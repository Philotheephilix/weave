'use client'
import { useState } from 'react'
import type { CallLogEntry } from '@/lib/types'
import { ensLabel, ensInitials, ensTint } from '@/lib/ens-display'

function getPerson(id: string) {
  return { name: ensLabel(id), initials: ensInitials(id), tint: ensTint(id), ink: '#444141', role: 'Member', handle: id }
}

interface CallsPageViewProps {
  callLog: CallLogEntry[]
  onCallBack: (id: string) => void
}

function CallLogRow({ entry, onCallBack }: { entry: CallLogEntry; onCallBack: () => void }) {
  const [rowHover, setRowHover] = useState(false)
  const [cbHover, setCbHover] = useState(false)
  const p = getPerson(entry.id)
  const icon = entry.dir === 'in' ? 'ph-phone-incoming' : entry.dir === 'out' ? 'ph-phone-outgoing' : 'ph-phone-x'
  const color = entry.dir === 'missed' ? '#aa0b56' : '#006786'
  return (
    <div onMouseEnter={() => setRowHover(true)} onMouseLeave={() => setRowHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', borderBottom: '1px solid rgba(32,30,29,.08)', background: rowHover ? 'rgba(32,30,29,.04)' : 'transparent' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 19, color }}></i>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, background: p.tint, color: p.ink, fontSize: 11, fontWeight: 600, borderRadius: 2 }}>{p.initials}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{entry.name}</span>
        <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.7)' }}>{entry.meta}</span>
      </span>
      <span style={{ fontSize: 12, color: 'rgba(32,30,29,.66)' }}>{entry.time}</span>
      <button onClick={onCallBack} onMouseEnter={() => setCbHover(true)} onMouseLeave={() => setCbHover(false)} title="Call back"
        style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 2, color: '#006786', background: cbHover ? 'rgba(0,136,176,.12)' : 'transparent', cursor: 'pointer' }}>
        <i className="ph-duotone ph-phone-call" style={{ fontSize: 17 }}></i>
      </button>
    </div>
  )
}

export default function CallsPageView({ callLog, onCallBack }: CallsPageViewProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Calls</h3>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Stealth-addressed over ERC-5564 — a one-time key per session, so the callee never sees your wallet.</p>
      <div>
        <h6 style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', fontWeight: 600 }}>Recent</h6>
        {callLog.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(32,30,29,.45)', fontSize: 13 }}>No recent calls</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {callLog.map((k, i) => (
              <CallLogRow key={i} entry={k} onCallBack={() => onCallBack(k.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
