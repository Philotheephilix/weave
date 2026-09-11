export type Presence = '#0088b0' | '#edbb00' | '#9b9797'

export interface Person {
  name: string
  handle: string
  initials: string
  tint: string
  ink: string
  role: string
  presence: Presence
}

export interface VoiceParticipant {
  id: string
  muted?: boolean
}

export interface VoiceRoom {
  name: string
  people: string[]
}

export type ChannelKind = 'standard' | 'private' | 'announcement'

export interface Channel {
  id: string
  name: string
  kind: ChannelKind
  unread: number
  desc: string
}

export interface Team {
  id: string
  name: string
  initials: string
  tint: string
  ink: string
  members: number
  voice?: VoiceRoom
  channels: Channel[]
}

export interface Reaction {
  glyph: string
  count: number
  on: boolean
}

export interface ThreadReply {
  who: string
  time: string
  text: string
}

export interface Message {
  id: string
  who: string
  time: string
  text: string
  file?: { name: string; meta: string }
  reactions: Reaction[]
  replies: ThreadReply[]
}

export interface DMMessage {
  mine: boolean
  time: string
  text: string
}

export interface CallLogEntry {
  id: string
  name: string
  dir: 'in' | 'out' | 'missed'
  meta: string
  time: string
}

export interface FileRow {
  name: string
  by: string
  cid: string
  size: string
  icon: string
  kind: string
}

export interface Meeting {
  time: string
  title: string
  who: string
  live: boolean
}

export interface ActivityItem {
  title: string
  body: string
  icon: string
  tint: string
  ink: string
  time: string
  weight: number
  nav: { rail?: string; team?: string; channel?: string; modal?: string }
}

export interface CallTile {
  id: string
  initials: string
  name: string
  short: string
  tint: string
  ink: string
  role: string
  bg: string
  border: string
  mic: string
  micColor: string
  camIcon: string
  net: string
  handShow: string
  speakShow: string
}

export type RailId = 'activity' | 'chat' | 'teams' | 'calls' | 'files' | 'meet'
export type ModalId = 'create' | 'invite' | 'members' | null
export type CallPanelId = 'people' | 'chat' | 'none'
export type CallMode = 'grid' | 'present'
export type TabId = 'posts' | 'files' | 'board'

export interface AppState {
  rail: RailId
  teamOpen: Record<string, boolean>
  team: string
  channel: string
  dm: string
  tab: TabId
  filesScope: string
  activityScope: string
  msgs: Record<string, Message[]>
  dms: Record<string, DMMessage[]>
  dmOrder: string[]
  draft: string
  threadDraft: string
  thread: string | null
  modal: ModalId
  palette: boolean
  pq: string
  newName: string
  newDesc: string
  newKind: ChannelKind
  inviteQ: string
  invited: string[]
  inviteRole: string
  expiry: string
  removed: Record<string, boolean>
  roleOverride: Record<string, string>
  joinedVoice: boolean
  voiceTeam: string | null
  mic: boolean
  call: CallState | null
  callMode: CallMode
  callPanel: CallPanelId
  callDraft: string
  callChat: { name: string; time: string; text: string }[]
  cam: boolean
  hand: boolean
  captions: boolean
  rec: boolean
  tick: number
  dial: string
  joinCode: string
  toast: string | null
}

export interface CallState {
  state: 'live' | 'ringing'
  title: string
  with?: string
  base: number
  people: string[]
}
