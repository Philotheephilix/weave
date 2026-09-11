'use client'
import { useRef, useEffect } from 'react'
import type { Message } from '@/lib/types'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  rowGap: number
  rowPad: number
  emptyTitle: string
  someoneTyping: boolean
  typingLabel: string
  onToggleReaction: (id: string, glyph: string) => void
  onOpenThread: (id: string) => void
  onOpenInvite: () => void
  scrollToBottom?: boolean
}

export default function MessageList({ messages, rowGap, rowPad, emptyTitle, someoneTyping, typingLabel, onToggleReaction, onOpenThread, onOpenInvite, scrollToBottom }: MessageListProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollToBottom && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [messages, someoneTyping, scrollToBottom])

  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
        {messages.map(m => (
          <MessageItem key={m.id} message={m} rowPad={rowPad} onToggleReaction={onToggleReaction} onOpenThread={onOpenThread} />
        ))}
        {messages.length === 0 && (
          <div style={{ padding: '26px 8px', maxWidth: '60ch' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 600 }}>{emptyTitle}</h4>
            <p style={{ margin: '0 0 14px', fontSize: 14, color: 'rgba(32,30,29,.75)' }}>Nothing here yet. This channel is gossip-distributed between members — no channel server holds its history.</p>
            <button onClick={onOpenInvite} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, padding: '7px 13px', background: '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
              <i className="ph-duotone ph-user-plus" style={{ fontSize: 16 }}></i>Add members
            </button>
          </div>
        )}
        {someoneTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 4px', fontSize: 12.5, color: 'rgba(32,30,29,.68)', fontStyle: 'italic' }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <span style={{ width: 5, height: 5, background: '#9b9797', borderRadius: '50%', animation: 'wv-pulse 1.2s infinite' }}></span>
              <span style={{ width: 5, height: 5, background: '#9b9797', borderRadius: '50%', animation: 'wv-pulse 1.2s infinite 0.2s' }}></span>
              <span style={{ width: 5, height: 5, background: '#9b9797', borderRadius: '50%', animation: 'wv-pulse 1.2s infinite 0.4s' }}></span>
            </span>
            {typingLabel}
          </div>
        )}
      </div>
    </div>
  )
}
