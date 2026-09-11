import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('weave', {
  identity: {
    get:          () => ipcRenderer.invoke('weave:identity:get'),
    generateSeed: () => ipcRenderer.invoke('weave:identity:generate-seed'),
    save:         (data: any) => ipcRenderer.invoke('weave:identity:save', data),
    load:         () => ipcRenderer.invoke('weave:identity:load'),
    login:        (data: any) => ipcRenderer.invoke('weave:identity:login', data),
  },
  org: {
    create:      (data: any) => ipcRenderer.invoke('weave:org:create', data),
    enroll:      (data: any) => ipcRenderer.invoke('weave:member:enroll', data),
    listMembers: (orgName: string) => ipcRenderer.invoke('weave:member:list', orgName),
  },
  resolve:       (label: string) => ipcRenderer.invoke('weave:resolve', label),
  notifications: {
    poll: () => ipcRenderer.invoke('weave:notifications:poll'),
  },
  dht: {
    announce: (onion: string) => ipcRenderer.invoke('weave:dht:announce', onion),
    lookup:   () => ipcRenderer.invoke('weave:dht:lookup'),
  },
  tor: {
    proxy: () => ipcRenderer.invoke('weave:tor:proxy'),
  },
  stealth: {
    compute: (viewPub: string, spendPub: string) =>
      ipcRenderer.invoke('weave:stealth:compute', viewPub, spendPub),
  },
})
