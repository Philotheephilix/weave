/**
 * Deployed contract addresses on Ethereum Sepolia.
 * Fill in after running `forge script DeployWeave.s.sol --broadcast`.
 */
export const ADDRESSES = {
  WeavePermissionedRegistry: '0x9Facb44a02841A96E83Efe4A6aeDC2Ef10b0909D' as `0x${string}`,
  WeaveWildcardResolver:     '0xa4D4507942a2b167fEe1C8642ebc63dF1368EBCf' as `0x${string}`,
  WeaveRegistrar:            '0x3570B6fed25D56C4C5492d75a3DF8f182567e9BA' as `0x${string}`,
  NotificationLog:           '0x769b50baAa94100D3433098C850F92E3B0bB527C' as `0x${string}`,
} as const

export const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
export const CHAIN_ID = 11155111
