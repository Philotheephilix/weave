'use client'
import { useState } from 'react'

interface NewDMModalProps {
  members: Array<{ name: string; address: string }>
  myHandle: string
  onStart: (peerLabel: string) => void
  onClose: () => void
}

export default function NewDMModal({ members, myHandle, onStart, onClose }: NewDMModalProps) {
  const [query, setQuery] = useState('')
  const myLabel = myHandle.includes('.') ? myHandle.split('.')[0] : myHandle

  const filtered = members
    .filter(m => m.name !== myLabel)
    .filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 4, width: 440, boxShadow: '0 16px 48px rgba(32,30,29,.22)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid rgba(32,30,29,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>New direct message</span>
            <button onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: 'rgba(32,30,29,.6)', cursor: 'pointer' }}>
              <i className="ph-duotone ph-x" style={{ fontSize: 16 }}></i>
            </button>
          </div>
          <input
            autoFocus
            placeholder="Search members…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(32,30,29,.2)', borderRadius: 2, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px 8px', color: 'rgba(32,30,29,.5)', fontSize: 13, textAlign: 'center' }}>
              {members.length === 0 ? 'No org members found. Enroll members first.' : 'No members match your search.'}
            </div>
          ) : filtered.map(m => (
            <MemberRow key={m.name} member={m} onSelect={() => { onStart(m.name); onClose() }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member, onSelect }: { member: { name: string; address: string }; onSelect: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px', borderRadius: 2, background: hover ? '#e9f8ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, background: '#eae9e9', color: '#444141', fontSize: 12, fontWeight: 600, borderRadius: 2, flexShrink: 0 }}>
        {member.name.slice(0, 2).toUpperCase()}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{member.name}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'rgba(32,30,29,.55)', fontFamily: 'ui-monospace,Menlo,monospace' }}>{member.address.slice(0, 12)}…</span>
      </span>
      <i className="ph-duotone ph-envelope" style={{ fontSize: 15, color: '#0088b0' }}></i>
    </button>
  )
}
