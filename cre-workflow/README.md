# cre-workflow — Confidential Runtime Environment

The CRE (Confidential Runtime Environment) is a Go WASM binary that wraps Weave's ENS write operations in a confidential workflow. It submits Ethereum transactions using a private key that never touches the renderer process or any untrusted code path.

## What It Does

ENS writes (org registration, member enrollment, role grants) require an Ethereum private key for signing. The CRE workflow:

1. Receives the operation parameters (org name, member address, role bitmap, etc.) as workflow inputs.
2. Loads the signing key from the confidential environment (not from the app's renderer or OS keychain directly).
3. Constructs and signs the transaction using the Weave contract ABI.
4. Broadcasts the signed transaction to the Sepolia RPC endpoint.
5. Returns the transaction hash as workflow output.

This architecture means the private key is only ever held inside the WASM sandbox — not in JavaScript, not in the Electron renderer, and not in the main process memory beyond what the Go runtime needs.

## Files

| File | Purpose |
|------|---------|
| `main.go` | Workflow step implementations — one function per ENS operation |
| `workflow.yaml` | Workflow step definitions — declares inputs, outputs, and step ordering |
| `config.json` | Chain config: RPC URL, contract addresses, chain ID |
| `cre-workflow.wasm` | Compiled WASM binary (do not edit; rebuild from source) |
| `go.mod` / `go.sum` | Go module dependencies |
| `crypto.go` | Signing utilities used by `main.go` |
| `project.yaml` | CRE project metadata |
| `secrets.yaml` | Secret slot declarations (actual secrets injected at runtime, not stored here) |

## Building

```bash
cd cre-workflow
GOOS=js GOARCH=wasm go build -o cre-workflow.wasm .
```

Requires Go 1.21+ with WASM support. The output `cre-workflow.wasm` is loaded by the Electron main process at startup.

## How It Is Invoked

The Electron main process loads the WASM binary and invokes workflow steps via the CRE SDK. IPC handlers in `app/main/ipc-handlers.ts` that need to write to ENS route through the CRE workflow rather than building the transaction directly. The workflow returns a result object `{ txHash, error }` which the handler passes back to the renderer.

## Contract Config

`config.json` holds the target contract addresses. After a redeployment, update this file alongside `app/main/addresses.ts` and `app/renderer/lib/addresses.ts`:

```json
{
  "chainId": 11155111,
  "rpcUrl": "https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt",
  "contracts": {
    "WeaveRegistrar": "0x47f73c5F82a43Cc4b3a007131Af0E84543146950"
  }
}
```
