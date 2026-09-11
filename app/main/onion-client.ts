import * as net from 'net'

export const ONION_HOST_RE = /^[a-z2-7]{56}\.onion$/
export const ONION_ADDR_RE = /^[a-z2-7]{56}\.onion:\d{1,5}$/

export function connectToOnion(
  onionAddr: string,
  socks: { host: string; port: number },
): Promise<net.Socket> {
  const colonIdx = onionAddr.lastIndexOf(':')
  if (colonIdx === -1) return Promise.reject(new Error(`Invalid onionAddr (no port): ${onionAddr}`))
  const host = onionAddr.slice(0, colonIdx)
  const destPort = parseInt(onionAddr.slice(colonIdx + 1), 10)
  if (isNaN(destPort) || destPort < 1 || destPort > 65535) {
    return Promise.reject(new Error(`Invalid port in onionAddr: ${onionAddr}`))
  }
  if (!ONION_HOST_RE.test(host)) {
    return Promise.reject(new Error(`Invalid .onion address (must be v3): ${host}`))
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('SOCKS5 connect timeout (30s)')) }, 30_000)
    const done = (err?: Error) => { clearTimeout(timer); if (err) reject(err) }

    const socket = net.connect(socks.port, socks.host, () => {
      socket.write(Buffer.from([0x05, 0x01, 0x00]))
    })

    let step = 0
    socket.on('data', (chunk: Buffer) => {
      if (step === 0) {
        if (chunk[0] !== 0x05 || chunk[1] !== 0x00) {
          socket.destroy(); return done(new Error(`SOCKS5 method negotiation failed: ${chunk.toString('hex')}`))
        }
        step = 1
        const hostBuf = Buffer.from(host, 'ascii')
        const req = Buffer.allocUnsafe(7 + hostBuf.length)
        req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x03; req[4] = hostBuf.length
        hostBuf.copy(req, 5)
        req.writeUInt16BE(destPort, 5 + hostBuf.length)
        socket.write(req)
      } else if (step === 1) {
        if (chunk[1] !== 0x00) {
          socket.destroy(); return done(new Error(`SOCKS5 CONNECT failed: ${chunk.toString('hex')}`))
        }
        step = 2
        socket.removeAllListeners('data')
        done()
        resolve(socket)
      }
    })

    socket.on('error', done)
  })
}
