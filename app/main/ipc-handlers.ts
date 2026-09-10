/**
 * IPC bridge between Electron main process and renderer.
 * All channel names are prefixed 'weave:' to avoid collisions.
 */
import { ipcMain } from 'electron'
import { TorManager } from './tor-manager'
import { DHTDiscovery } from './dht-discovery'
import { NostrDelivery } from './nostr-delivery'
import { IdentityManager, createIdentity, WeaveIdentity } from './identity-manager'
import { computeStealthAddress } from './crypto/stealth-address'
import { NoiseXXSession } from './crypto/noise-xx'

export function registerIpcHandlers(
  tor: TorManager,
  dht: DHTDiscovery,
  nostr: NostrDelivery,
  idMgr: IdentityManager,
  identity: WeaveIdentity,
): void {

  ipcMain.handle('weave:identity:get', () => ({
    viewPub:   Buffer.from(identity.viewPub).toString('hex'),
    spendPub:  Buffer.from(identity.spendPub).toString('hex'),
    noisePub:  Buffer.from(identity.noisePub).toString('hex'),
  }))

  ipcMain.handle('weave:resolve', async (_e, label: string) => {
    return idMgr.resolveHandle(label)
  })

  ipcMain.handle('weave:notifications:poll', async () => {
    return idMgr.pollNotificationLog(identity.spendPub)
  })

  ipcMain.handle('weave:dht:announce', (_e, onionAddress: string) => {
    dht.announce(identity.viewPub, onionAddress)
  })

  ipcMain.handle('weave:dht:lookup', async (_e, viewPubHex: string) => {
    const viewPub = Buffer.from(viewPubHex, 'hex')
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000)
      dht.lookup(viewPub, identity.viewPriv, (onion) => {
        clearTimeout(timer)
        resolve(onion)
      })
    })
  })

  ipcMain.handle('weave:tor:proxy', () => tor.getSocksProxy())

  ipcMain.handle('weave:stealth:compute', (_e, viewPubHex: string, spendPubHex: string) => {
    const ephPriv = new Uint8Array(32)
    crypto.getRandomValues(ephPriv)
    return computeStealthAddress(
      { viewPub: Buffer.from(viewPubHex, 'hex'), spendPub: Buffer.from(spendPubHex, 'hex') },
      ephPriv,
    )
  })
}
