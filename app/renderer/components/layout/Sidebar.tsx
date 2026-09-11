'use client'
import { useState } from 'react'
import type { RailId, Team, DMMessage, CallLogEntry } from '@/lib/types'

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
  members: Array<{ name: string; address: string }>
  onToggleTeam: (id: string) => void
  onSelectChannel: (teamId: string, channelId: string) => void
  onSelectDM: (id: string) => void
  onJoinVoice: (teamId: string) => void
  onToggleMic: () => void
  onLeaveVoice: () => void
  onOpenCreate: () => void
  onOpenNewDM: () => void
  onOpenPalette: () => void
  isAdmin: boolean
  onEnrollMember: () => void
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
                const initials = id === 'me' ? 'Me' : (id || '?').slice(0, 2).toUpperCase()
                const displayName = id === 'me' ? 'You' : id
                const muted = id === 'me' ? !mic : false
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 8px 3px 27px' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, background: '#eae9e9', color: '#444141', fontSize: 9, fontWeight: 600, borderRadius: 2 }}>{initials}</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(32,30,29,.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{displayName}</span>
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
  if (!id) return null
  const initials = (id || '?').slice(0, 2).toUpperCase()
  const last = dmData[dmData.length - 1]
  const preview = last ? (last.mine ? 'You: ' : '') + last.text : ''
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer', width: '100%' }}>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 28, height: 28, background: '#eae9e9', color: '#444141', fontSize: 11, fontWeight: 600, borderRadius: 2 }}>
        {initials}
        <span style={{ position: 'absolute', right: -2, bottom: -2, width: 8, height: 8, background: '#9b9797', border: '2px solid #f3f2f2', borderRadius: '50%' }}></span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{id}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(32,30,29,.68)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</span>
      </span>
      <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)' }}>{last?.time || ''}</span>
    </button>
  )
}

function CallLogItem({ entry }: { entry: CallLogEntry }) {
  const icon = entry.dir === 'in' ? 'ph-phone-incoming' : entry.dir === 'out' ? 'ph-phone-outgoing' : 'ph-phone-x'
  const color = entry.dir === 'missed' ? '#aa0b56' : '#006786'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', width: '100%' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, color }}></i>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: entry.dir === 'missed' ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
        <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.68)' }}>{entry.meta}</span>
      </span>
      <span style={{ fontSize: 11, color: 'rgba(32,30,29,.62)' }}>{entry.time}</span>
    </div>
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


export default function Sidebar(props: SidebarProps) {
  const { rail, teams, teamOpen, activeTeam, activeChannel, activeDM, joinedVoice, voiceTeam, mic, dmOrder, dms, callLog, members, isAdmin } = props

  const titles: Record<RailId, string> = { teams: 'Teams', chat: 'Direct Messages', calls: 'Calls', members: 'Members' }
  const [leaveHover, setLeaveHover] = useState(false)

  // Voice status bar data
  const voiceTm = teams.find(t => t.id === voiceTeam)
  const roomName = voiceTm?.voice?.name || ''
  const peerCount = (voiceTm?.voice?.people.length || 0) + 1

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f2f2', borderRight: '1px solid rgba(32,30,29,.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 8px' }}>
        <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-.01em', flex: 1 }}>{titles[rail]}</h4>
        {rail === 'teams' && <HoverIconBtn icon="ph-plus" title="New channel" onClick={props.onOpenCreate} hoverBg="rgba(32,30,29,.07)" hoverColor="#0088b0" />}
        {rail === 'chat' && <HoverIconBtn icon="ph-plus" title="New DM" onClick={props.onOpenNewDM} hoverBg="rgba(32,30,29,.07)" hoverColor="#0088b0" />}
        {(rail === 'teams' || rail === 'chat') && <HoverIconBtn icon="ph-funnel" title="Filter" onClick={props.onOpenPalette} hoverBg="rgba(32,30,29,.07)" hoverColor="#0088b0" />}
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

        {rail === 'members' && (
          <div>
            {isAdmin && (
              <button
                onClick={props.onEnrollMember}
                style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '8px 8px', marginBottom: 10, background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <i className="ph-duotone ph-user-plus" style={{ fontSize: 15 }} />
                Enroll member
              </button>
            )}
            {members.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(32,30,29,.5)', padding: '12px 8px' }}>No members enrolled yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {members.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: '#eae9e9', color: '#444141', fontSize: 11, fontWeight: 600, borderRadius: 2, flexShrink: 0 }}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'rgba(32,30,29,.55)', fontFamily: 'ui-monospace,Menlo,monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.address.slice(0, 10)}…</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
