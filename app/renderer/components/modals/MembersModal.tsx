'use client'
import { useState } from 'react'
import { ensLabel, ensInitials, ensTint } from '@/lib/ens-display'

interface MembersModalProps {
  members: Array<{ name: string; address: string }>
  onClose: () => void
}

export default function MembersModal({ members, onClose }: MembersModalProps) {
  const [closeHover, setCloseHover] = useState(false)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(45,43,43,.5)', zIndex: 40 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px,100%)', maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: '#eae9e9', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.22)', animation: 'wv-rise .16s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>Org Members</h4>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(32,30,29,.75)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} · roles enforced by ENSv2 access control
            </p>
          </div>
          <button onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: closeHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-x" style={{ fontSize: 16 }}></i>
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {members.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(32,30,29,.55)', padding: '18px 8px' }}>
              No members enrolled in this org yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Member', 'Address'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', padding: 9, borderBottom: '1px solid rgba(32,30,29,.14)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i}>
                    <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: ensTint(m.name), color: '#444141', fontSize: 10.5, fontWeight: 600, borderRadius: 2, flexShrink: 0 }}>
                          {ensInitials(m.name)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{ensLabel(m.name)}</span>
                      </span>
                    </td>
                    <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, color: 'rgba(32,30,29,.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                      {m.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
