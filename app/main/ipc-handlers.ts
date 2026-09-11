import { ipcMain } from 'electron'
import { TorManager } from './tor-manager.js'
import { DHTDiscovery } from './dht-discovery.js'
import { NostrDelivery } from './nostr-delivery.js'
import { IdentityManager, createIdentity, WeaveIdentity } from './identity-manager.js'
import { computeStealthAddress } from './crypto/stealth-address.js'

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
    if (!/^[a-z2-7]{56}\.onion$/.test(onionAddress)) return
    dht.announce(identity.viewPriv, identity.viewPub, onionAddress)
  })

  // Lookup can only decrypt records for the local identity (DHT values are encrypted to our viewPub).
  ipcMain.handle('weave:dht:lookup', async () => {
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000)
      dht.lookup(identity.viewPriv, (onion) => {
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
