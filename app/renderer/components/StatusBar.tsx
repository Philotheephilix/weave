import React, { useEffect, useState, useCallback } from 'react'
import { ipcTorProxy } from '../lib/ipc'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { SEPOLIA_RPC } from '../lib/addresses'

type TorStatus = 'connecting' | 'connected' | 'error'

const viemClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

export default function StatusBar() {
  const [torStatus, setTorStatus] = useState<TorStatus>('connecting')
  const [torProxy, setTorProxy] = useState<string>('')
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null)

  const checkTor = useCallback(async () => {
    try {
      const proxy = await ipcTorProxy()
      setTorProxy(`${proxy.host}:${proxy.port}`)
      setTorStatus('connected')
    } catch {
      setTorStatus('error')
    }
  }, [])

  const fetchBlock = useCallback(async () => {
    try {
      const n = await viemClient.getBlockNumber()
      setBlockNumber(n)
    } catch {
      // silent — no block available
    }
  }, [])

  useEffect(() => {
    checkTor()
    fetchBlock()
    const torTimer = setInterval(checkTor, 30_000)
    const blockTimer = setInterval(fetchBlock, 12_000)
    return () => { clearInterval(torTimer); clearInterval(blockTimer) }
  }, [checkTor, fetchBlock])

  const dotClass = torStatus === 'connected' ? 'green' : torStatus === 'connecting' ? 'yellow' : 'red'
  const torLabel = torStatus === 'connected' ? 'Tor connected' : torStatus === 'connecting' ? 'Connecting...' : 'Tor offline'

  return (
    <div className="status-bar">
      <div className="status-indicator">
        <span className={`status-dot ${dotClass}`} />
        <span>{torLabel}</span>
        {torProxy && torStatus === 'connected' && (
          <span style={{ color: 'var(--text-2)', fontSize: '11px' }}>({torProxy})</span>
        )}
      </div>
      <div className="status-indicator">
        <span className="status-dot green" />
        <span>Sepolia</span>
      </div>
      {blockNumber !== null && (
        <div className="status-indicator">
          <span style={{ color: 'var(--text-2)' }}>Block</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {blockNumber.toString()}
          </span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', color: 'var(--text-2)', fontSize: '11px' }}>
        Noise_XX · ERC-5564 · ENSv2
      </div>
    </div>
  )
}
