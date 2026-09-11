declare module 'bittorrent-dht' {
  type SignFunction = (buf: Buffer) => Buffer
  type VerifyFunction = ((sig: Buffer, buf: Buffer, k: Buffer) => boolean) | null

  interface DHTOptions {
    nodeId?: Buffer | string
    verify?: VerifyFunction
  }

  interface PutOpts {
    k: Buffer
    v: Buffer
    seq?: number
    sig?: Buffer
    sign?: SignFunction
  }

  type PutCallback = (err: Error | null, hash: Buffer) => void
  type GetCallback = (err: Error | null, res: { v: Buffer } | null) => void
  type LookupCallback = (err: Error | null, peers: Array<{ host: string; port: number }>) => void

  class DHT {
    constructor(opts?: DHTOptions)
    listen(port: number, cb?: () => void): void
    destroy(cb?: () => void): void
    put(opts: PutOpts, cb?: PutCallback): void
    get(key: Buffer, cb: GetCallback): void
    lookup(hash: string | Buffer, cb?: LookupCallback): void
    on(event: 'ready' | 'error' | 'listening', cb: (...args: unknown[]) => void): this
  }

  export = DHT
}
