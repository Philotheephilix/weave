import React, { useState } from 'react'

interface Props {
  onClose: () => void
}

type ChannelType = 'standard' | 'private' | 'announcement'

export default function CreateChannel({ onClose }: Props) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<ChannelType>('standard')

  const canCreate = name.trim().length > 0

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box">
        <div className="modal-title">Create a channel</div>

        <label className="modal-label">Channel name</label>
        <input
          className="modal-input"
          placeholder="e.g. announcements"
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          autoFocus
        />

        <label className="modal-label">Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input
          className="modal-input"
          placeholder="What is this channel about?"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />

        <label className="modal-label">Channel type</label>
        <div className="modal-type-group">
          {(['standard', 'private', 'announcement'] as ChannelType[]).map(t => (
            <button
              key={t}
              className={`modal-type-btn${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'standard' && '# '}
              {t === 'private' && '🔒 '}
              {t === 'announcement' && '📢 '}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="modal-confirm-btn" disabled={!canCreate} onClick={onClose}>
            Create channel
          </button>
        </div>
      </div>
    </div>
  )
}
