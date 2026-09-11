import React, { useState } from 'react'

const SUGGESTIONS = ['alice.weave.eth', 'bob.weave.eth', 'carol.weave.eth', 'dave.weave.eth']

interface Props {
  onClose: () => void
}

export default function Invite({ onClose }: Props) {
  const [handle, setHandle] = useState('')
  const [invited, setInvited] = useState<string[]>([])
  const [role, setRole] = useState<'member' | 'guest'>('member')
  const [expiry, setExpiry] = useState('7')

  const add = (h: string) => {
    if (!invited.includes(h)) setInvited(prev => [...prev, h])
    setHandle('')
  }

  const remove = (h: string) => setInvited(prev => prev.filter(x => x !== h))

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div className="modal-title">Invite to workspace</div>

        <label className="modal-label">ENS handle</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            className="modal-input"
            style={{ marginBottom: 0, flex: 1 }}
            placeholder="handle.weave.eth"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && handle.trim()) add(handle.trim()) }}
          />
          <button
            className="modal-confirm-btn"
            disabled={!handle.trim()}
            onClick={() => add(handle.trim())}
            style={{ flexShrink: 0 }}
          >
            Add
          </button>
        </div>

        <div className="chips-row">
          {SUGGESTIONS.map(s => (
            <span
              key={s}
              className={`chip${invited.includes(s) ? ' active' : ''}`}
              onClick={() => invited.includes(s) ? remove(s) : add(s)}
            >
              {s}
            </span>
          ))}
        </div>

        {invited.length > 0 && (
          <>
            <label className="modal-label">Invited ({invited.length})</label>
            <div className="chips-row">
              {invited.map(h => (
                <span key={h} className="chip active" onClick={() => remove(h)}>
                  {h} ✕
                </span>
              ))}
            </div>
          </>
        )}

        <label className="modal-label">Role</label>
        <div className="modal-type-group" style={{ marginBottom: 14 }}>
          {(['member', 'guest'] as const).map(r => (
            <button
              key={r}
              className={`modal-type-btn${role === r ? ' active' : ''}`}
              onClick={() => setRole(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {role === 'guest' && (
          <>
            <label className="modal-label">Guest expiry (days)</label>
            <input
              className="modal-input"
              type="number"
              min={1}
              max={90}
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, marginTop: -10 }}>
              Guest access is issued as an ERC-1155 token with a time-locked expiry.
            </p>
          </>
        )}

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="modal-confirm-btn"
            disabled={invited.length === 0}
            onClick={onClose}
          >
            Send invite{invited.length > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
