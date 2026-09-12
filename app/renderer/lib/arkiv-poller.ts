export async function startArkivPoller(
  orgName: string,
  myLabel: string,
  channels: string[],
  dispatch: (action: { type: string; payload: unknown }) => void,
): Promise<() => void> {
  const INTERVAL_MS = 30_000
  const handles     = new Map<string, ReturnType<typeof setInterval>>()
  // Channels past their initial backfill; only those read the cached timestamp
  const seeded      = new Set<string>()

  async function poll(channel: string): Promise<void> {
    try {
      if (!window.weave?.arkiv) return
      // Keys are stored under "handle.org" (e.g. "bob.google"), not the bare handle
      const recipientLabel = myLabel.includes('.') ? myLabel : `${myLabel}.${orgName}`
      const keyVersion = await window.weave.arkiv.getLatestKeyVersion({ org: orgName, channel, recipientLabel })
      if (keyVersion < 0) return  // not a member of this channel yet

      const lastFetchKey   = `arkiv_last_${orgName}_${channel}`
      const storedTs       = seeded.has(channel) ? localStorage.getItem(lastFetchKey) : null
      const sinceTimestamp = storedTs ? parseInt(storedTs, 10) : 0

      // Sweep every key version so messages under rotated-out keys still surface.
      // A version we cannot decrypt (rotated without us as member) yields nothing.
      const seen = new Set<string>()
      const allMessages: { id: string; sender: string; timestamp: number; text: string }[] = []
      for (let v = 0; v <= keyVersion; v++) {
        const batch = await window.weave.arkiv
          .fetchMessages({ org: orgName, channel, sinceTimestamp, keyVersion: v })
          .catch(() => [])
        for (const msg of batch) {
          if (seen.has(msg.id)) continue
          seen.add(msg.id)
          allMessages.push(msg)
        }
      }

      seeded.add(channel)

      if (allMessages.length) {
        dispatch({ type: 'ARKIV_MESSAGES_RECEIVED', payload: { channel, messages: allMessages } })
        const maxTs = Math.max(...allMessages.map(m => m.timestamp))
        localStorage.setItem(lastFetchKey, String(maxTs))
      }
    } catch (err) {
      console.warn(`[arkiv-poller] poll failed for ${orgName}/${channel}:`, err)
    }
  }

  for (const channel of channels) {
    // Immediate first fetch (full backfill), then incremental on interval
    await poll(channel)
    handles.set(channel, setInterval(() => { void poll(channel) }, INTERVAL_MS))
  }

  return () => handles.forEach(h => clearInterval(h))
}
