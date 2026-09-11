'use client'
import { useState } from 'react'
import type { Meeting } from '@/lib/types'

interface MeetViewProps {
  meetings: Meeting[]
  joinCode: string
  onJoinCodeChange: (v: string) => void
  onJoin: (title: string) => void
  onMeetNow: () => void
}

export default function MeetView({ meetings, joinCode, onJoinCodeChange, onJoin, onMeetNow }: MeetViewProps) {
  const [meetHover, setMeetHover] = useState(false)
  const [joinHover, setJoinHover] = useState(false)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>Meet</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(32,30,29,.72)' }}>Full-mesh rooms, six peers per hop. Beyond six, Weave chains a second mesh through the host.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 28, alignItems: 'start' }}>
        <div>
          <h6 style={{ margin: '0 0 10px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', fontWeight: 600 }}>Today</h6>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {meetings.map((m, i) => {
              const [rowHover, setRowHover] = useState(false)
              const [btnHover, setBtnHover] = useState(false)
              return (
                <div key={i}
                  onMouseEnter={() => setRowHover(true)}
                  onMouseLeave={() => setRowHover(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 8px', borderBottom: '1px solid rgba(32,30,29,.08)', background: rowHover ? 'rgba(32,30,29,.04)' : 'transparent' }}>
                  <span style={{ width: 66, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'rgba(32,30,29,.78)' }}>{m.time}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{m.title}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(32,30,29,.72)' }}>{m.who}</span>
                  </span>
                  {m.live && (
                    <span style={{ display: 'inline-block', fontSize: 10, letterSpacing: '.06em', padding: '3px 8px', background: '#fff1f4', color: '#aa0b56', borderRadius: 2 }}>live</span>
                  )}
                  <button
                    onClick={() => onJoin(m.title)}
                    onMouseEnter={() => setBtnHover(true)}
                    onMouseLeave={() => setBtnHover(false)}
                    style={{ fontWeight: 600, fontSize: 13.5, padding: '6px 13px', background: m.live ? (btnHover ? '#1186ac' : '#0088b0') : btnHover ? '#1186ac' : 'transparent', color: m.live ? '#f3f2f2' : btnHover ? '#f3f2f2' : '#201e1d', border: `1px solid ${m.live ? '#0088b0' : 'rgba(32,30,29,.16)'}`, borderRadius: 2, cursor: 'pointer' }}>
                    {m.live ? 'Join' : 'Details'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ padding: 16, background: '#eae9e9', borderRadius: 2 }}>
          <h6 style={{ margin: '0 0 10px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(32,30,29,.66)', fontWeight: 600 }}>Join with a code</h6>
          <input
            value={joinCode}
            onChange={e => onJoinCodeChange(e.target.value)}
            placeholder="weave://meet/…"
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12.5, background: '#f8f4f4', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, caretColor: '#0088b0' }}
          />
          <button
            onClick={onMeetNow}
            onMouseEnter={() => setMeetHover(true)}
            onMouseLeave={() => setMeetHover(false)}
            style={{ width: '100%', marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '9px 0', background: meetHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
            <i className="ph-duotone ph-video-camera" style={{ fontSize: 16 }}></i>Meet now
          </button>
          <button
            onClick={onMeetNow}
            onMouseEnter={() => setJoinHover(true)}
            onMouseLeave={() => setJoinHover(false)}
            style={{ width: '100%', marginTop: 7, fontWeight: 600, fontSize: 14, padding: '8px 0', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, background: joinHover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}>
            Join without camera
          </button>
          <p style={{ margin: '12px 0 0', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, lineHeight: 1.6, color: 'rgba(32,30,29,.7)' }}>vp8 · opus · rnnoise · blur on-device</p>
        </div>
      </div>
    </div>
  )
}
