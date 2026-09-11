import React from 'react'

const MEMBERS = [
  { id: 'm1', name: 'Alice',   handle: 'alice.weave.eth',  role: 'owner',  status: 'Online',  bg: '#cbeeff', ink: '#004961' },
  { id: 'm2', name: 'Bob',     handle: 'bob.weave.eth',    role: 'member', status: 'Away',    bg: '#e9dcff', ink: '#4a1d96' },
  { id: 'm3', name: 'Carol',   handle: 'carol.weave.eth',  role: 'member', status: 'Offline', bg: '#fce7f3', ink: '#831843' },
  { id: 'm4', name: 'Dave',    handle: 'dave.weave.eth',   role: 'guest',  status: 'Online',  bg: '#dcfce7', ink: '#14532d' },
]

interface Props {
  onClose: () => void
}

export default function Members({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div className="modal-title">Members ({MEMBERS.length})</div>

        <table className="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Handle</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: m.bg, color: m.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, flexShrink: 0,
                    }}>
                      {m.name[0]}
                    </div>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                  {m.handle}
                </td>
                <td>
                  <span className={`role-badge role-${m.role}`}>
                    {m.role}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{m.status}</td>
                <td>
                  <button className="view-header-btn" style={{ padding: '3px 6px' }}>
                    <i className="ph-duotone ph-dots-three-vertical-duotone" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="modal-actions">
          <button className="modal-confirm-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
