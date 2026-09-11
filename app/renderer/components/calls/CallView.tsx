'use client'
import { useState } from 'react'
import type { CallState, CallPanelId, CallMode } from '@/lib/types'
import { people } from '@/lib/mockData'

interface CallViewProps {
  call: CallState
  callMode: CallMode
  callPanel: CallPanelId
  mic: boolean
  cam: boolean
  hand: boolean
  captions: boolean
  rec: boolean
  tick: number
  callChat: { name: string; time: string; text: string }[]
  callDraft: string
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleShare: () => void
  onToggleHand: () => void
  onToggleCaptions: () => void
  onToggleRec: () => void
  onToggleCallPanel: () => void
  onSetCallPanel: (p: CallPanelId) => void
  onEndCall: () => void
  onCallDraft: (v: string) => void
  onSendCallChat: () => void
  onOpenInvite: () => void
}

function mkTile(id: string, mic: boolean, cam: boolean, hand: boolean, callMode: CallMode) {
  const p = people[id] || people.me
  const isMe = id === 'me'
  const muted = isMe ? !mic : id === 'arjun'
  const speaking = !isMe && id === 'maya' && callMode !== 'present'
  return {
    id,
    initials: p.initials,
    name: isMe ? 'You' : p.name,
    short: isMe ? 'You' : p.name.split(' ')[0],
    tint: p.tint,
    ink: p.ink,
    role: p.role,
    bg: isMe ? '#f8f4f4' : 'repeating-linear-gradient(135deg,#dedbdb 0 3px,#e8e6e6 3px 6px)',
    border: speaking ? '#0088b0' : 'rgba(32,30,29,.14)',
    mic: muted ? 'ph-microphone-slash' : 'ph-microphone',
    micColor: muted ? '#aa0b56' : '#006786',
    camIcon: (isMe ? cam : true) ? 'ph-video-camera' : 'ph-video-camera-slash',
    net: isMe ? 'tor · 1 hop' : 'tor · 3 hops',
    handShow: isMe && hand ? 'inline-flex' : 'none',
    speakShow: speaking ? 'block' : 'none',
  }
}

function formatTime(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function CallView(props: CallViewProps) {
  const { call, callMode, callPanel, mic, cam, hand, captions, rec, tick, callChat, callDraft } = props
  const secs = call.base + tick
  const timer = formatTime(secs)
  const mm = timer.split(':')[0], ss2 = timer.split(':')[1]
  const callPeople = call.people
  const tiles = callPeople.map(id => mkTile(id, mic, cam, hand, callMode))
  const [panelHover, setPanelHover] = useState(false)

  const controls = [
    { label: mic ? 'Mute' : 'Unmute', icon: mic ? 'ph-microphone' : 'ph-microphone-slash', on: !mic, act: props.onToggleMic },
    { label: cam ? 'Stop video' : 'Video', icon: cam ? 'ph-video-camera' : 'ph-video-camera-slash', on: cam, act: props.onToggleCam },
    { label: callMode === 'present' ? 'Stop share' : 'Share', icon: 'ph-screencast', on: callMode === 'present', act: props.onToggleShare },
    { label: 'Hand', icon: 'ph-hand-palm', on: hand, act: props.onToggleHand },
    { label: 'Captions', icon: 'ph-subtitles', on: captions, act: props.onToggleCaptions },
    { label: 'Record', icon: 'ph-record', on: rec, act: props.onToggleRec },
    { label: 'People', icon: 'ph-users', on: callPanel === 'people', act: () => props.onSetCallPanel('people') },
    { label: 'Chat', icon: 'ph-chat-teardrop-text', on: callPanel === 'chat', act: () => props.onSetCallPanel('chat') },
  ]

  const panelOpen = callPanel !== 'none'
  const callTabs: CallPanelId[] = ['people', 'chat']

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#eae9e9', animation: 'wv-rise .18s ease-out' }}>
      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Call header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', flexWrap: 'nowrap' }}>
          <span style={{ width: 9, height: 9, flexShrink: 0, background: '#0088b0', borderRadius: '50%', animation: 'wv-pulse 2s infinite' }}></span>
          <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{call.title}</span>
          <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: 'rgba(32,30,29,.75)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timer} · full mesh · {callPeople.length}/6 peers</span>
          {rec && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, letterSpacing: '.06em', padding: '3px 8px', background: '#fff1f4', color: '#aa0b56', borderRadius: 2 }}>rec · local</span>
          )}
          <div style={{ flex: 1 }}></div>
          <button
            onClick={props.onToggleCallPanel}
            onMouseEnter={() => setPanelHover(true)}
            onMouseLeave={() => setPanelHover(false)}
            title="Panel"
            style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 2, color: 'rgba(32,30,29,.75)', background: panelHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-sidebar-simple" style={{ fontSize: 17 }}></i>
          </button>
        </div>

        {/* Grid/Present area */}
        <div style={{ flex: 1, minHeight: 0, padding: '0 18px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {callMode === 'present' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1, minHeight: 180, background: 'repeating-linear-gradient(135deg,#dcd9d9 0 4px,#e6e4e4 4px 8px)', display: 'grid', placeItems: 'center', border: '1px solid rgba(32,30,29,.14)' }}>
                <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: 'rgba(32,30,29,.72)', textAlign: 'center' }}>shared screen — Maya Rao<br />&quot;Broadsheet · cover plates v2&quot;</span>
                <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, padding: '3px 7px', background: '#f3f2f2', color: '#006786', borderRadius: 2 }}>presenting · 1080p · vp8</span>
                <button onClick={props.onToggleShare} style={{ position: 'absolute', top: 8, right: 8, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', background: '#f3f2f2', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, cursor: 'pointer' }}>Stop sharing</button>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {tiles.map(t => (
                  <div key={t.id} style={{ position: 'relative', width: 132, height: 80, flexShrink: 0, background: t.bg, display: 'grid', placeItems: 'center', border: `1px solid ${t.border}` }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, background: t.tint, color: t.ink, fontSize: 11, fontWeight: 600, borderRadius: 2 }}>{t.initials}</span>
                    <span style={{ position: 'absolute', left: 5, bottom: 4, maxWidth: 'calc(100% - 28px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10.5, fontWeight: 600, background: 'rgba(243,242,242,.9)', padding: '1px 5px', borderRadius: 2 }}>{t.short}</span>
                    <i className={`ph-duotone ${t.mic}`} style={{ position: 'absolute', right: 5, bottom: 4, fontSize: 13, color: t.micColor }}></i>
                  </div>
                ))}
              </div>
            </div>
          )}
          {callMode === 'grid' && (
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gridAutoRows: 'minmax(120px,1fr)', gap: 10 }}>
              {tiles.map(t => (
                <div key={t.id} style={{ position: 'relative', background: t.bg, display: 'grid', placeItems: 'center', border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, background: t.tint, color: t.ink, fontSize: 17, fontWeight: 600, borderRadius: 2 }}>{t.initials}</span>
                  <span style={{ position: 'absolute', left: 8, bottom: 7, maxWidth: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(243,242,242,.92)', padding: '2px 8px', borderRadius: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                    <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9, color: 'rgba(32,30,29,.7)', whiteSpace: 'nowrap' }}>{t.net}</span>
                  </span>
                  <i className={`ph-duotone ${t.mic}`} style={{ position: 'absolute', right: 8, bottom: 7, fontSize: 15, color: t.micColor }}></i>
                  {t.handShow !== 'none' && (
                    <span style={{ display: 'inline-flex', position: 'absolute', right: 8, top: 8, alignItems: 'center', gap: 4, fontSize: 10.5, padding: '2px 7px', background: '#fff1f4', color: '#aa0b56', borderRadius: 2 }}>hand up</span>
                  )}
                  {t.speakShow !== 'none' && (
                    <span style={{ position: 'absolute', inset: 0, border: '2px solid #0088b0', pointerEvents: 'none' }}></span>
                  )}
                </div>
              ))}
            </div>
          )}
          {captions && (
            <div style={{ padding: '9px 12px', background: '#f8f4f4', borderLeft: '2px solid #0088b0' }}>
              <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: '#006786' }}>whisper.cpp · on-device</span>
              <p style={{ margin: '3px 0 0', fontSize: 14.5 }}>Maya: …so the plate offsets stay em-scaled, which means the fringes hold at any projection size.</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 18px 16px' }}>
          {controls.map((c, i) => {
            const [ctlHover, setCtlHover] = useState(false)
            return (
              <button key={i} onClick={c.act}
                onMouseEnter={() => setCtlHover(true)}
                onMouseLeave={() => setCtlHover(false)}
                title={c.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 58, padding: '7px 9px', borderRadius: 2, background: c.on ? '#e9f8ff' : ctlHover ? 'rgba(0,136,176,.14)' : 'transparent', color: c.on ? '#004961' : '#201e1d', border: `1px solid ${c.on ? '#0088b0' : 'rgba(32,30,29,.16)'}`, cursor: 'pointer' }}>
                <i className={`ph-duotone ${c.icon}`} style={{ fontSize: 20 }}></i>
                <span style={{ fontSize: 10.5, fontWeight: 600 }}>{c.label}</span>
              </button>
            )
          })}
          <button onClick={props.onEndCall}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 58, marginLeft: 10, padding: '7px 9px', borderRadius: 2, background: '#d6006c', color: '#fff', cursor: 'pointer' }}>
            <i className="ph-duotone ph-phone-x" style={{ fontSize: 20 }}></i>
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>Leave</span>
          </button>
        </div>
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div style={{ width: 312, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f2f2', borderLeft: '1px solid rgba(32,30,29,.12)' }}>
          <div style={{ display: 'flex', gap: 2, padding: '12px 12px 0' }}>
            {(['people', 'chat'] as CallPanelId[]).map(tab => {
              const [tHover, setTHover] = useState(false)
              const isActive = callPanel === tab
              return (
                <button key={tab} onClick={() => props.onSetCallPanel(tab)}
                  onMouseEnter={() => setTHover(true)}
                  onMouseLeave={() => setTHover(false)}
                  style={{ padding: '6px 11px 8px', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#004961' : 'rgba(32,30,29,.78)', boxShadow: `inset 0 -2px 0 0 ${isActive ? '#0088b0' : 'transparent'}`, cursor: 'pointer', background: 'transparent' }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            })}
          </div>

          {callPanel === 'people' && (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.7)', flex: 1 }}>full mesh · {callPeople.length}/6 peers</span>
                <button onClick={props.onOpenInvite} style={{ fontSize: 12.5, fontWeight: 600, color: '#006786', cursor: 'pointer', background: 'transparent' }}>Invite</button>
              </div>
              {tiles.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: t.tint, color: t.ink, fontSize: 10.5, fontWeight: 600, borderRadius: 2 }}>{t.initials}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                    <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9, color: 'rgba(32,30,29,.7)' }}>{t.role}</span>
                  </span>
                  <i className={`ph-duotone ${t.mic}`} style={{ fontSize: 15, color: t.micColor }}></i>
                  <i className={`ph-duotone ${t.camIcon}`} style={{ fontSize: 15, color: 'rgba(32,30,29,.6)' }}></i>
                </div>
              ))}
            </div>
          )}

          {callPanel === 'chat' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {callChat.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: 10, color: 'rgba(32,30,29,.66)' }}>{m.time}</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 13.5 }}>{m.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 12px 12px' }}>
                <div style={{ border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: '#f8f4f4' }}>
                  <textarea
                    value={callDraft}
                    onChange={e => props.onCallDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); props.onSendCallChat() } }}
                    placeholder="Message the meeting"
                    rows={2}
                    style={{ display: 'block', width: '100%', padding: '9px 10px 2px', border: 0, background: 'transparent', fontSize: 13.5, resize: 'none', caretColor: '#0088b0', minHeight: 46, fontFamily: '"Source Serif 4", Georgia, serif' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 7px 7px' }}>
                    <button onClick={props.onSendCallChat} style={{ fontWeight: 600, fontSize: 12.5, padding: '5px 11px', background: '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
