import React from 'react'

export type NavTab = 'teams' | 'chat' | 'calls' | 'files' | 'activity' | 'meet'

interface NavItem {
  id: NavTab
  icon: string
  label: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'teams',    icon: 'ph-users-three-duotone',  label: 'Teams' },
  { id: 'chat',     icon: 'ph-chat-dots-duotone',    label: 'Chat',     badge: 3 },
  { id: 'calls',    icon: 'ph-phone-duotone',        label: 'Calls' },
  { id: 'files',    icon: 'ph-folder-open-duotone',  label: 'Files' },
  { id: 'activity', icon: 'ph-bell-duotone',         label: 'Activity', badge: 7 },
  { id: 'meet',     icon: 'ph-video-camera-duotone', label: 'Meet' },
]

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

export default function NavRail({ active, onChange }: Props) {
  return (
    <nav className="nav-rail">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`nav-rail-item${active === item.id ? ' active' : ''}`}
          onClick={() => onChange(item.id)}
          title={item.label}
        >
          <i className={`ph-duotone ${item.icon}`} />
          <span>{item.label}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </button>
      ))}
      <div className="nav-spacer" />
      <button
        className="nav-rail-item"
        title="Invite"
        onClick={() => {}}
      >
        <i className="ph-duotone ph-user-plus-duotone" />
        <span>Invite</span>
      </button>
    </nav>
  )
}
