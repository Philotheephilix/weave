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

function HoverButton({ children, style, hoverStyle, onClick, title }: { children: React.ReactNode; style: React.CSSProperties; hoverStyle: React.CSSProperties; onClick?: () => void; title?: string }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ ...style, ...(hover ? hoverStyle : {}) }}>
      {children}
    </button>
  )
}

export default function Sidebar(props: SidebarProps) {
  const { rail, teams, teamOpen, activeTeam, activeChannel, activeDM, joinedVoice, voiceTeam, mic, dmOrder, dms, callLog, filesScope, activityScope } = props

  const titles: Record<RailId, string> = { teams: 'Teams', chat: 'Chat', calls: 'Calls', files: 'Files', activity: 'Activity', meet: 'Meet' }

  const fileNav = [
    { id: 'channel', label: 'This channel',   icon: 'ph-hash',                count: '6'  },
    { id: 'recent',  label: 'Recent',          icon: 'ph-clock-counter-clockwise', count: '18' },
    { id: 'shared',  label: 'Shared with me',  icon: 'ph-users-three',         count: '9'  },
    { id: 'pinned',  label: 'Pinned',           icon: 'ph-push-pin',            count: '2'  },
  ]

  const activityNav = [
    { id: 'all',      label: 'All activity',  icon: 'ph-stack',    count: '4' },
    { id: 'mentions', label: 'Mentions',      icon: 'ph-at',       count: '2' },
    { id: 'invites',  label: 'Invites',       icon: 'ph-user-plus',count: '1' },
    { id: 'calls',    label: 'Missed calls',  icon: 'ph-phone-x',  count: '1' },
  ]

  const callDirIcon = (dir: string) => dir === 'in' ? 'ph-phone-incoming' : dir === 'out' ? 'ph-phone-outgoing' : 'ph-phone-x'
  const callDirColor = (dir: string) => dir === 'missed' ? '#aa0b56' : '#006786'

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f2f2', borderRight: '1px solid rgba(32,30,29,.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 8px' }}>
        <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-.01em', flex: 1 }}>{titles[rail]}</h4>
        <HoverButton onClick={props.onOpenCreate} title="New channel" style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: 'transparent', cursor: 'pointer' }} hoverStyle={{ background: 'rgba(32,30,29,.07)', color: '#0088b0' }}>
          <i className="ph-duotone ph-plus" style={{ fontSize: 16 }}></i>
        </HoverButton>
        <HoverButton onClick={props.onOpenPalette} title="Filter" style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: 'transparent', cursor: 'pointer' }} hoverStyle={{ background: 'rgba(32,30,29,.07)', color: '#0088b0' }}>
          <i className="ph-duotone ph-funnel" style={{ fontSize: 15 }}></i>
        </HoverButton>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 8px 12px' }}>

        {/* Team tree */}
        {rail === 'teams' && teams.map(tm => {
          const [teamHover, setTeamHover] = useState(false)
          const isOpen = !!teamOpen[tm.id]
          const currentVoiceCount = (tm.voice ? tm.voice.people.length + (joinedVoice && voiceTeam === tm.id ? 1 : 0) : 0)
          const inThisVoice = joinedVoice && voiceTeam === tm.id
          return (
            <div key={tm.id} style={{ marginBottom: 16 }}>
              <button
                onClick={() => props.onToggleTeam(tm.id)}
                onMouseEnter={() => setTeamHover(true)}
                onMouseLeave={() => setTeamHover(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 6px', borderRadius: 2, textAlign: 'left', background: teamHover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}
              >
                <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, background: tm.tint, color: tm.ink, fontSize: 10.5, fontWeight: 600, borderRadius: 2 }}>{tm.initials}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{tm.name}</span>
                <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.62)' }}>{tm.members}</span>
                <i className={`ph-duotone ${isOpen ? 'ph-caret-down' : 'ph-caret-right'}`} style={{ fontSize: 13, color: 'rgba(32,30,29,.6)' }}></i>
              </button>
              {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, margin: '3px 0 0 6px', paddingLeft: 6, borderLeft: '1px solid rgba(32,30,29,.1)' }}>
                  {tm.channels.map(ch => {
                    const isActive = activeTeam === tm.id && activeChannel === ch.id
                    const [chHover, setChHover] = useState(false)
                    const chIcon = ch.kind === 'private' ? 'ph-lock-simple' : ch.kind === 'announcement' ? 'ph-megaphone' : 'ph-hash'
                    return (
                      <button
                        key={ch.id}
                        onClick={() => props.onSelectChannel(tm.id, ch.id)}
                        onMouseEnter={() => setChHover(true)}
                        onMouseLeave={() => setChHover(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : chHover ? 'rgba(32,30,29,.06)' : 'transparent', color: isActive ? '#004961' : 'rgba(32,30,29,.86)', cursor: 'pointer' }}
                      >
                        <i className={`ph-duotone ${chIcon}`} style={{ fontSize: 14, opacity: 0.85 }}></i>
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: (isActive || ch.unread) ? 600 : 400 }}>{ch.name}</span>
                        {ch.unread > 0 && (
                          <span style={{ minWidth: 17, padding: '0 5px', background: '#d6006c', color: '#fff', fontSize: 9.5, fontWeight: 600, borderRadius: 9, textAlign: 'center', lineHeight: '16px' }}>{ch.unread}</span>
                        )}
                      </button>
                    )
                  })}
                  {tm.voice && (
                    <div style={{ marginTop: 6 }}>
                      {(() => {
                        const [vHover, setVHover] = useState(false)
                        return (
                          <button
                            onClick={() => props.onJoinVoice(tm.id)}
                            onMouseEnter={() => setVHover(true)}
                            onMouseLeave={() => setVHover(false)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '5px 8px', borderRadius: 2, textAlign: 'left', color: inThisVoice ? '#004961' : 'rgba(32,30,29,.86)', background: vHover ? 'rgba(0,136,176,.09)' : 'transparent', cursor: 'pointer' }}
                          >
                            <i className="ph-duotone ph-microphone-stage" style={{ fontSize: 14 }}></i>
                            <span style={{ flex: 1, fontSize: 13.5 }}>{tm.voice.name}</span>
                            <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5 }}>{currentVoiceCount}/6</span>
                          </button>
                        )
                      })()}
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
        })}

        {/* DM list */}
        {rail === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dmOrder.map(id => {
              const p = people[id]
              if (!p) return null
              const msgs = dms[id] || []
              const last = msgs[msgs.length - 1]
              const preview = last ? (last.mine ? 'You: ' : '') + last.text : ''
              const isActive = activeDM === id
              const [hover, setHover] = useState(false)
              return (
                <button key={id} onClick={() => props.onSelectDM(id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}>
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
            })}
          </div>
        )}

        {/* Calls list */}
        {rail === 'calls' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {callLog.map((k, i) => {
              const p = people[k.id] || people.me
              const [hover, setHover] = useState(false)
              return (
                <button key={i} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 2, textAlign: 'left', background: hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}>
                  <i className={`ph-duotone ${callDirIcon(k.dir)}`} style={{ fontSize: 16, color: callDirColor(k.dir) }}></i>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: k.dir === 'missed' ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.name}</span>
                    <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.68)' }}>{k.meta}</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(32,30,29,.62)' }}>{k.time}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Files nav */}
        {rail === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {fileNav.map(f => {
              const isActive = filesScope === f.id
              const [hover, setHover] = useState(false)
              return (
                <button key={f.id} onClick={() => props.onSetFilesScope(f.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}>
                  <i className={`ph-duotone ${f.icon}`} style={{ fontSize: 16, opacity: 0.85 }}></i>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: isActive ? 600 : 400 }}>{f.label}</span>
                  <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)' }}>{f.count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Activity nav */}
        {rail === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activityNav.map(a => {
              const isActive = activityScope === a.id
              const [hover, setHover] = useState(false)
              return (
                <button key={a.id} onClick={() => props.onSetActivityScope(a.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 2, textAlign: 'left', background: isActive ? '#e9f8ff' : hover ? 'rgba(32,30,29,.06)' : 'transparent', cursor: 'pointer' }}>
                  <i className={`ph-duotone ${a.icon}`} style={{ fontSize: 16, opacity: 0.85 }}></i>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: isActive ? 600 : 400 }}>{a.label}</span>
                  {a.count && <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: '#aa0b56' }}>{a.count}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Voice status bar */}
      {joinedVoice && (() => {
        const voiceTm = teams.find(t => t.id === voiceTeam)
        const roomName = voiceTm?.voice?.name || ''
        const peerCount = (voiceTm?.voice?.people.length || 0) + 1
        const [micHover, setMicHover] = useState(false)
        const [leaveHover, setLeaveHover] = useState(false)
        return (
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
                style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: mic ? '#006786' : '#aa0b56', background: mic ? 'transparent' : 'rgba(214,0,108,.1)', cursor: 'pointer' }}
              >
                <i className={`ph-duotone ${mic ? 'ph-microphone' : 'ph-microphone-slash'}`} style={{ fontSize: 15 }}></i>
              </button>
              <button
                onClick={props.onLeaveVoice}
                onMouseEnter={() => setLeaveHover(true)}
                onMouseLeave={() => setLeaveHover(false)}
                title="Disconnect"
                style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: '#aa0b56', background: leaveHover ? 'rgba(214,0,108,.12)' : 'transparent', cursor: 'pointer' }}
              >
                <i className="ph-duotone ph-phone-x" style={{ fontSize: 15 }}></i>
              </button>
            </div>
          </div>
        )
      })()}
    </aside>
  )
}
