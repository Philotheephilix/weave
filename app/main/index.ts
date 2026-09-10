import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { TorManager } from './tor-manager'
import { DHTDiscovery } from './dht-discovery'
import { NostrDelivery } from './nostr-delivery'
import { IdentityManager, createIdentity } from './identity-manager'
import { registerIpcHandlers } from './ipc-handlers'

const tor   = new TorManager()
const dht   = new DHTDiscovery()
const nostr = new NostrDelivery()
const idMgr = new IdentityManager()
const identity = createIdentity()

async function bootstrap(): Promise<void> {
  await app.whenReady()
  await Promise.all([tor.start(), dht.start()])

  const onion = await tor.createOnionService(3000)
  dht.announce(identity.viewPriv, identity.viewPub, onion.onionAddress)

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
