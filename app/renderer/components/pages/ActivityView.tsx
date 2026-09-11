'use client'
import { useState } from 'react'
import type { RailId } from '@/lib/types'

interface ActivityItem {
  title: string
  body: string
  icon: string
  tint: string
  ink: string
  time: string
  weight: number
  nav: { rail?: RailId; team?: string; channel?: string; modal?: string }
}

interface ActivityViewProps {
  items: ActivityItem[]
  onNavigate: (nav: ActivityItem['nav']) => void
}

export default function ActivityView({ items, onNavigate }: ActivityViewProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Activity</h3>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Delivered while you were offline via gift-wrapped Nostr events — the relay only ever saw ciphertext.</p>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
        {items.map((a, i) => {
          const [hover, setHover] = useState(false)
          return (
            <button key={i}
              onClick={() => onNavigate(a.nav)}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) auto', gap: 12, alignItems: 'start', padding: '13px 8px', borderBottom: '1px solid rgba(32,30,29,.08)', textAlign: 'left', background: hover ? 'rgba(32,30,29,.04)' : 'transparent', cursor: 'pointer' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, background: a.tint, color: a.ink, borderRadius: 2 }}>
                <i className={`ph-duotone ${a.icon}`} style={{ fontSize: 18 }}></i>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: a.weight }}>{a.title}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'rgba(32,30,29,.75)' }}>{a.body}</span>
              </span>
              <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.66)', whiteSpace: 'nowrap' }}>{a.time}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
