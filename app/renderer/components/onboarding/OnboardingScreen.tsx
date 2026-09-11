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
  const [createHover, setCreateHover] = useState(false)
  const [joinHover, setJoinHover] = useState(false)

  if (flow === 'create') {
    return <CreateOrgFlow onComplete={onComplete} onBack={() => setFlow('landing')} />
  }
  if (flow === 'join') {
    return <JoinOrgFlow onComplete={onComplete} onBack={() => setFlow('landing')} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f2f2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '"Source Serif 4", Georgia, serif',
    }}>
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#201e1d', letterSpacing: '-0.5px', marginBottom: 8 }}>
          weave
        </div>
        <div style={{ fontSize: 15, color: 'rgba(32,30,29,.68)' }}>
          Decentralized, private team communication
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 10, letterSpacing: '.06em', color: '#006786', background: '#e9f8ff', padding: '2px 6px', borderRadius: 2 }}>
            onion · private · no central server
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, maxWidth: 680, width: '100%' }}>
        <button
          onClick={() => setFlow('create')}
          onMouseEnter={() => setCreateHover(true)}
          onMouseLeave={() => setCreateHover(false)}
          style={{
            flex: 1,
            background: createHover ? '#e9f8ff' : '#fff',
            border: `1px solid ${createHover ? '#0088b0' : 'rgba(32,30,29,.14)'}`,
            borderRadius: 2,
            padding: '28px 22px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 140ms, background 140ms',
            color: 'inherit',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <i className="ph-duotone ph-buildings" style={{ fontSize: 34, color: '#0088b0' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#201e1d', marginBottom: 7 }}>
            Create Organization
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(32,30,29,.72)', lineHeight: 1.6 }}>
            Set up a new Weave org for your team. Generates a seed phrase and registers your ENS identity on-chain.
          </div>
          <div style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 600,
            color: '#0088b0',
          }}>
            Get started <i className="ph-duotone ph-arrow-right" style={{ fontSize: 13 }} />
          </div>
        </button>

        <button
          onClick={() => setFlow('join')}
          onMouseEnter={() => setJoinHover(true)}
          onMouseLeave={() => setJoinHover(false)}
          style={{
            flex: 1,
            background: joinHover ? '#e9f8ff' : '#fff',
            border: `1px solid ${joinHover ? '#0088b0' : 'rgba(32,30,29,.14)'}`,
            borderRadius: 2,
            padding: '28px 22px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 140ms, background 140ms',
            color: 'inherit',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <i className="ph-duotone ph-user" style={{ fontSize: 34, color: '#0088b0' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#201e1d', marginBottom: 7 }}>
            Join Organization
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(32,30,29,.72)', lineHeight: 1.6 }}>
            Sign in with your ENS handle and seed phrase. Your org admin must have enrolled you first.
          </div>
          <div style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 600,
            color: '#0088b0',
          }}>
            Sign in <i className="ph-duotone ph-arrow-right" style={{ fontSize: 13 }} />
          </div>
        </button>
      </div>

      <div style={{ marginTop: 36, fontSize: 12, color: 'rgba(32,30,29,.45)', textAlign: 'center' }}>
        End-to-end encrypted · No central server · Keys never leave your device
      </div>
    </div>
  )
}
