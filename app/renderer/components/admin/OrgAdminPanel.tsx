'use client'
import { useState, useEffect } from 'react'
import type { OrgMember } from '@/lib/ipc'

export interface OrgAdminPanelProps {
  adminHandle: string
  onEnrolled?: () => void
  onClose: () => void
}

export default function OrgAdminPanel({ adminHandle, onEnrolled, onClose }: OrgAdminPanelProps) {
  const parts = adminHandle.split('.')
  const orgName = parts.length >= 4 && parts[0] === 'admin' ? parts[1] : null

  const [members, setMembers] = useState<OrgMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [memberName, setMemberName] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!orgName) { setLoadingMembers(false); return }
    setLoadingMembers(true)
    window.weave?.org?.listMembers(orgName)
      .then(list => setMembers(list))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [orgName])

  const handleEnroll = async () => {
    const name = memberName.trim()
    const address = memberAddress.trim()
    if (!name || !address || !orgName) return

    setEnrolling(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const result = await window.weave?.org?.enroll({ orgName, memberName: name, memberAddress: address })
      if (result?.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg(`${name}.${orgName}.weave.eth enrolled successfully`)
        setMemberName('')
        setMemberAddress('')
        window.weave?.org?.listMembers(orgName)
          .then(list => setMembers(list))
          .catch(() => {})
        onEnrolled?.()
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const canEnroll = !enrolling && memberName.trim().length > 0 && memberAddress.trim().length > 0

  const truncateAddress = (addr: string) =>
    addr.length > 14 ? addr.slice(0, 6) + '…' + addr.slice(-4) : addr

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(32,30,29,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 2,
          padding: 24,
          minWidth: 480,
          maxWidth: 560,
          width: '100%',
          color: '#201e1d',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(32,30,29,.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#201e1d' }}>Org Admin Panel</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(32,30,29,.55)' }}>{adminHandle}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(32,30,29,.55)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 2,
              fontSize: 18,
              lineHeight: 1,
            }}
            title="Close"
          >
            <i className="ph-duotone ph-x" />
          </button>
        </div>

        <section style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(32,30,29,.55)' }}>
            Enrolled Members
          </h3>

          {loadingMembers ? (
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(32,30,29,.5)' }}>Loading…</p>
          ) : members.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(32,30,29,.5)' }}>No members enrolled yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '0 16px',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: 'rgba(32,30,29,.04)',
                    borderRadius: 2,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#201e1d' }}>
                    {m.name}.{orgName}.weave.eth
                  </span>
                  <span style={{ color: 'rgba(32,30,29,.55)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}>
                    {truncateAddress(m.address)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(32,30,29,.1)', marginBottom: 20 }} />

        {/* Section 2: Enroll New Member */}
        <section>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(32,30,29,.55)' }}>
            Enroll New Member
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 5 }}>
                Member handle
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, overflow: 'hidden' }}>
                <input
                  type="text"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="philo"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#201e1d',
                    padding: '9px 12px',
                    fontSize: 13.5,
                  }}
                />
                <span style={{ paddingRight: 12, fontSize: 12.5, color: 'rgba(32,30,29,.45)', whiteSpace: 'nowrap' }}>
                  .{orgName}.weave.eth
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 5 }}>
                Ethereum wallet address
              </label>
              <input
                type="text"
                value={memberAddress}
                onChange={e => setMemberAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  background: '#fff',
                  border: '1px solid rgba(32,30,29,.22)',
                  borderRadius: 2,
                  outline: 'none',
                  color: '#201e1d',
                  padding: '9px 12px',
                  fontSize: 13.5,
                  boxSizing: 'border-box',
                  fontFamily: 'ui-monospace,Menlo,monospace',
                }}
              />
            </div>

            {successMsg && (
              <p style={{ margin: 0, fontSize: 13, color: '#006786', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph-duotone ph-check-circle" style={{ fontSize: 16 }} />
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p style={{ margin: 0, fontSize: 13, color: '#aa0b56', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph-duotone ph-warning-circle" style={{ fontSize: 16 }} />
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleEnroll}
              disabled={!canEnroll}
              style={{
                alignSelf: 'flex-start',
                padding: '9px 20px',
                background: canEnroll ? '#0088b0' : 'rgba(32,30,29,.1)',
                color: canEnroll ? '#fff' : 'rgba(32,30,29,.4)',
                border: 'none',
                borderRadius: 2,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: canEnroll ? 'pointer' : 'not-allowed',
                transition: 'background .15s',
              }}
            >
              {enrolling ? 'Enrolling…' : 'Enroll Member'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
