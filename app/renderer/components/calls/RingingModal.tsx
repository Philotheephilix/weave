'use client'
import { useState } from 'react'

interface RingingModalProps {
  name: string
  initials: string
  tint: string
  ink: string
  meta: string
  onConnect: () => void
  onCancel: () => void
}

export default function RingingModal({ name, initials, tint, ink, meta, onConnect, onCancel }: RingingModalProps) {
  const [cancelHover, setCancelHover] = useState(false)
  const [connectHover, setConnectHover] = useState(false)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(45,43,43,.5)' }}>
      <div style={{ width: 340, padding: 22, background: '#f3f2f2', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.22)', textAlign: 'center', animation: 'wv-rise .16s ease-out' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, margin: '0 auto', background: tint, color: ink, fontSize: 22, fontWeight: 600, borderRadius: 2, animation: 'wv-ring 1.6s infinite' }}>{initials}</span>
        <h4 style={{ margin: '14px 0 2px', fontSize: 20, fontWeight: 600 }}>{name}</h4>
        <p style={{ margin: 0, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10.5, color: 'rgba(32,30,29,.72)' }}>{meta}</p>
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button
            onClick={onCancel}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{ flex: 1, fontWeight: 600, fontSize: 14, padding: '9px 0', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: cancelHover ? 'rgba(214,0,108,.1)' : 'transparent', color: cancelHover ? '#aa0b56' : '#201e1d', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={onConnect}
            onMouseEnter={() => setConnectHover(true)}
            onMouseLeave={() => setConnectHover(false)}
            style={{ flex: 1, fontWeight: 600, fontSize: 14, padding: '9px 0', background: connectHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
            Connected
          </button>
        </div>
      </div>
    </div>
  )
}
