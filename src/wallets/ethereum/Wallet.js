import Wallet from '../Wallet'
import { Blockchain } from 'depay-web3-blockchains'
import { getApiKey } from '../../apiKey'

export default class EthereumWallet extends Wallet {
  name = 'unknown'
  logo =
    'data:image/png;base64,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'
  blockchains = ['ethereum']

  async connect() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    return accounts
  }

  async account() {
    return (await this.accounts())[0]
  }

  async accounts() {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    return accounts
  }

  async assets(blockchain) {
    let account = await this.account()
    if (!account) {
      return
    }

    let assets = Promise.all(
      (blockchain ? [blockchain] : undefined || this.blockchains).map((blockchain) =>
        fetch('https://api.depay.pro/v1/assets?account=' + account + '&blockchain=' + blockchain, {
          headers: { 'X-Api-Key': getApiKey() },
        })
          .then((response) => response.json())
          .then((assets) => assets.map((asset) => Object.assign(asset, { blockchain }))),
      ),
    ).then((responses) => responses.flat())

    return assets
  }

  on(event, callback) {
    switch (event) {
      case 'account':
        window.ethereum.on('accountsChanged', (accounts) => callback(accounts[0]))
        break
      case 'accounts':
        window.ethereum.on('accountsChanged', (accounts) => callback(accounts))
        break
      case 'network':
        window.ethereum.on('chainChanged', (chainId) => callback(Blockchain.findById(chainId).name))
        break
    }
  }
}
