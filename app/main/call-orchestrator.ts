/**
 * Tor-only call orchestrator — Noise_XX over TCP via SOCKS5.
 * No WebRTC. No STUN. Calls only work when both users have active Tor onion services.
 * Ported from Philotheephilix/ghostcall.
 */

import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import { TorManager } from './tor-manager.js'
import { OnionServer } from './onion-server.js'
import { noiseKeygen, NoiseSession } from './noise-session.js'
import { connectToOnion } from './onion-client.js'
import { setActiveTransport, clearTransport, isTransportActive, registerAudioIpcHandlers } from './audio-bridge.js'

const CALL_PORT = 7331

let torMgr: TorManager | null = null
const onionServer = new OnionServer()
let currentOnionAddr: string | null = null
let currentServiceId: string | null = null
let isOnline = false
let activeCall: { direction: string; onionAddr?: string } | null = null

export function initCallOrchestrator(tor: TorManager): void {
  torMgr = tor
}

async function goOnline(): Promise<string> {
  if (isOnline && currentOnionAddr) return currentOnionAddr
  if (!torMgr) throw new Error('TorManager not initialized')

  const { onionAddress, serviceId } = await torMgr.createOnionServiceWithPort(CALL_PORT, CALL_PORT)
  currentOnionAddr = `${onionAddress}:${CALL_PORT}`
  currentServiceId = serviceId
  isOnline = true
  return currentOnionAddr
}

function startInboundListener(noiseStaticPriv: Uint8Array, win: BrowserWindow): Promise<void> {
  if (onionServer.isListening()) return Promise.resolve()

  let connectionPending = false
  return onionServer.listen(CALL_PORT, async (socket) => {
    if (isTransportActive() || connectionPending) { socket.destroy(); return }
    connectionPending = true
    try {
      const transport = await NoiseSession.handshakeResponder(socket, noiseStaticPriv)
      setActiveTransport(transport, win.webContents)
      activeCall = { direction: 'inbound' }
      win.webContents.send('call:connected', { direction: 'inbound' })
    } catch (err) {
      connectionPending = false
      socket.destroy()
      win.webContents.send('call:error', { message: String(err) })
    }
  })
}

async function initiateCall(onionAddr: string, noiseStaticPriv: Uint8Array, win: BrowserWindow): Promise<void> {
  if (!torMgr) throw new Error('TorManager not initialized')
  const socks = torMgr.getSocksProxy()
  const socket = await connectToOnion(onionAddr, socks)
  try {
    const transport = await NoiseSession.handshakeInitiator(socket, noiseStaticPriv)
    setActiveTransport(transport, win.webContents)
    activeCall = { direction: 'outbound', onionAddr }
    win.webContents.send('call:connected', { direction: 'outbound', onionAddr })
  } catch (err) {
    socket.destroy()
    throw err
  }
}

async function hangUp(): Promise<void> {
  clearTransport()
  activeCall = null
  const sid = currentServiceId
  currentOnionAddr = null
  currentServiceId = null
  isOnline = false
  try { await onionServer.close() } catch { /* ignore */ }
  if (sid && torMgr) { try { await torMgr.removeOnion(sid) } catch { /* ignore */ } }
}

export function registerCallIpcHandlers(win: BrowserWindow): void {
  registerAudioIpcHandlers()

  ipcMain.handle('call:current-state', async () => activeCall)

  ipcMain.handle('call:go-online', async () => {
    try {
      const addr = await goOnline()
      const noiseKeys = noiseKeygen()
      await startInboundListener(noiseKeys.secretKey, win)
      return { onionAddr: addr }
    } catch (err) {
      throw new Error(`call:go-online failed: ${err}`)
    }
  })

  ipcMain.handle('call:initiate', async (_e, { onionAddr }: { onionAddr: string }) => {
    if (typeof onionAddr !== 'string' || !/^[a-z2-7]{56}\.onion:\d{1,5}$/.test(onionAddr)) {
      throw new Error(`Invalid onion address format: ${onionAddr}`)
    }
    const noiseKeys = noiseKeygen()
    await initiateCall(onionAddr, noiseKeys.secretKey, win)
    return { ok: true }
  })

  ipcMain.handle('call:hang-up', async () => {
    await hangUp()
    return { ok: true }
  })
}
