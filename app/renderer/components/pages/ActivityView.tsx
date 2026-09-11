'use client'
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

export default function ActivityView(_props: ActivityViewProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Activity</h3>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Delivered while you were offline via gift-wrapped Nostr events — the relay only ever saw ciphertext.</p>
      <div style={{ color: 'rgba(32,30,29,.55)', fontSize: 13 }}>No activity</div>
    </div>
  )
}
