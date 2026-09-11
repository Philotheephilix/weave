import React, { useEffect, useState, useCallback } from 'react'
import CopyableAddress from '../components/CopyableAddress'
import ErrorBoundary from '../components/ErrorBoundary'
import { ipcGetIdentity, ipcTorProxy, ipcDhtLookup, ipcDhtAnnounce, WeaveIdentityInfo } from '../lib/ipc'

function hexToHandle(noisePub: string): string {
  // Derive a short handle from the first 4 bytes of noisePub
  return noisePub.slice(0, 8)
}

function IdentityContent() {
  const [identity, setIdentity] = useState<WeaveIdentityInfo | null>(null)
  const [onionAddress, setOnionAddress] = useState<string | null>(null)
  const [announcing, setAnnouncing] = useState(false)
  const [announceStatus, setAnnounceStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [id, onion] = await Promise.all([
        ipcGetIdentity(),
        ipcDhtLookup(),
      ])
      setIdentity(id)
      setOnionAddress(onion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load identity')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAnnounce() {
    if (!onionAddress) return
    setAnnouncing(true)
    setAnnounceStatus('')
    try {
      await ipcDhtAnnounce(onionAddress)
      setAnnounceStatus('Announced to DHT')
    } catch (e) {
      setAnnounceStatus(e instanceof Error ? e.message : 'Announce failed')
    } finally {
      setAnnouncing(false)
      setTimeout(() => setAnnounceStatus(''), 4000)
    }
  }

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      Loading identity...
    </div>
  )

  if (error) return (
    <div className="error-boundary">
      <h3>Failed to load identity</h3>
      <p>{error}</p>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={load}>
        Retry
      </button>
    </div>
  )

  if (!identity) return null

  const handle = hexToHandle(identity.noisePub)

  return (
    <div className="page">
      <div className="page-title">Identity</div>
      <div className="page-subtitle">Your Weave cryptographic identity on ENSv2 + ERC-5564</div>

      <div className="identity-card">
        <div className="identity-handle">{handle}.weave.eth</div>
        <div className="identity-subtext">
          Your on-chain handle — derived from Noise public key prefix
        </div>
        <CopyableAddress label="viewPub"   value={identity.viewPub}  />
        <CopyableAddress label="spendPub"  value={identity.spendPub} />
        <CopyableAddress label="noisePub"  value={identity.noisePub} />
      </div>

      <div className="card">
        <div className="card-title">Onion Service</div>
        {onionAddress ? (
          <>
            <CopyableAddress label="onion" value={onionAddress} truncate={false} />
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={handleAnnounce}
                disabled={announcing}
              >
                {announcing ? 'Announcing...' : 'Announce to DHT'}
              </button>
              {announceStatus && (
                <span style={{ fontSize: '13px', color: 'var(--green)' }}>{announceStatus}</span>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-2)', fontSize: '13px' }}>
            No onion address found in DHT. Start Tor and announce.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Protocol Stack</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            ['Transport',  'Tor v3 onion service + Nostr NIP-59 fallback'],
            ['Encryption', 'Noise_XX (x25519 / ChaCha20-Poly1305)'],
            ['Identity',   'ERC-5564 stealth addresses (secp256k1)'],
            ['Discovery',  'ENSv2 subnames + DHT'],
            ['Network',    'Ethereum Sepolia'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-2)', minWidth: '90px' }}>{k}</span>
              <span style={{ color: 'var(--text-0)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function IdentityPage() {
  return (
    <ErrorBoundary>
      <IdentityContent />
    </ErrorBoundary>
  )
}
