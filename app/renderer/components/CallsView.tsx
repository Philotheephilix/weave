import React, { useState } from 'react'

const DIAL_KEYS = [
  { num: '1', sub: '' },
  { num: '2', sub: 'ABC' },
  { num: '3', sub: 'DEF' },
  { num: '4', sub: 'GHI' },
  { num: '5', sub: 'JKL' },
  { num: '6', sub: 'MNO' },
  { num: '7', sub: 'PQRS' },
  { num: '8', sub: 'TUV' },
  { num: '9', sub: 'WXYZ' },
  { num: '*', sub: '' },
  { num: '0', sub: '+' },
  { num: '#', sub: '' },
]

const RECENT_CALLS = [
  { id: 'c1', name: 'Alice',  handle: 'alice.weave.eth', time: '10:32 AM',  dir: 'incoming', missed: false, tintBg: '#cbeeff', tintInk: '#004961' },
  { id: 'c2', name: 'Bob',    handle: 'bob.weave.eth',   time: 'Yesterday', dir: 'outgoing', missed: false, tintBg: '#e9dcff', tintInk: '#4a1d96' },
  { id: 'c3', name: 'Carol',  handle: 'carol.weave.eth', time: 'Mon',       dir: 'incoming', missed: true,  tintBg: '#fce7f3', tintInk: '#831843' },
]

interface Props {
  onCallStart: () => void
}

export default function CallsView({ onCallStart }: Props) {
  const [dialStr, setDialStr] = useState('')

  return (
    <div className="main-area">
      <div className="view-header">
        <span className="view-header-title">Calls</span>
        <div className="view-header-spacer" />
        <button className="view-header-btn primary" onClick={onCallStart}>
          <i className="ph-duotone ph-phone-plus-duotone" /> New Call
        </button>
      </div>

      <div className="two-col-grid">
        {/* Recent calls */}
        <div className="panel-card">
          <div className="panel-card-header">Recent</div>
          {RECENT_CALLS.map(c => (
            <div key={c.id} className="call-row" onClick={onCallStart}>
              <div className="call-avatar" style={{ background: c.tintBg, color: c.tintInk }}>
                {c.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="call-name">{c.name}</div>
                <div className="call-time" style={{ fontFamily: 'var(--font-mono)' }}>{c.handle}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={`call-time${c.missed ? ' call-missed' : ''}`}>
                  {c.missed ? 'Missed' : c.dir === 'incoming' ? '↙ Incoming' : '↗ Outgoing'}
                </div>
                <div className="call-time">{c.time}</div>
              </div>
              <button className="view-header-btn" style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); onCallStart() }}>
                <i className="ph-duotone ph-phone-duotone" />
              </button>
            </div>
          ))}
        </div>

        {/* Dial pad */}
        <div className="panel-card">
          <div className="panel-card-header">Dial</div>
          <div className="dial-pad">
            <input
              className="dial-display"
              value={dialStr}
              onChange={e => setDialStr(e.target.value)}
              placeholder="ENS handle or address"
            />
            <div className="dial-grid">
              {DIAL_KEYS.map(k => (
                <div key={k.num} className="dial-key" onClick={() => setDialStr(p => p + k.num)}>
                  <span className="dial-key-num">{k.num}</span>
                  {k.sub && <span className="dial-key-sub">{k.sub}</span>}
                </div>
              ))}
            </div>
            <button className="dial-call-btn" onClick={onCallStart}>
              <i className="ph-duotone ph-phone-duotone" /> Call
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
