// app/renderer/lib/arkiv-poller.ts
//
// Polls Arkiv for new messages on all channels the user belongs to.
// Runs every 30 seconds. On first open, fetches the last 7 days.
//
// Usage:
//   const stop = await startArkivPoller(orgName, myLabel, ['general', 'eng'], dispatch)
//   // later:
//   stop()

export async function startArkivPoller(
  orgName: string,
  myLabel: string,
  channels: string[],
  dispatch: (action: { type: string; payload: unknown }) => void,
): Promise<() => void> {
  const INTERVAL_MS = 30_000
  const handles     = new Map<string, ReturnType<typeof setInterval>>()
  // Track which channels have completed the initial backfill so incremental polls use the cache
  const seeded      = new Set<string>()

  async function poll(channel: string): Promise<void> {
    try {
      if (!window.weave?.arkiv) return
      // recipientLabel is stored as "handle.org" (e.g. "bob.google"), not just the first segment
      const recipientLabel = myLabel.includes('.') ? myLabel : `${myLabel}.${orgName}`
      const keyVersion = await window.weave.arkiv.getLatestKeyVersion({
        org:           orgName,
        channel,
        recipientLabel,
      })
      if (keyVersion < 0) return  // not a member of this channel yet

      // On first run always backfill from 0; after that use the cached timestamp
      const lastFetchKey   = `arkiv_last_${orgName}_${channel}`
      const storedTs       = seeded.has(channel) ? localStorage.getItem(lastFetchKey) : null
      const sinceTimestamp = storedTs ? parseInt(storedTs, 10) : 0

      // Fetch from all key versions (0..latest) to cover messages posted under old keys
      const allMessages: { id: string; sender: string; timestamp: number; text: string }[] = []
      for (let v = 0; v <= keyVersion; v++) {
        try {
          const batch = await window.weave.arkiv.fetchMessages({
            org:            orgName,
            channel,
            sinceTimestamp,
            keyVersion:     v,
          })
          allMessages.push(...batch)
        } catch {
          // key version not decryptable (e.g. rotated without us as member) — skip
        }
      }

      seeded.add(channel)

      if (allMessages.length) {
        dispatch({ type: 'ARKIV_MESSAGES_RECEIVED', payload: { channel, messages: allMessages } })
        localStorage.setItem(lastFetchKey, String(Date.now()))
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

  // Return a cleanup function
  return () => handles.forEach(h => clearInterval(h))
}
