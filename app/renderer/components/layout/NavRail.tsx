'use client'
import { useState } from 'react'
import type { RailId } from '@/lib/types'

interface RailItem {
  id: RailId
  label: string
  icon: string
  badge: string
}

const railDefs: RailItem[] = [
  { id: 'members', label: 'Members', icon: 'ph-users-three',        badge: ''  },
  { id: 'chat',    label: 'Chat',    icon: 'ph-chat-teardrop-text', badge: '2' },
  { id: 'teams',   label: 'Teams',   icon: 'ph-hash',               badge: ''  },
  { id: 'calls',   label: 'Calls',   icon: 'ph-phone',              badge: ''  },
  { id: 'files',   label: 'Files',   icon: 'ph-folder-open',        badge: ''  },
  { id: 'meet',    label: 'Meet',    icon: 'ph-video-camera',       badge: ''  },
]

interface NavRailProps {
  active: RailId
  onSelect: (id: RailId) => void
  onInvite: () => void
}

function RailButton({ item, active, onClick }: { item: RailItem; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 2px 7px', borderRadius: 2, color: active ? '#004961' : 'rgba(32,30,29,.82)', background: active ? '#e9f8ff' : hover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}
    >
      <span style={{ position: 'absolute', left: -6, top: 8, bottom: 8, width: 2, background: active ? '#0088b0' : 'transparent' }}></span>
      <i className={`ph-duotone ${item.icon}`} style={{ fontSize: 21 }}></i>
      <span style={{ fontSize: 10.5, letterSpacing: '.02em', fontWeight: active ? 600 : 400 }}>{item.label}</span>
      {item.badge && (
        <span style={{ position: 'absolute', top: 6, right: 10, minWidth: 15, height: 15, padding: '0 4px', display: 'grid', placeItems: 'center', background: '#d6006c', color: '#fff', fontSize: 9.5, fontWeight: 600, borderRadius: 9, lineHeight: '15px', textAlign: 'center' }}>{item.badge}</span>
      )}
    </button>
  )
}

export default function NavRail({ active, onSelect, onInvite }: NavRailProps) {
  const [inviteHover, setInviteHover] = useState(false)
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '10px 6px', background: '#f3f2f2', borderRight: '1px solid rgba(32,30,29,.1)', overflowY: 'auto' }}>
      {railDefs.map(r => (
        <RailButton key={r.id} item={r} active={active === r.id} onClick={() => onSelect(r.id)} />
      ))}
      <div style={{ flex: 1 }}></div>
      <button
        onClick={onInvite}
        onMouseEnter={() => setInviteHover(true)}
        onMouseLeave={() => setInviteHover(false)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '9px 2px', borderRadius: 2, color: inviteHover ? '#0088b0' : 'rgba(32,30,29,.7)', background: inviteHover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}
      >
        <i className="ph-duotone ph-user-plus" style={{ fontSize: 21 }}></i>
        <span style={{ fontSize: 10.5 }}>Invite</span>
      </button>
    </nav>
  )
}
