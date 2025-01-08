/*#if _EVM

import { request } from '@depay/web3-client-evm'

/*#elif _SOLANA

import { request } from '@depay/web3-client-solana'

//#else */

import { request } from '@depay/web3-client'

//#endif

import logos from '../logos'
import Blockchains from '@depay/web3-blockchains'
import { CoinbaseWalletSDK } from '@depay/coinbase-wallet-sdk'
import { ethers } from 'ethers'
import { sendTransaction } from './WalletLink/transaction'
import { supported } from '../blockchains'

const getConnectedInstance = ()=>{
  return window._connectedWalletLinkInstance
}

const setConnectedInstance = (value)=>{
  window._connectedWalletLinkInstance = value
}

class WalletLink {

  static info = {
    name: 'Coinbase',
    logo: logos.coinbase,
    blockchains: supported.evm
  }

  static isAvailable = async()=>{ return getConnectedInstance() != undefined }

  constructor() {
    this.name = this.constructor.info.name
    this.logo = this.constructor.info.logo
    this.blockchains = this.constructor.info.blockchains
    // RESET WalletLink (do not recover connections!)
    Object.keys(localStorage).forEach((key)=>{
      if(key.match("-walletlink:https://www.walletlink.org")) {
        delete localStorage[key]  
      }
    })
    this.connector = WalletLink.instance || this.newWalletLinkInstance()
    this.sendTransaction = (transaction)=>{
      return sendTransaction({
        wallet: this,
        transaction
      })
    }
  }

  newWalletLinkInstance() {
    let instance = new CoinbaseWalletSDK({ enableMobileWalletLink: true }).makeWeb3Provider()
    return instance
  }

  async account() {
    if(this.connectedAccounts == undefined) { return }
    return ethers.utils.getAddress(this.connectedAccounts[0])
  }

  async connect(options) {

    let connect = (options && options.connect) ? options.connect : ({uri})=>{}
    await connect({ uri: this.connector.qrUrl })
    
    document.querySelector('.-cbwsdk-css-reset')?.setAttribute('style', 'display: none;')
    document.querySelector('.-cbwsdk-extension-dialog-container')?.setAttribute('style', 'display: none;')
    setTimeout(()=>{
      if(this?.connector?._relay?.ui?.linkFlow?.isOpen){
        this.connector._relay.ui.linkFlow.isOpen = false
      }
    }, 10)

    let relay = await this.connector._relayProvider()
    relay.setConnectDisabled(false)

    let accounts = await this.connector.enable()
    if(accounts instanceof Array && accounts.length) {
      setConnectedInstance(this)
    }
    accounts = accounts.map((account)=>ethers.utils.getAddress(account))
    this.connectedAccounts = accounts
    this.connectedChainId = await this.connector.getChainId()
    return accounts[0]
  }

  async connectedTo(input) {
    let chainId = await this.connector.getChainId()
    const blockchain = Blockchains.findByNetworkId(chainId)
    if(!blockchain) { return false }
    if(input) {
      return input === blockchain.name
    } else {
      return blockchain.name
    }
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName)
      this.connector.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: blockchain.id }],
      }).then(resolve).catch((error)=> {
        if(error.code === 4902){ // chain not yet added
          this.addNetwork(blockchainName)
            .then(()=>this.switchTo(blockchainName).then(resolve))
            .catch(reject)
        } else {
          reject(error)
        }
      })
    })
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName)
      this.connector.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: blockchain.id,
          chainName: blockchain.fullName,
          nativeCurrency: {
            name: blockchain.currency.name,
            symbol: blockchain.currency.symbol,
            decimals: blockchain.currency.decimals
          },
          rpcUrls: [blockchain.rpc],
          blockExplorerUrls: [blockchain.explorer],
          iconUrls: [blockchain.logo]
        }],
      }).then(resolve).catch(reject)
    })
  }

  on(event, callback) {
    let internalCallback
    switch (event) {
      case 'account':
        internalCallback = (accounts) => callback(ethers.utils.getAddress(accounts[0]))
        this.connector.on('accountsChanged', internalCallback)
        break
    }
    return internalCallback
  }

  off(event, internalCallback) {
    switch (event) {
      case 'account':
        this.connector.removeListener('accountsChanged', internalCallback)
        break
    }
    return internalCallback
  }

  transactionCount({ blockchain, address }) {
    return request({ blockchain, method: 'transactionCount', address })
  }

  async sign(message) {
    if(typeof message === 'object') {
      let provider = this.connector
      let account = await this.account()
      if((await this.connectedTo(Blockchains.findByNetworkId(message.domain.chainId).name)) === false) {
        throw({ code: 'WRONG_NETWORK' })
      }
      let signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [account, message],
        from: account,
      })
      return signature
    } else if (typeof message === 'string') {
      let address = await this.account()
      let provider = new ethers.providers.Web3Provider(this.connector, 'any')
      let signer = provider.getSigner(0)
      let signature = await signer.signMessage(message)
      return signature
    }
  }
}

WalletLink.getConnectedInstance = getConnectedInstance
WalletLink.setConnectedInstance = setConnectedInstance

export default WalletLink
