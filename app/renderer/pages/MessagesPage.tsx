import React, { useState, useEffect, useRef, useCallback } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  loadConversations,
  saveConversations,
  upsertConversation,
  sendNostrMessage,
  getOrCreateEphNostrKey,
  Conversation,
  StoredMessage,
} from '../lib/nostr'
import type { ResolvedIdentity } from '../lib/ipc'

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface MessagesContentProps {
  preSelectedContact?: (ResolvedIdentity & { handle: string }) | null
  onContactConsumed?: () => void
}

function MessagesContent({ preSelectedContact, onContactConsumed }: MessagesContentProps) {
  const [convos, setConvos] = useState<Conversation[]>(() => loadConversations())
  const [activeNoisePub, setActiveNoisePub] = useState<string | null>(null)
  const [compose, setCompose] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle pre-selected contact from ContactsPage
  useEffect(() => {
    if (!preSelectedContact) return
    const noisePub = bufToHex(preSelectedContact.noisePub)
    const exists = convos.find(c => c.noisePub === noisePub)
    if (!exists) {
      const newConvo: Conversation = {
        noisePub,
        handle: `${preSelectedContact.handle}.weave.eth`,
        nostrPub: preSelectedContact.nostrPub,
        messages: [],
      }
      const updated = upsertConversation(convos, newConvo)
      setConvos(updated)
      saveConversations(updated)
    }
    setActiveNoisePub(noisePub)
    onContactConsumed?.()
  }, [preSelectedContact]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeNoisePub, convos])

  const activeConvo = convos.find(c => c.noisePub === activeNoisePub) ?? null

  const handleSend = useCallback(async () => {
    if (!activeConvo || !compose.trim()) return
    setSending(true)
    const content = compose.trim()
    setCompose('')

    const senderKey = getOrCreateEphNostrKey()
    const transport = await sendNostrMessage(senderKey, activeConvo.nostrPub, content)

    const msg: StoredMessage = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction: 'sent',
      content,
      timestamp: Date.now(),
      transport: transport === 'nostr' ? 'nostr' : 'nostr',
    }

    setConvos(prev => {
      const updated = upsertConversation(prev, {
        ...activeConvo,
        messages: [...activeConvo.messages, msg],
      })
      saveConversations(updated)
      return updated
    })
    setSending(false)
  }, [activeConvo, compose])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="messages-layout" style={{ height: '100%' }}>
      {/* Conversations panel */}
      <div className="conversations-panel">
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Conversations
        </div>
        {convos.length === 0 ? (
          <div style={{ padding: '20px 16px', color: 'var(--text-2)', fontSize: '12px', lineHeight: '1.6' }}>
            No conversations yet. Resolve a contact to start.
          </div>
        ) : (
          convos.map(c => {
            const last = c.messages[c.messages.length - 1]
            return (
              <div
                key={c.noisePub}
                className={`convo-item${activeNoisePub === c.noisePub ? ' active' : ''}`}
                onClick={() => setActiveNoisePub(c.noisePub)}
              >
                <div className="convo-name">{c.handle}</div>
                <div className="convo-preview">
                  {last ? `${last.direction === 'sent' ? 'You: ' : ''}${last.content}` : 'No messages yet'}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Thread panel */}
      <div className="thread-panel">
        {activeConvo ? (
          <>
            <div className="thread-header">
              <div className="thread-name">{activeConvo.handle}</div>
              <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-2)' }}>
                {activeConvo.nostrPub
                  ? `nostr: ${activeConvo.nostrPub.slice(0, 8)}...${activeConvo.nostrPub.slice(-6)}`
                  : 'no nostr key'}
              </div>
            </div>

            <div className="thread-messages">
              {activeConvo.messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">◎</div>
                  <div className="empty-text">
                    Start the conversation. Messages are encrypted end-to-end.
                  </div>
                </div>
              ) : (
                activeConvo.messages.map(msg => (
                  <div key={msg.id}>
                    <div className={`message-bubble ${msg.direction}`}>
                      {msg.content}
                      <div className="message-meta">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="message-transport">{msg.transport}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="compose-area">
              <textarea
                className="compose-input"
                placeholder={`Message ${activeConvo.handle} via Nostr NIP-59… (Enter to send)`}
                value={compose}
                onChange={e => setCompose(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end' }}
                onClick={handleSend}
                disabled={sending || !compose.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-icon">◎</div>
            <div className="empty-text">
              Select a conversation from the left, or resolve a contact to start messaging.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MessagesPageProps {
  preSelectedContact?: (ResolvedIdentity & { handle: string }) | null
  onContactConsumed?: () => void
}

export default function MessagesPage({ preSelectedContact, onContactConsumed }: MessagesPageProps) {
  return (
    <ErrorBoundary>
      <MessagesContent
        preSelectedContact={preSelectedContact}
        onContactConsumed={onContactConsumed}
      />
    </ErrorBoundary>
  )
}
