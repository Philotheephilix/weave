'use client'
import { useState } from 'react'

interface Props {
  onComplete: (identity: object) => void
  onBack: () => void
}

type Step = 'name' | 'seed' | 'confirm' | 'creating' | 'success'

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 18,
      height: 18,
      border: '2px solid rgba(255,255,255,.2)',
      borderTopColor: '#0088b0',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      verticalAlign: 'middle',
    }} />
  )
}

function ErrorToast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      bottom: 26,
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 16px',
      background: '#3b1a1a',
      color: '#fca5a5',
      borderRadius: 6,
      boxShadow: '0 12px 32px rgba(0,0,0,.5)',
      zIndex: 60,
      fontSize: 13.5,
      maxWidth: 480,
    }}>
      <i className="ph-duotone ph-warning" style={{ fontSize: 18, color: '#f87171' }} />
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}

const ORG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$|^[a-z0-9]{3}$/

function validateOrgName(name: string): string | null {
  if (name.length < 3) return 'Name must be at least 3 characters'
  if (name.length > 32) return 'Name must be at most 32 characters'
  if (!/^[a-z0-9-]+$/.test(name)) return 'Only lowercase letters, numbers, and hyphens allowed'
  if (!ORG_RE.test(name)) return 'Must start and end with a letter or number'
  return null
}

export default function CreateOrgFlow({ onComplete, onBack }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [orgName, setOrgName] = useState('')
  const [orgNameError, setOrgNameError] = useState('')
  const [seedPhrase, setSeedPhrase] = useState<string[]>([])
  const [seedLoading, setSeedLoading] = useState(false)
  const [confirmWords, setConfirmWords] = useState<Record<number, string>>({})
  const [confirmIndices, setConfirmIndices] = useState<number[]>([])
  const [confirmError, setConfirmError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successEns, setSuccessEns] = useState('')
  const [successAdmin, setSuccessAdmin] = useState('')

  async function handleNameNext() {
    const err = validateOrgName(orgName.trim())
    if (err) { setOrgNameError(err); return }
    setOrgNameError('')
    setSeedLoading(true)
    try {
      const result = await window.weave.identity.generateSeed()
      setSeedPhrase(result.seedPhrase)
      const indices = pickThreeIndices(result.seedPhrase.length)
      setConfirmIndices(indices)
      setConfirmWords({})
      setStep('seed')
    } catch (e: unknown) {
      setErrorMsg(String(e instanceof Error ? e.message : e) || 'Failed to generate seed phrase')
    } finally {
      setSeedLoading(false)
    }
  }

  function pickThreeIndices(len: number): number[] {
    const all = Array.from({ length: len }, (_, i) => i)
    const out: number[] = []
    while (out.length < 3) {
      const idx = Math.floor(Math.random() * all.length)
      out.push(all.splice(idx, 1)[0])
    }
    return out.sort((a, b) => a - b)
  }

  function handleConfirmCheck() {
    for (const idx of confirmIndices) {
      if ((confirmWords[idx] || '').trim().toLowerCase() !== seedPhrase[idx].toLowerCase()) {
        setConfirmError(`Word #${idx + 1} is incorrect`)
        return
      }
    }
    setConfirmError('')
    handleCreate()
  }

  async function handleCreate() {
    setStep('creating')
    try {
      const result = await window.weave.org.create({ orgName: orgName.trim(), seedPhrase })
      if ('error' in result && result.error) {
        setErrorMsg(result.error)
        setStep('confirm')
        return
      }
      setSuccessEns(result.ensName)
      setSuccessAdmin(result.adminEns)
      const identity = { ensName: result.ensName, adminEns: result.adminEns, orgName: orgName.trim(), seedPhrase }
      localStorage.setItem('weave_identity', JSON.stringify(identity))
      setStep('success')
    } catch (e: unknown) {
      setErrorMsg(String(e instanceof Error ? e.message : e) || 'Failed to create organization')
      setStep('confirm')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <button
          onClick={step === 'name' ? onBack : () => { if (step === 'seed') setStep('name'); else if (step === 'confirm') setStep('seed') }}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 24, padding: 0 }}
        >
          <i className="ph-duotone ph-arrow-left" style={{ fontSize: 14 }} /> Back
        </button>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Create Organization</div>
        <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32 }}>
          {step === 'name' && 'Choose a name for your organization on Weave.'}
          {step === 'seed' && 'Your 12-word seed phrase. Write it down and keep it safe — it cannot be recovered.'}
          {step === 'confirm' && 'Confirm you saved your seed phrase by entering the requested words.'}
          {step === 'creating' && 'Creating your organization on-chain…'}
          {step === 'success' && 'Your organization is live.'}
        </div>

        <StepIndicator current={step} />

        <div style={{ background: '#1f2937', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: '28px 24px' }}>
          {step === 'name' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Organization name
              </label>
              <input
                autoFocus
                value={orgName}
                onChange={e => { setOrgName(e.target.value.toLowerCase()); setOrgNameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleNameNext() }}
                placeholder="e.g. acme"
                style={{
                  width: '100%', padding: '10px 12px', background: '#111827', border: `1px solid ${orgNameError ? '#ef4444' : 'rgba(255,255,255,.12)'}`,
                  borderRadius: 6, color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 4,
                }}
              />
              {orgNameError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{orgNameError}</div>}
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
                Your org will be registered as <span style={{ color: '#0088b0', fontFamily: 'ui-monospace,Menlo,monospace' }}>{orgName || 'yourorg'}.weave.eth</span>
              </div>
              <button
                onClick={handleNameNext}
                disabled={seedLoading}
                style={{ width: '100%', padding: '11px', background: '#0088b0', border: 'none', borderRadius: 6, color: '#fff', fontSize: 15, fontWeight: 600, cursor: seedLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {seedLoading ? <><Spinner /> Generating seed…</> : 'Continue'}
              </button>
            </div>
          )}

          {step === 'seed' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
                {seedPhrase.map((word, i) => (
                  <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#4b5563', fontFamily: 'ui-monospace,Menlo,monospace', minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: '#fff', fontFamily: 'ui-monospace,Menlo,monospace' }}>{word}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1a1000', border: '1px solid #854d0e', borderRadius: 6, padding: '12px 14px', fontSize: 13, color: '#fbbf24', marginBottom: 20, display: 'flex', gap: 8 }}>
                <i className="ph-duotone ph-warning" style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                Write down these 12 words in order. Anyone with this phrase controls your organization. Never store it digitally.
              </div>
              <button
                onClick={() => setStep('confirm')}
                style={{ width: '100%', padding: '11px', background: '#0088b0', border: 'none', borderRadius: 6, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                I have written it down
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20 }}>
                Enter words #{confirmIndices.map(i => i + 1).join(', ')} from your seed phrase.
              </div>
              {confirmIndices.map(idx => (
                <div key={idx} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Word #{idx + 1}
                  </label>
                  <input
                    value={confirmWords[idx] || ''}
                    onChange={e => { setConfirmWords(prev => ({ ...prev, [idx]: e.target.value })); setConfirmError('') }}
                    style={{ width: '100%', padding: '9px 12px', background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, color: '#fff', fontSize: 14, fontFamily: 'ui-monospace,Menlo,monospace', outline: 'none' }}
                  />
                </div>
              ))}
              {confirmError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{confirmError}</div>}
              <button
                onClick={handleConfirmCheck}
                style={{ width: '100%', padding: '11px', background: '#0088b0', border: 'none', borderRadius: 6, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Create Organization
              </button>
            </div>
          )}

          {step === 'creating' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <Spinner />
              <div style={{ fontSize: 15, color: '#9ca3af' }}>Registering on ENSv2 and deploying contracts…</div>
            </div>
          )}

          {step === 'success' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <i className="ph-duotone ph-check-circle" style={{ fontSize: 28, color: '#22c55e' }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Organization created</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Org ENS</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 14, color: '#0088b0', background: '#111827', padding: '8px 10px', borderRadius: 6 }}>{successEns}</div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Admin identity</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 14, color: '#0088b0', background: '#111827', padding: '8px 10px', borderRadius: 6 }}>{successAdmin}</div>
              </div>
              <button
                onClick={() => {
                  const raw = localStorage.getItem('weave_identity')
                  onComplete(raw ? JSON.parse(raw) : {})
                }}
                style={{ width: '100%', padding: '11px', background: '#0088b0', border: 'none', borderRadius: 6, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Open Weave
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && <ErrorToast msg={errorMsg} onDismiss={() => setErrorMsg('')} />}
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'seed', label: 'Seed' },
    { key: 'confirm', label: 'Confirm' },
    { key: 'success', label: 'Done' },
  ]
  const order: Step[] = ['name', 'seed', 'confirm', 'creating', 'success']
  const currentIdx = order.indexOf(current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => {
        const stepIdx = order.indexOf(s.key)
        const done = currentIdx > stepIdx
        const active = current === s.key || (current === 'creating' && s.key === 'confirm')
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: done ? '#0088b0' : active ? '#0088b0' : '#374151',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                opacity: done || active ? 1 : 0.5,
              }}>
                {done ? <i className="ph-duotone ph-check" style={{ fontSize: 12 }} /> : i + 1}
              </div>
              <div style={{ fontSize: 11, color: active ? '#fff' : '#6b7280', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#0088b0' : '#374151', margin: '0 6px', marginBottom: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
