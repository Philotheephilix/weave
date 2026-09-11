'use client'
import { useState } from 'react'
import type { Message } from '@/lib/types'
import { ensLabel, ensInitials, ensTint } from '@/lib/ens-display'

const FALLBACK_PERSON = { name: 'Unknown', initials: '??', tint: '#eae9e9', ink: '#444141', role: 'Member', handle: '' }
function getPerson(id: string) {
  if (!id) return FALLBACK_PERSON
  if (id.includes('.')) {
    return {
      name: ensLabel(id),
      initials: ensInitials(id),
      tint: ensTint(id),
      ink: '#444141',
      role: 'Member',
      handle: id,
    }
  }
  // Raw pubkey — truncate for display
  const label = id.slice(0, 8)
  return {
    name: label,
    initials: label.slice(0, 2).toUpperCase(),
    tint: ensTint(id),
    ink: '#444141',
    role: 'Member',
    handle: id,
  }
}

function ReactionButton({ r, onToggle }: { r: { glyph: string; count: number; on: boolean }; onToggle: () => void }) {
  const [rHover, setRHover] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setRHover(true)}
      onMouseLeave={() => setRHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', fontSize: 12, borderRadius: 2, background: r.on ? '#e9f8ff' : 'transparent', color: r.on ? '#004961' : 'rgba(32,30,29,.8)', border: `1px solid ${rHover ? '#0088b0' : r.on ? '#0088b0' : 'rgba(32,30,29,.16)'}`, cursor: 'pointer' }}>
      <span style={{ fontSize: 12.5 }}>{r.glyph}</span>
      <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10 }}>{r.count}</span>
    </button>
  )
}

interface MessageItemProps {
  message: Message
  rowPad: number
  onToggleReaction: (id: string, glyph: string) => void
  onOpenThread: (id: string) => void
}

export default function MessageItem({ message: m, rowPad, onToggleReaction, onOpenThread }: MessageItemProps) {
  const [rowHover, setRowHover] = useState(false)
  const [reactHover, setReactHover] = useState(false)
  const [replyHover, setReplyHover] = useState(false)
  const p = getPerson(m.who)
  const replyLabel = m.replies.length ? `${m.replies.length} replies` : 'Reply in thread'

  return (
    <div
      onMouseEnter={() => setRowHover(true)}
      onMouseLeave={() => setRowHover(false)}
      style={{ display: 'grid', gridTemplateColumns: '38px minmax(0,1fr)', gap: 12, padding: `${rowPad}px 8px`, borderRadius: 2, background: rowHover ? 'rgba(32,30,29,.035)' : 'transparent' }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, background: p.tint, color: p.ink, fontSize: 13, fontWeight: 600, borderRadius: 2 }}>{p.initials}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>{m.who === 'me' ? 'You' : p.name}</span>
          <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.66)' }}>{p.handle}</span>
          {m.who === 'notes' && (
            <span style={{ display: 'inline-block', fontSize: 10, letterSpacing: '.04em', padding: '2px 6px', background: '#fff1f4', color: '#aa0b56', borderRadius: 2 }}>agent</span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(32,30,29,.66)' }}>{m.time}</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 15, lineHeight: 1.55 }}>{m.text}</p>
        {m.file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 9, padding: '10px 12px', maxWidth: 520, background: '#eae9e9', borderRadius: 2 }}>
            <div style={{ width: 52, height: 40, flex: 'none', background: 'repeating-linear-gradient(135deg,#d7d3d3 0 3px,#eae9e9 3px 6px)' }}></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.file.name}</div>
              <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.file.meta}</div>
            </div>
            <button
              disabled
              style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: '#006786', cursor: 'not-allowed', background: 'transparent', opacity: 0.5 }}
              title="Download not yet implemented">
              <i className="ph-duotone ph-download-simple" style={{ fontSize: 16 }}></i>
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          {m.reactions.map((r, i) => (
            <ReactionButton key={i} r={r} onToggle={() => onToggleReaction(m.id, r.glyph)} />
          ))}
          <button
            onClick={() => onToggleReaction(m.id, '✓')}
            onMouseEnter={() => setReactHover(true)}
            onMouseLeave={() => setReactHover(false)}
            title="Acknowledge"
            style={{ display: 'grid', placeItems: 'center', width: 24, height: 22, borderRadius: 2, color: reactHover ? '#0088b0' : 'rgba(32,30,29,.6)', background: reactHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-check-circle" style={{ fontSize: 14 }}></i>
          </button>
          <button
            onClick={() => onOpenThread(m.id)}
            onMouseEnter={() => setReplyHover(true)}
            onMouseLeave={() => setReplyHover(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', fontSize: 12.5, color: '#006786', borderRadius: 2, background: replyHover ? 'rgba(0,136,176,.1)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-chat-teardrop-dots" style={{ fontSize: 14 }}></i>{replyLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
