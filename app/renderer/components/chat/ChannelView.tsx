'use client'
import { useState } from 'react'
import type { Message, Channel, Team, TabId } from '@/lib/types'
import { people, fileRows } from '@/lib/mockData'
import MessageList from './MessageList'
import MessageComposer from './MessageComposer'
import ThreadPanel from './ThreadPanel'

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

  const facepile = ['maya', 'arjun', 'priya', 'me'].map(id => people[id] || people.me)
  const threadMessage = threadId ? messages.find(m => m.id === threadId) : null

  const tabs: { id: TabId; label: string }[] = [
    { id: 'posts', label: 'Posts' },
    { id: 'files', label: 'Files' },
    { id: 'board', label: 'Whiteboard' },
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
              {facepile.map((p, i) => (
                <span key={i} style={{ display: 'grid', placeItems: 'center', width: 27, height: 27, marginLeft: i > 0 ? -5 : 0, background: p.tint, color: p.ink, fontSize: 10, fontWeight: 600, borderRadius: 2, boxShadow: '0 0 0 2px #f3f2f2' }}>{p.initials}</span>
              ))}
              <span style={{ marginLeft: 5, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10.5, color: 'rgba(32,30,29,.72)' }}>{team.members} members</span>
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
          {tabs.map(t => {
            const [tabHover, setTabHover] = useState(false)
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => props.onSetTab(t.id)}
                onMouseEnter={() => setTabHover(true)}
                onMouseLeave={() => setTabHover(false)}
                style={{ padding: '6px 12px 9px', fontSize: 13.5, fontWeight: isActive ? 600 : 400, color: isActive ? '#004961' : tabHover ? '#0088b0' : 'rgba(32,30,29,.78)', boxShadow: `inset 0 -2px 0 0 ${isActive ? '#0088b0' : 'transparent'}`, cursor: 'pointer', background: 'transparent' }}>
                {t.label}
              </button>
            )
          })}
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
              someoneTyping={ch.id === 'critique'}
              typingLabel="Maya is typing"
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
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Name', 'Shared by', 'CID', 'Size', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', padding: 10, borderBottom: '1px solid rgba(32,30,29,.14)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileRows.map((f, i) => (
                  <tr key={i}>
                    <td style={{ padding: 10, borderBottom: '1px solid rgba(32,30,29,.08)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <i className={`ph-duotone ${f.icon}`} style={{ fontSize: 18, color: '#006786' }}></i>
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                      </span>
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid rgba(32,30,29,.08)' }}>{f.by}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid rgba(32,30,29,.08)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: 'rgba(32,30,29,.72)' }}>{f.cid}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid rgba(32,30,29,.08)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11 }}>{f.size}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid rgba(32,30,29,.08)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, letterSpacing: '.04em', padding: '3px 7px', background: '#e9f8ff', color: '#004961', borderRadius: 2 }}>encrypted</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Board tab */}
        {tab === 'board' && (
          <div style={{ flex: 1, minHeight: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: '#006786' }}>yjs crdt · 3 cursors · version history local</span>
              <div style={{ flex: 1 }}></div>
              <button onClick={props.onStartCall} style={{ fontWeight: 600, fontSize: 13.5, padding: '6px 12px', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, cursor: 'pointer', background: 'transparent' }}>Present board</button>
            </div>
            <div style={{ flex: 1, minHeight: 220, display: 'grid', placeItems: 'center', background: 'repeating-linear-gradient(90deg,#eceaea 0 1px,#f3f2f2 1px 22px),repeating-linear-gradient(0deg,#eceaea 0 1px,#f3f2f2 1px 22px)', border: '1px solid rgba(32,30,29,.12)' }}>
              <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: 'rgba(32,30,29,.7)', textAlign: 'center' }}>whiteboard canvas<br />drop the Yjs board here</span>
            </div>
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
