import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('weave', {
  identity: {
    get:           () => ipcRenderer.invoke('weave:identity:get'),
    generateSeed:  () => ipcRenderer.invoke('weave:identity:generate-seed'),
    deriveAddress: (seedPhrase: string[]) => ipcRenderer.invoke('weave:identity:derive-address', seedPhrase),
    save:          (data: any) => ipcRenderer.invoke('weave:identity:save', data),
    load:          () => ipcRenderer.invoke('weave:identity:load'),
    login:         (data: any) => ipcRenderer.invoke('weave:identity:login', data),
  },
  org: {
    create:         (data: any) => ipcRenderer.invoke('weave:org:create', data),
    enroll:         (data: any) => ipcRenderer.invoke('weave:member:enroll', data),
    listMembers:    (orgName: string) => ipcRenderer.invoke('weave:member:list', orgName),
    mintGuestToken: (args: object) => ipcRenderer.invoke('weave:org:mintGuestToken', args),
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
  peer: {
    reachable: (args: object) => ipcRenderer.invoke('weave:peer:reachable', args),
  },
  call: {
    // Tor Noise_XX call orchestration
    goOnline:  () => ipcRenderer.invoke('call:go-online'),
    initiate:  (args: { onionAddr: string }) => ipcRenderer.invoke('call:initiate', args),
    hangUp:    () => ipcRenderer.invoke('call:hang-up'),
    getState:  () => ipcRenderer.invoke('call:current-state'),
    // Nostr-based call signaling (used to publish caller's onion address to callee)
    signal: (args: object) => ipcRenderer.invoke('weave:call:signal', args),
    onSignal: (cb: (payload: { from: string; signal: object }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: { from: string; signal: object }) => cb(payload)
      ipcRenderer.on('weave:call:signal', handler)
      return () => ipcRenderer.removeListener('weave:call:signal', handler)
    },
    // Audio frames (raw PCM Int16 over Noise_XX transport)
    onAudioFrame: (cb: (data: ArrayBuffer) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: ArrayBuffer) => cb(data)
      ipcRenderer.on('audio:inbound-frame', handler)
      return () => ipcRenderer.removeListener('audio:inbound-frame', handler)
    },
    sendAudioFrame: (data: ArrayBuffer) => ipcRenderer.send('audio:outbound-frame', data),
    // Call state events
    onConnected: (cb: (info: { direction: string; onionAddr?: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: { direction: string; onionAddr?: string }) => cb(info)
      ipcRenderer.on('call:connected', handler)
      return () => ipcRenderer.removeListener('call:connected', handler)
    },
    onError: (cb: (err: { message: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, err: { message: string }) => cb(err)
      ipcRenderer.on('call:error', handler)
      return () => ipcRenderer.removeListener('call:error', handler)
    },
  },
  arkiv: {
    // Channel key management
    storeChannelKey:     (args: object) => ipcRenderer.invoke('weave:arkiv:storeChannelKey', args),
    fetchChannelKey:     (args: object) => ipcRenderer.invoke('weave:arkiv:fetchChannelKey', args),
    getLatestKeyVersion: (args: object) => ipcRenderer.invoke('weave:arkiv:getLatestKeyVersion', args),
    rotateChannelKey:    (args: object) => ipcRenderer.invoke('weave:arkiv:rotateChannelKey', args),
    // Message storage
    postMessage:         (args: object) => ipcRenderer.invoke('weave:arkiv:postMessage', args),
    fetchMessages:       (args: object) => ipcRenderer.invoke('weave:arkiv:fetchMessages', args),
    // DM storage
    postDM:              (args: object) => ipcRenderer.invoke('weave:arkiv:postDM', args),
    fetchDMs:            (args: object) => ipcRenderer.invoke('weave:arkiv:fetchDMs', args),
    // Member management
    addChannelMember:    (args: object) => ipcRenderer.invoke('weave:arkiv:addChannelMember', args),
    listChannelMembers:  (args: object) => ipcRenderer.invoke('weave:arkiv:listChannelMembers', args),
  },
  chat: {
    sendDM: (args: object) => ipcRenderer.invoke('weave:chat:sendDM', args),
  },
  teams: {
    load:          (orgName: string) => ipcRenderer.invoke('weave:teams:load', orgName),
    save:          (args: object) => ipcRenderer.invoke('weave:teams:save', args),
    createTeam:    (args: object) => ipcRenderer.invoke('weave:teams:createTeam', args),
    createChannel: (args: object) => ipcRenderer.invoke('weave:teams:createChannel', args),
  },
  dm: {
    list: (orgName: string) => ipcRenderer.invoke('weave:dm:list', orgName),
    open: (args: object) => ipcRenderer.invoke('weave:dm:open', args),
  },
  on:  (channel: string, cb: (...args: unknown[]) => void) => ipcRenderer.on(channel, cb),
  off: (channel: string, cb: (...args: unknown[]) => void) => ipcRenderer.removeListener(channel, cb),
})
