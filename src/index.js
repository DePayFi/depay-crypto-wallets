import getWallets from './getWallets'
import wallets from './wallets'

const supported = [
  wallets.MetaMask,
  wallets.Phantom,
  wallets.Coinbase,
  wallets.WalletConnect,
  wallets.WalletLink
]

export { 
  getWallets,
  supported,
  wallets
}
