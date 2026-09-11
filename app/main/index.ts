import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { IdentityManager, createIdentity } from './identity-manager.js'
import { registerIpcHandlers, loadIdentity, deriveKeysFromSeed } from './ipc-handlers.js'
import { ArkivManager } from './arkiv-manager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tor   = new TorManager()
const dht   = new DHTDiscovery()
const nostr = new NostrDelivery()
const idMgr = new IdentityManager()

async function bootstrap(): Promise<void> {
  await app.whenReady()

  // Attempt to load a persisted identity so returning users never use ephemeral keys.
  // Falls back to a fresh ephemeral identity if no seed is stored yet.
  let identity = createIdentity()
  const persisted = loadIdentity()
  if (persisted?.seedPhrase) {
    try {
      const { identity: derived } = deriveKeysFromSeed(persisted.seedPhrase as string[])
      identity = derived
    } catch {
      // corrupt seed — keep ephemeral, user will need to log in again
    }
  }

  // Tor and DHT startup is best-effort — window must open even if they fail
  await Promise.allSettled([tor.start(), dht.start()])

  tor.createOnionService(3000).then(onion => {
    dht.announce(identity.viewPriv, identity.viewPub, onion.onionAddress)
  }).catch(() => {})

  // Initialise ArkivManager with the correct spend key.
  // Wrapped in a mutable ref so the login handler can replace it after auth.
  const spendPrivHex = `0x${Buffer.from(identity.spendPriv).toString('hex')}` as `0x${string}`
  const arkivRef: { current: ArkivManager } = { current: new ArkivManager(spendPrivHex) }
  await arkivRef.current.init()

  // Wrap identity in a mutable ref so login can swap in the real keys.
  const identityRef: { current: typeof identity } = { current: identity }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  registerIpcHandlers(tor, dht, nostr, idMgr, identityRef, win, arkivRef)

  await win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'out', 'index.html'))

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    tor.stop()
    dht.stop()
    nostr.close()
  })
}

bootstrap().catch(console.error)
