/**
 * Deployed contract addresses on Ethereum Sepolia.
 * Fill in after running `forge script DeployWeave.s.sol --broadcast`.
 */
export const ADDRESSES = {
  WeavePermissionedRegistry: '0x5dCC3E88Ff81Cf7D12B127Da9b3623FFDe616283' as `0x${string}`,
  WeaveWildcardResolver:     '0x7803f87Feee40E03D6049aA935134784E8BD8b08' as `0x${string}`,
  WeaveRegistrar:            '0xF9F3aC24335Fc14d20297F0Db91CEbE1823A7D6C' as `0x${string}`,
  NotificationLog:           '0xE0E923359d2Af2Ce48a23128F206EC7f67fEad39' as `0x${string}`,
} as const

export const SEPOLIA_RPC = 'https://gateway.tenderly.co/public/sepolia'
export const CHAIN_ID = 11155111
