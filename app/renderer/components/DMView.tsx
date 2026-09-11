import React, { useState } from 'react'
import { MOCK_DMS } from './Sidebar'

interface DMMessage {
  id: string
  text: string
  self: boolean
  time: string
}

const DM_DATA: Record<string, DMMessage[]> = {
  alice: [
    { id: '1', text: 'Hey! Can you review the DHT patch?', self: false, time: '9:45 AM' },
    { id: '2', text: 'Sure, sending it now.', self: true, time: '9:47 AM' },
    { id: '3', text: 'Thanks! Also the Tor fallback looks off — port binding fails on restart.', self: false, time: '9:50 AM' },
    { id: '4', text: 'I\'ll check the socket cleanup. Probably a leaked handle.', self: true, time: '9:52 AM' },
  ],
  bob: [
    { id: '1', text: 'Did you see the CI failure on feature/noise?', self: false, time: 'Yesterday' },
    { id: '2', text: 'Yeah, it\'s the test timeout on slow machines. Will bump the limit.', self: true, time: 'Yesterday' },
    { id: '3', text: 'OK, let me know when it\'s fixed.', self: false, time: 'Yesterday' },
  ],
  carol: [
    { id: '1', text: 'Deployment went smooth!', self: false, time: 'Mon' },
    { id: '2', text: 'Great work everyone 🎉', self: true, time: 'Mon' },
  ],
}

interface Props {
  dmId: string
}

export default function DMView({ dmId }: Props) {
  const [draft, setDraft] = useState('')
  const [msgs, setMsgs] = useState<DMMessage[]>(DM_DATA[dmId] ?? [])
  const contact = MOCK_DMS.find(d => d.id === dmId)

  const presenceColor = (s: string) =>
    s === 'online' ? '#22c55e' : s === 'away' ? '#f59e0b' : s === 'busy' ? '#ef4444' : 'var(--border-strong)'

  const send = () => {
    if (!draft.trim()) return
    setMsgs(prev => [...prev, {
      id: `dm${Date.now()}`,
      text: draft.trim(),
      self: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    setDraft('')
  }

  if (!contact) return null

  return (
    <div className="main-area">
      {/* DM header */}
      <div className="view-header">
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#cbeeff', color: '#004961',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, flexShrink: 0,
        }}>
          {contact.name[0]}
        </div>
        <div
          style={{
            width: 9, height: 9, borderRadius: '50%',
            background: presenceColor(contact.status),
            marginLeft: -10, marginBottom: -10, flexShrink: 0,
          }}
        />
        <div>
          <div className="view-header-title">{contact.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
            {contact.handle}
          </div>
        </div>
        <div className="view-header-spacer" />
        <button className="view-header-btn"><i className="ph-duotone ph-phone-duotone" /> Audio</button>
        <button className="view-header-btn"><i className="ph-duotone ph-video-camera-duotone" /> Video</button>
        <button className="view-header-btn"><i className="ph-duotone ph-info-duotone" /></button>
      </div>

      {/* Noise banner */}
      <div className="noise-banner">
        <i className="ph-duotone ph-shield-check-duotone" />
        <span>End-to-end encrypted · Noise_XX · Routing via Tor hidden service</span>
      </div>

      <div className="dm-message-list">
        {msgs.map(m => (
          <div key={m.id} className={`dm-bubble-wrap ${m.self ? 'self' : 'other'}`}>
            <div className={`dm-bubble ${m.self ? 'self' : 'other'}`}>{m.text}</div>
            <div className="dm-bubble-time">{m.time}</div>
          </div>
        ))}
      </div>

      <div className="composer">
        <textarea
          className="composer-textarea"
          rows={2}
          placeholder={`Message ${contact.name}`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <div className="composer-toolbar">
          <button className="composer-tool-btn"><i className="ph-duotone ph-paperclip-duotone" /></button>
          <button className="composer-tool-btn"><i className="ph-duotone ph-at-duotone" /></button>
          <button className="composer-tool-btn"><i className="ph-duotone ph-text-aa-duotone" /></button>
          <span className="composer-hint">enter to send</span>
          <button className="composer-send-btn" onClick={send} disabled={!draft.trim()}>
            <i className="ph-duotone ph-paper-plane-right-duotone" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
