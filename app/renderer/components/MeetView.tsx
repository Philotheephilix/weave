import React, { useState } from 'react'

const MEETINGS = [
  {
    id: 'mt1',
    time: '10:00 AM',
    title: 'Sprint planning',
    host: 'Hosted by alice.weave.eth',
    participants: 5,
  },
  {
    id: 'mt2',
    time: '2:00 PM',
    title: 'Design sync',
    host: 'Hosted by carol.weave.eth',
    participants: 3,
  },
]

interface Props {
  onJoin: () => void
}

export default function MeetView({ onJoin }: Props) {
  const [code, setCode] = useState('')

  return (
    <div className="main-area">
      <div className="view-header">
        <span className="view-header-title">Meet</span>
        <div className="view-header-spacer" />
        <button className="view-header-btn primary" onClick={onJoin}>
          <i className="ph-duotone ph-video-camera-duotone" /> New meeting
        </button>
      </div>

      <div className="two-col-grid">
        {/* Today's meetings */}
        <div className="panel-card">
          <div className="panel-card-header">Today — Thursday, Sep 11</div>
          {MEETINGS.map(m => (
            <div key={m.id} className="meet-meeting-row" onClick={onJoin}>
              <div className="meet-time-badge">{m.time}</div>
              <div style={{ flex: 1 }}>
                <div className="meet-title">{m.title}</div>
                <div className="meet-host">{m.host} · {m.participants} participants</div>
              </div>
              <button className="view-header-btn primary" onClick={e => { e.stopPropagation(); onJoin() }}>
                Join
              </button>
            </div>
          ))}
        </div>

        {/* Join with code */}
        <div className="panel-card">
          <div className="panel-card-header">Join with code</div>
          <div className="meet-join-panel">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
              Enter a meeting code or ENS handle to join a private call.
            </p>
            <input
              className="meet-input"
              placeholder="Meeting code or handle…"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <button
              className="view-header-btn primary"
              style={{ alignSelf: 'flex-start', padding: '8px 18px' }}
              onClick={onJoin}
            >
              <i className="ph-duotone ph-sign-in-duotone" /> Join
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
