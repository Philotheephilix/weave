import * as net from 'net'

const PROBE_TIMEOUT_MS = 8_000

/**
 * Check if a peer's onion address is reachable right now.
 * Opens a SOCKS5 TCP connection through Tor and sends a lightweight HTTP HEAD
 * to /ping. Returns true if we get any HTTP response, false on timeout/error.
 */
export function probeOnionReachable(
  onionAddress: string,
  socks: { host: string; port: number },
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { socket.destroy(); resolve(false) }, PROBE_TIMEOUT_MS)

    const done = (result: boolean) => {
      clearTimeout(timer)
      resolve(result)
    }

    const host = onionAddress.replace(/\.onion$/, '') + '.onion'
    const socket = net.connect(socks.port, socks.host, () => {
      socket.write(Buffer.from([0x05, 0x01, 0x00]))
    })

    let step = 0
    const onData = (chunk: Buffer) => {
      if (step === 0) {
        if (chunk[0] !== 0x05 || chunk[1] !== 0x00) { socket.destroy(); return done(false) }
        step = 1
        const hostBuf = Buffer.from(host, 'ascii')
        const req = Buffer.allocUnsafe(7 + hostBuf.length)
        req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x03; req[4] = hostBuf.length
        hostBuf.copy(req, 5)
        req.writeUInt16BE(80, 5 + hostBuf.length)
        socket.write(req)
      } else if (step === 1) {
        if (chunk[1] !== 0x00) { socket.destroy(); return done(false) }
        step = 2
        const req = `HEAD /ping HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`
        socket.write(req)
      } else if (step === 2) {
        // Any HTTP response means the peer is up
        socket.removeListener('data', onData)
        socket.destroy()
        done(true)
      }
    }

    socket.on('data', onData)
    socket.on('error', () => done(false))
  })
}
