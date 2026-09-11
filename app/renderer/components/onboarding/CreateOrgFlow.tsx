'use client'
import { useState } from 'react'

interface Props {
  onComplete: (identity: object) => void
  onBack: () => void
}

type Step = 'name' | 'seed' | 'fund' | 'confirm' | 'creating' | 'success'

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
  const [ethAddress, setEthAddress] = useState('')
  const [copied, setCopied] = useState(false)
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
      const words: string[] = result.seedPhrase
      setSeedPhrase(words)
      const addrResult = await window.weave.identity.deriveAddress(words)
      setEthAddress(addrResult.ethAddress || '')
      const indices = pickThreeIndices(words.length)
      setConfirmIndices(indices)
      setConfirmWords({})
      setStep('seed')
    } catch (e: unknown) {
      setErrorMsg(String(e instanceof Error ? e.message : e) || 'Failed to generate seed phrase')
    } finally {
      setSeedLoading(false)
    }
  }

  function handleCopyAddress() {
    navigator.clipboard.writeText(ethAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
      const identity = { handle: result.adminEns, ensName: result.ensName, adminEns: result.adminEns, orgName: orgName.trim(), seedPhrase, ethAddress }
      localStorage.setItem('weave_identity', JSON.stringify(identity))
      setStep('success')
    } catch (e: unknown) {
      setErrorMsg(String(e instanceof Error ? e.message : e) || 'Failed to create organization')
      setStep('confirm')
    }
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
      <div style={{ width: '100%', maxWidth: 520 }}>
        <button
          onClick={step === 'name' ? onBack : () => { if (step === 'seed') setStep('name'); else if (step === 'fund') setStep('seed'); else if (step === 'confirm') setStep('fund') }}
          style={{ background: 'none', border: 'none', color: 'rgba(32,30,29,.62)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 24, padding: 0, fontFamily: 'inherit' }}
        >
          <i className="ph-duotone ph-arrow-left" style={{ fontSize: 14 }} /> Back
        </button>

        <div style={{ fontSize: 22, fontWeight: 700, color: '#201e1d', marginBottom: 6 }}>Create Organization</div>
        <div style={{ fontSize: 14, color: 'rgba(32,30,29,.68)', marginBottom: 28 }}>
          {step === 'name' && 'Choose a name for your organization on Weave.'}
          {step === 'seed' && 'Your 12-word seed phrase. Write it down and keep it safe — it cannot be recovered.'}
          {step === 'fund' && 'Fund your wallet before registering on-chain.'}
          {step === 'confirm' && 'Confirm you saved your seed phrase by entering the requested words.'}
          {step === 'creating' && 'Creating your organization on-chain…'}
          {step === 'success' && 'Your organization is live.'}
        </div>

        <StepIndicator current={step} />

        <div style={{ background: '#fff', border: '1px solid rgba(32,30,29,.1)', borderRadius: 2, padding: '26px 22px' }}>
          {step === 'name' && (
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(32,30,29,.62)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                Organization name
              </label>
              <input
                autoFocus
                value={orgName}
                onChange={e => { setOrgName(e.target.value.toLowerCase()); setOrgNameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleNameNext() }}
                placeholder="e.g. acme"
                style={{
                  width: '100%', padding: '9px 11px', background: '#eae9e9',
                  border: `1px solid ${orgNameError ? '#aa0b56' : 'rgba(32,30,29,.14)'}`,
                  borderRadius: 2, color: '#201e1d', fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 4,
                  boxSizing: 'border-box',
                }}
              />
              {orgNameError && <div style={{ color: '#aa0b56', fontSize: 13, marginBottom: 8 }}>{orgNameError}</div>}
              <div style={{ fontSize: 12, color: 'rgba(32,30,29,.55)', marginBottom: 20 }}>
                Your org will be registered as <span style={{ color: '#006786', fontFamily: 'ui-monospace,Menlo,monospace' }}>{orgName || 'yourorg'}.weave.eth</span>
              </div>
              <button
                onClick={handleNameNext}
                disabled={seedLoading}
                style={{ width: '100%', padding: '10px', background: seedLoading ? 'rgba(32,30,29,.14)' : '#0088b0', border: 'none', borderRadius: 2, color: seedLoading ? 'rgba(32,30,29,.55)' : '#fff', fontSize: 14, fontWeight: 600, cursor: seedLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
              >
                {seedLoading ? <><Spinner /> Generating seed…</> : 'Continue'}
              </button>
            </div>
          )}

          {step === 'seed' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 22 }}>
                {seedPhrase.map((word, i) => (
                  <div key={i} style={{ background: '#f3f2f2', border: '1px solid rgba(32,30,29,.1)', borderRadius: 2, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'rgba(32,30,29,.45)', fontFamily: 'ui-monospace,Menlo,monospace', minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ fontSize: 13.5, color: '#201e1d', fontFamily: 'ui-monospace,Menlo,monospace' }}>{word}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid rgba(213,157,0,.35)', borderRadius: 2, padding: '11px 13px', fontSize: 13, color: '#92400e', marginBottom: 20, display: 'flex', gap: 8 }}>
                <i className="ph-duotone ph-warning" style={{ fontSize: 17, flexShrink: 0, marginTop: 1, color: '#d97706' }} />
                Write down these 12 words in order. Anyone with this phrase controls your organization. Never store it digitally.
              </div>
              <button
                onClick={() => setStep('fund')}
                style={{ width: '100%', padding: '10px', background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                I have written it down
              </button>
            </div>
          )}

          {step === 'fund' && (
            <div>
              <div style={{ fontSize: 14, color: 'rgba(32,30,29,.72)', marginBottom: 18, lineHeight: 1.6 }}>
                Registering your org requires a small amount of Sepolia ETH for gas. Send at least <span style={{ color: '#d97706', fontWeight: 600 }}>0.002 SepoliaETH</span> to your wallet before continuing.
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(32,30,29,.62)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your wallet address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    flex: 1,
                    fontFamily: 'ui-monospace,Menlo,monospace',
                    fontSize: 12.5,
                    color: '#006786',
                    background: '#f3f2f2',
                    padding: '9px 11px',
                    borderRadius: 2,
                    border: '1px solid rgba(32,30,29,.1)',
                    wordBreak: 'break-all',
                  }}>
                    {ethAddress}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    title="Copy address"
                    style={{
                      background: copied ? '#d1fae5' : '#eae9e9',
                      border: `1px solid ${copied ? '#6ee7b7' : 'rgba(32,30,29,.14)'}`,
                      borderRadius: 2,
                      padding: '9px 11px',
                      cursor: 'pointer',
                      color: copied ? '#065f46' : 'rgba(32,30,29,.6)',
                      flexShrink: 0,
                      fontSize: 15,
                      transition: 'all 0.15s',
                    }}
                  >
                    {copied ? <i className="ph-duotone ph-check" /> : <i className="ph-duotone ph-copy" />}
                  </button>
                </div>
              </div>
              <div style={{ background: '#f0f9ff', border: '1px solid rgba(0,136,176,.22)', borderRadius: 2, padding: '11px 13px', fontSize: 13, color: '#0c4a6e', marginBottom: 18, display: 'flex', gap: 8 }}>
                <i className="ph-duotone ph-drop" style={{ fontSize: 17, flexShrink: 0, marginTop: 1, color: '#0088b0' }} />
                Get free Sepolia ETH at <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0088b0', marginLeft: 4 }}>sepoliafaucet.com</a> or the Alchemy faucet.
              </div>
              <button
                onClick={() => setStep('confirm')}
                style={{ width: '100%', padding: '10px', background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Wallet is funded — Continue
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <div style={{ fontSize: 13.5, color: 'rgba(32,30,29,.7)', marginBottom: 20 }}>
                Enter words #{confirmIndices.map(i => i + 1).join(', ')} from your seed phrase.
              </div>
              {confirmIndices.map(idx => (
                <div key={idx} style={{ marginBottom: 13 }}>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(32,30,29,.62)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    Word #{idx + 1}
                  </label>
                  <input
                    value={confirmWords[idx] || ''}
                    onChange={e => { setConfirmWords(prev => ({ ...prev, [idx]: e.target.value })); setConfirmError('') }}
                    style={{ width: '100%', padding: '9px 11px', background: '#eae9e9', border: '1px solid rgba(32,30,29,.14)', borderRadius: 2, color: '#201e1d', fontSize: 14, fontFamily: 'ui-monospace,Menlo,monospace', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {confirmError && <div style={{ color: '#aa0b56', fontSize: 13, marginBottom: 12 }}>{confirmError}</div>}
              <button
                onClick={handleConfirmCheck}
                style={{ width: '100%', padding: '10px', background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Create Organization
              </button>
            </div>
          )}

          {step === 'creating' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
              <Spinner />
              <div style={{ fontSize: 14, color: 'rgba(32,30,29,.68)' }}>Registering on ENSv2 and deploying contracts…</div>
            </div>
          )}

          {step === 'success' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <i className="ph-duotone ph-check-circle" style={{ fontSize: 26, color: '#0088b0' }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: '#201e1d' }}>Organization created</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(32,30,29,.62)', marginBottom: 4 }}>Org ENS</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13.5, color: '#006786', background: '#f3f2f2', padding: '7px 10px', borderRadius: 2, border: '1px solid rgba(32,30,29,.1)' }}>{successEns}</div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(32,30,29,.62)', marginBottom: 4 }}>Admin identity</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13.5, color: '#006786', background: '#f3f2f2', padding: '7px 10px', borderRadius: 2, border: '1px solid rgba(32,30,29,.1)' }}>{successAdmin}</div>
              </div>
              <button
                onClick={() => {
                  const raw = localStorage.getItem('weave_identity')
                  if (!raw) return
                  onComplete(JSON.parse(raw))
                }}
                style={{ width: '100%', padding: '10px', background: '#0088b0', border: 'none', borderRadius: 2, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
    { key: 'fund', label: 'Fund' },
    { key: 'confirm', label: 'Confirm' },
    { key: 'success', label: 'Done' },
  ]
  const order: Step[] = ['name', 'seed', 'fund', 'confirm', 'creating', 'success']
  const currentIdx = order.indexOf(current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 22 }}>
      {steps.map((s, i) => {
        const stepIdx = order.indexOf(s.key)
        const done = currentIdx > stepIdx
        const active = current === s.key || (current === 'creating' && (s.key === 'confirm' || s.key === 'fund'))
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done || active ? '#0088b0' : '#eae9e9',
                border: `1px solid ${done || active ? '#0088b0' : 'rgba(32,30,29,.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5, fontWeight: 700, color: done || active ? '#fff' : 'rgba(32,30,29,.45)',
              }}>
                {done ? <i className="ph-duotone ph-check" style={{ fontSize: 11 }} /> : i + 1}
              </div>
              <div style={{ fontSize: 11, color: active ? '#004961' : done ? '#006786' : 'rgba(32,30,29,.5)', whiteSpace: 'nowrap', fontWeight: active ? 600 : 400 }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? '#0088b0' : 'rgba(32,30,29,.15)', margin: '0 6px', marginBottom: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
