'use client'
import { useState } from 'react'
import Link from 'next/link'

interface ResolvedId {
  viewPub: Uint8Array
  spendPub: Uint8Array
  noisePub: Uint8Array
  onionAddress: string
  nostrPub: string
}

export default function IdentityPage() {
  const [handle, setHandle] = useState('')
  const [resolved, setResolved] = useState<ResolvedId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function lookup() {
    setLoading(true)
    setError(null)
    setResolved(null)
    try {
      const w = (window as any).weave
      const result = await w.resolve(handle.replace(/\.weave\.eth$/, ''))
      if (!result) throw new Error('Handle not found')
      setResolved(result)
    } catch (e: any) {
      setError(e.message ?? 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <Link href="/" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← back</Link>
      <h1 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>Resolve Identity</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="alice.weave.eth"
          onKeyDown={e => e.key === 'Enter' && lookup()}
          style={{
            flex: 1, padding: '0.5rem 0.75rem', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
            fontSize: '0.9rem',
          }}
        />
        <button
          onClick={lookup}
          disabled={loading || !handle}
          style={{
            padding: '0.5rem 1.25rem', background: 'var(--accent)', border: 'none',
            borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '…' : 'Resolve'}
        </button>
      </div>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {resolved && (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{handle}</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.4rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            <dt style={{ color: 'var(--muted)' }}>onion</dt>
            <dd style={{ wordBreak: 'break-all' }}>{resolved.onionAddress}</dd>
            <dt style={{ color: 'var(--muted)' }}>view</dt>
            <dd style={{ wordBreak: 'break-all' }}>{Buffer.from(resolved.viewPub).toString('hex')}</dd>
            <dt style={{ color: 'var(--muted)' }}>spend</dt>
            <dd style={{ wordBreak: 'break-all' }}>{Buffer.from(resolved.spendPub).toString('hex')}</dd>
            <dt style={{ color: 'var(--muted)' }}>noise</dt>
            <dd style={{ wordBreak: 'break-all' }}>{Buffer.from(resolved.noisePub).toString('hex')}</dd>
            {resolved.nostrPub && (<>
              <dt style={{ color: 'var(--muted)' }}>nostr</dt>
              <dd style={{ wordBreak: 'break-all' }}>{resolved.nostrPub}</dd>
            </>)}
          </dl>
        </section>
      )}
    </main>
  )
}
