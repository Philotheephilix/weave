import { createWalletClient, createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
const WeaveRegistrar = '0x4Af2E8f065852FcA87D27B617Ca42224C809f17F'

const REGISTRAR_ABI = [
  {
    name: 'registerOrg',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgLabel', type: 'string' },
      { name: 'adminAddr', type: 'address' },
      { name: 'adminIdentity', type: 'tuple', components: [
        { name: 'stealthViewKey',  type: 'bytes' },
        { name: 'stealthSpendKey', type: 'bytes' },
        { name: 'x25519Pubkey',   type: 'bytes' },
        { name: 'onionAddress',   type: 'bytes' },
        { name: 'nostrPubkey',    type: 'bytes' },
        { name: 'registeredAt',   type: 'uint64' },
      ]},
    ],
    outputs: [],
  },
  {
    name: 'enrollMember',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orgLabel',      type: 'string' },
      { name: 'memberLabel',   type: 'string' },
      { name: 'memberAddr',    type: 'address' },
      { name: 'memberIdentity',type: 'tuple', components: [
        { name: 'stealthViewKey',  type: 'bytes' },
        { name: 'stealthSpendKey', type: 'bytes' },
        { name: 'x25519Pubkey',   type: 'bytes' },
        { name: 'onionAddress',   type: 'bytes' },
        { name: 'nostrPubkey',    type: 'bytes' },
        { name: 'registeredAt',   type: 'uint64' },
      ]},
    ],
    outputs: [],
  },
  {
    name: 'orgAdmins',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
]

function deriveKeys(words) {
  const seed = new TextEncoder().encode(words.join(' '))
  const h0 = sha256(seed)
  const h1 = sha256(h0)
  const h2 = sha256(h1)
  const h3 = sha256(h2)
  const viewPriv   = secp256k1.utils.normPrivateKeyToScalar(h0)
  const spendPriv  = secp256k1.utils.normPrivateKeyToScalar(h1)
  const ethPrivScalar = secp256k1.utils.normPrivateKeyToScalar(h2)
  const ethPrivBuf = Buffer.from(ethPrivScalar.toString(16).padStart(64, '0'), 'hex')
  const ethPrivKey = `0x${ethPrivBuf.toString('hex')}`
  const viewPrivBuf  = Buffer.from(viewPriv.toString(16).padStart(64, '0'), 'hex')
  const spendPrivBuf = Buffer.from(spendPriv.toString(16).padStart(64, '0'), 'hex')
  return {
    ethPrivKey,
    viewPub:  secp256k1.getPublicKey(viewPrivBuf, true),
    spendPub: secp256k1.getPublicKey(spendPrivBuf, true),
    noisePub: x25519.getPublicKey(h3),
    ethAddress: privateKeyToAccount(ethPrivKey).address,
  }
}

function toIdentityArg(keys) {
  const toHex = (b) => `0x${Buffer.from(b).toString('hex')}`
  return {
    stealthViewKey:  toHex(keys.viewPub),
    stealthSpendKey: toHex(keys.spendPub),
    x25519Pubkey:    toHex(keys.noisePub),
    onionAddress:    '0x',
    nostrPubkey:     `0x${'00'.repeat(32)}`,
    registeredAt:    BigInt(Math.floor(Date.now() / 1000)),
  }
}

// ── Identities ───────────────────────────────────────────────────────────────
const ADMIN_SEED = ['resource','have','manage','melt','edit','addict','curtain','crowd','sense','caught','gap','brand']
const PHILO_SEED = null  // philo doesn't have a seed — use address only
const BOB_SEED   = ['chicken','address','grunt','emerge','gossip','tobacco','dawn','comfort','post','soul','supply','body']

const adminKeys = deriveKeys(ADMIN_SEED)
const bobKeys   = deriveKeys(BOB_SEED)

console.log('Admin:', adminKeys.ethAddress)
console.log('Bob:  ', bobKeys.ethAddress)

// Philo's address from members file (no seed — enroll with zero keys)
const PHILO_ADDR = '0x3974cb516e9bf7cbbeb162c1505d6923cd10497e'

const pubClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

// Check if org already registered
const orgHash = `0x${Buffer.from(
  sha256(new TextEncoder().encode('google'))
).toString('hex')}`
const existingAdmin = await pubClient.readContract({
  address: WeaveRegistrar,
  abi: REGISTRAR_ABI,
  functionName: 'orgAdmins',
  args: [orgHash],
}).catch(() => '0x0000000000000000000000000000000000000000')
console.log('Existing org admin:', existingAdmin)

const adminAccount = privateKeyToAccount(adminKeys.ethPrivKey)
const walletClient = createWalletClient({ account: adminAccount, chain: sepolia, transport: http(SEPOLIA_RPC) })

if (existingAdmin === '0x0000000000000000000000000000000000000000') {
  console.log('\n→ Registering google org...')
  const tx = await walletClient.writeContract({
    address: WeaveRegistrar,
    abi: REGISTRAR_ABI,
    functionName: 'registerOrg',
    args: ['google', adminKeys.ethAddress, toIdentityArg(adminKeys)],
  })
  console.log('  registerOrg tx:', tx)
  await pubClient.waitForTransactionReceipt({ hash: tx })
  console.log('  ✓ Org registered')
} else {
  console.log('  ✓ Org already registered, admin:', existingAdmin)
}

// Enroll philo (no seed — zero identity keys)
const zeroIdentity = {
  stealthViewKey:  `0x${'00'.repeat(33)}`,
  stealthSpendKey: `0x${'00'.repeat(33)}`,
  x25519Pubkey:    `0x${'00'.repeat(32)}`,
  onionAddress:    '0x',
  nostrPubkey:     `0x${'00'.repeat(32)}`,
  registeredAt:    0n,
}

console.log('\n→ Enrolling philo.google.weave.eth...')
try {
  const tx2 = await walletClient.writeContract({
    address: WeaveRegistrar,
    abi: REGISTRAR_ABI,
    functionName: 'enrollMember',
    args: ['google', 'philo', PHILO_ADDR, zeroIdentity],
  })
  console.log('  enrollMember(philo) tx:', tx2)
  await pubClient.waitForTransactionReceipt({ hash: tx2 })
  console.log('  ✓ philo enrolled')
} catch(e) {
  console.log('  philo enroll error (may already exist):', e.message?.slice(0, 150))
}

console.log('\n→ Enrolling bob.google.weave.eth...')
try {
  const tx3 = await walletClient.writeContract({
    address: WeaveRegistrar,
    abi: REGISTRAR_ABI,
    functionName: 'enrollMember',
    args: ['google', 'bob', bobKeys.ethAddress, toIdentityArg(bobKeys)],
  })
  console.log('  enrollMember(bob) tx:', tx3)
  await pubClient.waitForTransactionReceipt({ hash: tx3 })
  console.log('  ✓ bob enrolled')
} catch(e) {
  console.log('  bob enroll error (may already exist):', e.message?.slice(0, 150))
}

console.log('\n✓ All registrations complete')
