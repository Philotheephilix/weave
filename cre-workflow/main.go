//go:build wasip1

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"strings"

	pb "github.com/smartcontractkit/chainlink-protos/cre/go/values/pb"
	"github.com/smartcontractkit/cre-sdk-go/capabilities/blockchain/evm"
	"github.com/smartcontractkit/cre-sdk-go/capabilities/scheduler/cron"
	cresdk "github.com/smartcontractkit/cre-sdk-go/cre"
	"github.com/smartcontractkit/cre-sdk-go/cre/wasm"
)

type SecretConfig struct {
	SpendingKey string `json:"spending_key"`
	ViewKey     string `json:"view_key"`
}

type Config struct {
	Schedule          string       `json:"schedule"`
	AnnouncerContract string       `json:"announcer_contract"`
	NotificationLog   string       `json:"notification_contract"`
	GasLimit          uint64       `json:"gas_limit"`
	SecretIDs         SecretConfig `json:"secret_ids"`
	LastScannedBlock  int64        `json:"last_scanned_block"`
}

func InitWorkflow(config *Config, _ *slog.Logger, _ cresdk.SecretsProvider) (cresdk.Workflow[*Config], error) {
	return cresdk.Workflow[*Config]{
		cresdk.HandlerInTee(
			cron.Trigger(&cron.Config{Schedule: config.Schedule}),
			runScan,
			cresdk.AnyTee{},
		),
	}, nil
}

func runScan(config *Config, runtime cresdk.TeeRuntime, _ *cron.Payload) (string, error) {
	// Fetch both keys from Vault DON — stays in enclave memory only.
	// ERC-5564: view key is used for ECDH scanning; spend key derives spendPub for the pubkeyHash.
	secrets, err := runtime.GetSecrets([]*cresdk.SecretRequest{
		{Id: config.SecretIDs.SpendingKey},
		{Id: config.SecretIDs.ViewKey},
	}).Await()
	if err != nil {
		return "", fmt.Errorf("GetSecrets: %w", err)
	}
	spendingKey, err := hex.DecodeString(strings.TrimPrefix(secrets[0].Value, "0x"))
	if err != nil {
		return "", fmt.Errorf("spending key hex decode: %w", err)
	}
	viewKey, err := hex.DecodeString(strings.TrimPrefix(secrets[1].Value, "0x"))
	if err != nil {
		return "", fmt.Errorf("view key hex decode: %w", err)
	}

	donRuntime := runtime.UsingTheDons()

	sepoliaClient := &evm.Client{ChainSelector: evm.EthereumTestnetSepolia}

	announcerAddr, err := hex.DecodeString(strings.TrimPrefix(config.AnnouncerContract, "0x"))
	if err != nil {
		return "", fmt.Errorf("announcer address decode: %w", err)
	}

	announcementTopic, err := hex.DecodeString("555d539bb0d170c9cae5a00fe08ce40e85bf37e3b409e8c8bfba28acf68b8af7")
	if err != nil {
		return "", fmt.Errorf("topic decode: %w", err)
	}

	logsReply, err := sepoliaClient.FilterLogs(donRuntime, &evm.FilterLogsRequest{
		FilterQuery: &evm.FilterQuery{
			FromBlock: bigIntPB(config.LastScannedBlock),
			Addresses: [][]byte{announcerAddr},
			Topics:    []*evm.Topics{{Topic: [][]byte{announcementTopic}}},
		},
	}).Await()
	if err != nil {
		return "", fmt.Errorf("FilterLogs: %w", err)
	}

	var announcements []ERC5564Announcement
	for _, log := range logsReply.Logs {
		if len(log.Data) < 32 || len(log.Topics) < 2 {
			continue
		}
		announcements = append(announcements, ERC5564Announcement{
			StealthAddress: hex.EncodeToString(log.Topics[1]),
			EphemeralPubkey: log.Data,
		})
	}

	spendPub := deriveSpendPub(spendingKey)

	matches, err := scanAnnouncements(viewKey, spendPub, announcements)
	if err != nil {
		return "", err
	}
	if len(matches) == 0 {
		return "no matches", nil
	}
	pubkeyHash := sha256.Sum256(spendPub)

	payload, err := json.Marshal(struct {
		UserPubkeyHash [32]byte `json:"userPubkeyHash"`
		MatchedIDs     []string `json:"matchedIds"`
	}{pubkeyHash, matches})
	if err != nil {
		return "", fmt.Errorf("marshal payload: %w", err)
	}

	report, err := donRuntime.GenerateReport(&cresdk.ReportRequest{
		EncodedPayload: payload,
		EncoderName:    "evm",
		SigningAlgo:    "ecdsa",
		HashingAlgo:    "keccak256",
	}).Await()
	if err != nil {
		return "", fmt.Errorf("GenerateReport: %w", err)
	}

	// Submit report on-chain via KeystoneForwarder → NotificationLog.onReport.
	receiverAddr, err := hex.DecodeString(strings.TrimPrefix(config.NotificationLog, "0x"))
	if err != nil {
		return "", fmt.Errorf("receiver address decode: %w", err)
	}

	gasLimit := config.GasLimit
	if gasLimit == 0 {
		gasLimit = 500_000
	}
	resp, err := sepoliaClient.WriteReport(donRuntime, &evm.WriteCreReportRequest{
		Receiver:  receiverAddr,
		Report:    report,
		GasConfig: &evm.GasConfig{GasLimit: gasLimit},
	}).Await()
	if err != nil {
		return "", fmt.Errorf("WriteReport: %w", err)
	}
	if resp.TxStatus != evm.TxStatus_TX_STATUS_SUCCESS {
		msg := "unknown error"
		if resp.ErrorMessage != nil {
			msg = *resp.ErrorMessage
		}
		return "", fmt.Errorf("tx failed (%v): %s", resp.TxStatus, msg)
	}

	return fmt.Sprintf("wrote %d matches on-chain (tx 0x%x)", len(matches), resp.TxHash), nil
}

func bigIntPB(n int64) *pb.BigInt {
	b := big.NewInt(n)
	return &pb.BigInt{AbsVal: b.Bytes(), Sign: int64(b.Sign())}
}

func main() {
	wasm.NewRunner(cresdk.ParseJSON[Config]).Run(InitWorkflow)
}
