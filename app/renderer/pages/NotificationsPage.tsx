import React, { useState, useEffect, useCallback } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import { ipcPollNotifications } from '../lib/ipc'

function parseTimestamp(id: string): string {
  // Some stealth IDs embed a timestamp prefix like "1700000000:0x..."
  const match = /^(\d{10,13}):/.exec(id)
  if (match) {
    const ms = match[1].length === 10 ? parseInt(match[1]) * 1000 : parseInt(match[1])
    return new Date(ms).toLocaleString()
  }
  return 'Unknown time'
}

interface NotificationsContentProps {
  onCountChange: (n: number) => void
}

function NotificationsContent({ onCountChange }: NotificationsContentProps) {
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const poll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await ipcPollNotifications()
      setIds(result)
      onCountChange(result.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to poll notifications')
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    poll()
  }, [poll])

  function handleClearAll() {
    setIds([])
    onCountChange(0)
  }

  if (loading) return (
    <div className="page">
      <div className="page-title">Notifications</div>
      <div className="loading"><div className="spinner" />Scanning NotificationLog contract...</div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-title">Notifications</div>
      <div className="page-subtitle">
        Matched stealth addresses from the on-chain NotificationLog
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--red)',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={poll} disabled={loading}>
          Refresh
        </button>
        {ids.length > 0 && (
          <button className="btn btn-danger" onClick={handleClearAll}>
            Clear All ({ids.length})
          </button>
        )}
      </div>

      {ids.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◉</div>
          <div className="empty-text">
            No matched stealth addresses yet. The CRE workflow scans the chain
            and writes matches to this contract.
          </div>
        </div>
      ) : (
        ids.map((id, i) => (
          <div key={`${id}-${i}`} className="notification-item">
            <span className="notification-icon">◉</span>
            <div className="notification-content">
              <div
                className="notification-id"
                title="Click to copy"
                style={{ cursor: 'pointer' }}
                onClick={() => navigator.clipboard.writeText(id)}
              >
                {id}
              </div>
              <div className="notification-time">{parseTimestamp(id)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

interface NotificationsPageProps {
  onCountChange: (n: number) => void
}

export default function NotificationsPage({ onCountChange }: NotificationsPageProps) {
  return (
    <ErrorBoundary>
      <NotificationsContent onCountChange={onCountChange} />
    </ErrorBoundary>
  )
}
