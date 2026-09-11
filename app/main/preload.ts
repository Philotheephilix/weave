import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('weave', {
  identity: {
    get: () => ipcRenderer.invoke('weave:identity:get'),
  },
  resolve:       (label: string) => ipcRenderer.invoke('weave:resolve', label),
  notifications: {
    poll: () => ipcRenderer.invoke('weave:notifications:poll'),
  },
  dht: {
    announce: (onion: string) => ipcRenderer.invoke('weave:dht:announce', onion),
    lookup:   (viewPub: string) => ipcRenderer.invoke('weave:dht:lookup', viewPub),
  },
  tor: {
    proxy: () => ipcRenderer.invoke('weave:tor:proxy'),
  },
  stealth: {
    compute: (viewPub: string, spendPub: string) =>
      ipcRenderer.invoke('weave:stealth:compute', viewPub, spendPub),
  },
})
