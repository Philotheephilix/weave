/**
 * Re-exports deployed contract addresses and chain config.
 * Values are inlined here so the renderer bundle has no Node.js imports.
 */

export const ADDRESSES = {
  WeavePermissionedRegistry: '0x5dCC3E88Ff81Cf7D12B127Da9b3623FFDe616283' as `0x${string}`,
  WeaveWildcardResolver:     '0x7803f87Feee40E03D6049aA935134784E8BD8b08' as `0x${string}`,
  WeaveRegistrar:            '0xF9F3aC24335Fc14d20297F0Db91CEbE1823A7D6C' as `0x${string}`,
  NotificationLog:           '0x0137C879f88BcB177d7B11bEd7c690195d8D7C5c' as `0x${string}`,
} as const

export const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
export const CHAIN_ID = 11155111
export const BLOCK_EXPLORER = 'https://sepolia.etherscan.io'
