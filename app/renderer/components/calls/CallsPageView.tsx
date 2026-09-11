'use client'
import { useState } from 'react'
import type { CallLogEntry } from '@/lib/types'
import { people } from '@/lib/mockData'

interface CallsPageViewProps {
  callLog: CallLogEntry[]
  dial: string
  onKeypad: (k: string) => void
  onDialBack: () => void
  onDialCall: () => void
  onCallBack: (id: string) => void
}

const KEYPAD = ['1','2','3','4','5','6','7','8','9','*','0','#']

function KeypadBtn({ k, onPress }: { k: string; onPress: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onPress} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '11px 0', background: hover ? '#e9f8ff' : '#f8f4f4', border: `1px solid ${hover ? '#0088b0' : 'rgba(32,30,29,.12)'}`, borderRadius: 2, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 17, cursor: 'pointer' }}>
      {k}
    </button>
  )
}

function CallLogRow({ entry, onCallBack }: { entry: CallLogEntry; onCallBack: () => void }) {
  const [rowHover, setRowHover] = useState(false)
  const [cbHover, setCbHover] = useState(false)
  const p = people[entry.id] || people.me
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

function callIcon(dir: string) {
  return dir === 'in' ? 'ph-phone-incoming' : dir === 'out' ? 'ph-phone-outgoing' : 'ph-phone-x'
}

function callColor(dir: string) {
  return dir === 'missed' ? '#aa0b56' : '#006786'
}

export default function CallsPageView({ callLog, dial, onKeypad, onDialBack, onDialCall, onCallBack }: CallsPageViewProps) {
  const [uploadHover, setUploadHover] = useState(false)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Calls</h3>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Stealth-addressed over ERC-5564 — a one-time key per session, so the callee never sees your wallet.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 268px', gap: 28, alignItems: 'start' }}>
        <div>
          <h6 style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', fontWeight: 600 }}>Recent</h6>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {callLog.map((k, i) => (
              <CallLogRow key={i} entry={k} onCallBack={() => onCallBack(k.id)} />
            ))}
          </div>
        </div>

        <div style={{ padding: 16, background: '#eae9e9', borderRadius: 2 }}>
          <h6 style={{ margin: '0 0 10px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', fontWeight: 600 }}>Dial</h6>
          <div style={{ minHeight: 44, padding: '8px 10px', background: '#f8f4f4', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 15, wordBreak: 'break-all' }}>
            {dial || 'dial a handle'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginTop: 12 }}>
            {KEYPAD.map(k => <KeypadBtn key={k} k={k} onPress={() => onKeypad(k)} />)}
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
            <button onClick={onDialCall}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '9px 0', background: '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
              <i className="ph-duotone ph-phone-call" style={{ fontSize: 16 }}></i>Call
            </button>
            <button onClick={onDialBack} title="Delete"
              style={{ width: 42, display: 'grid', placeItems: 'center', background: '#f8f4f4', border: '1px solid rgba(32,30,29,.12)', borderRadius: 2, color: 'rgba(32,30,29,.75)', cursor: 'pointer' }}>
              <i className="ph-duotone ph-backspace" style={{ fontSize: 17 }}></i>
            </button>
          </div>
          <p style={{ margin: '12px 0 0', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, lineHeight: 1.6, color: 'rgba(32,30,29,.7)' }}>dial an ens handle or a keypad alias · dht lookup, then tor rendezvous</p>
        </div>
      </div>
    </div>
  )
}
