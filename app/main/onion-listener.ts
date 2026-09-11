import * as http from 'http'
import type { BrowserWindow } from 'electron'

/**
 * HTTP server that listens on localhost:port (Tor routes the .onion service here).
 * Handles:
 *   POST /receive  — incoming DM from a peer (Tor transport)
 *   HEAD /ping     — reachability probe (no body, always 200)
 *   POST /call/signal — WebRTC-style call signal (offer/answer/candidate) over Tor
 */
export class OnionListener {
  private server: http.Server | null = null
  private win: BrowserWindow | null = null

  start(port: number, win: BrowserWindow): Promise<void> {
    this.win = win
    if (this.server) return Promise.resolve()

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Always allow ping (reachability probe)
        if (req.method === 'HEAD' && req.url === '/ping') {
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString('utf8') })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              if (req.url === '/receive') {
                // Incoming DM delivered via Tor
                this.win?.webContents.send('weave:dm:received', {
                  from: data.from ?? 'unknown',
                  content: data.text ?? data.content ?? '',
                })
                res.writeHead(200)
                res.end()
              } else if (req.url === '/call/signal') {
                // Incoming call signal (offer/answer/ice-candidate) via Tor
                this.win?.webContents.send('weave:call:signal', {
                  from: data.from ?? 'unknown',
                  signal: data.signal,
                })
                res.writeHead(200)
                res.end()
              } else {
                res.writeHead(404)
                res.end()
              }
            } catch {
              res.writeHead(400)
              res.end()
            }
          })
          return
        }

        res.writeHead(405)
        res.end()
      })

      this.server.listen(port, '127.0.0.1', () => resolve())
      this.server.on('error', reject)
    })
  }

  stop(): void {
    this.server?.close()
    this.server = null
    this.win = null
  }
}
