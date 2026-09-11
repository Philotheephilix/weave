import React, { useState } from 'react'

interface Message {
  id: string
  authorName: string
  authorHandle: string
  authorInitials: string
  authorColor: string
  authorInk: string
  text: string
  time: string
  reactions: { emoji: string; count: number; mine?: boolean }[]
  hasFile?: boolean
  fileName?: string
  isAgent?: boolean
}

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    authorName: 'Alice',
    authorHandle: 'alice.weave.eth',
    authorInitials: 'AL',
    authorColor: '#cbeeff',
    authorInk: '#004961',
    text: 'Hey everyone, pushed the new transport layer. Tor fallback now works cleanly.',
    time: '10:02 AM',
    reactions: [{ emoji: '🚀', count: 3, mine: true }, { emoji: '👍', count: 2 }],
    hasFile: true,
    fileName: 'tor-transport-v2.patch',
  },
  {
    id: 'm2',
    authorName: 'Bob',
    authorHandle: 'bob.weave.eth',
    authorInitials: 'BO',
    authorColor: '#e9dcff',
    authorInk: '#4a1d96',
    text: 'Nice! The DHT put for ed25519 keys was blocking before. Does this fix that too?',
    time: '10:08 AM',
    reactions: [],
  },
  {
    id: 'm3',
    authorName: 'WeaveBot',
    authorHandle: 'bot.weave.eth',
    authorInitials: 'WB',
    authorColor: '#fce7f3',
    authorInk: '#831843',
    text: 'CI passed: 14/14 tests green. Coverage 87%.',
    time: '10:11 AM',
    reactions: [{ emoji: '✅', count: 1 }],
    isAgent: true,
  },
  {
    id: 'm4',
    authorName: 'Carol',
    authorHandle: 'carol.weave.eth',
    authorInitials: 'CA',
    authorColor: '#dcfce7',
    authorInk: '#14532d',
    text: 'Merged to main. Deploying to staging now. Keep an eye on the notification log.',
    time: '10:15 AM',
    reactions: [{ emoji: '🎉', count: 4, mine: true }],
  },
]

const CHANNELS: Record<string, { name: string; team: string }> = {
  'eng-general': { name: 'general', team: 'Engineering' },
  'eng-backend': { name: 'backend', team: 'Engineering' },
  'eng-ops':     { name: 'ops', team: 'Engineering' },
  'des-general': { name: 'general', team: 'Design' },
  'des-backend': { name: 'backend', team: 'Design' },
  'des-ops':     { name: 'ops', team: 'Design' },
}

interface Props {
  channelId: string
  threadOpen: boolean
  onToggleThread: () => void
  onOpenInvite: () => void
  onOpenMembers: () => void
}

export default function ChannelView({ channelId, threadOpen, onToggleThread, onOpenInvite, onOpenMembers }: Props) {
  const [tab, setTab] = useState<'posts' | 'files' | 'board'>('posts')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState(MOCK_MESSAGES)

  const ch = CHANNELS[channelId] ?? { name: 'general', team: 'Engineering' }

  const send = () => {
    if (!draft.trim()) return
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`,
      authorName: 'You',
      authorHandle: 'you.weave.eth',
      authorInitials: 'YO',
      authorColor: '#fef9c3',
      authorInk: '#713f12',
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
    }])
    setDraft('')
  }

  return (
    <div className="main-area" style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Channel header */}
        <div className="view-header">
          <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 600, marginRight: -2 }}>#</span>
          <span className="view-header-title">{ch.name}</span>
          <span className="view-header-muted">· {ch.team}</span>

          {/* Facepile */}
          <div className="facepile" style={{ marginLeft: 8 }}>
            {[{ c: '#cbeeff', k: '#004961', l: 'AL' },
              { c: '#e9dcff', k: '#4a1d96', l: 'BO' },
              { c: '#dcfce7', k: '#14532d', l: 'CA' }].map((a, i) => (
              <div key={i} className="facepile-avatar" style={{ background: a.c, color: a.k }}>{a.l}</div>
            ))}
          </div>

          <div className="view-header-spacer" />
          <button className="view-header-btn primary" onClick={() => {}}>
            <i className="ph-duotone ph-video-camera-duotone" /> Meet now
          </button>
          <button className="view-header-btn" onClick={onOpenInvite}>
            <i className="ph-duotone ph-user-plus-duotone" /> Invite
          </button>
          <button className="view-header-btn" onClick={onOpenMembers}>
            <i className="ph-duotone ph-users-duotone" /> Members
          </button>
          <button className="view-header-btn" onClick={() => {}}>
            <i className="ph-duotone ph-dots-three-vertical-duotone" />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-row">
          {(['posts', 'files', 'board'] as const).map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div className="noise-chip">
            <i className="ph-duotone ph-lock-key-duotone" />
            noise_xx
          </div>
        </div>

        {/* Noise banner */}
        <div className="noise-banner">
          <i className="ph-duotone ph-shield-check-duotone" />
          <span>End-to-end encrypted · Noise_XX handshake · All messages transit via Tor</span>
        </div>

        {tab === 'posts' && (
          <>
            <div className="message-list">
              {messages.map(msg => (
                <div key={msg.id} className="message-row">
                  <div className="msg-avatar" style={{ background: msg.authorColor, color: msg.authorInk }}>
                    {msg.authorInitials}
                  </div>
                  <div className="msg-body">
                    <div className="msg-meta">
                      <span className="msg-name">{msg.authorName}</span>
                      <span className="msg-handle">{msg.authorHandle}</span>
                      {msg.isAgent && <span className="msg-agent-badge">agent</span>}
                      <span className="msg-time">{msg.time}</span>
                    </div>
                    <div className="msg-text">{msg.text}</div>
                    {msg.hasFile && (
                      <div className="msg-file-card">
                        <i className="ph-duotone ph-file-code-duotone" />
                        <span>{msg.fileName}</span>
                      </div>
                    )}
                    {msg.reactions.length > 0 && (
                      <div className="msg-reactions">
                        {msg.reactions.map((r, i) => (
                          <button key={i} className={`reaction-btn${r.mine ? ' mine' : ''}`}>
                            {r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="msg-actions">
                      <button className="msg-action-btn">✓ Acknowledge</button>
                      <button className="msg-action-btn" onClick={onToggleThread}>
                        <i className="ph-duotone ph-chats-duotone" /> Reply in thread
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="composer">
              <textarea
                className="composer-textarea"
                rows={2}
                placeholder={`Message #${ch.name}`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              />
              <div className="composer-toolbar">
                <button className="composer-tool-btn" title="Attach file">
                  <i className="ph-duotone ph-paperclip-duotone" />
                </button>
                <button className="composer-tool-btn" title="Mention">
                  <i className="ph-duotone ph-at-duotone" />
                </button>
                <button className="composer-tool-btn" title="Format">
                  <i className="ph-duotone ph-text-aa-duotone" />
                </button>
                <button className="composer-tool-btn" title="Call">
                  <i className="ph-duotone ph-phone-call-duotone" />
                </button>
                <span className="composer-hint">enter to send</span>
                <button className="composer-send-btn" onClick={send} disabled={!draft.trim()}>
                  <i className="ph-duotone ph-paper-plane-right-duotone" /> Send
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'files' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            No files in #{ch.name} yet.
          </div>
        )}

        {tab === 'board' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            Board view coming soon.
          </div>
        )}
      </div>

      {/* Thread panel */}
      {threadOpen && (
        <div className="thread-panel">
          <div className="thread-panel-header">
            <span className="thread-panel-title">Thread</span>
            <div style={{ flex: 1 }} />
            <button className="view-header-btn" onClick={onToggleThread}>✕</button>
          </div>
          <div className="message-list">
            <div className="message-row">
              <div className="msg-avatar" style={{ background: '#cbeeff', color: '#004961' }}>AL</div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-name">Alice</span>
                  <span className="msg-time">10:02 AM</span>
                </div>
                <div className="msg-text">Hey everyone, pushed the new transport layer.</div>
              </div>
            </div>
          </div>
          <div className="composer">
            <textarea className="composer-textarea" rows={2} placeholder="Reply in thread…" />
            <div className="composer-toolbar">
              <span className="composer-hint">enter to send</span>
              <button className="composer-send-btn">
                <i className="ph-duotone ph-paper-plane-right-duotone" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
