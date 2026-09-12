/**
 * Re-exports deployed contract addresses and chain config.
 * Values are inlined here so the renderer bundle has no Node.js imports.
 */

export const ADDRESSES = {
  WeavePermissionedRegistry: '0x38E5F605bE16c4A54d0a1CF5A6E75DFF1679EFf3' as `0x${string}`,
  WeaveWildcardResolver:     '0xE324fB0Fb00621094B8e81EA71E28D4263445377' as `0x${string}`,
  WeaveRegistrar:            '0x47f73c5F82a43Cc4b3a007131Af0E84543146950' as `0x${string}`,
  NotificationLog:           '0x8106E27a1FDE848Bf7A41fE90207A0e4Aa0dE849' as `0x${string}`,
} as const

export const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
export const CHAIN_ID = 11155111
export const BLOCK_EXPLORER = 'https://sepolia.etherscan.io'
