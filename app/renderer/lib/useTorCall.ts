/**
 * Tor-only call hook — Noise_XX transport via ghostcall architecture.
 * Replaces useWebRTC. No STUN, no ICE, no WebRTC.
 *
 * Audio pipeline:
 *   mic → ScriptProcessor (256 samples Int16) → IPC → Noise_XX → peer
 *   peer → Noise_XX → IPC → AudioContext buffer source → speakers
 */
import { useRef, useEffect, useState, useCallback } from 'react'

export interface TorCallHandle {
  connected: boolean
  startCall: (peerLabel: string) => Promise<void>
  startAudioPipeline: () => Promise<void>
  endCall: () => void
  toggleMic: (enabled: boolean) => void
}

export function useTorCall(): TorCallHandle {
  const [connected, setConnected] = useState(false)
  const peerLabelRef = useRef<string | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micEnabledRef = useRef(true)
  const unsubsRef = useRef<Array<() => void>>([])

  const teardown = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    unsubsRef.current.forEach(fn => fn())
    unsubsRef.current = []
    window.weave?.call?.hangUp().catch(() => {})
    peerLabelRef.current = null
    setConnected(false)
  }, [])

  // Set up audio playback (inbound) + mic capture (outbound). Called by both
  // the caller (after goOnline) and the callee (after initiate succeeds).
  const startAudioPipeline = useCallback(async () => {
    // Idempotent — skip if already running
    if (audioCtxRef.current) return

    const ac = new AudioContext({ sampleRate: 16000 })
    audioCtxRef.current = ac

    // Play inbound frames from peer
    const unsubAudio = window.weave?.call?.onAudioFrame((data: ArrayBuffer) => {
      const ac2 = audioCtxRef.current
      if (!ac2) return
      const buf = ac2.createBuffer(1, data.byteLength / 2, 16000)
      const ch = buf.getChannelData(0)
      const view = new Int16Array(data)
      for (let i = 0; i < view.length; i++) ch[i] = view[i] / 32768
      const src = ac2.createBufferSource()
      src.buffer = buf
      src.connect(ac2.destination)
      src.start()
    })
    if (unsubAudio) unsubsRef.current.push(unsubAudio)

    // Capture mic and pump outbound frames
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      console.warn('[TorCall] getUserMedia failed:', err)
      return
    }
    micStreamRef.current = stream
    micEnabledRef.current = true

    const src = ac.createMediaStreamSource(stream)
    const proc = ac.createScriptProcessor(256, 1, 1)
    proc.onaudioprocess = (e) => {
      if (!micEnabledRef.current) return
      const ch = e.inputBuffer.getChannelData(0)
      const buf = new Int16Array(ch.length)
      for (let i = 0; i < ch.length; i++) buf[i] = Math.max(-32768, Math.min(32767, ch[i] * 32768))
      window.weave?.call?.sendAudioFrame(buf.buffer)
    }
    src.connect(proc)
    proc.connect(ac.destination)
    processorRef.current = proc
  }, [])

  // Outbound call: go online, signal peer, then start audio pipeline.
  const startCall = useCallback(async (peerLabel: string) => {
    teardown()
    peerLabelRef.current = peerLabel

    // Subscribe to call events before going online so we don't miss them
    const unsubConnected = window.weave?.call?.onConnected(({ direction }) => {
      console.log('[TorCall] connected', direction)
      setConnected(true)
    })
    if (unsubConnected) unsubsRef.current.push(unsubConnected)

    const unsubError = window.weave?.call?.onError(({ message }) => {
      console.warn('[TorCall] error', message)
    })
    if (unsubError) unsubsRef.current.push(unsubError)

    // Go online: create onion service + bind inbound listener
    let myOnionAddr: string | undefined
    try {
      const result = await window.weave?.call?.goOnline()
      myOnionAddr = result?.onionAddr
    } catch (err) {
      console.warn('[TorCall] goOnline failed:', err)
      return
    }

    // Start audio pipeline immediately so mic is ready when peer dials back
    await startAudioPipeline()

    // Signal the peer via Nostr/Tor: our onion address as a call invite
    if (myOnionAddr && peerLabel) {
      await window.weave?.call?.signal({
        recipientLabel: peerLabel,
        signal: { type: 'call-invite', onionAddr: myOnionAddr },
      }).catch(() => {})
    }
  }, [teardown, startAudioPipeline])

  const endCall = useCallback(() => {
    teardown()
  }, [teardown])

  const toggleMic = useCallback((enabled: boolean) => {
    micEnabledRef.current = enabled
    micStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled })
  }, [])

  useEffect(() => () => teardown(), [teardown])

  return { connected, startCall, startAudioPipeline, endCall, toggleMic }
}
