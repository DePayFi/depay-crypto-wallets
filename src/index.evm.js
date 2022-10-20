import getWallets from './getWallets.evm'
import wallets from './wallets.evm'

const supported = [
  wallets.MetaMask,
  wallets.Coinbase,
  wallets.WalletConnect,
  wallets.WalletLink
]

export {
  getWallets,
  supported,
  wallets
}
