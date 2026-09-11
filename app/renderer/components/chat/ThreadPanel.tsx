'use client'
import { useState, useEffect } from 'react'
import type { Message } from '@/lib/types'
import { ensInitials, ensTint } from '@/lib/ens-display'

const FALLBACK_PERSON = { name: 'Unknown', initials: '??', tint: '#eae9e9', ink: '#444141', role: 'Member', handle: '' }

interface ThreadPanelProps {
  message: Message
  draft: string
  onDraftChange: (v: string) => void
  onSendReply: () => void
  onClose: () => void
}

function useResolvedPersons(ids: string[]) {
  const [persons, setPersons] = useState<Record<string, typeof FALLBACK_PERSON>>({})
  useEffect(() => {
    let cancelled = false
    const unique = Array.from(new Set(ids.filter(id => id && id !== 'me')))
    Promise.all(unique.map(id =>
      window.weave.resolve(id)
        .then((handle: string) => ({ id, handle }))
        .catch(() => ({ id, handle: '' }))
    )).then(results => {
      if (cancelled) return
      const map: Record<string, typeof FALLBACK_PERSON> = {}
      for (const { id, handle } of results) {
        if (handle) {
          map[id] = { name: handle, initials: ensInitials(handle), tint: ensTint(handle), ink: '#004961', role: 'Member', handle }
        } else {
          map[id] = FALLBACK_PERSON
        }
      }
      setPersons(map)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])
  return persons
}

export default function ThreadPanel({ message: m, draft, onDraftChange, onSendReply, onClose }: ThreadPanelProps) {
  const [closeHover, setCloseHover] = useState(false)
  const [replyHover, setReplyHover] = useState(false)

  const allIds = [m.who, ...m.replies.map(r => r.who)]
  const persons = useResolvedPersons(allIds)
  const getPerson = (id: string) => (id === 'me' ? FALLBACK_PERSON : persons[id] ?? FALLBACK_PERSON)
  const p = getPerson(m.who)

  return (
    <div style={{ width: 352, flex: 'none', display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '1px solid rgba(32,30,29,.1)', background: '#f8f4f4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 10px' }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600, flex: 1 }}>Thread</h5>
        <button
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: closeHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
          <i className="ph-duotone ph-x" style={{ fontSize: 15 }}></i>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 10px' }}>
        <div style={{ paddingBottom: 12, borderBottom: '1px solid rgba(32,30,29,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{m.who === 'me' ? 'You' : p.name}</span>
            <span style={{ fontSize: 10.5, color: 'rgba(32,30,29,.66)' }}>{m.time}</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 14 }}>{m.text}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
          {m.replies.map((r, i) => {
            const rp = getPerson(r.who)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 9 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, background: rp.tint, color: rp.ink, fontSize: 10.5, fontWeight: 600, borderRadius: 2 }}>{rp.initials}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.who === 'me' ? 'You' : rp.name}</span>
                    <span style={{ fontSize: 10.5, color: 'rgba(32,30,29,.66)' }}>{r.time}</span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 14 }}>{r.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: '#f3f2f2' }}>
          <textarea
            value={draft}
            onChange={e => onDraftChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendReply() } }}
            placeholder="Reply in thread"
            rows={2}
            style={{ display: 'block', width: '100%', padding: '9px 10px 2px', border: 0, background: 'transparent', fontSize: 14, resize: 'none', caretColor: '#0088b0', minHeight: 48, fontFamily: '"Source Serif 4", Georgia, serif' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 7px 7px' }}>
            <button
              onClick={onSendReply}
              onMouseEnter={() => setReplyHover(true)}
              onMouseLeave={() => setReplyHover(false)}
              style={{ fontWeight: 600, fontSize: 13, padding: '5px 11px', background: replyHover ? '#1186ac' : '#0088b0', color: '#f3f2f2', borderRadius: 2, cursor: 'pointer' }}>
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
