import React, { useState, useCallback } from 'react'
import Layout, { Page } from './components/Layout'
import IdentityPage from './pages/IdentityPage'
import ContactsPage from './pages/ContactsPage'
import MessagesPage from './pages/MessagesPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import type { ResolvedIdentity } from './lib/ipc'

export default function App() {
  const [page, setPage] = useState<Page>('identity')
  const [notificationCount, setNotificationCount] = useState(0)
  const [pendingContact, setPendingContact] = useState<(ResolvedIdentity & { handle: string }) | null>(null)

  const handleOpenMessages = useCallback((contact: ResolvedIdentity & { handle: string }) => {
    setPendingContact(contact)
    setPage('messages')
  }, [])

  const handleContactConsumed = useCallback(() => {
    setPendingContact(null)
  }, [])

  function renderPage() {
    switch (page) {
      case 'identity':
        return <IdentityPage />
      case 'contacts':
        return <ContactsPage onOpenMessages={handleOpenMessages} />
      case 'messages':
        return (
          <MessagesPage
            preSelectedContact={pendingContact}
            onContactConsumed={handleContactConsumed}
          />
        )
      case 'notifications':
        return <NotificationsPage onCountChange={setNotificationCount} />
      case 'settings':
        return <SettingsPage />
    }
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      notificationCount={notificationCount}
    >
      {renderPage()}
    </Layout>
  )
}
