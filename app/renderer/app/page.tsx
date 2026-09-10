'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface IdentityInfo {
  viewPub: string
  spendPub: string
  noisePub: string
}

export default function HomePage() {
  const [id, setId] = useState<IdentityInfo | null>(null)
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    const w = (window as any).weave
    if (!w) return
    w.identity.get().then(setId)
    w.notifications().then(setNotifications)
  }, [])

  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Weave</h1>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/identity">Identity</Link>
      </nav>

      {id ? (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--muted)' }}>Your Session Keys</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            <div><span style={{ color: 'var(--muted)' }}>view: </span>{id.viewPub}</div>
            <div><span style={{ color: 'var(--muted)' }}>spend: </span>{id.spendPub}</div>
            <div><span style={{ color: 'var(--muted)' }}>noise: </span>{id.noisePub}</div>
          </div>
        </section>
      ) : (
        <p style={{ color: 'var(--muted)' }}>Loading identity…</p>
      )}

      {notifications.length > 0 && (
        <section style={{ marginTop: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Stealth Matches</h2>
          <ul style={{ listStyle: 'none', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {notifications.map(id => <li key={id}>{id}</li>)}
          </ul>
        </section>
      )}
    </main>
  )
}
