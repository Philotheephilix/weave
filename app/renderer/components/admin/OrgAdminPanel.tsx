'use client'
import { useState, useEffect, useCallback } from 'react'
import type { OrgMember, RoleDef } from '@/lib/ipc'
import { ipcDefineRole, ipcListOrgRoles, ipcAddSubAdmin, ipcRemoveSubAdmin } from '@/lib/ipc'

export interface OrgAdminPanelProps {
  adminHandle: string
  onEnrolled?: () => void
  onClose: () => void
  onCallMember?: (label: string) => void
}

interface MemberWithRole extends OrgMember {
  isAdmin: boolean
  roleLoading: boolean
}

const truncateAddress = (addr: string) =>
  addr.length > 14 ? addr.slice(0, 6) + '…' + addr.slice(-4) : addr

// Extract "memberName" from a full ENS like "philo.google.weave.eth"
function extractMemberName(fullName: string, orgName: string): string {
  const prefix = `.${orgName}.weave.eth`
  return fullName.endsWith(prefix)
    ? fullName.slice(0, -prefix.length)
    : fullName.split('.')[0]
}

export default function OrgAdminPanel({ adminHandle, onEnrolled, onClose, onCallMember }: OrgAdminPanelProps) {
  const parts = adminHandle.split('.')
  const orgName = parts.length >= 4 && parts[0] === 'admin' ? parts[1] : null

  const [members, setMembers] = useState<MemberWithRole[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [memberName, setMemberName] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Custom roles
  const [orgRoles, setOrgRoles] = useState<RoleDef[]>([])
  const [roleSlug, setRoleSlug] = useState('')
  const [roleDisplay, setRoleDisplay] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [roleColor, setRoleColor] = useState('#006786')
  const [roleNybble, setRoleNybble] = useState(16)
  const [definingRole, setDefiningRole] = useState(false)

  // Sub-admins
  const [subAdminAddress, setSubAdminAddress] = useState('')
  const [addingSubAdmin, setAddingSubAdmin] = useState(false)
  const [subAdminMsg, setSubAdminMsg] = useState<string | null>(null)

  const loadOrgRoles = useCallback(async () => {
    if (!orgName) return
    const res = await ipcListOrgRoles(orgName)
    if (res.roles) setOrgRoles(res.roles)
  }, [orgName])

  const handleDefineRole = useCallback(async () => {
    if (!orgName || !roleSlug.trim() || !roleDisplay.trim()) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setDefiningRole(true)
    const res = await ipcDefineRole({ orgName, nybble: roleNybble, slug: roleSlug.trim(), displayName: roleDisplay.trim(), description: roleDesc.trim(), color: roleColor })
    setDefiningRole(false)
    if (res.error) { setErrorMsg(res.error); return }
    setRoleSlug(''); setRoleDisplay(''); setRoleDesc('')
    await loadOrgRoles()
    setSuccessMsg('Role defined.')
  }, [orgName, roleNybble, roleSlug, roleDisplay, roleDesc, roleColor, loadOrgRoles])

  const handleAddSubAdmin = useCallback(async () => {
    if (!orgName || !subAdminAddress.trim()) return
    setAddingSubAdmin(true)
    const res = await ipcAddSubAdmin(orgName, subAdminAddress.trim())
    setAddingSubAdmin(false)
    setSubAdminMsg(res.error ? `Error: ${res.error}` : 'Sub-admin added.')
    if (!res.error) setSubAdminAddress('')
  }, [orgName, subAdminAddress])

  useEffect(() => { loadOrgRoles() }, [loadOrgRoles])

  const loadMembers = useCallback(async () => {
    if (!orgName) { setLoadingMembers(false); return }
    setLoadingMembers(true)
    try {
      const list: OrgMember[] = await window.weave?.org?.listMembers(orgName) ?? []
      // Fetch role for each member concurrently
      const withRoles: MemberWithRole[] = await Promise.all(
        list.map(async (m) => {
          try {
            const res = await window.weave?.ens?.getMemberRole({ orgName, memberAddress: m.address })
            return { ...m, isAdmin: res?.isAdmin ?? false, roleLoading: false }
          } catch {
            return { ...m, isAdmin: false, roleLoading: false }
          }
        })
      )
      setMembers(withRoles)
    } catch {
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [orgName])

  useEffect(() => { loadMembers() }, [loadMembers])

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
        setSuccessMsg(`${name}.${orgName}.weave.eth enrolled`)
        setMemberName('')
        setMemberAddress('')
        loadMembers()
        onEnrolled?.()
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const handleGrant = async (m: MemberWithRole) => {
    if (!orgName) return
    const memberLabel = extractMemberName(m.name, orgName)
    setMembers(prev => prev.map(x => x.address === m.address ? { ...x, roleLoading: true } : x))
    try {
      const res = await window.weave?.ens?.grantAdmin({ orgName, memberName: memberLabel, memberAddress: m.address })
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setMembers(prev => prev.map(x => x.address === m.address ? { ...x, isAdmin: true, roleLoading: false } : x))
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Grant failed')
      setMembers(prev => prev.map(x => x.address === m.address ? { ...x, roleLoading: false } : x))
    }
  }

  const handleRevoke = async (m: MemberWithRole) => {
    if (!orgName) return
    const memberLabel = extractMemberName(m.name, orgName)
    setMembers(prev => prev.map(x => x.address === m.address ? { ...x, roleLoading: true } : x))
    try {
      const res = await window.weave?.ens?.revokeAccess({ orgName, memberName: memberLabel, memberAddress: m.address })
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setMembers(prev => prev.map(x => x.address === m.address ? { ...x, isAdmin: false, roleLoading: false } : x))
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Revoke failed')
      setMembers(prev => prev.map(x => x.address === m.address ? { ...x, roleLoading: false } : x))
    }
  }

  const canEnroll = !enrolling && memberName.trim().length > 0 && memberAddress.trim().length > 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: '#fff', borderRadius: 2, padding: 24, minWidth: 500, maxWidth: 600, width: '100%', color: '#201e1d', position: 'relative', boxShadow: '0 8px 32px rgba(32,30,29,.18)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Org Admin Panel</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(32,30,29,.55)' }}>{adminHandle}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(32,30,29,.55)', cursor: 'pointer', padding: '4px 6px', borderRadius: 2, fontSize: 18, lineHeight: 1 }} title="Close">
            <i className="ph-duotone ph-x" />
          </button>
        </div>

        {/* Members list */}
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
              {members.map((m) => (
                <div
                  key={m.address}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '0 8px', alignItems: 'center', padding: '8px 10px', background: 'rgba(32,30,29,.04)', borderRadius: 2, fontSize: 13 }}
                >
                  {/* Name */}
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name.includes('.') ? m.name : `${m.name}.${orgName}.weave.eth`}
                  </span>

                  {/* Role badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: m.isAdmin ? 'rgba(0,104,134,.12)' : 'rgba(32,30,29,.07)',
                    color: m.isAdmin ? '#006786' : 'rgba(32,30,29,.55)',
                    whiteSpace: 'nowrap',
                  }}>
                    {m.roleLoading ? '…' : m.isAdmin ? 'admin' : 'member'}
                  </span>

                  {/* Call button */}
                  <button
                    onClick={() => onCallMember?.(extractMemberName(m.name, orgName ?? ''))}
                    title="Call"
                    style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, background: 'transparent', color: '#006786', cursor: 'pointer', border: 'none' }}
                  >
                    <i className="ph-duotone ph-phone" style={{ fontSize: 15 }} />
                  </button>

                  {/* Grant / Revoke */}
                  {m.isAdmin ? (
                    <button
                      onClick={() => handleRevoke(m)}
                      disabled={m.roleLoading}
                      title="Revoke admin"
                      style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 2, border: '1px solid rgba(170,11,86,.35)', background: 'transparent', color: '#aa0b56', cursor: m.roleLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGrant(m)}
                      disabled={m.roleLoading}
                      title="Make admin"
                      style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 2, border: '1px solid rgba(0,104,134,.35)', background: 'transparent', color: '#006786', cursor: m.roleLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Make admin
                    </button>
                  )}

                  {/* Address */}
                  <span style={{ color: 'rgba(32,30,29,.55)', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5 }}>
                    {truncateAddress(m.address)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ height: 1, background: 'rgba(32,30,29,.1)', marginBottom: 20 }} />

        {/* Enroll new member */}
        <section>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(32,30,29,.55)' }}>
            Enroll New Member
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 5 }}>Member handle</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, overflow: 'hidden' }}>
                <input
                  type="text"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="philo"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#201e1d', padding: '9px 12px', fontSize: 13.5 }}
                />
                <span style={{ paddingRight: 12, fontSize: 12.5, color: 'rgba(32,30,29,.45)', whiteSpace: 'nowrap' }}>
                  .{orgName}.weave.eth
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 5 }}>Ethereum wallet address</label>
              <input
                type="text"
                value={memberAddress}
                onChange={e => setMemberAddress(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', background: '#fff', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, outline: 'none', color: '#201e1d', padding: '9px 12px', fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'ui-monospace,Menlo,monospace' }}
              />
            </div>

            {successMsg && (
              <p style={{ margin: 0, fontSize: 13, color: '#006786', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph-duotone ph-check-circle" style={{ fontSize: 16 }} /> {successMsg}
              </p>
            )}
            {errorMsg && (
              <p style={{ margin: 0, fontSize: 13, color: '#aa0b56', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ph-duotone ph-warning-circle" style={{ fontSize: 16 }} /> {errorMsg}
              </p>
            )}

            <button
              onClick={handleEnroll}
              disabled={!canEnroll}
              style={{ alignSelf: 'flex-start', padding: '9px 20px', background: canEnroll ? '#0088b0' : 'rgba(32,30,29,.1)', color: canEnroll ? '#fff' : 'rgba(32,30,29,.4)', border: 'none', borderRadius: 2, fontSize: 13.5, fontWeight: 600, cursor: canEnroll ? 'pointer' : 'not-allowed', transition: 'background .15s' }}
            >
              {enrolling ? 'Enrolling…' : 'Enroll Member'}
            </button>
          </div>
        </section>

        <div style={{ height: 1, background: 'rgba(32,30,29,.1)', marginBottom: 20, marginTop: 20 }} />

        {/* Custom Roles */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(32,30,29,.55)' }}>
            Custom Roles
          </h3>

          {orgRoles.length === 0 ? (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(32,30,29,.45)' }}>No custom roles defined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {orgRoles.filter(r => r.active).map(r => (
                <span key={r.slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}50` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                  {r.displayName}
                  <span style={{ fontWeight: 400, opacity: .6 }}>({r.slug})</span>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 4 }}>Slug (e.g. "editor")</label>
              <input type="text" value={roleSlug} onChange={e => setRoleSlug(e.target.value)} placeholder="editor"
                style={{ width: '100%', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: '8px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 4 }}>Display name</label>
              <input type="text" value={roleDisplay} onChange={e => setRoleDisplay(e.target.value)} placeholder="Editor"
                style={{ width: '100%', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: '8px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 4 }}>Description</label>
              <input type="text" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} placeholder="Can edit content"
                style={{ width: '100%', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: '8px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 4 }}>Color</label>
                <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)}
                  style={{ width: '100%', height: 36, border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: 2, cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(32,30,29,.5)', marginBottom: 4 }}>Nybble (16–63)</label>
                <input type="number" min={16} max={63} value={roleNybble} onChange={e => setRoleNybble(Number(e.target.value))}
                  style={{ width: '100%', border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: '8px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
          <button
            onClick={handleDefineRole}
            disabled={definingRole || !roleSlug.trim() || !roleDisplay.trim()}
            style={{ marginTop: 12, padding: '8px 18px', background: definingRole || !roleSlug.trim() ? 'rgba(32,30,29,.1)' : '#0088b0', color: definingRole || !roleSlug.trim() ? 'rgba(32,30,29,.4)' : '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: definingRole || !roleSlug.trim() ? 'not-allowed' : 'pointer' }}
          >
            {definingRole ? 'Defining…' : 'Define Role'}
          </button>
        </section>

        <div style={{ height: 1, background: 'rgba(32,30,29,.1)', marginBottom: 20 }} />

        {/* Sub-Admin Management */}
        <section>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(32,30,29,.55)' }}>
            Sub-Admin Management
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'rgba(32,30,29,.5)' }}>
            Sub-admins can grant roles up to but not exceeding their own permission bitmap.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={subAdminAddress}
              onChange={e => { setSubAdminAddress(e.target.value); setSubAdminMsg(null) }}
              placeholder="0x... (Ethereum address)"
              style={{ flex: 1, border: '1px solid rgba(32,30,29,.22)', borderRadius: 2, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'ui-monospace,Menlo,monospace' }}
            />
            <button
              onClick={handleAddSubAdmin}
              disabled={addingSubAdmin || !subAdminAddress.trim()}
              style={{ padding: '8px 16px', background: addingSubAdmin || !subAdminAddress.trim() ? 'rgba(32,30,29,.1)' : '#006786', color: addingSubAdmin || !subAdminAddress.trim() ? 'rgba(32,30,29,.4)' : '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: addingSubAdmin || !subAdminAddress.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {addingSubAdmin ? 'Adding…' : 'Add Sub-Admin'}
            </button>
          </div>
          {subAdminMsg && (
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: subAdminMsg.startsWith('Error') ? '#aa0b56' : '#006786' }}>{subAdminMsg}</p>
          )}
        </section>
      </div>
    </div>
  )
}
