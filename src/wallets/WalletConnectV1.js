/*#if _EVM

import { request } from '@depay/web3-client-evm'

/*#elif _SOLANA

import { request } from '@depay/web3-client-solana'

//#else */

import { request } from '@depay/web3-client'

//#endif

import Blockchains from '@depay/web3-blockchains'
import { ethers } from 'ethers'
import { getSmartContractWallet } from './MultiSig'
import { sendTransaction } from './WalletConnectV1/transaction'
import { supported } from '../blockchains'
import { WalletConnectClient } from '@depay/walletconnect-v1'

const KEY = '_DePayWeb3WalletsConnectedWalletConnectV1Instance'

let currentPlainInstance

const getPlainInstance = ()=>{
  if(currentPlainInstance) { return currentPlainInstance }
  currentPlainInstance = getWalletConnectInstance(()=>{})
  return currentPlainInstance
}

const isConnected = ()=>{
  return new Promise(async(resolve, reject)=>{
    
    setTimeout(()=>{ 
      delete localStorage['walletconnect']
      resolve(false)
    }, 5000)

    if(!localStorage['walletconnect'] || JSON.parse(localStorage['walletconnect']).handshakeTopic.length == 0) {
      delete localStorage['walletconnect']
      return resolve(false)
    }

    let connector = getPlainInstance()
    let accounts

    try {
      let blockNumber = await connector.sendCustomRequest({ method: 'eth_blockNumber' })
      if(blockNumber) {
        accounts = await connector.sendCustomRequest({ method: 'eth_accounts' }) 
      } else {
        delete localStorage['walletconnect']
      }
    } catch (error) {
      delete localStorage['walletconnect']
      resolve(false)
    }

    return resolve(accounts && accounts.length)
  })
}

const getConnectedInstance = async()=>{
  if(window[KEY]) { return window[KEY] }
  if(await isConnected()) { return new WalletConnectV1() }
}

const setConnectedInstance = (value)=>{
  window[KEY] = value
}

const getWalletConnectInstance = (connect)=>{
  return new WalletConnectClient({
    bridge: "https://walletconnect.depay.com",
    qrcodeModal: { 
      open: async(uri)=>connect({ uri }),
      close: ()=>{},
    }
  })
}

class WalletConnectV1 {

  static info = {
    name: 'WalletConnect V1',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0ndXRmLTgnPz48IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjUuNC4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAtLT48c3ZnIHZlcnNpb249JzEuMScgaWQ9J0xheWVyXzEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNTAwIDUwMCcgc3R5bGU9J2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTAwIDUwMDsnIHhtbDpzcGFjZT0ncHJlc2VydmUnPjxzdHlsZSB0eXBlPSd0ZXh0L2Nzcyc+IC5zdDB7ZmlsbDojNTk5MUNEO30KPC9zdHlsZT48ZyBpZD0nUGFnZS0xJz48ZyBpZD0nd2FsbGV0Y29ubmVjdC1sb2dvLWFsdCc+PHBhdGggaWQ9J1dhbGxldENvbm5lY3QnIGNsYXNzPSdzdDAnIGQ9J00xMDIuNywxNjJjODEuNS03OS44LDIxMy42LTc5LjgsMjk1LjEsMGw5LjgsOS42YzQuMSw0LDQuMSwxMC41LDAsMTQuNEwzNzQsMjE4LjkgYy0yLDItNS4zLDItNy40LDBsLTEzLjUtMTMuMmMtNTYuOC01NS43LTE0OS01NS43LTIwNS44LDBsLTE0LjUsMTQuMWMtMiwyLTUuMywyLTcuNCwwTDkxLjksMTg3Yy00LjEtNC00LjEtMTAuNSwwLTE0LjQgTDEwMi43LDE2MnogTTQ2Ny4xLDIyOS45bDI5LjksMjkuMmM0LjEsNCw0LjEsMTAuNSwwLDE0LjRMMzYyLjMsNDA1LjRjLTQuMSw0LTEwLjcsNC0xNC44LDBjMCwwLDAsMCwwLDBMMjUyLDMxMS45IGMtMS0xLTIuNy0xLTMuNywwaDBsLTk1LjUsOTMuNWMtNC4xLDQtMTAuNyw0LTE0LjgsMGMwLDAsMCwwLDAsMEwzLjQsMjczLjZjLTQuMS00LTQuMS0xMC41LDAtMTQuNGwyOS45LTI5LjIgYzQuMS00LDEwLjctNCwxNC44LDBsOTUuNSw5My41YzEsMSwyLjcsMSwzLjcsMGMwLDAsMCwwLDAsMGw5NS41LTkzLjVjNC4xLTQsMTAuNy00LDE0LjgsMGMwLDAsMCwwLDAsMGw5NS41LDkzLjUgYzEsMSwyLjcsMSwzLjcsMGw5NS41LTkzLjVDNDU2LjQsMjI1LjksNDYzLDIyNS45LDQ2Ny4xLDIyOS45eicvPjwvZz48L2c+PC9zdmc+Cg==",
    blockchains: supported.evm
  }

  static isAvailable = async()=>{
    return (await getConnectedInstance()) != undefined
  }

  constructor() {
    this.name = (localStorage[KEY+'_name'] && localStorage[KEY+'_name'] != undefined) ? localStorage[KEY+'_name'] : this.constructor.info.name
    this.logo = (localStorage[KEY+'_logo'] && localStorage[KEY+'_logo'] != undefined) ? localStorage[KEY+'_logo'] : this.constructor.info.logo
    this.blockchains = this.constructor.info.blockchains
    this.sendTransaction = (transaction)=>{ 
      return sendTransaction({
        wallet: this,
        transaction
      })
    }
  }

  disconnect() {
    setConnectedInstance(undefined)
    localStorage[KEY+'_name'] = undefined
    localStorage[KEY+'_logo'] = undefined
    currentPlainInstance = undefined
  }

  newWalletConnectInstance(connect) {
    let instance = getWalletConnectInstance(connect)

    instance.on("disconnect", (error, payload) => {
      this.disconnect()
      if (error) { throw error }
    })

    instance.on("modal_closed", ()=>{
      setConnectedInstance(undefined)
      this.connector = undefined
    })

    return instance
  }

  async account() {
    if(!this.connector){ this.connector = getPlainInstance() }
    let accounts
    try{ accounts = await this.connector.sendCustomRequest({ method: 'eth_accounts' }) } catch {}
    if(accounts && accounts.length) { return ethers.utils.getAddress(accounts[0]) }
  }

  async connect(options) {
    let connect = (options && options.connect) ? options.connect : ({uri})=>{}
    try {

      this.connector = WalletConnectV1.instance

      if(this.connector == undefined){
        this.connector = this.newWalletConnectInstance(connect)
      }

      if(options && options.reconnect) {
        if(this.connector) {
          try{ await this.connector.killSession() } catch {}
          this.disconnect()
        }
      }

      if((await isConnected())) {
        return await this.account()
      } else {

        let { accounts, chainId } = await this.connector.connect()

        if(options?.name) { localStorage[KEY+'_name'] = this.name = options.name }
        if(options?.logo) { localStorage[KEY+'_logo'] = this.logo = options.logo }

        if(accounts instanceof Array && accounts.length) {
          setConnectedInstance(this)
          accounts = accounts.map((account)=>ethers.utils.getAddress(account))

          return accounts[0]
        } else {
          return
        }
      }
      
    } catch (error) {
      console.log('WALLETCONNECT ERROR', error)
      return undefined
    }
  }

  async connectedTo(input) {
    let chainId = await this.connector.sendCustomRequest({ method: 'eth_chainId' })
    const blockchain = Blockchains.findById(chainId)
    if(!blockchain) { return false }
    if(input) {
      return input === blockchain.name
    } else {
      return blockchain.name
    }
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      let resolved, rejected
      const blockchain = Blockchains.findByName(blockchainName)
      setTimeout(async()=>{
        if(!(await this.connectedTo(blockchainName)) && !resolved && !rejected){
          reject({ code: 'NOT_SUPPORTED' })
        } else {
          resolve()
        }
      }, 3000)
      this.connector.sendCustomRequest({ 
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: blockchain.id }],
      }).then(()=>{
        resolved = true
        resolve()
      }).catch((error)=> {
        if(error && typeof error.message == 'string' && error.message.match('addEthereumChain')){ // chain not yet added
          this.addNetwork(blockchainName)
            .then(()=>this.switchTo(blockchainName).then(()=>{
              resolved = true
              resolve()
            }))
            .catch(()=>{
              rejected = true
              reject({ code: 'NOT_SUPPORTED' })
            })
        } else {
          rejected = true
          reject({ code: 'NOT_SUPPORTED' })
        }
      })
    })
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName)
      this.connector.sendCustomRequest({ 
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
        internalCallback = (error, payload) => {
          if(payload && payload.params && payload.params[0].accounts && payload.params[0].accounts instanceof Array) {
            const accounts = payload.params[0].accounts.map((account)=>ethers.utils.getAddress(account))
            callback(accounts[0])
          }
        }
        this.connector.on("session_update", internalCallback)
        break
    }
    return internalCallback
  }

  off(event, callback) {
    switch (event) {
      case 'account':
        this.connector.off("session_update")
        break
    }
  }

  async transactionCount({ blockchain, address }) {
    const smartContractWallet = await getSmartContractWallet(blockchain, address)
    if(smartContractWallet) {
      return await smartContractWallet.transactionCount()
    } else {
      return await request({ blockchain, method: 'transactionCount', address })
    }
  }

  async sign(message) {
    let blockchain = await this.connectedTo()
    let address = await this.account()
    const smartContractWallet = await getSmartContractWallet(blockchain, address)
    if(smartContractWallet){ throw({ message: 'Smart contract wallets are not supported for signing!', code: "SMART_CONTRACT_WALLET_NOT_SUPPORTED" }) }
    var params = [ethers.utils.toUtf8Bytes(message), address]
    let signature = await this.connector.signPersonalMessage(params)
    return signature
  }
}

WalletConnectV1.getConnectedInstance = getConnectedInstance
WalletConnectV1.setConnectedInstance = setConnectedInstance

export default WalletConnectV1
