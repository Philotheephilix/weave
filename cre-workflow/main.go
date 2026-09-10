//go:build wasip1

package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	cresdk "github.com/smartcontractkit/cre-sdk-go/pkg/cre"
	"github.com/smartcontractkit/cre-sdk-go/pkg/cre/types/cron"
	"github.com/smartcontractkit/cre-sdk-go/pkg/wasm"
)

// ── Config ────────────────────────────────────────────────────────────────────

type SecretConfig struct {
	SpendingKey string `json:"spending_key"`
}

type Config struct {
	Schedule          string       `json:"schedule"`
	RPCEndpoint       string       `json:"rpc_endpoint"`
	AnnouncerContract string       `json:"announcer_contract"`
	NotificationLog   string       `json:"notification_contract"`
	SecretIDs         SecretConfig `json:"secret_ids"`
	LastScannedBlock  uint64       `json:"last_scanned_block"`
}

// ── Workflow entry ────────────────────────────────────────────────────────────

func InitWorkflow(config *Config) (cresdk.Workflow, error) {
	return cresdk.NewWorkflow(
		// HandlerInTee: spending key + RPC call stay inside AWS Nitro enclave.
		// cre.AnyTee{} accepts any TEE type.
		cresdk.HandlerInTee(
			cron.Trigger(&cron.Config{Schedule: config.Schedule}),
			func(runtime cresdk.TeeRuntime, _ *cron.Payload) (string, error) {
				return runScan(config, runtime)
			},
			cresdk.AnyTee{},
		),
	), nil
}

// ── TEE handler ───────────────────────────────────────────────────────────────

func runScan(config *Config, runtime cresdk.TeeRuntime) (string, error) {
	// Step 1: fetch spending key from Vault DON — stays in enclave memory only
	secrets, err := runtime.GetSecrets([]*cresdk.SecretRequest{
		{Id: config.SecretIDs.SpendingKey},
	}).Await()
	if err != nil {
		return "", fmt.Errorf("GetSecrets: %w", err)
	}
	spendingKey, err := hex.DecodeString(secrets[0].Value)
	if err != nil {
		return "", fmt.Errorf("spending key hex decode: %w", err)
	}

	// Step 2: confidential HTTP — RPC call inside enclave; hidden from operators
	announcerURL := fmt.Sprintf(
		"%s/v1/announcements?contract=%s&fromBlock=%d",
		config.RPCEndpoint, config.AnnouncerContract, config.LastScannedBlock,
	)
	req, err := http.NewRequest(http.MethodGet, announcerURL, nil)
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	resp, err := runtime.SendRequestInTee(req).Await()
	if err != nil {
		return "", fmt.Errorf("confidential HTTP: %w", err)
	}
	defer resp.Body.Close()

	var announcements []ERC5564Announcement
	if err := json.NewDecoder(resp.Body).Decode(&announcements); err != nil {
		return "", fmt.Errorf("decode announcements: %w", err)
	}

	// Step 3: scan — all crypto in enclave (crypto.go)
	matches, err := scanAnnouncements(spendingKey, announcements)
	if err != nil {
		return "", err
	}
	if len(matches) == 0 {
		return "no matches", nil
	}

	// Step 4: cross TEE → DON boundary; only non-sensitive output
	donRuntime := runtime.UsingTheDons()

	// Derive spend public key so the hash matches what the client computes from spendPub.
	spendPub := deriveSpendPub(spendingKey)
	pubkeyHash := sha256.Sum256(spendPub)
	payload, err := json.Marshal(struct {
		UserPubkeyHash [32]byte `json:"userPubkeyHash"`
		MatchedIDs     []string `json:"matchedIds"`
	}{pubkeyHash, matches})
	if err != nil {
		return "", fmt.Errorf("marshal payload: %w", err)
	}

	// Step 5: generate DON-signed report and write to NotificationLog.sol
	report, err := donRuntime.GenerateReport(&cresdk.ReportRequest{
		EncodedPayload: payload,
		EncoderName:    "evm",
		SigningAlgo:    "ecdsa",
		HashingAlgo:    "keccak256",
	}).Await()
	if err != nil {
		return "", fmt.Errorf("GenerateReport: %w", err)
	}

	evmClient := donRuntime.GetEVMClient("sepolia")
	_, err = evmClient.WriteReport(donRuntime, &cresdk.WriteCreReportRequest{
		Receiver: config.NotificationLog,
		Report:   report,
		GasConfig: &cresdk.GasConfig{
			GasLimit: 500_000,
		},
	}).Await()
	if err != nil {
		return "", fmt.Errorf("WriteReport: %w", err)
	}

	return fmt.Sprintf("wrote %d matches on-chain", len(matches)), nil
}

func main() {
	wasm.NewRunner(cresdk.ParseJSON[Config]).Run(InitWorkflow)
}
