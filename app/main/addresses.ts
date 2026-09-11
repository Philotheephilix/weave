/**
 * Deployed contract addresses on Ethereum Sepolia.
 * Fill in after running `forge script DeployWeave.s.sol --broadcast`.
 */
export const ADDRESSES = {
  WeavePermissionedRegistry: '0x0E1b68e94fD85540021BE5ECB96E399388A60019' as `0x${string}`,
  WeaveWildcardResolver:     '0x001B3ca7f8217fe713e2DF433beF8C1dD46EFb6B' as `0x${string}`,
  WeaveRegistrar:            '0x4Af2E8f065852FcA87D27B617Ca42224C809f17F' as `0x${string}`,
  NotificationLog:           '0xaff3b50593ecd95068829b80acd0346dbc4cf1f7' as `0x${string}`,
} as const

export const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
export const CHAIN_ID = 11155111
