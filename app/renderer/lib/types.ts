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
  arkivId?: string       // Arkiv entity key, if persisted
  fromArkiv?: boolean    // true if this message was fetched from Arkiv (not live Tor)
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

export type RailId = 'members' | 'chat' | 'teams' | 'calls'
export type ModalId = 'create' | 'invite' | 'members' | null
export type CallPanelId = 'people' | 'chat' | 'none'
export type CallMode = 'grid' | 'present'
export type TabId = 'posts' | 'files' | 'board'

export interface AppState {
  rail: RailId
  arkivLastFetch: Record<string, number>       // `${org}/${channel}` → last fetch timestamp ms
  channelKeyVersions: Record<string, number>   // `${org}/${channel}` → current keyVersion
  teamOpen: Record<string, boolean>
  team: string
  channel: string
  dm: string
  tab: TabId
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
