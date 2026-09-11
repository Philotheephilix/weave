'use client'
import { useState } from 'react'

interface PaletteResult {
  label: string
  meta: string
  kind: string
  icon: string
  bg: string
  go: () => void
}

interface SearchPaletteProps {
  pq: string
  results: PaletteResult[]
  onPqChange: (v: string) => void
  onClose: () => void
}

export default function SearchPalette({ pq, results, onPqChange, onClose }: SearchPaletteProps) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'start center', padding: '90px 20px 20px', background: 'rgba(45,43,43,.45)', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(620px,100%)', background: '#f3f2f2', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.24)', overflow: 'hidden', animation: 'wv-rise .14s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderBottom: '1px solid rgba(32,30,29,.12)' }}>
          <i className="ph-duotone ph-magnifying-glass" style={{ fontSize: 19, color: 'rgba(32,30,29,.7)' }}></i>
          <input
            value={pq}
            onChange={e => onPqChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && results[0]) { results[0].go(); onClose() } else if (e.key === 'Escape') onClose() }}
            placeholder="Jump to a channel, person, file — or type /"
            autoFocus
            style={{ flex: 1, border: 0, background: 'transparent', fontSize: 17, caretColor: '#0088b0', fontFamily: '"Source Serif 4", Georgia, serif' }}
          />
          <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.6)' }}>esc</span>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: 7 }}>
          {results.length === 0 ? (
            <p style={{ margin: 0, padding: '22px 12px', fontSize: 13.5, color: 'rgba(32,30,29,.72)' }}>
              Nothing matches &ldquo;{pq}&rdquo;. Handles resolve on ENSv2 — try a full <span style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>name.weave.eth</span>.
            </p>
          ) : results.map((r, i) => {
            const [hover, setHover] = useState(false)
            return (
              <button key={i} onClick={() => { r.go(); onClose() }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px', borderRadius: 2, textAlign: 'left', background: hover ? '#e9f8ff' : r.bg, cursor: 'pointer' }}>
                <i className={`ph-duotone ${r.icon}`} style={{ fontSize: 18, color: '#006786' }}></i>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                  <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.7)' }}>{r.meta}</span>
                </span>
                <span style={{ fontSize: 10.5, letterSpacing: '.04em', color: 'rgba(32,30,29,.6)' }}>{r.kind}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
