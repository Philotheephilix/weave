import React, { useState, useEffect } from 'react'

interface CallTile {
  name: string
  initials: string
  bg: string
  ink: string
  muted: boolean
}

const TILES: CallTile[] = [
  { name: 'Alice', initials: 'AL', bg: '#cbeeff', ink: '#004961', muted: false },
  { name: 'You',   initials: 'YO', bg: '#fef9c3', ink: '#713f12', muted: true },
]

interface Props {
  onEnd: () => void
}

function useTimer() {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function CallOverlay({ onEnd }: Props) {
  const duration = useTimer()
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenOn, setScreenOn] = useState(false)

  return (
    <div className="call-overlay">
      <div className="call-overlay-header">
        <i className="ph-duotone ph-shield-check-duotone" style={{ color: '#22c55e', fontSize: 18 }} />
        <span className="call-overlay-name">Alice · Engineering</span>
        <span className="call-overlay-duration">{duration}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontFamily: 'var(--font-mono)' }}>
          Noise_XX · Tor
        </span>
      </div>

      <div className="call-video-grid">
        {TILES.map(t => (
          <div key={t.name} className="call-video-tile">
            <div className="call-tile-avatar" style={{ background: t.bg, color: t.ink }}>
              {t.initials}
            </div>
            <div className="call-tile-name">{t.name}</div>
            {t.muted && (
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,.4)', borderRadius: '50%',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ph-duotone ph-microphone-slash-duotone" style={{ color: '#ef4444', fontSize: 14 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="call-controls-bar">
        <button className={`call-ctrl-btn ${micOn ? 'active' : 'normal'}`} onClick={() => setMicOn(v => !v)} title="Microphone">
          <i className={`ph-duotone ${micOn ? 'ph-microphone-duotone' : 'ph-microphone-slash-duotone'}`} />
        </button>
        <button className={`call-ctrl-btn ${camOn ? 'active' : 'normal'}`} onClick={() => setCamOn(v => !v)} title="Camera">
          <i className={`ph-duotone ${camOn ? 'ph-video-camera-duotone' : 'ph-video-camera-slash-duotone'}`} />
        </button>
        <button className={`call-ctrl-btn ${screenOn ? 'active' : 'normal'}`} onClick={() => setScreenOn(v => !v)} title="Share screen">
          <i className="ph-duotone ph-monitor-duotone" />
        </button>
        <button className="call-ctrl-btn normal" title="Chat">
          <i className="ph-duotone ph-chat-dots-duotone" />
        </button>
        <button className="call-ctrl-btn normal" title="Raise hand">
          <i className="ph-duotone ph-hand-duotone" />
        </button>
        <button className="call-ctrl-btn danger" onClick={onEnd} title="End call">
          <i className="ph-duotone ph-phone-slash-duotone" />
        </button>
      </div>
    </div>
  )
}

interface RingingProps {
  onAccept: () => void
  onReject: () => void
}

export function RingingOverlay({ onAccept, onReject }: RingingProps) {
  return (
    <div className="ringing-overlay">
      <div className="ringing-modal">
        <div className="ringing-avatar" style={{ background: '#cbeeff', color: '#004961' }}>AL</div>
        <div className="ringing-name">Alice</div>
        <div className="ringing-sub">alice.weave.eth · Incoming encrypted call</div>
        <div className="ringing-actions">
          <button className="ringing-accept-btn" onClick={onAccept} title="Accept">
            <i className="ph-duotone ph-phone-duotone" />
          </button>
          <button className="ringing-reject-btn" onClick={onReject} title="Decline">
            <i className="ph-duotone ph-phone-slash-duotone" />
          </button>
        </div>
      </div>
    </div>
  )
}
