'use client'
import { useState, useEffect, useRef } from 'react'
import type { DMMessage } from '@/lib/types'
import { ensLabel, ensInitials, ensTint } from '@/lib/ens-display'
import { ipcPeerReachable } from '@/lib/ipc'
import MessageComposer from './MessageComposer'

const OFFLINE_COLOR = '#9b9797'
const ONLINE_COLOR  = '#4caf50'
const AGENT_STATUS  = 'Agent · scoped to 2 channels'
const DM_STATUS     = 'Direct message'

interface DMViewProps {
  dmId: string
  messages: DMMessage[]
  draft: string
  onDraft: (v: string) => void
  onSend: () => void
  onStartAudioCall: () => void
  onStartVideoCall: () => void
  onOpenMembers: () => void
}

interface HeaderButtonProps {
  onClick: () => void
  title: string
  icon: string
  color: string
  hoverBg: string
}

function HeaderButton({ onClick, title, icon, color, hoverBg }: HeaderButtonProps) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title={title}
      style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, color, background: hover ? hoverBg : 'transparent', cursor: 'pointer' }}>
      <i className={`ph-duotone ${icon}`} style={{ fontSize: 19 }}></i>
    </button>
  )
}

export default function DMView({ dmId, messages, draft, onDraft, onSend, onStartAudioCall, onStartVideoCall, onOpenMembers }: DMViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [presenceColor, setPresenceColor] = useState<string>(OFFLINE_COLOR)
  const [dmStatus, setDmStatus] = useState<string>(dmId === 'notes' ? AGENT_STATUS : DM_STATUS)
  const [fingerprint, setFingerprint] = useState<string | null>(null)

  useEffect(() => {
    setPresenceColor(OFFLINE_COLOR)
    setFingerprint(null)
    if (dmId === 'notes') {
      setDmStatus(AGENT_STATUS)
      return
    }
    setDmStatus(DM_STATUS)
    let cancelled = false
    window.weave?.resolve(dmId).then((meta) => {
      if (cancelled || !meta) return
      if (meta.noisePub && meta.noisePub.length > 0) {
        const hex = Array.from(meta.noisePub).map((b: number) => b.toString(16).padStart(2, '0')).join('')
        setFingerprint(`${hex.slice(0, 4)}…${hex.slice(-4)}`)
      }
    }).catch(() => { /* peer not yet resolvable */ })
    // Probe Tor reachability (8s timeout inside IPC handler)
    ipcPeerReachable(dmId).then(({ reachable }) => {
      if (cancelled) return
      setPresenceColor(reachable ? ONLINE_COLOR : OFFLINE_COLOR)
      setDmStatus(reachable ? 'Online via Tor' : DM_STATUS)
    }).catch(() => { /* Tor not available */ })
    return () => { cancelled = true }
  }, [dmId])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const p = {
    name: ensLabel(dmId),
    initials: ensInitials(dmId),
    tint: ensTint(dmId),
    ink: '#444141',
    handle: dmId,
    presence: presenceColor,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px', borderBottom: '1px solid rgba(32,30,29,.1)' }}>
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 36, height: 36, background: p.tint, color: p.ink, fontSize: 13, fontWeight: 600, borderRadius: 2 }}>
          {p.initials}
          <span style={{ position: 'absolute', right: -3, bottom: -3, width: 10, height: 10, background: p.presence, border: '2px solid #f3f2f2', borderRadius: '50%' }}></span>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{p.name}</h4>
            <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.7)' }}>{p.handle}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(32,30,29,.72)' }}>{dmStatus}</div>
        </div>
        <HeaderButton onClick={onStartAudioCall} title="Audio call" icon="ph-phone" color="#006786" hoverBg="rgba(0,136,176,.12)" />
        <HeaderButton onClick={onStartVideoCall} title="Video call" icon="ph-video-camera" color="#006786" hoverBg="rgba(0,136,176,.12)" />
        <HeaderButton onClick={onOpenMembers} title="Details" icon="ph-info" color="rgba(32,30,29,.7)" hoverBg="rgba(32,30,29,.07)" />
      </div>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
          {fingerprint && (
            <div style={{ alignSelf: 'center', marginBottom: 6, padding: '5px 10px', background: '#e9f8ff', borderRadius: 2, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: '#004961', textAlign: 'center' }}>
              direct · noise_xx handshake verified · fingerprint {fingerprint}
            </div>
          )}
          {messages.map((m, i) => {
            const align = m.mine ? 'flex-end' : 'flex-start'
            return (
              <div key={i} style={{ alignSelf: align, maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: align }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.mine ? 'You' : p.name}</span>
                  <span style={{ fontSize: 10.5, color: 'rgba(32,30,29,.66)' }}>{m.time}</span>
                </div>
                <div style={{ padding: '9px 12px', background: m.mine ? '#e9f8ff' : '#eae9e9', color: m.mine ? '#004961' : '#201e1d', borderRadius: 2, fontSize: 14.5, lineHeight: 1.5 }}>{m.text}</div>
              </div>
            )
          })}
        </div>
      </div>
      <MessageComposer
        draft={draft}
        placeholder={`Message ${p.name}`}
        onDraft={onDraft}
        onSend={onSend}
        compact
      />
    </div>
  )
}
