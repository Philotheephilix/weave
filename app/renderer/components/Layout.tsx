import React from 'react'
import StatusBar from './StatusBar'

export type Page = 'identity' | 'contacts' | 'messages' | 'notifications' | 'settings'

interface LayoutProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  notificationCount: number
  children: React.ReactNode
}

interface NavItem {
  id: Page
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'identity',      label: 'Identity',      icon: '◈' },
  { id: 'contacts',      label: 'Contacts',       icon: '⊕' },
  { id: 'messages',      label: 'Messages',       icon: '◎' },
  { id: 'notifications', label: 'Notifications',  icon: '◉' },
  { id: 'settings',      label: 'Settings',       icon: '⚙' },
]

export default function Layout({ currentPage, onNavigate, notificationCount, children }: LayoutProps) {
  return (
    <div className="shell">
      <div className="workspace">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <span className="logo-dot" />
            Weave
          </div>
          <div className="nav-section">
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.id === 'notifications' && notificationCount > 0 && (
                  <span className="nav-badge">{notificationCount}</span>
                )}
              </div>
            ))}
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
