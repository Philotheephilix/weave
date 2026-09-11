'use client'
import { useState } from 'react'

interface Props {
  onComplete: (identity: object) => void
  onBack: () => void
}

type Step = 'handle' | 'seed' | 'logging-in'

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 18,
      height: 18,
      border: '2px solid rgba(32,30,29,.15)',
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
      background: '#2d2b2b',
      color: '#f8f4f4',
      borderRadius: 2,
      boxShadow: '0 12px 32px rgba(45,43,43,.28)',
      zIndex: 60,
      fontSize: 13.5,
      maxWidth: 480,
      animation: 'wv-rise .16s ease-out',
    }}>
      <i className="ph-duotone ph-warning" style={{ fontSize: 18, color: '#fbbf24' }} />
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(248,244,244,.6)', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}

function validateHandle(h: string): string | null {
  const s = h.trim()
  if (!s) return 'Handle is required'
  const normalized = s.endsWith('.weave.eth') ? s : s + '.weave.eth'
  const parts = normalized.split('.')
  if (parts.length < 3) return 'Enter a full ENS handle like name.org.weave.eth'
  for (const p of parts.slice(0, -2)) {
    if (!/^[a-z0-9-]+$/.test(p)) return 'Handle parts may only contain lowercase letters, numbers, and hyphens'
  }
  return null
}

function parseSeedPhrase(raw: string): string[] {
  return raw.trim().split(/\s+/).filter(Boolean)
}

export default function JoinOrgFlow({ onComplete, onBack }: Props) {
  const [step, setStep] = useState<Step>('handle')
  const [handle, setHandle] = useState('')
  const [handleError, setHandleError] = useState('')
  const [seedRaw, setSeedRaw] = useState('')
  const [seedError, setSeedError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function normalizeHandle(h: string): string {
    const s = h.trim()
    return s.endsWith('.weave.eth') ? s : s + '.weave.eth'
  }

  function handleHandleNext() {
    const err = validateHandle(handle)
    if (err) { setHandleError(err); return }
    setHandleError('')
    setStep('seed')
  }

  async function handleLogin() {
    const words = parseSeedPhrase(seedRaw)
    if (words.length !== 12) {
      setSeedError('Seed phrase must be exactly 12 words')
      return
    }
    setSeedError('')
    setLoading(true)
    setStep('logging-in')
    try {
      const result = await window.weave.identity.login({
        handle: normalizeHandle(handle),
        seedPhrase: words,
      })
      if (!result.success) {
        const msg = result.error || 'You have not been enrolled in this organization. Contact your org admin.'
        setErrorMsg(msg)
        setLoading(false)
        setStep('seed')
        return
      }
      const identity = result.identity || { handle: normalizeHandle(handle) }
      localStorage.setItem('weave_identity', JSON.stringify(identity))
      onComplete(identity)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('enroll') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not registered')) {
        setErrorMsg('You have not been enrolled in this organization. Contact your org admin.')
      } else {
        setErrorMsg(msg || 'Login failed')
      }
      setLoading(false)
      setStep('seed')
    }
  }

  const seedWords = parseSeedPhrase(seedRaw)

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
      <div style={{ width: '100%', maxWidth: 520 }}>
        <button
          onClick={step === 'handle' ? onBack : () => setStep('handle')}
          style={{ background: 'none', border: 'none', color: 'rgba(32,30,29,.62)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 24, padding: 0, fontFamily: 'inherit' }}
        >
          <i className="ph-duotone ph-arrow-left" style={{ fontSize: 14 }} /> Back
        </button>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#201e1d', marginBottom: 6 }}>Join Organization</div>
        <div style={{ fontSize: 14, color: 'rgba(32,30,29,.68)', marginBottom: 32 }}>
          {step === 'handle' && 'Enter your Weave ENS handle assigned by your org admin.'}
          {step === 'seed' && 'Enter the 12-word seed phrase associated with your identity.'}
          {step === 'logging-in' && 'Verifying your identity…'}
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(32,30,29,.1)', borderRadius: 2, padding: '26px 22px' }}>
          {step === 'handle' && (
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(32,30,29,.62)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                ENS Handle
              </label>
              <input
                autoFocus
                value={handle}
                onChange={e => { setHandle(e.target.value.toLowerCase()); setHandleError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleHandleNext() }}
                placeholder="e.g. philo.google.weave.eth"
                style={{
                  width: '100%', padding: '9px 11px', background: '#eae9e9',
                  border: `1px solid ${handleError ? '#aa0b56' : 'rgba(32,30,29,.14)'}`,
                  borderRadius: 2, color: '#201e1d', fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 4,
                  boxSizing: 'border-box',
                }}
              />
              {handleError && <div style={{ color: '#aa0b56', fontSize: 13, marginBottom: 8 }}>{handleError}</div>}
              {!handleError && handle && (
                <div style={{ fontSize: 12, color: 'rgba(32,30,29,.55)', marginBottom: 16 }}>
                  Resolving as <span style={{ color: '#006786', fontFamily: 'ui-monospace,Menlo,monospace' }}>{normalizeHandle(handle)}</span>
                </div>
              )}
              {!handle && <div style={{ marginBottom: 16 }} />}
              <button
                onClick={handleHandleNext}
                style={{ width: '100%', padding: '10px', background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continue
              </button>
            </div>
          )}

          {step === 'seed' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(32,30,29,.62)', marginBottom: 4 }}>Signing in as</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13.5, color: '#006786' }}>{normalizeHandle(handle)}</div>
              </div>

              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(32,30,29,.62)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                Seed phrase <span style={{ color: 'rgba(32,30,29,.45)', fontWeight: 400, textTransform: 'none' }}>({seedWords.length}/12 words)</span>
              </label>
              <textarea
                autoFocus
                value={seedRaw}
                onChange={e => { setSeedRaw(e.target.value); setSeedError('') }}
                placeholder="Enter your 12 words separated by spaces"
                rows={4}
                style={{
                  width: '100%', padding: '9px 11px', background: '#eae9e9',
                  border: `1px solid ${seedError ? '#aa0b56' : 'rgba(32,30,29,.14)'}`,
                  borderRadius: 2, color: '#201e1d', fontSize: 14, fontFamily: 'ui-monospace,Menlo,monospace',
                  outline: 'none', resize: 'none', lineHeight: 1.6, marginBottom: 4,
                  boxSizing: 'border-box',
                }}
              />
              {seedError && <div style={{ color: '#aa0b56', fontSize: 13, marginBottom: 8 }}>{seedError}</div>}

              {seedWords.length === 12 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
                  {seedWords.map((word, i) => (
                    <div key={i} style={{ background: '#f3f2f2', border: '1px solid rgba(32,30,29,.1)', borderRadius: 2, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10, color: 'rgba(32,30,29,.45)', fontFamily: 'ui-monospace,Menlo,monospace', minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: '#201e1d', fontFamily: 'ui-monospace,Menlo,monospace' }}>{word}</span>
                    </div>
                  ))}
                </div>
              )}

              {seedWords.length !== 12 && <div style={{ marginBottom: 16 }} />}

              <button
                onClick={handleLogin}
                disabled={loading || seedWords.length !== 12}
                style={{
                  width: '100%', padding: '10px',
                  background: seedWords.length === 12 ? '#0088b0' : 'rgba(32,30,29,.1)',
                  border: 'none', borderRadius: 2,
                  color: seedWords.length === 12 ? '#fff' : 'rgba(32,30,29,.4)',
                  fontSize: 14, fontWeight: 600,
                  cursor: seedWords.length === 12 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                {loading ? <><Spinner /> Verifying…</> : 'Sign in'}
              </button>
            </div>
          )}

          {step === 'logging-in' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <Spinner />
              <div style={{ fontSize: 14, color: 'rgba(32,30,29,.68)' }}>Resolving identity on ENSv2…</div>
            </div>
          )}
        </div>
      </div>

      {errorMsg && <ErrorToast msg={errorMsg} onDismiss={() => setErrorMsg('')} />}
    </div>
  )
}
