import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { IdentityManager, createIdentity } from './identity-manager.js'
import { registerIpcHandlers, loadIdentity, deriveKeysFromSeed } from './ipc-handlers.js'
import { ArkivManager } from './arkiv-manager.js'
import { OnionListener } from './onion-listener.js'
import { cliArg, cliPort } from './cli-args.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Per-instance Tor ports via CLI flags (e.g. --tor-socks-port=9052 --tor-control-port=9053)
const tor = new TorManager({
  socksPort:   cliPort('tor-socks-port', 9050),
  controlPort: cliPort('tor-control-port', 9051),
  dataDir:     cliArg('tor-data-dir'),
})
const dht          = new DHTDiscovery()
const nostr        = new NostrDelivery()
const idMgr        = new IdentityManager()
const onionListener = new OnionListener()

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

  // Start the onion HTTP listener on an OS-assigned port (port 0) so multiple
  // instances on the same machine don't conflict. Must be after win is created.
  await onionListener.start(0, win)
  tor.createOnionService(onionListener.port).then(async onion => {
    dht.announce(identity.viewPriv, identity.viewPub, onion.onionAddress)
  }).catch(() => {})

  registerIpcHandlers(tor, dht, nostr, idMgr, identityRef, win, arkivRef, onionListener)

  await win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'out', 'index.html'))

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    onionListener.stop()
    tor.stop()
    dht.stop()
    nostr.close()
  })
}

bootstrap().catch(console.error)
