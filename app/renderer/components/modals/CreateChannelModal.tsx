'use client'
import { useState } from 'react'
import type { ChannelKind } from '@/lib/types'

interface CreateChannelModalProps {
  teamName: string
  newName: string
  newDesc: string
  newKind: ChannelKind
  onNameChange: (v: string) => void
  onDescChange: (v: string) => void
  onKindChange: (k: ChannelKind) => void
  onCreate: () => void
  onClose: () => void
}

const KIND_OPTIONS: { id: ChannelKind; label: string; icon: string; note: string }[] = [
  { id: 'standard',     label: 'Standard',     icon: 'ph-hash',        note: 'Everyone in the team can find and join it.' },
  { id: 'private',      label: 'Private',      icon: 'ph-lock-simple', note: 'Invite only. Its history gossips between members and nobody else.' },
  { id: 'announcement', label: 'Announcement', icon: 'ph-megaphone',   note: 'Moderators post; members read and react.' },
]

export default function CreateChannelModal({ teamName, newName, newDesc, newKind, onNameChange, onDescChange, onKindChange, onCreate, onClose }: CreateChannelModalProps) {
  const [closeHover, setCloseHover] = useState(false)
  const [cancelHover, setCancelHover] = useState(false)
  const [createHover, setCreateHover] = useState(false)
  const [hoveredKind, setHoveredKind] = useState<ChannelKind | null>(null)
  const canCreate = newName.trim().length > 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(45,43,43,.5)', zIndex: 40 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px,100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: '#eae9e9', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.22)', animation: 'wv-rise .16s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>Create a channel</h4>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(32,30,29,.75)' }}>In {teamName}. Members gossip its history between themselves.</p>
          </div>
          <button onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: closeHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-x" style={{ fontSize: 16 }}></i>
          </button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'rgba(32,30,29,.75)' }}>Name</label>
          <input
            value={newName}
            onChange={e => onNameChange(e.target.value.replace(/\s+/g, '-').toLowerCase())}
            placeholder="brand-refresh"
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: '#f8f4f4', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, caretColor: '#0088b0', fontFamily: '"Source Serif 4", Georgia, serif' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'rgba(32,30,29,.75)' }}>Description</label>
          <input
            value={newDesc}
            onChange={e => onDescChange(e.target.value)}
            placeholder="What is this channel for?"
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: '#f8f4f4', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, caretColor: '#0088b0', fontFamily: '"Source Serif 4", Georgia, serif' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'rgba(32,30,29,.75)' }}>Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {KIND_OPTIONS.map(k => {
              const isActive = newKind === k.id
              const kHover = hoveredKind === k.id
              return (
                <button key={k.id} onClick={() => onKindChange(k.id)}
                  onMouseEnter={() => setHoveredKind(k.id)}
                  onMouseLeave={() => setHoveredKind(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: isActive ? '#e9f8ff' : '#f8f4f4', color: isActive ? '#004961' : '#201e1d', border: `1px solid ${isActive ? '#0088b0' : 'rgba(32,30,29,.16)'}`, borderRadius: 2, fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer' }}>
                  <i className={`ph-duotone ${k.icon}`} style={{ fontSize: 15 }}></i>{k.label}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'rgba(32,30,29,.75)' }}>
            {KIND_OPTIONS.find(k => k.id === newKind)?.note}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 4 }}>
          <button onClick={onClose}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{ fontWeight: 600, fontSize: 14, padding: '8px 14px', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: cancelHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onCreate}
            onMouseEnter={() => setCreateHover(true)}
            onMouseLeave={() => setCreateHover(false)}
            style={{ fontWeight: 600, fontSize: 14, padding: '8px 16px', background: canCreate ? (createHover ? '#1186ac' : '#0088b0') : '#d7d3d3', color: canCreate ? '#f3f2f2' : 'rgba(32,30,29,.6)', borderRadius: 2, cursor: 'pointer' }}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
