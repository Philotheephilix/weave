import React, { useState, useRef } from 'react'
import CopyableAddress from '../components/CopyableAddress'
import ErrorBoundary from '../components/ErrorBoundary'
import { ipcResolve, ipcComputeStealth, ResolvedIdentity } from '../lib/ipc'

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface ContactsContentProps {
  onOpenMessages: (contact: ResolvedIdentity & { handle: string }) => void
}

function ContactsContent({ onOpenMessages }: ContactsContentProps) {
  const [query, setQuery] = useState('')
  const [contact, setContact] = useState<(ResolvedIdentity & { handle: string }) | null>(null)
  const [stealthAddress, setStealthAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stealthLoading, setStealthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault()
    const label = query.trim()
    if (!label) return
    setLoading(true)
    setError(null)
    setContact(null)
    setStealthAddress(null)
    try {
      const result = await ipcResolve(label)
      if (!result) {
        setError(`No Weave identity found for "${label}.weave.eth"`)
      } else {
        setContact({ ...result, handle: label.replace(/\.weave\.eth$/i, '') })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolution failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeriveStealth() {
    if (!contact) return
    setStealthLoading(true)
    try {
      const viewHex  = bufToHex(contact.viewPub)
      const spendHex = bufToHex(contact.spendPub)
      const result   = await ipcComputeStealth(viewHex, spendHex)
      setStealthAddress(result.stealthAddress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stealth derivation failed')
    } finally {
      setStealthLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-title">Contacts</div>
      <div className="page-subtitle">Resolve any Weave handle to view their public identity</div>

      <form className="input-group" onSubmit={handleResolve}>
        <input
          ref={inputRef}
          className="input"
          placeholder="alice  or  alice.weave.eth"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Resolving...' : 'Resolve'}
        </button>
      </form>

      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--red)',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {contact && (
        <>
          <div className="card">
            <div className="card-title">Identity — {contact.handle}.weave.eth</div>
            <CopyableAddress label="viewPub"  value={bufToHex(contact.viewPub)}  />
            <CopyableAddress label="spendPub" value={bufToHex(contact.spendPub)} />
            <CopyableAddress label="noisePub" value={bufToHex(contact.noisePub)} />
            <CopyableAddress label="onion"    value={contact.onionAddress} truncate={false} />
            {contact.nostrPub && (
              <CopyableAddress label="nostrPub" value={contact.nostrPub} />
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                className="btn btn-primary"
                onClick={() => onOpenMessages(contact)}
              >
                Send Message
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleDeriveStealth}
                disabled={stealthLoading}
              >
                {stealthLoading ? 'Computing...' : 'Derive Stealth Address'}
              </button>
            </div>
          </div>

          {stealthAddress && (
            <div className="card">
              <div className="card-title">Stealth Address</div>
              <CopyableAddress label="address" value={stealthAddress} truncate={false} />
              <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '8px', lineHeight: '1.6' }}>
                This is where to send funds to reach this contact privately.
                Only they can detect and spend from this address using their view and spend keys.
              </p>
            </div>
          )}
        </>
      )}

      {!contact && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">⊕</div>
          <div className="empty-text">
            Enter a Weave handle to resolve their public identity keys and onion address.
          </div>
        </div>
      )}
    </div>
  )
}

interface ContactsPageProps {
  onOpenMessages: (contact: ResolvedIdentity & { handle: string }) => void
}

export default function ContactsPage({ onOpenMessages }: ContactsPageProps) {
  return (
    <ErrorBoundary>
      <ContactsContent onOpenMessages={onOpenMessages} />
    </ErrorBoundary>
  )
}
