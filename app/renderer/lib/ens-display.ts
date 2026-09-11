export function ensLabel(handle: string): string {
  return handle.split('.')[0] || handle
}

export function ensInitials(handle: string): string {
  const label = ensLabel(handle)
  return label.slice(0, 2).toUpperCase()
}

// Returns a deterministic tint color from handle string for avatar bg
export function ensTint(handle: string): string {
  const tints = ['#e9f8ff', '#fef3c7', '#f0fdf4', '#fdf4ff', '#fff1f2', '#f0f9ff']
  let hash = 0
  for (const c of handle) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return tints[Math.abs(hash) % tints.length]
}
