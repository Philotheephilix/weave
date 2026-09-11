'use client'
import { useState, useEffect } from 'react'

interface HeaderProps {
  onOpenPalette: () => void
  onOpenMembers: () => void
  identity?: { handle: string }
}

type TorState = 'connecting' | 'connected' | 'error'

function torLabel(state: TorState): string {
  if (state === 'connected') return 'onion · connected'
  if (state === 'error') return 'onion · error'
  return 'onion · connecting'
}

function torColors(state: TorState): { color: string; background: string } {
  if (state === 'connected') return { color: '#006786', background: '#e9f8ff' }
  if (state === 'error') return { color: '#7a2020', background: '#fff0f0' }
  return { color: '#6b5c00', background: '#fffbe6' }
}

export default function Header({ onOpenPalette, onOpenMembers, identity }: HeaderProps) {
  const [searchHover, setSearchHover] = useState(false)
  const [profileHover, setProfileHover] = useState(false)
  const [torStatus, setTorStatus] = useState<TorState>('connecting')

  useEffect(() => {
    // Get initial Tor status
    window.weave?.tor?.status?.().then((s: unknown) => {
      if (typeof s === 'string') setTorStatus(s as TorState)
    }).catch(() => {})

    // Subscribe to Tor status change events
    const handler = (_event: unknown, status: unknown) => {
      if (typeof status === 'string') setTorStatus(status as TorState)
    }
    window.weave?.on?.('tor:status', handler as (...args: unknown[]) => void)
    return () => { window.weave?.off?.('tor:status', handler as (...args: unknown[]) => void) }
  }, [])

  const torStyle = torColors(torStatus)

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 16px', height: 52, background: '#f3f2f2' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 180 }}>
        <span style={{ fontWeight: 600, fontSize: 19, letterSpacing: '-.02em' }}>weave</span>
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, letterSpacing: '.06em', color: torStyle.color, background: torStyle.background, padding: '2px 6px', borderRadius: 2 }}>{torLabel(torStatus)}</span>
      </div>
      <button
        onClick={onOpenPalette}
        onMouseEnter={() => setSearchHover(true)}
        onMouseLeave={() => setSearchHover(false)}
        style={{ width: 320, display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 10px', background: '#eae9e9', border: `1px solid ${searchHover ? 'rgba(32,30,29,.4)' : 'rgba(32,30,29,.14)'}`, borderRadius: 2, color: 'rgba(32,30,29,.7)', fontSize: 14, textAlign: 'left', cursor: 'pointer' }}
      >
        <i className="ph-duotone ph-magnifying-glass" style={{ fontSize: 16 }}></i>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search people, channels, files</span>
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, color: 'rgba(32,30,29,.55)' }}>⌘K</span>
      </button>
      <button
        onClick={onOpenMembers}
        onMouseEnter={() => setProfileHover(true)}
        onMouseLeave={() => setProfileHover(false)}
        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '4px 6px 4px 4px', borderRadius: 2, background: profileHover ? 'rgba(32,30,29,.07)' : 'transparent', cursor: 'pointer' }}
      >
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 30, height: 30, background: '#cbeeff', color: '#004961', fontWeight: 600, fontSize: 12, borderRadius: 2 }}>
          {identity?.handle ? identity.handle.slice(0, 2).toUpperCase() : '??'}
          <span style={{ position: 'absolute', right: -2, bottom: -2, width: 9, height: 9, background: '#0088b0', border: '2px solid #f3f2f2', borderRadius: '50%' }}></span>
        </span>
        {identity?.handle && (
          <span style={{ textAlign: 'left', lineHeight: 1.15, maxWidth: 160 }}>
            <span style={{ display: 'block', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: 'rgba(32,30,29,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{identity.handle}</span>
          </span>
        )}
      </button>
    </header>
  )
}
