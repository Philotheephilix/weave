'use client'
import { useState } from 'react'
import CreateOrgFlow from './CreateOrgFlow'
import JoinOrgFlow from './JoinOrgFlow'

type Flow = 'landing' | 'create' | 'join'

interface Props {
  onComplete: (identity: object) => void
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [flow, setFlow] = useState<Flow>('landing')

  if (flow === 'create') {
    return <CreateOrgFlow onComplete={onComplete} onBack={() => setFlow('landing')} />
  }
  if (flow === 'join') {
    return <JoinOrgFlow onComplete={onComplete} onBack={() => setFlow('landing')} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 8 }}>
          Weave
        </div>
        <div style={{ fontSize: 15, color: '#9ca3af' }}>
          Decentralized, private team communication
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, maxWidth: 680, width: '100%' }}>
        <button
          onClick={() => setFlow('create')}
          style={{
            flex: 1,
            background: '#1f2937',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 8,
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 140ms, background 140ms',
            color: 'inherit',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#0088b0'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#243347'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.08)'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1f2937'
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <i className="ph-duotone ph-buildings" style={{ fontSize: 36, color: '#0088b0' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
            Create Organization
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
            Set up a new Weave org for your team. Generates a seed phrase and registers your ENS identity on-chain.
          </div>
          <div style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#0088b0',
          }}>
            Get started <i className="ph-duotone ph-arrow-right" style={{ fontSize: 14 }} />
          </div>
        </button>

        <button
          onClick={() => setFlow('join')}
          style={{
            flex: 1,
            background: '#1f2937',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 8,
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 140ms, background 140ms',
            color: 'inherit',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#0088b0'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#243347'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.08)'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1f2937'
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <i className="ph-duotone ph-user" style={{ fontSize: 36, color: '#0088b0' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
            Join Organization
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
            Sign in with your ENS handle and seed phrase. Your org admin must have enrolled you first.
          </div>
          <div style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#0088b0',
          }}>
            Sign in <i className="ph-duotone ph-arrow-right" style={{ fontSize: 14 }} />
          </div>
        </button>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: '#4b5563', textAlign: 'center' }}>
        End-to-end encrypted · No central server · Keys never leave your device
      </div>
    </div>
  )
}
