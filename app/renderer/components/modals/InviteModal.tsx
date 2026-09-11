'use client'
import { useState } from 'react'

interface InviteModalProps {
  channelTitle: string
  inviteQ: string
  invited: string[]
  inviteRole: string
  expiry: string
  onInviteQChange: (v: string) => void
  onAddInvite: () => void
  onRemoveInvite: (h: string) => void
  onSetRole: (r: string) => void
  onSetExpiry: (e: string) => void
  onSendInvites: () => void
  onClose: () => void
}

const ROLES = ['Owner', 'Moderator', 'Member', 'Guest']
const EXPIRIES = ['24 hours', '7 days', '30 days']

function InvitedTag({ h, onRemove }: { h: string; onRemove: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 6px 4px 9px', background: '#e9f8ff', color: '#004961', borderRadius: 2, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}>
      {h}
      <button onClick={onRemove} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 2, color: '#006786', background: hover ? 'rgba(0,136,176,.18)' : 'transparent', cursor: 'pointer' }}>
        <i className="ph-duotone ph-x" style={{ fontSize: 11 }}></i>
      </button>
    </span>
  )
}

function RoleBtn({ r, isActive, onClick }: { r: string; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '7px 12px', fontSize: 13, fontWeight: isActive ? 600 : 400, background: isActive ? '#e9f8ff' : (hover ? 'rgba(32,30,29,.06)' : '#f8f4f4'), color: isActive ? '#004961' : '#201e1d', border: `1px solid ${isActive ? '#0088b0' : hover ? 'rgba(32,30,29,.32)' : 'rgba(32,30,29,.16)'}`, borderRadius: 2, cursor: 'pointer' }}>
      {r}
    </button>
  )
}

function ExpiryBtn({ ex, isActive, onClick }: { ex: string; isActive: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: '5px 11px', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, background: isActive ? '#ffdee6' : (hover ? 'rgba(32,30,29,.06)' : '#f8f4f4'), color: isActive ? '#79103d' : '#201e1d', border: `1px solid ${isActive ? '#d6006c' : hover ? 'rgba(32,30,29,.32)' : 'rgba(32,30,29,.16)'}`, borderRadius: 2, cursor: 'pointer' }}>
      {ex}
    </button>
  )
}

export default function InviteModal({ channelTitle, inviteQ, invited, inviteRole, expiry, onInviteQChange, onAddInvite, onRemoveInvite, onSetRole, onSetExpiry, onSendInvites, onClose }: InviteModalProps) {
  const [closeHover, setCloseHover] = useState(false)
  const [addHover, setAddHover] = useState(false)
  const [cancelHover, setCancelHover] = useState(false)
  const [sendHover, setSendHover] = useState(false)
  const canSend = invited.length > 0
  const inviteHint = inviteRole === 'Guest' ? `guest token · expires in ${expiry}` : 'resolved on ensv2 · sepolia'
  const sendLabel = invited.length > 1 ? `Send ${invited.length} invites` : 'Send invite'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(45,43,43,.5)', zIndex: 40 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px,100%)', display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: '#eae9e9', borderRadius: 4, boxShadow: '0 12px 32px rgba(45,43,43,.22)', animation: 'wv-rise .16s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>Invite to {channelTitle}</h4>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(32,30,29,.75)' }}>Invitees are resolved on ENSv2 — one handle per line, or paste a wildcard group.</p>
          </div>
          <button onClick={onClose} onMouseEnter={() => setCloseHover(true)} onMouseLeave={() => setCloseHover(false)}
            style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, color: 'rgba(32,30,29,.7)', background: closeHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            <i className="ph-duotone ph-x" style={{ fontSize: 16 }}></i>
          </button>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'rgba(32,30,29,.75)' }}>ENS handle</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={inviteQ} onChange={e => onInviteQChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddInvite() } }}
              placeholder="devika.weave.eth"
              style={{ flex: 1, minHeight: 36, padding: '6px 10px', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, background: '#f8f4f4', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, caretColor: '#0088b0' }}
            />
            <button onClick={onAddInvite} onMouseEnter={() => setAddHover(true)} onMouseLeave={() => setAddHover(false)}
              style={{ fontWeight: 600, fontSize: 14, padding: '8px 14px', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: addHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
              Add
            </button>
          </div>
          {invited.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {invited.map(h => <InvitedTag key={h} h={h} onRemove={() => onRemoveInvite(h)} />)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: 'rgba(32,30,29,.75)' }}>Role</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map(r => <RoleBtn key={r} r={r} isActive={inviteRole === r} onClick={() => onSetRole(r)} />)}
          </div>
        </div>

        {inviteRole === 'Guest' && (
          <div style={{ padding: '11px 12px', background: '#fff1f4', borderRadius: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <i className="ph-duotone ph-hourglass-high" style={{ fontSize: 17, color: '#aa0b56' }}></i>
              <span style={{ flex: 1, fontSize: 13, color: '#79103d' }}>Guests get an expiring ERC-1155 token. Access revokes itself on chain when it lapses.</span>
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
              {EXPIRIES.map(ex => <ExpiryBtn key={ex} ex={ex} isActive={expiry === ex} onClick={() => onSetExpiry(ex)} />)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ flex: 1, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 9.5, color: 'rgba(32,30,29,.7)' }}>{inviteHint}</span>
          <button onClick={onClose} onMouseEnter={() => setCancelHover(true)} onMouseLeave={() => setCancelHover(false)}
            style={{ fontWeight: 600, fontSize: 14, padding: '8px 14px', border: '1px solid rgba(32,30,29,.16)', borderRadius: 2, background: cancelHover ? 'rgba(32,30,29,.08)' : 'transparent', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onSendInvites} onMouseEnter={() => setSendHover(true)} onMouseLeave={() => setSendHover(false)}
            style={{ fontWeight: 600, fontSize: 14, padding: '8px 16px', background: canSend ? (sendHover ? '#1186ac' : '#0088b0') : '#d7d3d3', color: canSend ? '#f3f2f2' : 'rgba(32,30,29,.6)', borderRadius: 2, cursor: 'pointer' }}>
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
