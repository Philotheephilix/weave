import type { Person, Team, FileRow, CallLogEntry, ActivityItem, Meeting } from './types'

export const people: Record<string, Person> = {
  me:    { name: 'Ravi Menon',    handle: 'ravi.weave.eth',    initials: 'RM', tint: '#cbeeff', ink: '#004961', role: 'Owner',    presence: '#0088b0' },
  alice: { name: 'Alice Chen',    handle: 'alice.weave.eth',   initials: 'AC', tint: '#d1fae5', ink: '#065f46', role: 'Member',   presence: '#0088b0' },
  bob:   { name: 'Bob Nakamura',  handle: 'bob.weave.eth',     initials: 'BN', tint: '#fef3c7', ink: '#92400e', role: 'Member',   presence: '#edbb00' },
  carol: { name: 'Carol Zhang',   handle: 'carol.weave.eth',   initials: 'CZ', tint: '#ede9fe', ink: '#4c1d95', role: 'Guest',    presence: '#0088b0' },
  dave:  { name: 'Dave Kim',      handle: 'dave.weave.eth',    initials: 'DK', tint: '#fee2e2', ink: '#991b1b', role: 'Member',   presence: '#9b9797' },
  eve:   { name: 'Eve Santos',    handle: 'eve.weave.eth',     initials: 'ES', tint: '#e9dcff', ink: '#4a1d96', role: 'Operator', presence: '#0088b0' },
  maya:  { name: 'Maya Rao',      handle: 'maya.weave.eth',    initials: 'MR', tint: '#cbeeff', ink: '#004961', role: 'Member',   presence: '#0088b0' },
  arjun: { name: 'Arjun Patel',   handle: 'arjun.weave.eth',   initials: 'AP', tint: '#fce7f3', ink: '#831843', role: 'Member',   presence: '#edbb00' },
  priya: { name: 'Priya Sharma',  handle: 'priya.weave.eth',   initials: 'PS', tint: '#dcfce7', ink: '#14532d', role: 'Member',   presence: '#9b9797' },
}

export const teams: Team[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    initials: 'EG',
    tint: '#cbeeff',
    ink: '#004961',
    members: 12,
    channels: [
      { id: 'eng-general',    name: 'general',    kind: 'standard',     unread: 3, desc: 'Engineering-wide announcements and discussion' },
      { id: 'eng-backend',    name: 'backend',    kind: 'standard',     unread: 0, desc: 'Backend services and infra' },
      { id: 'eng-frontend',   name: 'frontend',   kind: 'private',      unread: 1, desc: 'UI / renderer work' },
      { id: 'eng-alerts',     name: 'alerts',     kind: 'announcement', unread: 0, desc: 'Automated pipeline alerts' },
    ],
    voice: { name: 'Daily Standup', people: ['AC', 'BN'] },
  },
  {
    id: 'design',
    name: 'Design',
    initials: 'DS',
    tint: '#fef3c7',
    ink: '#92400e',
    members: 5,
    channels: [
      { id: 'design-general', name: 'general', kind: 'standard', unread: 0, desc: 'Design team channel' },
      { id: 'design-assets',  name: 'assets',  kind: 'standard', unread: 2, desc: 'Shared design assets' },
    ],
  },
]

export const fileRows: FileRow[] = [
  { name: 'weave-spec-v2.pdf',         by: 'Alice Chen',   cid: 'bafybeig...a1',  size: '1.2 MB', icon: 'ph-duotone ph-file-pdf',      kind: 'PDF'  },
  { name: 'contracts-audit.xlsx',      by: 'Bob Nakamura', cid: 'bafybeig...b2',  size: '340 KB', icon: 'ph-duotone ph-file-xls',      kind: 'XLSX' },
  { name: 'noise-protocol-diagram.png',by: 'Carol Zhang',  cid: 'bafybeig...c3',  size: '820 KB', icon: 'ph-duotone ph-image',         kind: 'PNG'  },
  { name: 'ens-deployment-notes.md',   by: 'Dave Kim',     cid: 'bafybeig...d4',  size: '28 KB',  icon: 'ph-duotone ph-file-text',     kind: 'MD'   },
  { name: 'cre-workflow.zip',          by: 'Eve Santos',   cid: 'bafybeig...e5',  size: '5.1 MB', icon: 'ph-duotone ph-file-archive',  kind: 'ZIP'  },
]

export const callLog: CallLogEntry[] = [
  { id: '1', name: 'Alice Chen',   dir: 'in',     meta: 'Voice · 12m',  time: '2h ago'     },
  { id: '2', name: 'Bob Nakamura', dir: 'out',    meta: 'Voice · 5m',   time: 'Yesterday'  },
  { id: '3', name: 'Carol Zhang',  dir: 'missed', meta: 'Missed',       time: 'Yesterday'  },
  { id: '4', name: 'Dave Kim',     dir: 'out',    meta: 'Video · 31m',  time: '3 days ago' },
]

export const meetings: Meeting[] = [
  { time: '10:00 AM', title: 'Engineering Standup', who: 'alice.weave.eth',  live: true  },
  { time: '2:30 PM',  title: 'Design Review',       who: 'carol.weave.eth', live: false },
]

export const activityItems: ActivityItem[] = [
  {
    title:   '#eng-general',
    body:    'Alice Chen: The Noise_XX handshake tests are all green now.',
    icon:    'ph-duotone ph-hash',
    tint:    '#cbeeff',
    ink:     '#004961',
    time:    '5m ago',
    weight:  600,
    nav:     { rail: 'teams', team: 'engineering', channel: 'eng-general' },
  },
  {
    title:   'Alice Chen → You',
    body:    'Can you review the ERC-5564 stealth scan PR?',
    icon:    'ph-duotone ph-envelope',
    tint:    '#d1fae5',
    ink:     '#065f46',
    time:    '1h ago',
    weight:  400,
    nav:     { rail: 'chat' },
  },
  {
    title:   'ENSv2 deploy confirmed',
    body:    'WeaveWildcardResolver at 0x7803f8…8b08 is live on Sepolia.',
    icon:    'ph-duotone ph-check-circle',
    tint:    '#fef3c7',
    ink:     '#92400e',
    time:    '3h ago',
    weight:  400,
    nav:     {},
  },
]

import type { Message, DMMessage } from './types'

export const initialTeams = teams

export const initialMsgs: Record<string, Message[]> = {
  'eng-general': [
    { id: 'm1', who: 'alice', time: '9:04 AM', text: 'Noise_XX 3-message handshake passing all 8 test cases.',                       file: undefined, reactions: [{ glyph: '🔐', count: 3, on: false }], replies: [] },
    { id: 'm2', who: 'bob',   time: '9:12 AM', text: 'DHT announce working end-to-end with BEP-44 mutable put.',                     file: undefined, reactions: [],                                          replies: [] },
    { id: 'm3', who: 'me',    time: '9:20 AM', text: 'CRE TEE scan confirmed — ERC-5564 stealth matching correct in Go test suite.', file: undefined, reactions: [{ glyph: '✅', count: 2, on: true }],  replies: [] },
  ],
  'eng-backend': [],
  'eng-frontend': [
    { id: 'm4', who: 'carol', time: '10:15 AM', text: 'Ref UI ported 1:1 — NavRail, Sidebar, ChannelView, DMView all rendering.',   file: undefined, reactions: [], replies: [] },
  ],
  'eng-alerts':     [],
  'design-general': [],
  'design-assets':  [],
}

export const initialDMs: Record<string, DMMessage[]> = {
  alice: [
    { mine: false, time: '8:50 AM', text: 'Hey! Can you review the ERC-5564 stealth scan PR?' },
    { mine: true,  time: '8:52 AM', text: 'On it — looks good so far, the view key ECDH is correct now.' },
  ],
  bob:   [],
  carol: [
    { mine: false, time: 'Yesterday', text: 'Dropped the new font assets in design-assets. Phosphor Icons look great.' },
  ],
  dave:  [],
  eve:   [],
}

export const dmOrder = ['alice', 'carol', 'bob', 'dave', 'eve']
