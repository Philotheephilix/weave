import { spawn, ChildProcess } from 'child_process'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface OnionService {
  onionAddress: string  // e.g. "abcdef1234567890.onion"
  port: number          // local port the service maps to
}

// Tor control protocol: a reply is complete when the last non-empty line
// starts with a 3-digit code followed by a space.
function isCompleteReply(buf: string): boolean {
  const lines = buf.split('\r\n').filter(Boolean)
  return /^\d{3} /.test(lines[lines.length - 1] ?? '')
}

export class TorManager {
  private proc: ChildProcess | null = null
  private controlSocket: net.Socket | null = null
  private ready = false
  private socksPort: number
  private controlPort: number
  private dataDir: string

  constructor(opts?: { socksPort?: number; controlPort?: number; dataDir?: string }) {
    this.socksPort   = opts?.socksPort   ?? 9050
    this.controlPort = opts?.controlPort ?? 9051
    this.dataDir     = opts?.dataDir     ?? path.join(os.tmpdir(), 'weave-tor')
  }

  private torBinPath(): string {
    const base = path.join(__dirname, '..', '..', 'binaries', 'tor')
    let bundled: string
    switch (process.platform) {
      case 'win32':
        bundled = path.join(base, 'windows', 'tor.exe')
        break
      case 'darwin':
        bundled = path.join(base, 'macos', 'tor')
        break
      default:
        bundled = path.join(base, 'linux', 'tor')
    }
    if (fs.existsSync(bundled)) return bundled

    const systemPaths = process.platform === 'win32'
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

    fs.mkdirSync(this.dataDir, { recursive: true })
    this.proc = spawn(bin, [
      '--SocksPort',    String(this.socksPort),
      '--ControlPort',  String(this.controlPort),
      '--CookieAuthentication', '1',
      '--DataDirectory', this.dataDir,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    await this._waitForReady()
    await this._authenticate()
    this.ready = true
  }

  private _cookieHex(): string {
    return fs.readFileSync(path.join(this.dataDir, 'control_auth_cookie')).toString('hex')
  }

  // Raw GETINFO returns 514 before auth, so each probe authenticates on a fresh
  // socket before querying bootstrap progress.
  private _probeBootstrap(): Promise<string> {
    return new Promise((resolve, reject) => {
      const cookie = this._cookieHex()
      const sock = net.createConnection(this.controlPort, '127.0.0.1')
      let buf = ''
      sock.on('data', (d: Buffer) => {
        buf += d.toString()
        if (isCompleteReply(buf)) { sock.destroy(); resolve(buf) }
      })
      sock.on('error', reject)
      sock.once('connect', () => {
        sock.write(`AUTHENTICATE ${cookie}\r\nGETINFO status/bootstrap-phase\r\n`)
      })
      setTimeout(() => { sock.destroy(); reject(new Error('timeout')) }, 3000)
    })
  }

  private _waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 60_000
      let done = false

      const succeed = () => { if (!done) { done = true; resolve() } }
      const fail    = (e: Error) => { if (!done) { done = true; reject(e) } }

      let stdoutBuf = ''
      this.proc!.stdout!.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString()
        if (stdoutBuf.includes('Bootstrapped 100%')) succeed()
      })
      this.proc!.on('error', fail)
      this.proc!.on('exit', (code) => fail(new Error(`Tor exited with code ${code}`)))

      const poll = async () => {
        while (!done && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 2000))
          if (done) break
          const reply = await this._probeBootstrap().catch(() => null)
          if (reply?.includes('PROGRESS=100')) { succeed(); break }
        }
        if (!done) fail(new Error('Tor startup timeout (60s)'))
      }
      // Delay the first probe so the control port has time to open
      setTimeout(() => { void poll() }, 3000)
    })
  }

  private _controlCmd(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.controlSocket || this.controlSocket.destroyed) {
        this.controlSocket = net.createConnection(this.controlPort, '127.0.0.1')
      }
      let buf = ''
      const onData = (data: Buffer) => {
        buf += data.toString()
        if (isCompleteReply(buf)) {
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

  private async _authenticate(): Promise<void> {
    const reply = await this._controlCmd(`AUTHENTICATE ${this._cookieHex()}`)
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

  async createOnionServiceWithPort(externalPort: number, localPort: number): Promise<{ onionAddress: string; serviceId: string }> {
    if (!this.ready) throw new Error('TorManager not started')
    const reply = await this._controlCmd(
      `ADD_ONION NEW:ED25519-V3 Flags=DiscardPK Port=${externalPort},127.0.0.1:${localPort}`
    )
    const match = reply.match(/ServiceID=([a-z2-7]{56})/)
    if (!match) throw new Error(`Failed to create onion service: ${reply}`)
    return { onionAddress: `${match[1]}.onion`, serviceId: match[1] }
  }

  async removeOnion(serviceId: string): Promise<void> {
    if (!this.ready) return
    try { await this._controlCmd(`DEL_ONION ${serviceId}`) } catch { /* ignore */ }
  }

  getSocksProxy(): { host: string; port: number } {
    return { host: '127.0.0.1', port: this.socksPort }
  }

  stop(): void {
    this.controlSocket?.destroy()
    this.proc?.kill()
    this.ready = false
    this.proc = null
  }
}
