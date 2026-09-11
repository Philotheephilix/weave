'use client'
import { useState, useEffect } from 'react'
import type { DMMessage } from '@/lib/types'
import { ensLabel, ensInitials, ensTint } from '@/lib/ens-display'
import { ipcPeerReachable } from '@/lib/ipc'
import MessageComposer from './MessageComposer'

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

export default function DMView({ dmId, messages, draft, onDraft, onSend, onStartAudioCall, onStartVideoCall, onOpenMembers }: DMViewProps) {
  const [presenceColor, setPresenceColor] = useState<string>('#9b9797')
  const [dmStatus, setDmStatus] = useState<string>(dmId === 'notes' ? 'Agent · scoped to 2 channels' : 'Direct message')
  const [fingerprint, setFingerprint] = useState<string | null>(null)

  useEffect(() => {
    if (dmId === 'notes') {
      setDmStatus('Agent · scoped to 2 channels')
      setPresenceColor('#9b9797')
      setFingerprint(null)
      return
    }
    setDmStatus('Direct message')
    setPresenceColor('#9b9797')
    setFingerprint(null)
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
      if (reachable) {
        setPresenceColor('#4caf50')
        setDmStatus('Online via Tor')
      } else {
        setPresenceColor('#9b9797')
        setDmStatus('Direct message')
      }
    }).catch(() => { /* Tor not available */ })
    return () => { cancelled = true }
  }, [dmId])

  const p = {
    name: ensLabel(dmId),
    initials: ensInitials(dmId),
    tint: ensTint(dmId),
    ink: '#444141',
    handle: dmId,
    presence: presenceColor,
  }
  const [audioHover, setAudioHover] = useState(false)
  const [videoHover, setVideoHover] = useState(false)
  const [infoHover, setInfoHover] = useState(false)

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
        <button onClick={onStartAudioCall} onMouseEnter={() => setAudioHover(true)} onMouseLeave={() => setAudioHover(false)} title="Audio call"
          style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, color: '#006786', background: audioHover ? 'rgba(0,136,176,.12)' : 'transparent', cursor: 'pointer' }}>
          <i className="ph-duotone ph-phone" style={{ fontSize: 19 }}></i>
        </button>
        <button onClick={onStartVideoCall} onMouseEnter={() => setVideoHover(true)} onMouseLeave={() => setVideoHover(false)} title="Video call"
          style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, color: '#006786', background: videoHover ? 'rgba(0,136,176,.12)' : 'transparent', cursor: 'pointer' }}>
          <i className="ph-duotone ph-video-camera" style={{ fontSize: 19 }}></i>
        </button>
        <button onClick={onOpenMembers} onMouseEnter={() => setInfoHover(true)} onMouseLeave={() => setInfoHover(false)} title="Details"
          style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: infoHover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}>
          <i className="ph-duotone ph-info" style={{ fontSize: 19 }}></i>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 8px' }}>
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
