export function formatTime(secs: number): string {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/** Returns a tint+ink pair for an arbitrary string seed */
const TINTS: [string, string][] = [
  ['#cbeeff', '#004961'],
  ['#ffdee6', '#aa0b56'],
  ['#eae7e7', '#444141'],
  ['#fff1f4', '#aa0b56'],
]

export function avatarColors(seed: string): { tint: string; ink: string } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
  const [tint, ink] = TINTS[h % TINTS.length]
  return { tint, ink }
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
