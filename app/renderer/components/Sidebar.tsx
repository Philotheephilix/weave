import React, { useState } from 'react'
import type { NavTab } from './NavRail'

export interface Channel {
  id: string
  name: string
  private?: boolean
  unread?: number
}

export interface Team {
  id: string
  name: string
  channels: Channel[]
}

export interface DMContact {
  id: string
  handle: string
  name: string
  status: 'online' | 'away' | 'busy' | 'offline'
  unread?: number
}

export const MOCK_TEAMS: Team[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    channels: [
      { id: 'eng-general', name: 'general', unread: 2 },
      { id: 'eng-backend', name: 'backend', private: true },
      { id: 'eng-ops', name: 'ops' },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    channels: [
      { id: 'des-general', name: 'general' },
      { id: 'des-backend', name: 'backend', private: true, unread: 1 },
      { id: 'des-ops', name: 'ops' },
    ],
  },
]

export const MOCK_DMS: DMContact[] = [
  { id: 'alice', handle: 'alice.weave.eth', name: 'Alice',  status: 'online',  unread: 2 },
  { id: 'bob',   handle: 'bob.weave.eth',   name: 'Bob',    status: 'away' },
  { id: 'carol', handle: 'carol.weave.eth', name: 'Carol',  status: 'offline' },
]

export const MOCK_CALLS = [
  { id: 'c1', name: 'Alice',  handle: 'alice.weave.eth', time: '10:32 AM', missed: false },
  { id: 'c2', name: 'Bob',    handle: 'bob.weave.eth',   time: 'Yesterday', missed: true },
  { id: 'c3', name: 'Carol',  handle: 'carol.weave.eth', time: 'Mon',       missed: false },
]

interface Props {
  nav: NavTab
  activeChannel: string
  activeDM: string
  onSelectChannel: (id: string) => void
  onSelectDM: (id: string) => void
  onCreateChannel: () => void
}

export default function Sidebar({ nav, activeChannel, activeDM, onSelectChannel, onSelectDM, onCreateChannel }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  const presenceClass = (s: DMContact['status']) =>
    s === 'online' ? 'presence-online' : s === 'away' ? 'presence-away' : s === 'busy' ? 'presence-busy' : 'presence-offline'

  if (nav === 'teams' || nav === 'chat') {
    return (
      <aside className="sidebar">
        <div className="sidebar-scroll">
          {MOCK_TEAMS.map(team => (
            <div key={team.id}>
              <div className="sidebar-section-header" onClick={() => toggle(team.id)}>
                <span className="sidebar-section-title">{team.name}</span>
                <button className="sidebar-section-btn" onClick={e => { e.stopPropagation(); onCreateChannel() }}>
                  <i className="ph-duotone ph-plus-duotone" />
                </button>
              </div>
              {!collapsed[team.id] && team.channels.map(ch => (
                <div
                  key={ch.id}
                  className={`sidebar-row${activeChannel === ch.id ? ' active' : ''}`}
                  onClick={() => onSelectChannel(ch.id)}
                >
                  {ch.private
                    ? <i className="ph-duotone ph-lock-duotone" />
                    : <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>#</span>
                  }
                  <span className="sidebar-row-name">{ch.name}</span>
                  {ch.unread && <span className="sidebar-row-badge">{ch.unread}</span>}
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">Direct Messages</span>
            </div>
            {MOCK_DMS.map(dm => (
              <div
                key={dm.id}
                className={`sidebar-row${activeDM === dm.id ? ' active' : ''}`}
                onClick={() => onSelectDM(dm.id)}
              >
                <span className={`sidebar-presence ${presenceClass(dm.status)}`} />
                <span className="sidebar-row-name">{dm.name}</span>
                {dm.unread && <span className="sidebar-row-badge">{dm.unread}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-voice-room">
          <i className="ph-duotone ph-waveform-duotone" />
          <span>Voice Room — #ops</span>
        </div>
      </aside>
    )
  }

  if (nav === 'calls') {
    return (
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Recent</span>
          </div>
          {MOCK_CALLS.map(c => (
            <div key={c.id} className="sidebar-row">
              <i className={`ph-duotone ${c.missed ? 'ph-phone-missed-duotone' : 'ph-phone-call-duotone'}`}
                 style={{ color: c.missed ? '#ef4444' : 'var(--primary)' }} />
              <span className="sidebar-row-name">{c.name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.time}</span>
            </div>
          ))}
        </div>
      </aside>
    )
  }

  if (nav === 'files') {
    return (
      <aside className="sidebar">
        <div className="sidebar-scroll">
          {MOCK_TEAMS.map(team => (
            <div key={team.id}>
              <div className="sidebar-section-header">
                <span className="sidebar-section-title">{team.name}</span>
              </div>
              {team.channels.map(ch => (
                <div key={ch.id} className="sidebar-row">
                  <i className="ph-duotone ph-folder-duotone" />
                  <span className="sidebar-row-name">#{ch.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
    )
  }

  if (nav === 'activity') {
    return (
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Sources</span>
          </div>
          {MOCK_TEAMS.map(team => (
            <div key={team.id} className="sidebar-row">
              <i className="ph-duotone ph-users-three-duotone" />
              <span className="sidebar-row-name">{team.name}</span>
            </div>
          ))}
          <div className="sidebar-row">
            <i className="ph-duotone ph-chat-dots-duotone" />
            <span className="sidebar-row-name">Direct Messages</span>
          </div>
        </div>
      </aside>
    )
  }

  if (nav === 'meet') {
    return (
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Today</span>
          </div>
          <div className="sidebar-row">
            <i className="ph-duotone ph-calendar-duotone" />
            <span className="sidebar-row-name">Sep 11 — Thursday</span>
          </div>
          <div className="sidebar-section-header" style={{ marginTop: 8 }}>
            <span className="sidebar-section-title">Upcoming</span>
          </div>
          <div className="sidebar-row">
            <i className="ph-duotone ph-calendar-check-duotone" />
            <span className="sidebar-row-name">Sprint planning</span>
          </div>
          <div className="sidebar-row">
            <i className="ph-duotone ph-calendar-check-duotone" />
            <span className="sidebar-row-name">Design sync</span>
          </div>
        </div>
      </aside>
    )
  }

  return <aside className="sidebar"><div className="sidebar-scroll" /></aside>
}
