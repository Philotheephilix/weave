import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { IdentityManager, createIdentity } from './identity-manager.js'
import { registerIpcHandlers } from './ipc-handlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tor   = new TorManager()
const dht   = new DHTDiscovery()
const nostr = new NostrDelivery()
const idMgr = new IdentityManager()
const identity = createIdentity()

async function bootstrap(): Promise<void> {
  await app.whenReady()

  // Tor and DHT startup is best-effort — window must open even if they fail
  await Promise.allSettled([tor.start(), dht.start()])

  tor.createOnionService(3000).then(onion => {
    dht.announce(identity.viewPriv, identity.viewPub, onion.onionAddress)
  }).catch(() => {})

  registerIpcHandlers(tor, dht, nostr, idMgr, identity)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    await win.loadURL('http://localhost:3000')
    win.webContents.openDevTools()
  } else {
    await win.loadFile(path.join(__dirname, '..', 'renderer', 'out', 'index.html'))
  }

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
