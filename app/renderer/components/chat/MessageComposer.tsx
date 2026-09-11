'use client'
import { useState } from 'react'

interface MessageComposerProps {
  draft: string
  placeholder: string
  onDraft: (v: string) => void
  onSend: () => void
  onStartCall?: () => void
  compact?: boolean
}

export default function MessageComposer({ draft, placeholder, onDraft, onSend, onStartCall, compact }: MessageComposerProps) {
  const [callHover, setCallHover] = useState(false)
  const [sendHover, setSendHover] = useState(false)

  const hasDraft = draft.trim().length > 0
  const sendBg = hasDraft ? (sendHover ? '#1186ac' : '#0088b0') : '#d7d3d3'
  const sendInk = hasDraft ? '#f3f2f2' : 'rgba(32,30,29,.6)'

  return (
    <div style={{ padding: compact ? '0 14px 12px' : '0 20px 16px' }}>
      <div style={{ border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: '#f8f4f4' }}>
        <textarea
          value={draft}
          onChange={e => onDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder={placeholder}
          rows={2}
          style={{ display: 'block', width: '100%', padding: '11px 12px 4px', border: 0, background: 'transparent', fontSize: 15, lineHeight: 1.5, color: '#201e1d', resize: 'none', caretColor: '#0088b0', minHeight: 56, fontFamily: '"Source Serif 4", Georgia, serif' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px 7px' }}>
          {onStartCall && (
            <button onMouseEnter={() => setCallHover(true)} onMouseLeave={() => setCallHover(false)} onClick={onStartCall} title="Start a call here"
              style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 2, color: callHover ? '#0088b0' : 'rgba(32,30,29,.72)', background: callHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
              <i className="ph-duotone ph-phone-call" style={{ fontSize: 17 }}></i>
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          {onStartCall && <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)', marginRight: 8 }}>enter to send</span>}
          <button
            onClick={onSend}
            onMouseEnter={() => setSendHover(true)}
            onMouseLeave={() => setSendHover(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13.5, padding: '6px 13px', background: sendBg, color: sendInk, borderRadius: 2, cursor: 'pointer' }}
          >
            <i className="ph-duotone ph-paper-plane-right" style={{ fontSize: 15 }}></i>Send
          </button>
        </div>
      </div>
    </div>
  )
}
