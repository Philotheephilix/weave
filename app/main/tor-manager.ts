import { spawn, ChildProcess } from 'child_process'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export interface OnionService {
  onionAddress: string  // e.g. "abcdef1234567890.onion"
  port: number          // local port the service maps to
}

export class TorManager {
  private proc: ChildProcess | null = null
  private controlSocket: net.Socket | null = null
  private ready = false

  private torBinPath(): string {
    const platform = process.platform
    const base = path.join(__dirname, '..', '..', 'binaries', 'tor')
    const bundled = platform === 'win32'
      ? path.join(base, 'windows', 'tor.exe')
      : platform === 'darwin'
        ? path.join(base, 'macos', 'tor')
        : path.join(base, 'linux', 'tor')
    if (fs.existsSync(bundled)) return bundled
    // Fall back to system Tor (dev / CI environments)
    const systemPaths = platform === 'win32'
      ? []
      : ['/opt/homebrew/bin/tor', '/usr/local/bin/tor', '/usr/bin/tor']
    for (const p of systemPaths) {
      if (fs.existsSync(p)) return p
    }
    return bundled // let start() produce the "not found" error with the expected path
  }

  async start(): Promise<void> {
    if (this.ready) return
    const bin = this.torBinPath()
    if (!fs.existsSync(bin)) throw new Error(`Tor binary not found at ${bin}. Bundle tor into binaries/tor/ or install system Tor.`)

    const dataDir = path.join(os.tmpdir(), 'weave-tor')
    this.proc = spawn(bin, [
      '--SocksPort', '9050',
      '--ControlPort', '9051',
      '--CookieAuthentication', '1',
      '--DataDirectory', dataDir,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    await this._waitForReady()
    await this._authenticate(dataDir)
    this.ready = true
  }

  private _waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tor startup timeout')), 30_000)
      this.proc!.stdout!.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('Bootstrapped 100%')) {
          clearTimeout(timeout)
          resolve()
        }
      })
      this.proc!.on('error', (err) => { clearTimeout(timeout); reject(err) })
      this.proc!.on('exit', (code) => { clearTimeout(timeout); reject(new Error(`Tor exited with code ${code}`)) })
    })
  }

  private _controlCmd(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.controlSocket || this.controlSocket.destroyed) {
        this.controlSocket = net.createConnection(9051, '127.0.0.1')
      }
      let buf = ''
      const onData = (data: Buffer) => {
        buf += data.toString()
        // Tor control protocol: response is complete when last non-empty line starts with 3-digit code + space
        const lines = buf.split('\r\n').filter(Boolean)
        const last = lines[lines.length - 1] ?? ''
        if (/^\d{3} /.test(last)) {
          this.controlSocket!.removeListener('data', onData)
          this.controlSocket!.removeListener('error', onError)
          resolve(buf)
        }
      }
      const onError = (err: Error) => {
        this.controlSocket!.removeListener('data', onData)
        reject(err)
      }
      this.controlSocket.on('data', onData)
      this.controlSocket.once('error', onError)
      this.controlSocket.write(cmd + '\r\n')
    })
  }

  private async _authenticate(dataDir: string): Promise<void> {
    // Cookie auth: read the cookie file Tor wrote, send as hex.
    const cookiePath = path.join(dataDir, 'control_auth_cookie')
    const cookie = fs.readFileSync(cookiePath).toString('hex')
    const reply = await this._controlCmd(`AUTHENTICATE ${cookie}`)
    if (!reply.startsWith('250')) throw new Error(`Tor auth failed: ${reply}`)
  }

  async createOnionService(localPort: number): Promise<OnionService> {
    if (!this.ready) throw new Error('TorManager not started')
    const reply = await this._controlCmd(
      `ADD_ONION NEW:ED25519-V3 Flags=DiscardPK Port=80,127.0.0.1:${localPort}`
    )
    const match = reply.match(/ServiceID=([a-z2-7]{56})/)
    if (!match) throw new Error(`Failed to create onion service: ${reply}`)
    return { onionAddress: `${match[1]}.onion`, port: localPort }
  }

  getSocksProxy(): { host: string; port: number } {
    return { host: '127.0.0.1', port: 9050 }
  }

  stop(): void {
    this.controlSocket?.destroy()
    this.proc?.kill()
    this.ready = false
    this.proc = null
  }
}
