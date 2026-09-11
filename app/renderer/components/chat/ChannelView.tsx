'use client'
import { useState } from 'react'
import type { Message, Channel, Team, TabId } from '@/lib/types'

import MessageList from './MessageList'
import MessageComposer from './MessageComposer'
import ThreadPanel from './ThreadPanel'

function TabBtn({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '6px 12px 9px', fontSize: 13.5, fontWeight: isActive ? 600 : 400, color: isActive ? '#004961' : hover ? '#0088b0' : 'rgba(32,30,29,.78)', boxShadow: `inset 0 -2px 0 0 ${isActive ? '#0088b0' : 'transparent'}`, cursor: 'pointer', background: 'transparent' }}>
      {label}
    </button>
  )
}

interface ChannelViewProps {
  team: Team
  channel: Channel
  messages: Message[]
  tab: TabId
  draft: string
  threadId: string | null
  threadDraft: string
  density: 'comfortable' | 'compact'
  onSetTab: (t: TabId) => void
  onDraft: (v: string) => void
  onSend: () => void
  onToggleReaction: (id: string, glyph: string) => void
  onOpenThread: (id: string) => void
  onCloseThread: () => void
  onThreadDraft: (v: string) => void
  onSendThread: () => void
  onOpenMembers: () => void
  onOpenInvite: () => void
  onStartCall: () => void
  showPrivacy?: boolean
  scrollToBottom?: boolean
}

export default function ChannelView(props: ChannelViewProps) {
  const { team, channel, messages, tab, draft, threadId, threadDraft, density } = props
  const compact = density === 'compact'
  const rowGap = compact ? 2 : 6
  const rowPad = compact ? 4 : 7

  const ch = channel
  const chIcon = ch.kind === 'private' ? 'ph-lock-simple' : ch.kind === 'announcement' ? 'ph-megaphone' : 'ph-hash'
  const chTagBg = ch.kind === 'standard' ? '#eae7e7' : ch.kind === 'private' ? '#fff1f4' : '#e9f8ff'
  const chTagInk = ch.kind === 'standard' ? '#444141' : ch.kind === 'private' ? '#aa0b56' : '#004961'

  const threadMessage = threadId ? messages.find(m => m.id === threadId) : null

  const tabs: { id: TabId; label: string }[] = [
    { id: 'posts', label: 'Posts' },
    { id: 'files', label: 'Files' },
  ]

  const [meetNowHover, setMeetNowHover] = useState(false)
  const [inviteHover, setInviteHover] = useState(false)

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
        {/* Channel header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: '1 1 240px', minWidth: 0 }}>
            <i className={`ph-duotone ${chIcon}`} style={{ fontSize: 19, color: 'rgba(32,30,29,.6)' }}></i>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-.015em', whiteSpace: 'nowrap' }}>#{ch.name}</h3>
            <span style={{ fontSize: 11, letterSpacing: '.02em', padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap', background: chTagBg, color: chTagInk }}>{ch.kind}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={props.onOpenMembers} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'transparent' }} title="Members">
              <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10.5, color: 'rgba(32,30,29,.72)' }}>{team.members} members</span>
            </button>
            <button
              onClick={props.onStartCall}
              onMouseEnter={() => setMeetNowHover(true)}
              onMouseLeave={() => setMeetNowHover(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '7px 13px', background: meetNowHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
              <i className="ph-duotone ph-video-camera" style={{ fontSize: 16 }}></i>Meet now
            </button>
            <button
              onClick={props.onOpenInvite}
              onMouseEnter={() => setInviteHover(true)}
              onMouseLeave={() => setInviteHover(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '7px 13px', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, background: inviteHover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}>
              <i className="ph-duotone ph-user-plus" style={{ fontSize: 16 }}></i>Invite
            </button>
            <button onClick={props.onOpenMembers} title="Channel settings"
              style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 2, color: 'rgba(32,30,29,.7)', cursor: 'pointer', background: 'transparent' }}>
              <i className="ph-duotone ph-dots-three-outline" style={{ fontSize: 17 }}></i>
            </button>
          </div>
          <p style={{ flex: '1 1 100%', margin: 0, fontSize: 13, color: 'rgba(32,30,29,.72)', maxWidth: '76ch' }}>{ch.desc}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '10px 20px 0', marginTop: 8, borderBottom: '1px solid rgba(32,30,29,.1)' }}>
          {tabs.map(t => (
            <TabBtn key={t.id} label={t.label} isActive={tab === t.id} onClick={() => props.onSetTab(t.id)} />
          ))}
          <div style={{ flex: 1 }}></div>
          {props.showPrivacy && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, letterSpacing: '.04em', color: '#006786' }}>
              <i className="ph-duotone ph-lock-key" style={{ fontSize: 13 }}></i>noise_xx · gossip · no relay plaintext
            </span>
          )}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          <>
            <MessageList
              messages={messages}
              rowGap={rowGap}
              rowPad={rowPad}
              emptyTitle={`You created #${ch.name}`}
              onToggleReaction={props.onToggleReaction}
              onOpenThread={props.onOpenThread}
              onOpenInvite={props.onOpenInvite}
              scrollToBottom={props.scrollToBottom}
            />
            <MessageComposer
              draft={draft}
              placeholder={`Message #${ch.name}`}
              onDraft={props.onDraft}
              onSend={props.onSend}
              onStartCall={props.onStartCall}
            />
          </>
        )}

        {/* Files tab */}
        {tab === 'files' && (
          <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: '18px 20px' }}>
            <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'rgba(32,30,29,.5)' }}>File sharing coming soon</span>
          </div>
        )}
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          draft={threadDraft}
          onDraftChange={props.onThreadDraft}
          onSendReply={props.onSendThread}
          onClose={props.onCloseThread}
        />
      )}
    </div>
  )
}
