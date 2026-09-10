/**
 * Manages a bundled Tor process and creates ephemeral v3 onion services.
 * Communicates with Tor via the control port (9051) using AUTHENTICATE + ADD_ONION.
 */
import { spawn, ChildProcess } from 'child_process'
import * as net from 'net'
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
  private onionServices: OnionService[] = []

  private torBinPath(): string {
    const platform = process.platform
    const base = path.join(__dirname, '..', '..', 'binaries', 'tor')
    if (platform === 'darwin') return path.join(base, 'macos', 'tor')
    if (platform === 'win32') return path.join(base, 'windows', 'tor.exe')
    return path.join(base, 'linux', 'tor')
  }

  async start(): Promise<void> {
    if (this.ready) return
    const bin = this.torBinPath()
    if (!fs.existsSync(bin)) throw new Error(`Tor binary not found at ${bin}`)

    const dataDir = path.join(require('os').tmpdir(), 'weave-tor')
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
      const handler = (data: Buffer) => {
        buf += data.toString()
        if (/^[0-9]{3} /.test(buf.split('\n').filter(Boolean).pop() || '')) {
          this.controlSocket!.off('data', handler)
          resolve(buf)
        }
      }
      this.controlSocket.on('data', handler)
      this.controlSocket.once('error', reject)
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
    const svc: OnionService = { onionAddress: `${match[1]}.onion`, port: localPort }
    this.onionServices.push(svc)
    return svc
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
