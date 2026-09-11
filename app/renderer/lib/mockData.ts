import type { Person, Team, Message, DMMessage, CallLogEntry, FileRow, Meeting } from './types'

export const people: Record<string, Person> = {
  me:     { name: 'Ravi Menon',     handle: 'ravi.weave.eth',   initials: 'RM', tint: '#cbeeff', ink: '#004961', role: 'Owner · design',    presence: '#0088b0' },
  maya:   { name: 'Maya Rao',       handle: 'maya.weave.eth',   initials: 'MR', tint: '#ffdee6', ink: '#aa0b56', role: 'Moderator · design', presence: '#0088b0' },
  arjun:  { name: 'Arjun Nair',     handle: 'arjun.weave.eth',  initials: 'AN', tint: '#cbeeff', ink: '#004961', role: 'Member · design',    presence: '#0088b0' },
  priya:  { name: 'Priya Iyer',     handle: 'priya.weave.eth',  initials: 'PI', tint: '#eae7e7', ink: '#444141', role: 'Member · design',    presence: '#edbb00' },
  devika: { name: 'Devika Suresh',  handle: 'devika.weave.eth', initials: 'DS', tint: '#ffdee6', ink: '#aa0b56', role: 'Member · tech',      presence: '#9b9797' },
  kabir:  { name: 'Kabir Shah',     handle: 'kabir.weave.eth',  initials: 'KS', tint: '#cbeeff', ink: '#004961', role: 'Moderator · tech',   presence: '#0088b0' },
  nithya: { name: 'Nithya Balan',   handle: 'nithya.weave.eth', initials: 'NB', tint: '#eae7e7', ink: '#444141', role: 'Owner · people',     presence: '#edbb00' },
  tarun:  { name: 'Tarun Das',      handle: 'tarun.weave.eth',  initials: 'TD', tint: '#cbeeff', ink: '#004961', role: 'Guest · brand',      presence: '#9b9797' },
  notes:  { name: 'Notes agent',    handle: 'agent-notes.weave.eth', initials: 'NA', tint: '#fff1f4', ink: '#aa0b56', role: 'Agent · scoped', presence: '#0088b0' },
}

export const initialTeams: Team[] = [
  {
    id: 'design', name: 'Design Guild', initials: 'DG', tint: '#cbeeff', ink: '#004961', members: 40,
    voice: { name: 'Studio floor', people: ['maya', 'arjun'] },
    channels: [
      { id: 'general',  name: 'general',      kind: 'standard',     unread: 0, desc: 'Whole-guild announcements. 40 members, gossip-distributed.' },
      { id: 'critique', name: 'critique',     kind: 'standard',     unread: 0, desc: 'Work in progress, twice a week. Post the plate, take the notes.' },
      { id: 'system',   name: 'design-system',kind: 'standard',     unread: 3, desc: 'Tokens, components and the press treatments that ship with them.' },
      { id: 'brand',    name: 'brand-refresh',kind: 'private',      unread: 0, desc: 'Private. Refresh workstream with two guests on expiring tokens.' },
    ],
  },
  {
    id: 'tech', name: 'Tech', initials: 'TE', tint: '#eae7e7', ink: '#444141', members: 18,
    voice: { name: 'Pairing room', people: ['kabir'] },
    channels: [
      { id: 'engineering', name: 'engineering', kind: 'standard',      unread: 0, desc: 'Electron shell, Tor manager, DHT discovery.' },
      { id: 'releases',    name: 'releases',    kind: 'announcement',  unread: 0, desc: 'Announcement channel — moderators post, everyone reads.' },
      { id: 'incidents',   name: 'incidents',   kind: 'standard',      unread: 1, desc: 'Onion service health, relay flaps, mesh degradation.' },
    ],
  },
  {
    id: 'people', name: 'People & HR', initials: 'HR', tint: '#ffdee6', ink: '#aa0b56', members: 6,
    channels: [
      { id: 'hiring',     name: 'hiring',     kind: 'private',  unread: 0, desc: 'Private. Loops, scorecards, offers.' },
      { id: 'onboarding', name: 'onboarding', kind: 'standard', unread: 0, desc: 'Day-one setup: identity keys, onion address, device pairing.' },
    ],
  },
]

export const initialMsgs: Record<string, Message[]> = {
  'design/critique': [
    { id: 'c1', who: 'maya',  time: '09:12', text: 'Second pass on the cover plates. I pulled the misregistration in by half — at 80px the fringes were reading as an anaglyph poster instead of a breath out of register.', file: { name: 'cover-plates-v2.png', meta: 'bafybeic7…k3qa · 2.4 MB · chacha20' }, reactions: [{ glyph: '✓', count: 4, on: false }], replies: [] },
    { id: 'c2', who: 'arjun', time: '09:14', text: 'Much better. The C plate holding still is what makes it read as print and not as a glitch.', reactions: [], replies: [] },
    { id: 'c3', who: 'priya', time: '09:20', text: 'Do we keep the halftone on interface imagery, or is that a deck-only treatment? Asking because the onboarding screens inherit it right now.', reactions: [{ glyph: '★', count: 2, on: false }], replies: [
      { who: 'maya',  time: '09:22', text: 'Deck-only for the full separation. Interface imagery takes the plain dot screen — cheaper to render and it survives at 1x.' },
      { who: 'arjun', time: '09:25', text: 'Agreed. I will note it in design-system so the onboarding set stops inheriting the wrong one.' },
      { who: 'priya', time: '09:31', text: 'Perfect, that unblocks the onboarding review.' },
    ]},
    { id: 'c4', who: 'notes', time: '09:34', text: 'Summary posted: two decisions (halftone scope, plate offsets halved), one owner — Arjun, by Thursday.', reactions: [], replies: [] },
  ],
  'design/system': [
    { id: 's1', who: 'arjun', time: '08:40', text: 'Radius stays at 2px everywhere. Anything rounder starts to look like a consumer chat app and the whole point is that this reads as print.', reactions: [{ glyph: '✓', count: 6, on: false }], replies: [] },
    { id: 's2', who: 'maya',  time: '08:52', text: 'Pushed the tonal ramps: every role now shares one perceptual lightness scale, so step 500 of cyan and magenta carry the same weight.', file: { name: 'ramps.css', meta: 'bafybeih2…9tzz · 11 KB · chacha20' }, reactions: [], replies: [] },
  ],
  'design/general': [
    { id: 'g1', who: 'nithya', time: 'Mon', text: 'Guild is 40 as of today — Tarun joins the refresh pod as a guest, token expires in 30 days.', reactions: [{ glyph: '✓', count: 9, on: false }], replies: [] },
  ],
  'design/brand': [
    { id: 'b1', who: 'maya', time: 'Tue', text: 'Private channel, two guests on expiring tokens. Keep the unreleased marks in here only — this history never leaves the member set.', reactions: [], replies: [] },
  ],
  'tech/incidents': [
    { id: 'i1', who: 'kabir', time: '07:58', text: 'Onion service reintroduced itself after a descriptor refresh. Calls that were mid-handshake had to redial; nothing dropped after that.', reactions: [{ glyph: '✓', count: 3, on: false }], replies: [] },
  ],
  'tech/engineering': [
    { id: 'e1', who: 'devika', time: 'Yest', text: 'DHT lookups now cached for 10 minutes per handle, which cuts call setup from 6s to about 1.4s on a warm cache.', reactions: [{ glyph: '★', count: 5, on: false }], replies: [] },
  ],
}

export const initialDMs: Record<string, DMMessage[]> = {
  maya:   [
    { mine: false, time: '09:02', text: 'Are you presenting the plates at the all-hands or should I?' },
    { mine: true,  time: '09:03', text: 'You take it — it is your treatment. I will run the ramps section after.' },
    { mine: false, time: '09:04', text: 'Deal. Sending the deck over the mesh now, it is 40MB so it will trickle.' },
  ],
  kabir:  [
    { mine: false, time: '08:10', text: 'Descriptor refresh is done, your onion address is unchanged.' },
    { mine: true,  time: '08:12', text: 'Thanks — I will redial the standup room.' },
  ],
  nithya: [{ mine: false, time: 'Mon', text: 'Tarun guest token issued: 30 days, brand-refresh only.' }],
  notes:  [{ mine: false, time: '09:34', text: 'I can only read channels you scope me to. Right now that is critique and design-system.' }],
}

export const dmOrder = ['maya', 'kabir', 'nithya', 'notes']

export const callLog: CallLogEntry[] = [
  { id: 'maya',   name: 'Maya Rao',        dir: 'in',     meta: 'stealth · 12m 04s',       time: '09:40' },
  { id: 'kabir',  name: 'Standup · Tech',  dir: 'out',    meta: 'mesh · 6 peers · 24m',    time: '08:30' },
  { id: 'priya',  name: 'Priya Iyer',      dir: 'missed', meta: 'missed · redialled once',  time: 'Yest'  },
  { id: 'devika', name: 'Devika Suresh',   dir: 'out',    meta: 'audio · 4m 11s',          time: 'Yest'  },
  { id: 'nithya', name: 'Nithya Balan',    dir: 'in',     meta: 'audio · 51s',             time: 'Mon'   },
]

export const fileRows: FileRow[] = [
  { name: 'cover-plates-v2.png',      by: 'Maya Rao',    cid: 'bafybeic7…k3qa', size: '2.4 MB', icon: 'ph-image',      kind: 'image · plates' },
  { name: 'ramps.css',                by: 'Arjun Nair',  cid: 'bafybeih2…9tzz', size: '11 KB',  icon: 'ph-file-css',   kind: 'stylesheet' },
  { name: 'onboarding-flow.pdf',      by: 'Priya Iyer',  cid: 'bafybeid9…m1xk', size: '8.1 MB', icon: 'ph-file-pdf',   kind: 'document' },
  { name: 'standup-2026-09-09.enc',   by: 'Notes agent', cid: 'bafybeib4…7wqe', size: '46 MB',  icon: 'ph-file-audio', kind: 'recording' },
  { name: 'guild-roster.csv',         by: 'Nithya Balan',cid: 'bafybeia1…22pl', size: '6 KB',   icon: 'ph-file-csv',   kind: 'table' },
  { name: 'brand-marks-wip.fig',      by: 'Tarun Das',   cid: 'bafybeif8…0cdr', size: '19 MB',  icon: 'ph-file',       kind: 'design source' },
]

export const meetings: Meeting[] = [
  { time: '10:00', title: 'Design critique',   who: 'Design Guild · 12 invited', live: true  },
  { time: '13:30', title: 'Tech standup',       who: 'Tech · 6 invited',          live: false },
  { time: '16:00', title: 'Onboarding review',  who: 'Priya, Nithya, you',        live: false },
]
