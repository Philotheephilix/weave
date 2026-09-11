import { useRef, useEffect, useState, useCallback } from 'react'
import { ipcCallSignal, ipcCallOnSignal } from './ipc'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

type SignalPayload =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }

export interface WebRTCHandle {
  connected: boolean
  startCall: (peerLabel: string) => Promise<void>
  endCall: () => void
  toggleMic: (enabled: boolean) => void
}

export function useWebRTC(): WebRTCHandle {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const peerLabelRef = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const [connected, setConnected] = useState(false)

  // Ensure a hidden audio element exists for remote audio playback
  useEffect(() => {
    if (!remoteAudioRef.current) {
      const el = document.createElement('audio')
      el.autoplay = true
      el.style.display = 'none'
      document.body.appendChild(el)
      remoteAudioRef.current = el
    }
    return () => {
      remoteAudioRef.current?.remove()
      remoteAudioRef.current = null
    }
  }, [])

  const teardown = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    unsubRef.current?.()
    unsubRef.current = null
    peerLabelRef.current = null
    setConnected(false)
  }, [])

  const sendSignal = useCallback(async (signal: SignalPayload) => {
    const label = peerLabelRef.current
    if (!label) return
    await ipcCallSignal({ recipientLabel: label, signal })
  }, [])

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal({ type: 'candidate', candidate: candidate.toJSON() })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setConnected(true)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnected(false)
      }
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream
      }
    }

    return pc
  }, [sendSignal])

  const startCall = useCallback(async (peerLabel: string) => {
    teardown()
    peerLabelRef.current = peerLabel

    // Subscribe to incoming signals first
    {
      const unsub = ipcCallOnSignal(async ({ signal }) => {
        const pc = pcRef.current
        if (!pc) return
        if (typeof signal !== 'object' || signal === null || !('type' in signal)) return
        try {
          if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await sendSignal({ type: 'answer', sdp: answer.sdp! })
          } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }))
          } else if (signal.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          }
        } catch (err) {
          console.warn('[WebRTC] signal handling error:', err)
        }
      })
      unsubRef.current = unsub
    }

    // Acquire microphone
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed:', err)
      return
    }
    localStreamRef.current = stream

    const pc = createPC()
    pcRef.current = pc
    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream))

    // Create and send the offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sendSignal({ type: 'offer', sdp: offer.sdp! })
  }, [teardown, createPC, sendSignal])

  const endCall = useCallback(() => {
    teardown()
  }, [teardown])

  const toggleMic = useCallback((enabled: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled })
  }, [])

  // Cleanup on unmount
  useEffect(() => () => teardown(), [teardown])

  return { connected, startCall, endCall, toggleMic }
}
