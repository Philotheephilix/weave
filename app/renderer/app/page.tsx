'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppState, RailId, ModalId, TabId, ChannelKind, CallPanelId, CallMode, Message, Team, Channel } from '@/lib/types'
import OnboardingScreen from '@/components/onboarding/OnboardingScreen'

import Header from '@/components/layout/Header'
import NavRail from '@/components/layout/NavRail'
import Sidebar from '@/components/layout/Sidebar'
import ChannelView from '@/components/chat/ChannelView'
import DMView from '@/components/chat/DMView'
import CallView from '@/components/calls/CallView'
import CallsPageView from '@/components/calls/CallsPageView'
import RingingModal from '@/components/calls/RingingModal'
import FilesView from '@/components/pages/FilesView'
import ActivityView from '@/components/pages/ActivityView'
import MeetView from '@/components/pages/MeetView'
import CreateChannelModal from '@/components/modals/CreateChannelModal'
import InviteModal from '@/components/modals/InviteModal'
import MembersModal from '@/components/modals/MembersModal'
import SearchPalette from '@/components/modals/SearchPalette'
import OrgAdminPanel from '@/components/admin/OrgAdminPanel'

const initialState: AppState = {
  rail: 'teams',
  teamOpen: {},
  team: '',
  channel: '',
  dm: '',
  tab: 'posts',
  filesScope: 'channel',
  activityScope: 'all',
  msgs: {},
  dms: {},
  dmOrder: [],
  draft: '',
  threadDraft: '',
  thread: null,
  modal: null,
  palette: false,
  pq: '',
  newName: '',
  newDesc: '',
  newKind: 'standard',
  inviteQ: '',
  invited: [],
  inviteRole: 'Member',
  expiry: '30 days',
  removed: {},
  roleOverride: {},
  joinedVoice: false,
  voiceTeam: null,
  mic: true,
  call: null,
  callMode: 'grid',
  callPanel: 'people',
  callDraft: '',
  callChat: [],
  cam: false,
  hand: false,
  captions: false,
  rec: false,
  tick: 0,
  dial: '',
  joinCode: '',
  toast: null,
}

// teams is stored in component state, not in mockData; getTeam/getChan work from passed-in teams array
function getTeamFrom(teams: Team[], state: AppState): Team | undefined {
  return teams.find(t => t.id === state.team)
}

function getChanFrom(teams: Team[], state: AppState): Channel | undefined {
  const t = getTeamFrom(teams, state)
  return t?.channels.find(c => c.id === state.channel)
}

function chanKey(teamId: string, channelId: string) {
  return teamId + '/' + channelId
}

export default function WeaveApp() {
  const [s, setS] = useState<AppState>(initialState)
  const [teams, setTeams] = useState<Team[]>([])
  const [identity, setIdentity] = useState<{ handle: string } | null>(null)
  const [identityChecked, setIdentityChecked] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load identity on mount — check localStorage first, then IPC
  useEffect(() => {
    const stored = localStorage.getItem('weave_identity')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setIdentity(parsed)
        setIdentityChecked(true)
        return
      } catch {
        localStorage.removeItem('weave_identity')
      }
    }
    window.weave?.identity?.load?.().then((id: unknown) => {
      if (id && typeof id === 'object') {
        setIdentity(id as { handle: string })
      }
    }).catch(() => {}).finally(() => setIdentityChecked(true))
    if (!window.weave?.identity?.load) setIdentityChecked(true)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setS(prev => ({ ...prev, palette: !prev.palette, pq: '' }))
      } else if (e.key === 'Escape') {
        setS(prev => ({ ...prev, palette: false, modal: null, thread: null }))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Call timer
  useEffect(() => {
    tickTimer.current = setInterval(() => {
      setS(prev => prev.call ? { ...prev, tick: prev.tick + 1 } : prev)
    }, 1000)
    return () => { if (tickTimer.current) clearInterval(tickTimer.current) }
  }, [])

  function say(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setS(prev => ({ ...prev, toast: msg }))
    toastTimer.current = setTimeout(() => setS(prev => ({ ...prev, toast: null })), 3200)
  }

  // --- Actions ---
  const send = () => {
    const text = s.draft.trim()
    if (!text) return
    if (s.rail === 'chat') {
      const list = [...(s.dms[s.dm] || []), { mine: true, time: 'now', text }]
      setS(prev => ({ ...prev, dms: { ...prev.dms, [prev.dm]: list }, draft: '' }))
    } else {
      const k = chanKey(s.team, s.channel)
      const list = [...(s.msgs[k] || []), { id: 'm' + Date.now(), who: 'me', time: 'now', text, reactions: [], replies: [] }]
      setS(prev => ({ ...prev, msgs: { ...prev.msgs, [k]: list }, draft: '' }))
    }
  }

  const sendThread = () => {
    const text = s.threadDraft.trim()
    if (!text || !s.thread) return
    const k = chanKey(s.team, s.channel)
    const list = (s.msgs[k] || []).map(m =>
      m.id === s.thread ? { ...m, replies: [...m.replies, { who: 'me', time: 'now', text }] } : m
    )
    setS(prev => ({ ...prev, msgs: { ...prev.msgs, [k]: list }, threadDraft: '' }))
  }

  const toggleReaction = (id: string, glyph: string) => {
    const k = chanKey(s.team, s.channel)
    const list = (s.msgs[k] || []).map(m => {
      if (m.id !== id) return m
      const rs = [...m.reactions]
      const i = rs.findIndex(r => r.glyph === glyph)
      if (i < 0) rs.push({ glyph, count: 1, on: true })
      else rs[i] = { ...rs[i], on: !rs[i].on, count: rs[i].count + (rs[i].on ? -1 : 1) }
      return { ...m, reactions: rs.filter(r => r.count > 0) }
    })
    setS(prev => ({ ...prev, msgs: { ...prev.msgs, [k]: list } }))
  }

  const createChannel = () => {
    const name = s.newName.trim()
    if (!name) return
    setTeams(prev => prev.map(t => t.id === s.team
      ? { ...t, channels: [...t.channels, { id: name, name, kind: s.newKind, unread: 0, desc: s.newDesc.trim() || `New ${s.newKind} channel.` }] }
      : t
    ))
    setS(prev => ({ ...prev, channel: name, rail: 'teams', tab: 'posts', modal: 'invite', newName: '', newDesc: '' }))
    say('#' + name + ' created · add members to start gossiping history')
  }

  const addInvite = () => {
    let h = s.inviteQ.trim().toLowerCase()
    if (!h) return
    if (!h.includes('.')) h = h + '.weave.eth'
    if (s.invited.includes(h)) { setS(prev => ({ ...prev, inviteQ: '' })); return }
    setS(prev => ({ ...prev, invited: [...prev.invited, h], inviteQ: '' }))
  }

  const sendInvites = () => {
    if (!s.invited.length) return
    const n = s.invited.length
    setS(prev => ({ ...prev, invited: [], modal: null }))
    say(`${n} ${n > 1 ? 'invites' : 'invite'} sent · ${s.inviteRole === 'Guest' ? 'guest token expires in ' + s.expiry : s.inviteRole.toLowerCase() + ' role on ensv2'}`)
  }

  const startMeet = (title: string) => {
    setS(prev => ({ ...prev, call: { state: 'live', title, base: 0, people: ['me', 'maya', 'arjun', 'priya', 'kabir', 'devika'] }, tick: 0, callMode: 'grid', callPanel: 'people', cam: true }))
  }

  const ring = (id: string, kind: string) => {
    setS(prev => ({ ...prev, call: { state: 'ringing', with: id, title: id + ' · ' + kind, base: 0, people: ['me', id] }, tick: 0, callMode: 'grid', callPanel: 'people', cam: kind === 'video' }))
  }

  const toggleShare = () => {
    const present = s.callMode !== 'present'
    setS(prev => ({ ...prev, callMode: present ? 'present' : 'grid' }))
    say(present ? 'Sharing your screen · 1080p, VP8 over Tor' : 'Stopped sharing')
  }

  const joinVoice = (teamId: string) => {
    const on = s.joinedVoice && s.voiceTeam === teamId
    const t = teams.find(x => x.id === teamId)
    setS(prev => ({ ...prev, joinedVoice: !on, voiceTeam: on ? null : teamId }))
    if (t?.voice) say(on ? 'Left ' + t.voice.name : 'Connected to ' + t.voice.name + ' · Opus over Tor')
  }

  const leaveVoice = () => {
    setS(prev => ({ ...prev, joinedVoice: false, voiceTeam: null }))
    say('Disconnected')
  }

  const endCall = () => {
    const secs = s.call ? s.call.base + s.tick : 0
    const mm = String(Math.floor(secs / 60)).padStart(2, '0')
    const ss2 = String(secs % 60).padStart(2, '0')
    setS(prev => ({ ...prev, call: null, callMode: 'grid', hand: false, rec: false, captions: false }))
    say(`Call ended · ${mm}:${ss2}`)
  }

  const sendCallChat = () => {
    const text = s.callDraft.trim()
    if (!text) return
    setS(prev => ({ ...prev, callChat: [...prev.callChat, { name: 'You', time: 'now', text }], callDraft: '' }))
  }

  // Palette search pool
  const buildPaletteResults = (pq: string) => {
    const pool: Array<{ label: string; meta: string; kind: string; icon: string; bg: string; go: () => void }> = []
    const pqL = pq.trim().toLowerCase()
    teams.forEach(tm => tm.channels.forEach(c => pool.push({
      label: '#' + c.name,
      meta: tm.name + ' · ' + c.kind,
      kind: 'channel',
      icon: c.kind === 'private' ? 'ph-lock-simple' : 'ph-hash',
      bg: 'transparent',
      go: () => setS(prev => ({ ...prev, rail: 'teams', team: tm.id, channel: c.id, tab: 'posts', palette: false, thread: null, teamOpen: { ...prev.teamOpen, [tm.id]: true } }))
    })))
    pool.push({ label: 'Meet now', meta: 'start a full-mesh room', kind: 'action', icon: 'ph-video-camera', bg: 'transparent', go: () => { setS(prev => ({ ...prev, palette: false })); startMeet('Meet now') } })
    pool.push({ label: 'Create a channel', meta: 'in ' + (teams.find(t => t.id === s.team)?.name || ''), kind: 'action', icon: 'ph-plus-circle', bg: 'transparent', go: () => setS(prev => ({ ...prev, palette: false, modal: 'create' })) })

    const filtered = pqL
      ? pool.filter(r => (r.label + ' ' + r.meta).toLowerCase().includes(pqL))
      : pool
    return filtered.slice(0, 8).map((r, i) => ({ ...r, bg: i === 0 && pqL ? '#e9f8ff' : 'transparent' }))
  }

  const currentTeam = getTeamFrom(teams, s)
  const currentChan = currentTeam ? getChanFrom(teams, s) : undefined
  const chanMsgs = currentTeam && currentChan ? (s.msgs[chanKey(currentTeam.id, currentChan.id)] || []) : []
  const inChannel = s.rail === 'teams'
  const inDM = s.rail === 'chat'
  const callActive = !!s.call && s.call.state === 'live'
  const isRinging = !!s.call && s.call.state === 'ringing'
  const ringWith = s.call?.state === 'ringing' ? s.call.with : undefined
  const ringPerson = ringWith ? { name: ringWith, initials: ringWith.slice(0, 2).toUpperCase(), tint: '#eae9e9', ink: '#444141' } : null

  const activityItems = [
    { title: 'Priya mentioned you in #critique', body: '"…@ravi can you confirm the halftone scope before the onboarding review?"', icon: 'ph-at', tint: '#e9f8ff', ink: '#004961', time: '09:31', weight: 600, nav: { rail: 'teams' as RailId, team: 'design', channel: 'critique' } },
    { title: '3 unread in #design-system', body: 'Arjun pinned the radius decision.', icon: 'ph-hash', tint: '#eae7e7', ink: '#444141', time: '08:52', weight: 600, nav: { rail: 'teams' as RailId, team: 'design', channel: 'system' } },
    { title: 'Guest token expires in 4 days', body: 'tarun.weave.eth · brand-refresh · ERC-1155 lapses on chain.', icon: 'ph-hourglass-high', tint: '#fff1f4', ink: '#aa0b56', time: '08:02', weight: 400, nav: { modal: 'members' } },
    { title: 'Missed call from Priya Iyer', body: 'Stealth address rotated; she redialled once.', icon: 'ph-phone-x', tint: '#fff1f4', ink: '#aa0b56', time: 'Yest', weight: 400, nav: { rail: 'calls' as RailId } },
    { title: 'Notes agent posted a summary', body: '#critique · two decisions, one owner.', icon: 'ph-robot', tint: '#eae7e7', ink: '#444141', time: 'Yest', weight: 400, nav: { rail: 'teams' as RailId, team: 'design', channel: 'critique' } },
  ]

  function handleActivityNav(nav: { rail?: RailId; team?: string; channel?: string; modal?: string }) {
    setS(prev => ({
      ...prev,
      ...(nav.rail ? { rail: nav.rail } : {}),
      ...(nav.team ? { team: nav.team } : {}),
      ...(nav.channel ? { channel: nav.channel } : {}),
      ...(nav.modal ? { modal: nav.modal as ModalId } : {}),
    }))
  }

  const memberIds = ['me', 'maya', 'arjun', 'priya', 'devika', 'kabir', 'tarun', 'notes']

  if (!identityChecked) return null

  if (!identity) {
    return (
      <OnboardingScreen
        onComplete={(data) => {
          setIdentity(data as { handle: string })
        }}
      />
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)', height: '100vh', minHeight: 600, background: '#f3f2f2', overflow: 'hidden' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Header
          onOpenPalette={() => setS(prev => ({ ...prev, palette: true, pq: '' }))}
          onMeetNow={() => startMeet('Meet now')}
          onOpenMembers={() => setS(prev => ({ ...prev, modal: 'members' }))}
        />
        {identity?.handle?.startsWith('admin.') && (
          <button
            onClick={() => setShowAdminPanel(true)}
            className="admin-btn"
            title="Org Admin Panel"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(32,30,29,.7)', padding: '5px 7px', borderRadius: 6, fontSize: 18 }}
          >
            <i className="ph-duotone ph-gear" />
          </button>
        )}
      </div>
      {showAdminPanel && identity && (
        <OrgAdminPanel
          adminHandle={identity.handle}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '74px 262px minmax(0,1fr)', minHeight: 0, borderTop: '1px solid rgba(32,30,29,.1)' }}>
        <NavRail
          active={s.rail}
          onSelect={(id: RailId) => setS(prev => ({ ...prev, rail: id }))}
          onInvite={() => setS(prev => ({ ...prev, modal: 'invite' }))}
        />

        <Sidebar
          rail={s.rail}
          teams={teams}
          teamOpen={s.teamOpen}
          activeTeam={s.team}
          activeChannel={s.channel}
          activeDM={s.dm}
          joinedVoice={s.joinedVoice}
          voiceTeam={s.voiceTeam}
          mic={s.mic}
          dmOrder={s.dmOrder}
          dms={s.dms}
          callLog={[]}
          filesScope={s.filesScope}
          activityScope={s.activityScope}
          onToggleTeam={id => setS(prev => ({ ...prev, teamOpen: { ...prev.teamOpen, [id]: !prev.teamOpen[id] }, team: id }))}
          onSelectChannel={(teamId, channelId) => setS(prev => ({ ...prev, rail: 'teams', team: teamId, channel: channelId, tab: 'posts', thread: null }))}
          onSelectDM={id => setS(prev => ({ ...prev, rail: 'chat', dm: id }))}
          onJoinVoice={joinVoice}
          onToggleMic={() => setS(prev => ({ ...prev, mic: !prev.mic }))}
          onLeaveVoice={leaveVoice}
          onOpenCreate={() => setS(prev => ({ ...prev, modal: 'create', newName: '', newDesc: '', newKind: 'standard' }))}
          onOpenPalette={() => setS(prev => ({ ...prev, palette: true, pq: '' }))}
          onSetFilesScope={id => setS(prev => ({ ...prev, filesScope: id }))}
          onSetActivityScope={id => setS(prev => ({ ...prev, activityScope: id }))}
        />

        <main style={{ position: 'relative', display: 'flex', minHeight: 0, background: '#f3f2f2' }}>
          {inChannel && !callActive && !isRinging && !currentTeam && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(32,30,29,.5)', fontSize: 14 }}>
              No channels yet. Your org admin will add channels.
            </div>
          )}
          {inChannel && !callActive && !isRinging && currentTeam && !currentChan && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(32,30,29,.5)', fontSize: 14 }}>
              Select a channel to start chatting
            </div>
          )}
          {inChannel && !callActive && !isRinging && currentTeam && currentChan && (
            <ChannelView
              team={currentTeam}
              channel={currentChan}
              messages={chanMsgs}
              tab={s.tab}
              draft={s.draft}
              threadId={s.thread}
              threadDraft={s.threadDraft}
              density="comfortable"
              onSetTab={t => setS(prev => ({ ...prev, tab: t }))}
              onDraft={v => setS(prev => ({ ...prev, draft: v }))}
              onSend={send}
              onToggleReaction={toggleReaction}
              onOpenThread={id => setS(prev => ({ ...prev, thread: id }))}
              onCloseThread={() => setS(prev => ({ ...prev, thread: null }))}
              onThreadDraft={v => setS(prev => ({ ...prev, threadDraft: v }))}
              onSendThread={sendThread}
              onOpenMembers={() => setS(prev => ({ ...prev, modal: 'members' }))}
              onOpenInvite={() => setS(prev => ({ ...prev, modal: 'invite' }))}
              onStartCall={() => startMeet('#' + currentChan!.name + ' · Meet now')}
              showPrivacy={true}
            />
          )}

          {inDM && !callActive && !isRinging && !s.dm && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(32,30,29,.5)', fontSize: 14 }}>
              No direct messages yet
            </div>
          )}
          {inDM && !callActive && !isRinging && s.dm && (
            <DMView
              dmId={s.dm}
              messages={s.dms[s.dm] || []}
              draft={s.draft}
              onDraft={v => setS(prev => ({ ...prev, draft: v }))}
              onSend={send}
              onStartAudioCall={() => ring(s.dm, 'audio')}
              onStartVideoCall={() => ring(s.dm, 'video')}
              onOpenMembers={() => setS(prev => ({ ...prev, modal: 'members' }))}
            />
          )}

          {s.rail === 'calls' && !callActive && !isRinging && (
            <CallsPageView
              callLog={[]}
              dial={s.dial}
              onKeypad={k => setS(prev => ({ ...prev, dial: prev.dial + k }))}
              onDialBack={() => setS(prev => ({ ...prev, dial: prev.dial.slice(0, -1) }))}
              onDialCall={() => ring('devika', 'audio')}
              onCallBack={id => ring(id, 'audio')}
            />
          )}

          {s.rail === 'files' && !callActive && !isRinging && (
            <FilesView files={[]} />
          )}

          {s.rail === 'activity' && !callActive && !isRinging && (
            <ActivityView items={activityItems} onNavigate={handleActivityNav} />
          )}

          {s.rail === 'meet' && !callActive && !isRinging && (
            <MeetView
              meetings={[]}
              joinCode={s.joinCode}
              onJoinCodeChange={v => setS(prev => ({ ...prev, joinCode: v }))}
              onJoin={title => startMeet(title)}
              onMeetNow={() => startMeet('Meet now')}
            />
          )}

          {callActive && s.call && (
            <CallView
              call={s.call}
              callMode={s.callMode}
              callPanel={s.callPanel}
              mic={s.mic}
              cam={s.cam}
              hand={s.hand}
              captions={s.captions}
              rec={s.rec}
              tick={s.tick}
              callChat={s.callChat}
              callDraft={s.callDraft}
              onToggleMic={() => setS(prev => ({ ...prev, mic: !prev.mic }))}
              onToggleCam={() => setS(prev => ({ ...prev, cam: !prev.cam }))}
              onToggleShare={toggleShare}
              onToggleHand={() => { setS(prev => ({ ...prev, hand: !prev.hand })); say(s.hand ? 'Hand lowered' : 'Hand raised') }}
              onToggleCaptions={() => setS(prev => ({ ...prev, captions: !prev.captions }))}
              onToggleRec={() => { setS(prev => ({ ...prev, rec: !prev.rec })); say(s.rec ? 'Recording stopped' : 'Recording — encrypted, stored on this device only') }}
              onToggleCallPanel={() => setS(prev => ({ ...prev, callPanel: prev.callPanel === 'none' ? 'people' : 'none' }))}
              onSetCallPanel={p => setS(prev => ({ ...prev, callPanel: p }))}
              onEndCall={endCall}
              onCallDraft={v => setS(prev => ({ ...prev, callDraft: v }))}
              onSendCallChat={sendCallChat}
              onOpenInvite={() => setS(prev => ({ ...prev, modal: 'invite' }))}
            />
          )}

          {isRinging && s.call && ringPerson && (
            <RingingModal
              name={ringPerson.name}
              initials={ringPerson.initials}
              tint={ringPerson.tint}
              ink={ringPerson.ink}
              meta="ringing · stealth key minted · dht lookup 1.4s"
              onConnect={() => setS(prev => ({ ...prev, call: prev.call ? { ...prev.call, state: 'live' } : null, tick: 0 }))}
              onCancel={endCall}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {s.modal === 'create' && (
        <CreateChannelModal
          teamName={currentTeam?.name || ''}
          newName={s.newName}
          newDesc={s.newDesc}
          newKind={s.newKind}
          onNameChange={v => setS(prev => ({ ...prev, newName: v }))}
          onDescChange={v => setS(prev => ({ ...prev, newDesc: v }))}
          onKindChange={k => setS(prev => ({ ...prev, newKind: k }))}
          onCreate={createChannel}
          onClose={() => setS(prev => ({ ...prev, modal: null }))}
        />
      )}

      {s.modal === 'invite' && (
        <InviteModal
          channelTitle={'#' + (currentChan?.name || '')}
          inviteQ={s.inviteQ}
          invited={s.invited}
          inviteRole={s.inviteRole}
          expiry={s.expiry}
          onInviteQChange={v => setS(prev => ({ ...prev, inviteQ: v }))}
          onAddInvite={addInvite}
          onRemoveInvite={h => setS(prev => ({ ...prev, invited: prev.invited.filter(x => x !== h) }))}
          onSetRole={r => setS(prev => ({ ...prev, inviteRole: r }))}
          onSetExpiry={e => setS(prev => ({ ...prev, expiry: e }))}
          onSendInvites={sendInvites}
          onClose={() => setS(prev => ({ ...prev, modal: null }))}
        />
      )}

      {s.modal === 'members' && (
        <MembersModal
          channelTitle={'#' + (currentChan?.name || '')}
          teamMembers={currentTeam?.members || 0}
          memberIds={memberIds}
          removed={s.removed}
          roleOverride={s.roleOverride}
          onSetRole={(id, role) => setS(prev => ({ ...prev, roleOverride: { ...prev.roleOverride, [id]: role } }))}
          onRemove={id => { setS(prev => ({ ...prev, removed: { ...prev.removed, [id]: true } })); say((id === 'me' ? 'You' : id) + ' removed from #' + (currentChan?.name || '')) }}
          onOpenInvite={() => setS(prev => ({ ...prev, modal: 'invite' }))}
          onClose={() => setS(prev => ({ ...prev, modal: null }))}
        />
      )}

      {s.palette && (
        <SearchPalette
          pq={s.pq}
          results={buildPaletteResults(s.pq)}
          onPqChange={v => setS(prev => ({ ...prev, pq: v }))}
          onClose={() => setS(prev => ({ ...prev, palette: false }))}
        />
      )}

      {/* Toast */}
      {s.toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: '#2d2b2b', color: '#f8f4f4', borderRadius: 2, boxShadow: '0 12px 32px rgba(45,43,43,.28)', zIndex: 60, animation: 'wv-rise .16s ease-out' }}>
          <i className="ph-duotone ph-check-circle" style={{ fontSize: 18, color: '#62c5ee' }}></i>
          <span style={{ fontSize: 13.5 }}>{s.toast}</span>
        </div>
      )}
    </div>
  )
}
