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

  async function poll(channel: string): Promise<void> {
    try {
      const lastFetchKey    = `arkiv_last_${orgName}_${channel}`
      const storedTs        = localStorage.getItem(lastFetchKey)
      const sinceTimestamp  = storedTs
        ? parseInt(storedTs, 10)
        : Date.now() - 7 * 24 * 3600_000   // default: 7 days back on first run

      if (!window.weave?.arkiv) return
      const keyVersion = await window.weave.arkiv.getLatestKeyVersion({
        org:           orgName,
        channel,
        recipientLabel: myLabel,
      })
      if (keyVersion < 0) return  // not a member of this channel yet

      const messages = await window.weave.arkiv.fetchMessages({
        org:            orgName,
        channel,
        sinceTimestamp,
        keyVersion,
      })

      if (messages.length) {
        dispatch({ type: 'ARKIV_MESSAGES_RECEIVED', payload: { channel, messages } })
        localStorage.setItem(lastFetchKey, String(Date.now()))
      }
    } catch (err) {
      console.warn(`[arkiv-poller] poll failed for ${orgName}/${channel}:`, err)
    }
  }

  for (const channel of channels) {
    // Immediate first fetch, then on interval
    await poll(channel)
    handles.set(channel, setInterval(() => { void poll(channel) }, INTERVAL_MS))
  }

  // Return a cleanup function
  return () => handles.forEach(h => clearInterval(h))
}
