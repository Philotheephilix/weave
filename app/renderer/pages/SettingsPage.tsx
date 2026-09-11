import React, { useEffect, useState, useCallback } from 'react'
import CopyableAddress from '../components/CopyableAddress'
import ErrorBoundary from '../components/ErrorBoundary'
import { ipcGetIdentity, ipcTorProxy, WeaveIdentityInfo, TorProxy } from '../lib/ipc'
import { ADDRESSES, SEPOLIA_RPC, CHAIN_ID, BLOCK_EXPLORER } from '../lib/addresses'

function SettingsContent() {
  const [identity, setIdentity] = useState<WeaveIdentityInfo | null>(null)
  const [torProxy, setTorProxy] = useState<TorProxy | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [id, proxy] = await Promise.allSettled([ipcGetIdentity(), ipcTorProxy()])
      if (id.status === 'fulfilled') setIdentity(id.value)
      if (proxy.status === 'fulfilled') setTorProxy(proxy.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="page">
      <div className="page-title">Settings</div>
      <div className="page-subtitle">Weave node configuration and diagnostic info</div>

      <div className="settings-section">
        <div className="settings-section-title">Identity</div>
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : identity ? (
          <>
            <div className="settings-row">
              <span className="settings-row-label">View Public Key</span>
              <CopyableAddress label="" value={identity.viewPub} />
            </div>
            <div className="settings-row">
              <span className="settings-row-label">Spend Public Key</span>
              <CopyableAddress label="" value={identity.spendPub} />
            </div>
            <div className="settings-row">
              <span className="settings-row-label">Noise Static Key</span>
              <CopyableAddress label="" value={identity.noisePub} />
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>
            Identity not loaded — Tor may be starting.
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Transport</div>
        <div className="settings-row">
          <span className="settings-row-label">Tor SOCKS5 Proxy</span>
          <span className="settings-row-value">
            {torProxy ? `${torProxy.host}:${torProxy.port}` : 'Not connected'}
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Encryption</span>
          <span className="settings-row-value">Noise_XX_25519_ChaChaPoly_SHA256</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Discovery</span>
          <span className="settings-row-value">BEP-44 mutable DHT + Nostr NIP-59</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Network — Ethereum Sepolia</div>
        <div className="settings-row">
          <span className="settings-row-label">Chain ID</span>
          <span className="settings-row-value">{CHAIN_ID}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">RPC</span>
          <span className="settings-row-value" style={{ wordBreak: 'break-all' }}>{SEPOLIA_RPC.replace(/\/v2\/.+$/, '/v2/…')}</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Deployed Contracts</div>
        {(Object.entries(ADDRESSES) as [string, `0x${string}`][]).map(([name, addr]) => (
          <div className="settings-row" key={name}>
            <span className="settings-row-label">{name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CopyableAddress label="" value={addr} />
              <a
                href={`${BLOCK_EXPLORER}/address/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">CRE Workflow</div>
        <div className="settings-row">
          <span className="settings-row-label">Scanner</span>
          <span className="settings-row-value">ERC-5564 stealth scan in Chainlink TEE</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Schedule</span>
          <span className="settings-row-value">Every 5 minutes</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Announcer Contract</span>
          <span className="settings-row-value">0x55649E01B5Df198D18D95b5cc5051630cfD45564</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Privacy Stack</div>
        {[
          ['IP Anonymity', 'Tor v3 onion services — no IP exposed'],
          ['Content', 'Noise_XX E2E — no server can read messages'],
          ['Metadata', 'ERC-5564 stealth — who-talks-to-whom unlinkable'],
          ['Files', 'IPFS + ChaCha20-Poly1305 — server sees only ciphertext'],
          ['Scanning', 'Chainlink CRE TEE — spend key never leaves enclave'],
          ['Offline Delivery', 'Nostr NIP-59 gift-wrap — relay sees only ciphertext'],
        ].map(([k, v]) => (
          <div className="settings-row" key={k}>
            <span className="settings-row-label">{k}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-1)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsContent />
    </ErrorBoundary>
  )
}
