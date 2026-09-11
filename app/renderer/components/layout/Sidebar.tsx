'use client'
import { useState } from 'react'
import type { RailId, Team, DMMessage, CallLogEntry } from '@/lib/types'
import { people } from '@/lib/mockData'

interface SidebarProps {
  rail: RailId
  teams: Team[]
  teamOpen: Record<string, boolean>
  activeTeam: string
  activeChannel: string
  activeDM: string
  joinedVoice: boolean
  voiceTeam: string | null
  mic: boolean
  dmOrder: string[]
  dms: Record<string, DMMessage[]>
  callLog: CallLogEntry[]
  filesScope: string
  activityScope: string
  onToggleTeam: (id: string) => void
  onSelectChannel: (teamId: string, channelId: string) => void
  onSelectDM: (id: string) => void
  onJoinVoice: (teamId: string) => void
  onToggleMic: () => void
  onLeaveVoice: () => void
  onOpenCreate: () => void
  onOpenPalette: () => void
  onSetFilesScope: (s: string) => void
  onSetActivityScope: (s: string) => void
}

// Sub-components to keep hooks outside loops

function ChannelItem({ ch, isActive, onClick }: { ch: Team['channels'][0]; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const icon = ch.kind === 'private' ? 'ph-lock-simple' : ch.kind === 'announcement' ? 'ph-megaphone' : 'ph-hash'
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', color: isActive ? '#004961' : 'rgba(32,30,29,.86)', cursor: 'pointer', width: '100%' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 14, opacity: 0.85 }}></i>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: (isActive || ch.unread > 0) ? 600 : 400 }}>{ch.name}</span>
      {ch.unread > 0 && (
        <span style={{ minWidth: 17, padding: '0 5px', background: '#d6006c', color: '#fff', fontSize: 9.5, fontWeight: 600, borderRadius: 9, textAlign: 'center', lineHeight: '16px' }}>{ch.unread}</span>
      )}
    </button>
  )
}

function VoiceRoomItem({ name, count, inThisVoice, onClick }: { name: string; count: string; inThisVoice: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '5px 8px', borderRadius: 2, textAlign: 'left', color: inThisVoice ? '#004961' : 'rgba(32,30,29,.86)', background: hover ? 'rgba(0,136,176,.09)' : 'transparent', cursor: 'pointer' }}>
      <i className="ph-duotone ph-microphone-stage" style={{ fontSize: 14 }}></i>
      <span style={{ flex: 1, fontSize: 13.5 }}>{name}</span>
      <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5 }}>{count}</span>
    </button>
  )
}

function TeamRow({ tm, isOpen, activeTeam, activeChannel, joinedVoice, voiceTeam, mic, onToggle, onSelectChannel, onJoinVoice }: {
  tm: Team; isOpen: boolean; activeTeam: string; activeChannel: string; joinedVoice: boolean; voiceTeam: string | null; mic: boolean;
  onToggle: () => void; onSelectChannel: (cid: string) => void; onJoinVoice: () => void;
}) {
  const [hover, setHover] = useState(false)
  const inThisVoice = joinedVoice && voiceTeam === tm.id
  const voiceCount = tm.voice ? ((tm.voice.people.length + (inThisVoice ? 1 : 0)) + '/6') : ''

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={onToggle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 6px', borderRadius: 2, textAlign: 'left', background: hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, background: tm.tint, color: tm.ink, fontSize: 10.5, fontWeight: 600, borderRadius: 2 }}>{tm.initials}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{tm.name}</span>
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.62)' }}>{tm.members}</span>
        <i className={`ph-duotone ${isOpen ? 'ph-caret-down' : 'ph-caret-right'}`} style={{ fontSize: 13, color: 'rgba(32,30,29,.6)' }}></i>
      </button>
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '3px 0 0 6px', paddingLeft: 6, borderLeft: '1px solid rgba(32,30,29,.1)' }}>
          {tm.channels.map(ch => (
            <ChannelItem key={ch.id} ch={ch} isActive={activeTeam === tm.id && activeChannel === ch.id} onClick={() => onSelectChannel(ch.id)} />
          ))}
          {tm.voice && (
            <div style={{ marginTop: 6 }}>
              <VoiceRoomItem name={tm.voice.name} count={voiceCount} inThisVoice={inThisVoice} onClick={onJoinVoice} />
              {tm.voice.people.concat(inThisVoice ? ['me'] : []).map(id => {
                const p = people[id] || people.me
                const muted = id === 'me' ? !mic : id === 'arjun'
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 8px 3px 27px' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, background: p.tint, color: p.ink, fontSize: 9, fontWeight: 600, borderRadius: 2 }}>{p.initials}</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(32,30,29,.78)' }}>{id === 'me' ? 'You' : p.name}</span>
                    <i className={`ph-duotone ${muted ? 'ph-microphone-slash' : 'ph-microphone'}`} style={{ fontSize: 12, color: muted ? '#aa0b56' : '#006786' }}></i>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DMItem({ id, dmData, isActive, onClick }: { id: string; dmData: DMMessage[]; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const p = people[id]
  if (!p) return null
  const last = dmData[dmData.length - 1]
  const preview = last ? (last.mine ? 'You: ' : '') + last.text : ''
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer', width: '100%' }}>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 28, height: 28, background: p.tint, color: p.ink, fontSize: 11, fontWeight: 600, borderRadius: 2 }}>
        {p.initials}
        <span style={{ position: 'absolute', right: -2, bottom: -2, width: 8, height: 8, background: p.presence, border: '2px solid #f3f2f2', borderRadius: '50%' }}></span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(32,30,29,.68)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</span>
      </span>
      <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)' }}>{last?.time || ''}</span>
    </button>
  )
}

function CallLogItem({ entry }: { entry: CallLogEntry }) {
  const [hover, setHover] = useState(false)
  const icon = entry.dir === 'in' ? 'ph-phone-incoming' : entry.dir === 'out' ? 'ph-phone-outgoing' : 'ph-phone-x'
  const color = entry.dir === 'missed' ? '#aa0b56' : '#006786'
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', background: hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer', width: '100%' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, color }}></i>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: entry.dir === 'missed' ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
        <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.68)' }}>{entry.meta}</span>
      </span>
      <span style={{ fontSize: 11, color: 'rgba(32,30,29,.62)' }}>{entry.time}</span>
    </button>
  )
}

function NavScopeItem({ id, label, icon, count, isActive, onClick }: { id: string; label: string; icon: string; count?: string; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer', width: '100%' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, opacity: 0.85 }}></i>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: isActive ? 600 : 400 }}>{label}</span>
      {count && <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)' }}>{count}</span>}
    </button>
  )
}

function ActivityNavItem({ id, label, icon, count, isActive, onClick }: { id: string; label: string; icon: string; count?: string; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer', width: '100%' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, opacity: 0.85 }}></i>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: isActive ? 600 : 400 }}>{label}</span>
      {count && <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: '#aa0b56' }}>{count}</span>}
    </button>
  )
}

function HoverIconBtn({ icon, title, onClick, hoverBg, hoverColor }: { icon: string; title?: string; onClick?: () => void; hoverBg: string; hoverColor: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: hover ? hoverColor : 'rgba(32,30,29,.7)', background: hover ? hoverBg : 'transparent', cursor: 'pointer' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 15 }}></i>
    </button>
  )
}

const FILE_NAV = [
  { id: 'channel', label: 'This channel',  icon: 'ph-hash',                    count: '6'  },
  { id: 'recent',  label: 'Recent',         icon: 'ph-clock-counter-clockwise', count: '18' },
  { id: 'shared',  label: 'Shared with me', icon: 'ph-users-three',             count: '9'  },
  { id: 'pinned',  label: 'Pinned',          icon: 'ph-push-pin',               count: '2'  },
]

const ACTIVITY_NAV = [
  { id: 'all',      label: 'All activity',  icon: 'ph-stack',     count: '4' },
  { id: 'mentions', label: 'Mentions',      icon: 'ph-at',        count: '2' },
  { id: 'invites',  label: 'Invites',       icon: 'ph-user-plus', count: '1' },
  { id: 'calls',    label: 'Missed calls',  icon: 'ph-phone-x',   count: '1' },
]

export default function Sidebar(props: SidebarProps) {
  const { rail, teams, teamOpen, activeTeam, activeChannel, activeDM, joinedVoice, voiceTeam, mic, dmOrder, dms, callLog, filesScope, activityScope } = props

  const titles: Record<RailId, string> = { teams: 'Teams', chat: 'Chat', calls: 'Calls', files: 'Files', activity: 'Activity', meet: 'Meet' }
  const [micHover, setMicHover] = useState(false)
  const [leaveHover, setLeaveHover] = useState(false)

  // Voice status bar data
  const voiceTm = teams.find(t => t.id === voiceTeam)
  const roomName = voiceTm?.voice?.name || ''
  const peerCount = (voiceTm?.voice?.people.length || 0) + 1

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f2f2', borderRight: '1px solid rgba(32,30,29,.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 8px' }}>
        <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-.01em', flex: 1 }}>{titles[rail]}</h4>
        <HoverIconBtn icon="ph-plus" title="New channel" onClick={props.onOpenCreate} hoverBg="rgba(32,30,29,.07)" hoverColor="#0088b0" />
        <HoverIconBtn icon="ph-funnel" title="Filter" onClick={props.onOpenPalette} hoverBg="rgba(32,30,29,.07)" hoverColor="#0088b0" />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 8px 12px' }}>
        {rail === 'teams' && teams.map(tm => (
          <TeamRow
            key={tm.id}
            tm={tm}
            isOpen={!!teamOpen[tm.id]}
            activeTeam={activeTeam}
            activeChannel={activeChannel}
            joinedVoice={joinedVoice}
            voiceTeam={voiceTeam}
            mic={mic}
            onToggle={() => props.onToggleTeam(tm.id)}
            onSelectChannel={cid => props.onSelectChannel(tm.id, cid)}
            onJoinVoice={() => props.onJoinVoice(tm.id)}
          />
        ))}

        {rail === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dmOrder.map(id => (
              <DMItem key={id} id={id} dmData={dms[id] || []} isActive={activeDM === id} onClick={() => props.onSelectDM(id)} />
            ))}
          </div>
        )}

        {rail === 'calls' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {callLog.map((k, i) => <CallLogItem key={i} entry={k} />)}
          </div>
        )}

        {rail === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FILE_NAV.map(f => (
              <NavScopeItem key={f.id} {...f} isActive={filesScope === f.id} onClick={() => props.onSetFilesScope(f.id)} />
            ))}
          </div>
        )}

        {rail === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ACTIVITY_NAV.map(a => (
              <ActivityNavItem key={a.id} {...a} isActive={activityScope === a.id} onClick={() => props.onSetActivityScope(a.id)} />
            ))}
          </div>
        )}
      </div>

      {joinedVoice && (
        <div style={{ margin: '0 8px 10px', padding: '9px 10px', background: '#e9f8ff', borderRadius: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ph-duotone ph-microphone-stage" style={{ fontSize: 15, color: '#006786' }}></i>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#004961' }}>{roomName}</span>
            <span style={{ width: 7, height: 7, background: '#0088b0', borderRadius: '50%', animation: 'wv-pulse 2s infinite' }}></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            <span style={{ flex: 1, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: '#006786' }}>tor · opus · {peerCount} peers</span>
            <button
              onClick={props.onToggleMic}
              onMouseEnter={() => setMicHover(true)}
              onMouseLeave={() => setMicHover(false)}
              title="Mute"
              style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: mic ? '#006786' : '#aa0b56', background: mic ? 'transparent' : 'rgba(214,0,108,.1)', cursor: 'pointer' }}>
              <i className={`ph-duotone ${mic ? 'ph-microphone' : 'ph-microphone-slash'}`} style={{ fontSize: 15 }}></i>
            </button>
            <button
              onClick={props.onLeaveVoice}
              onMouseEnter={() => setLeaveHover(true)}
              onMouseLeave={() => setLeaveHover(false)}
              title="Disconnect"
              style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: '#aa0b56', background: leaveHover ? 'rgba(214,0,108,.12)' : 'transparent', cursor: 'pointer' }}>
              <i className="ph-duotone ph-phone-x" style={{ fontSize: 15 }}></i>
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
