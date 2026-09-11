'use client'
import { useState } from 'react'

function getPerson(id: string) {
  return { name: id, initials: (id || '?').slice(0, 2).toUpperCase(), tint: '#eae9e9', ink: '#444141', role: 'Member', handle: id, presence: '#9b9797' as const }
}

interface MembersModalProps {
  channelTitle: string
  teamMembers: number
  memberIds: string[]
  removed: Record<string, boolean>
  roleOverride: Record<string, string>
  onSetRole: (id: string, role: string) => void
  onRemove: (id: string) => void
  onOpenInvite: () => void
  onClose: () => void
}

function MemberRow({ id, roleOverride, onSetRole, onRemove }: {
  id: string
  roleOverride: Record<string, string>
  onSetRole: (id: string, role: string) => void
  onRemove: (id: string) => void
}) {
  const [rowHover, setRowHover] = useState(false)
  const [rmHover, setRmHover] = useState(false)
  const p = getPerson(id)
  const role = roleOverride[id] || p.role.split(' · ')[0]

  function presenceStatus() {
    if (id === 'tarun') return { status: 'guest · 4d left', bg: '#fff1f4', ink: '#aa0b56' }
    if (p.presence === '#0088b0') return { status: 'reachable', bg: '#e9f8ff', ink: '#004961' }
    if (p.presence === '#edbb00') return { status: 'away', bg: '#eae7e7', ink: '#444141' }
    return { status: 'offline · queued', bg: '#eae7e7', ink: '#444141' }
  }
  const { status, bg: stBg, ink: stInk } = presenceStatus()

  return (
    <tr onMouseEnter={() => setRowHover(true)} onMouseLeave={() => setRowHover(false)}
      style={{ background: rowHover ? 'rgba(32,30,29,.04)' : 'transparent' }}>
      <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: p.tint, color: p.ink, fontSize: 10.5, fontWeight: 600, borderRadius: 2 }}>{p.initials}</span>
          <span style={{ fontWeight: 600 }}>{id === 'me' ? 'You' : p.name}</span>
        </span>
      </td>
      <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, color: 'rgba(32,30,29,.75)' }}>{p.handle}</td>
      <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)' }}>
        <select value={role} onChange={e => onSetRole(id, e.target.value)}
          style={{ fontFamily: 'inherit', fontSize: 13, padding: '4px 6px', background: '#f8f4f4', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2 }}>
          {['Owner', 'Moderator', 'Member', 'Guest'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '.03em', padding: '3px 8px', background: stBg, color: stInk, borderRadius: 2 }}>{status}</span>
      </td>
      <td style={{ padding: 9, borderBottom: '1px solid rgba(32,30,29,.08)', textAlign: 'right' }}>
        <button onClick={() => onRemove(id)} onMouseEnter={() => setRmHover(true)} onMouseLeave={() => setRmHover(false)} title="Remove"
          style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: rmHover ? '#aa0b56' : 'rgba(32,30,29,.7)', background: rmHover ? 'rgba(214,0,108,.12)' : 'transparent', cursor: 'pointer' }}>
          <i className="ph-duotone ph-user-minus" style={{ fontSize: 16 }}></i>
        </button>
      </td>
    </tr>
  )
}

export default function MembersModal({ channelTitle, teamMembers, memberIds, removed, roleOverride, onSetRole, onRemove, onOpenInvite, onClose }: MembersModalProps) {
  const [closeHover, setCloseHover] = useState(false)
  const [inviteHover, setInviteHover] = useState(false)
  const visible = memberIds.filter(id => !removed[id])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(45,43,43,.5)', zIndex: 40 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px,100%)', maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: '#eae9e9', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.22)', animation: 'wv-rise .16s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>Members of {channelTitle}</h4>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(32,30,29,.75)' }}>{visible.length} of {teamMembers} shown · roles enforced by ENSv2 access control</p>
          </div>
          <button onClick={onOpenInvite}
            onMouseEnter={() => setInviteHover(true)}
            onMouseLeave={() => setInviteHover(false)}
            style={{ fontWeight: 600, fontSize: 13.5, padding: '7px 13px', background: inviteHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
            Invite
          </button>
          <button onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: closeHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-x" style={{ fontSize: 16 }}></i>
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Member', 'Handle', 'Role', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', padding: 9, borderBottom: '1px solid rgba(32,30,29,.14)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(id => (
                <MemberRow key={id} id={id} roleOverride={roleOverride} onSetRole={onSetRole} onRemove={onRemove} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
