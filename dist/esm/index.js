import Blockchains from '@depay/web3-blockchains';
import { ethers } from 'ethers';
import { request, getProvider, estimate } from '@depay/web3-client';
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@depay/solana-web3.js';
import { WalletConnectClient } from '@depay/walletconnect-v1';
import { CoinbaseWalletSDK } from '@depay/coinbase-wallet-sdk';

let supported$1 = ['ethereum', 'bsc', 'polygon', 'solana', 'fantom', 'velas'];
supported$1.evm = ['ethereum', 'bsc', 'polygon', 'fantom', 'velas'];
supported$1.solana = ['solana'];

function _optionalChain$e(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Transaction {

  constructor({ blockchain, from, to, value, api, method, params, instructions, sent, succeeded, failed }) {

    // required
    this.blockchain = blockchain;
    this.from = (from && from.match('0x')) ? ethers.utils.getAddress(from) : from;
    this.to = (to && to.match('0x')) ? ethers.utils.getAddress(to) : to;

    // optional
    this.value = _optionalChain$e([Transaction, 'access', _ => _.bigNumberify, 'call', _2 => _2(value, blockchain), 'optionalAccess', _3 => _3.toString, 'call', _4 => _4()]);
    this.api = api;
    this.method = method;
    this.params = params;
    this.sent = sent;
    this.succeeded = succeeded;
    this.failed = failed;
    this.instructions = instructions;

    // internal
    this._succeeded = false;
    this._failed = false;
  }

  async prepare({ wallet }) {
    this.from = await wallet.account();
  }

  static bigNumberify(value, blockchain) {
    if (typeof value === 'number') {
      return ethers.utils.parseUnits(value.toString(), Blockchains[blockchain].currency.decimals)
    } else if (value && value.toString) {
      return ethers.BigNumber.from(value.toString())
    } else {
      return value
    }
  }

  getContractArguments() {
    let fragment = this.getContract().interface.fragments.find((fragment) => {
      return fragment.name == this.method
    });

    if(this.params instanceof Array) {
      return this.params
    } else if (this.params instanceof Object) {
      return fragment.inputs.map((input) => {
        return this.params[input.name]
      })
    }
  }

  getContract() {
    return new ethers.Contract(this.to, this.api)
  }

  async getData() {
    let contractArguments = this.getContractArguments();
    let populatedTransaction;
    if(contractArguments) {
      populatedTransaction = await this.getContract().populateTransaction[this.method].apply(
        null, contractArguments
      );
    } else {
      populatedTransaction = await this.getContract().populateTransaction[this.method].apply(null);
    }
     
    return populatedTransaction.data
  }

  success() {
    if (this._succeeded) {
      return Promise.resolve(this)
    }
    return new Promise((resolve, reject) => {
      let originalSucceeded = this.succeeded;
      this.succeeded = (transaction) => {
        if (originalSucceeded) originalSucceeded(transaction);
        resolve(transaction);
      };
    })
  }

  failure() {
    if (this._failed) {
      return Promise.resolve(this)
    }
    return new Promise((resolve, reject) => {
      let originalFailed = this.failed;
      this.failed = (transaction, reason) => {
        if (originalFailed) originalFailed(transaction, reason);
        resolve(transaction, reason);
      };
    })
  }
}

const sendTransaction$3 = async ({ transaction, wallet })=> {
  transaction = new Transaction(transaction);
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    await wallet.switchTo(transaction.blockchain);
  }
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    throw({ code: 'WRONG_NETWORK' })
  }
  await transaction.prepare({ wallet });
  let transactionCount = await request({ blockchain: transaction.blockchain, method: 'transactionCount', address: transaction.from });
  transaction.nonce = transactionCount;
  let provider = new ethers.providers.Web3Provider(wallet.getProvider(), 'any');
  let signer = provider.getSigner(0);
  await submit$3({ transaction, provider, signer }).then((sentTransaction)=>{
    if (sentTransaction) {
      transaction.id = sentTransaction.hash;
      transaction.nonce = sentTransaction.nonce || transactionCount;
      transaction.url = Blockchains.findByName(transaction.blockchain).explorerUrlFor({ transaction });
      if (transaction.sent) transaction.sent(transaction);
      sentTransaction.wait(1).then(() => {
        transaction._succeeded = true;
        if (transaction.succeeded) transaction.succeeded(transaction);
      }).catch((error)=>{
        if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
          if(error.replacement && error.replacement.hash) {
            transaction.id = error.replacement.hash;
            transaction.url = Blockchains.findByName(transaction.blockchain).explorerUrlFor({ transaction });
          }
          if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 1) {
            transaction._succeeded = true;
            if (transaction.succeeded) transaction.succeeded(transaction);
          } else if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 0) {
            transaction._failed = true;
            if(transaction.failed) transaction.failed(transaction, error);  
          }
        } else {
          transaction._failed = true;
          if(transaction.failed) transaction.failed(transaction, error);
        }
      });
    } else {
      throw('Submitting transaction failed!')
    }
  });
  return transaction
};

const submit$3 = ({ transaction, provider, signer }) => {
  if(transaction.method) {
    return submitContractInteraction$2({ transaction, signer, provider })
  } else {
    return submitSimpleTransfer$3({ transaction, signer })
  }
};

const submitContractInteraction$2 = ({ transaction, signer, provider })=>{
  let contract = new ethers.Contract(transaction.to, transaction.api, provider);
  let contractArguments = transaction.getContractArguments({ contract });
  let method = contract.connect(signer)[transaction.method];
  if(contractArguments) {
    return method(...contractArguments, {
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  } else {
    return method({
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  }
};

const submitSimpleTransfer$3 = ({ transaction, signer })=>{
  return signer.sendTransaction({
    to: transaction.to,
    value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
  })
};

function _optionalChain$d(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Wallet (Ethereum)',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDojMzQzNDM0O30KCS5zdDJ7ZmlsbDojOEM4QzhDO30KCS5zdDN7ZmlsbDojM0MzQzNCO30KCS5zdDR7ZmlsbDojMTQxNDE0O30KCS5zdDV7ZmlsbDojMzkzOTM5O30KPC9zdHlsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4MS43LDExMC4yaDY0LjdWNDYuNWMwLTI1LjctMjAuOC00Ni41LTQ2LjUtNDYuNUg0Ni41QzIwLjgsMCwwLDIwLjgsMCw0Ni41djY1LjFoMzUuN2wyNi45LTI2LjkKCWMxLjUtMS41LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDc4LjZjNS4zLTI1LjUsMzAuMi00Miw1NS43LTM2LjdjMjUuNSw1LjMsNDIsMzAuMiwzNi43LDU1LjdjLTEuNiw3LjUtNC45LDE0LjYtOS44LDIwLjUKCWMtMC45LDEuMS0xLjksMi4yLTMsMy4zYy0xLjEsMS4xLTIuMiwyLjEtMy4zLDNjLTIwLjEsMTYuNi00OS45LDEzLjgtNjYuNS02LjNjLTQuOS01LjktOC4zLTEzLTkuOC0yMC42SDczLjJsLTI2LjksMjYuOAoJYy0xLjUsMS41LTMuNiwyLjUtNS43LDIuN2wwLDBoLTAuNGgtMC4xaC0wLjVIMHY3NGgyOC44bDE4LjItMTguMmMxLjUtMS42LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDI5LjkKCWM1LjItMjUuNSwzMC4yLTQxLjksNTUuNy0zNi43czQxLjksMzAuMiwzNi43LDU1LjdzLTMwLjIsNDEuOS01NS43LDM2LjdjLTE4LjUtMy44LTMyLjktMTguMi0zNi43LTM2LjdINTcuN2wtMTguMiwxOC4zCgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40SDB2MzQuMmg1Ni4zYzAuMiwwLDAuMywwLDAuNSwwaDAuMWgwLjRsMCwwYzIuMiwwLjIsNC4yLDEuMiw1LjgsMi44bDI4LDI4aDU3LjcKCWM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN3M0MiwzMC4yLDM2LjcsNTUuN2MtMS43LDguMS01LjUsMTUuNy0xMSwyMS45Yy0wLjYsMC43LTEuMiwxLjMtMS45LDJzLTEuMywxLjMtMiwxLjkKCWMtMTkuNSwxNy4zLTQ5LjMsMTUuNi02Ni43LTMuOWMtNS41LTYuMi05LjMtMTMuNy0xMS0yMS45SDg3LjFjLTEuMSwwLTIuMS0wLjItMy4xLTAuNWgtMC4xbC0wLjMtMC4xbC0wLjItMC4xbC0wLjItMC4xbC0wLjMtMC4xCgloLTAuMWMtMC45LTAuNS0xLjgtMS4xLTIuNi0xLjhsLTI4LTI4SDB2NTMuNWMwLjEsMjUuNywyMC45LDQ2LjQsNDYuNSw0Ni40aDM1My4zYzI1LjcsMCw0Ni41LTIwLjgsNDYuNS00Ni41di02My42aC02NC43CgljLTQzLjIsMC03OC4yLTM1LTc4LjItNzguMmwwLDBDMzAzLjUsMTQ1LjIsMzM4LjUsMTEwLjIsMzgxLjcsMTEwLjJ6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMjAuOSwyOTguMWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIyMC45LDMxMi40LDIyMC45LDI5OC4xTDIyMC45LDI5OC4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjE5LjYsOTEuNWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIxOS42LDEwNS44LDIxOS42LDkxLjV6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zODIuMiwxMjguOGgtMC41Yy0zMi45LDAtNTkuNiwyNi43LTU5LjYsNTkuNmwwLDBsMCwwYzAsMzIuOSwyNi43LDU5LjYsNTkuNiw1OS42bDAsMGgwLjUKCWMzMi45LDAsNTkuNi0yNi43LDU5LjYtNTkuNmwwLDBDNDQxLjgsMTU1LjQsNDE1LjEsMTI4LjgsMzgyLjIsMTI4Ljh6IE0zOTYuNiwyMTkuNGgtMzFsOC45LTMyLjVjLTcuNy0zLjctMTEtMTIuOS03LjQtMjAuNgoJYzMuNy03LjcsMTIuOS0xMSwyMC42LTcuNGM3LjcsMy43LDExLDEyLjksNy40LDIwLjZjLTEuNSwzLjItNC4xLDUuOC03LjQsNy40TDM5Ni42LDIxOS40eiIvPgo8ZyBpZD0iTGF5ZXJfeDAwMjBfMSI+Cgk8ZyBpZD0iXzE0MjEzOTQzNDI0MDAiPgoJCTxnPgoJCQk8cG9seWdvbiBjbGFzcz0ic3QxIiBwb2ludHM9IjEyOSwxNjYuMiAxMjguNywxNjcuMyAxMjguNywyMDEuNCAxMjksMjAxLjcgMTQ0LjgsMTkyLjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDE2Ni4yIDExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDMiIHBvaW50cz0iMTI5LDIwNC43IDEyOC44LDIwNC45IDEyOC44LDIxNyAxMjksMjE3LjYgMTQ0LjgsMTk1LjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDIxNy42IDEyOSwyMDQuNyAxMTMuMiwxOTUuNCAJCQkiLz4KCQkJPHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSIxMjksMjAxLjcgMTQ0LjgsMTkyLjQgMTI5LDE4NS4yIAkJCSIvPgoJCQk8cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJPC9nPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ 
    return (
      _optionalChain$d([window, 'optionalAccess', _17 => _17.ethereum]) &&
      Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!PocketUniverse)(?!RevokeCash)/)).length != 1 && // MetaMask
      !_optionalChain$d([window, 'optionalAccess', _18 => _18.coin98]) && // Coin98
      !(_optionalChain$d([window, 'optionalAccess', _19 => _19.ethereum, 'optionalAccess', _20 => _20.isTrust]) || _optionalChain$d([window, 'optionalAccess', _21 => _21.ethereum, 'optionalAccess', _22 => _22.isTrustWallet])) && // Trust Wallet
      !_optionalChain$d([window, 'optionalAccess', _23 => _23.ethereum, 'optionalAccess', _24 => _24.isDeficonnectProvider]) && // crypto.com
      !_optionalChain$d([window, 'optionalAccess', _25 => _25.ethereum, 'optionalAccess', _26 => _26.isHyperPay]) && // isHyperPay
      !_optionalChain$d([window, 'optionalAccess', _27 => _27.ethereum, 'optionalAccess', _28 => _28.isPhantom]) && // Phantom
      !(_optionalChain$d([window, 'optionalAccess', _29 => _29.ethereum, 'optionalAccess', _30 => _30.isCoinbaseWallet]) || _optionalChain$d([window, 'optionalAccess', _31 => _31.ethereum, 'optionalAccess', _32 => _32.isWalletLink]))
    )
  };}
  
  constructor () {
    this.name = this.constructor.info.name;
    this.logo = this.constructor.info.logo;
    this.blockchains = this.constructor.info.blockchains;
    this.sendTransaction = (transaction)=>{
      return sendTransaction$3({
        wallet: this,
        transaction
      })
    };
  }

  getProvider() { return window.ethereum }

  async account() {
    if(!this.getProvider()) { return undefined }
    const accounts = (await this.getProvider().request({ method: 'eth_accounts' })).map((address)=>ethers.utils.getAddress(address));
    return accounts[0]
  }

  async connect() {
    if(!this.getProvider()) { return undefined }
    const accounts = (await this.getProvider().request({ method: 'eth_requestAccounts' })).map((address)=>ethers.utils.getAddress(address));
    return accounts[0]
  }

  on(event, callback) {
    let internalCallback;
    switch (event) {
      case 'account':
        internalCallback = (accounts) => callback(ethers.utils.getAddress(accounts[0]));
        this.getProvider().on('accountsChanged', internalCallback);
        break
    }
    return internalCallback
  }

  off(event, internalCallback) {
    switch (event) {
      case 'account':
        this.getProvider().removeListener('accountsChanged', internalCallback);
        break
    }
    return internalCallback
  }

  async connectedTo(input) {
    const blockchain = Blockchains.findById(await this.getProvider().request({ method: 'eth_chainId' }));
    if(input) {
      return input === blockchain.name
    } else {
      return blockchain.name
    }
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName);
      this.getProvider().request({
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
      }).then(resolve).catch(reject);
    })
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName);
      this.getProvider().request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: blockchain.id }],
      }).then(resolve).catch((error)=> {
        if(error.code === 4902){ // chain not yet added
          this.addNetwork(blockchainName)
            .then(()=>this.switchTo(blockchainName).then(resolve))
            .catch(reject);
        } else {
          reject(error);
        }
      });
    })
  }

  transactionCount({ blockchain, address }) {
    return request({ blockchain, method: 'transactionCount', address })
  }

  async sign(message) {
    await this.account();
    let provider = new ethers.providers.Web3Provider(this.getProvider(), 'any');
    let signer = provider.getSigner(0);
    let signature = await signer.signMessage(message);
    return signature
  }
} WindowEthereum.__initStatic(); WindowEthereum.__initStatic2();

function _optionalChain$c(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Binance extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Binance Wallet',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkzLjY4Ij48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5My42OCIgZmlsbD0iIzFlMjAyNCIvPjxwYXRoIGQ9Im01Ni45Miw0Ni41M2wzOS4wOC0yMi41NCwzOS4wOCwyMi41NC0xNC4zNSw4LjM2LTI0LjczLTE0LjE4LTI0LjczLDE0LjE4LTE0LjM1LTguMzZabTc4LjE3LDI4LjUzbC0xNC4zNS04LjM2LTI0LjczLDE0LjI3LTI0LjczLTE0LjI3LTE0LjM1LDguMzZ2MTYuNzFsMjQuNzMsMTQuMTh2MjguNDVsMTQuMzUsOC4zNiwxNC4zNS04LjM2di0yOC40NWwyNC43My0xNC4yN3YtMTYuNjNabTAsNDUuMTZ2LTE2LjcxbC0xNC4zNSw4LjM2djE2LjcxbDE0LjM1LTguMzZabTEwLjIxLDUuODJsLTI0LjczLDE0LjI3djE2LjcxbDM5LjA4LTIyLjU0di00NS4yNWwtMTQuMzUsOC4zNnYyOC40NVptLTE0LjM1LTY1LjI1bDE0LjM1LDguMzZ2MTYuNzFsMTQuMzUtOC4zNnYtMTYuNzFsLTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTQ5LjMsODUuNnYxNi43MWwxNC4zNSw4LjM2LDE0LjM1LTguMzZ2LTE2LjcxbC0xNC4zNSw4LjM2LTE0LjM1LTguMzZabS0yNC43My0yNi4xN2wxNC4zNSw4LjM2di0xNi43MWwtMTQuMzUtOC4zNnYxNi43MVptMjQuNzMtNTkuNDNsMTQuMzUsOC4zNiwxNC4zNS04LjM2LTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTM0Ljk1LDguMzZsMTQuMzUtOC4zNi0xNC4zNS04LjM2LTE0LjM1LDguMzZ2MTYuNzFsMTQuMzUsOC4zNnYtMTYuNzFabTAsMjguNDVsLTE0LjM1LTguMzZ2NDUuMTZsMzkuMDgsMjIuNTR2LTE2LjcxbC0yNC43My0xNC4yN3MwLTI4LjM2LDAtMjguMzZaIiBmaWxsPSIjZjBiOTBiIi8+PC9zdmc+",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{
    return _optionalChain$c([window, 'optionalAccess', _2 => _2.BinanceChain]) &&
      !window.coin98
  };}

  getProvider() { return window.BinanceChain }

} Binance.__initStatic(); Binance.__initStatic2();

function _optionalChain$b(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Brave extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Brave',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyNTYgMzAxIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyNTYgMzAxIiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoKCTxwYXRoIGZpbGw9IiNGMTVBMjIiIGQ9Im0yMzYgMTA1LjQtNy44LTIxLjIgNS40LTEyLjJjMC43LTEuNiAwLjMtMy40LTAuOC00LjZsLTE0LjgtMTQuOWMtNi41LTYuNS0xNi4xLTguOC0yNC44LTUuN2wtNC4xIDEuNC0yMi42LTI0LjUtMzguMi0wLjNoLTAuM2wtMzguNSAwLjMtMjIuNiAyNC43LTQtMS40Yy04LjgtMy4xLTE4LjUtMC44LTI1IDUuOGwtMTUgMTUuMmMtMSAxLTEuMyAyLjQtMC44IDMuN2w1LjcgMTIuNy03LjggMjEuMiA1LjEgMTkuMiAyMyA4Ny4yYzIuNiAxMCA4LjcgMTguOCAxNy4yIDI0LjkgMCAwIDI3LjggMTkuNyA1NS4zIDM3LjUgMi40IDEuNiA1IDIuNyA3LjcgMi43czUuMi0xLjEgNy43LTIuN2MzMC45LTIwLjIgNTUuMy0zNy41IDU1LjMtMzcuNSA4LjQtNi4xIDE0LjUtMTQuOCAxNy4xLTI0LjlsMjIuOC04Ny4yIDQuOC0xOS40eiIvPgoJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0ibTEzMy4xIDE3OS40Yy0xLTAuNC0yLjEtMC44LTIuNC0wLjhoLTIuN2MtMC4zIDAtMS40IDAuMy0yLjQgMC44bC0xMSA0LjZjLTEgMC40LTIuNyAxLjItMy43IDEuN2wtMTYuNSA4LjZjLTEgMC41LTEuMSAxLjQtMC4yIDIuMWwxNC42IDEwLjNjMC45IDAuNyAyLjQgMS44IDMuMiAyLjVsNi41IDUuNmMwLjggMC44IDIuMiAxLjkgMyAyLjdsNi4yIDUuNmMwLjggMC44IDIuMiAwLjggMyAwbDYuNC01LjZjMC44LTAuOCAyLjItMS45IDMtMi43bDYuNS01LjdjMC44LTAuOCAyLjMtMS45IDMuMi0yLjVsMTQuNi0xMC40YzAuOS0wLjcgMC44LTEuNi0wLjItMi4xbC0xNi41LTguNGMtMS0wLjUtMi43LTEuMy0zLjctMS43bC0xMC45LTQuNnoiLz4KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Im0yMTIuMiAxMDkuMmMwLjMtMS4xIDAuMy0xLjUgMC4zLTEuNSAwLTEuMS0wLjEtMy0wLjMtNGwtMC44LTIuNGMtMC41LTEtMS40LTIuNi0yLTMuNWwtOS41LTE0LjFjLTAuNi0wLjktMS43LTIuNC0yLjQtMy4zbC0xMi4zLTE1LjRjLTAuNy0wLjgtMS40LTEuNi0xLjQtMS41aC0wLjJzLTAuOSAwLjItMiAwLjNsLTE4LjggMy43Yy0xLjEgMC4zLTIuOSAwLjYtNCAwLjhsLTAuMyAwLjFjLTEuMSAwLjItMi45IDAuMS00LTAuM2wtMTUuOC01LjFjLTEuMS0wLjMtMi45LTAuOC0zLjktMS4xIDAgMC0zLjItMC44LTUuOC0wLjctMi42IDAtNS44IDAuNy01LjggMC43LTEuMSAwLjMtMi45IDAuOC0zLjkgMS4xbC0xNS44IDUuMWMtMS4xIDAuMy0yLjkgMC40LTQgMC4zbC0wLjMtMC4xYy0xLjEtMC4yLTIuOS0wLjYtNC0wLjhsLTE5LTMuNWMtMS4xLTAuMy0yLTAuMy0yLTAuM2gtMC4yYy0wLjEgMC0wLjggMC43LTEuNCAxLjVsLTEyLjMgMTUuMmMtMC43IDAuOC0xLjggMi40LTIuNCAzLjNsLTkuNSAxNC4xYy0wLjYgMC45LTEuNSAyLjUtMiAzLjVsLTAuOCAyLjRjLTAuMiAxLjEtMC4zIDMtMC4zIDQuMSAwIDAgMCAwLjMgMC4zIDEuNSAwLjYgMiAyIDMuOSAyIDMuOSAwLjcgMC44IDEuOSAyLjMgMi43IDNsMjcuOSAyOS43YzAuOCAwLjggMSAyLjQgMC42IDMuNGwtNS44IDEzLjhjLTAuNCAxLTAuNSAyLjctMC4xIDMuOGwxLjYgNC4zYzEuMyAzLjYgMy42IDYuOCA2LjcgOS4zbDUuNyA0LjZjMC44IDAuNyAyLjQgMC45IDMuNCAwLjRsMTcuOS04LjVjMS0wLjUgMi41LTEuNSAzLjQtMi4zbDEyLjgtMTEuNmMxLjktMS43IDEuOS00LjYgMC4zLTYuNGwtMjYuOS0xOC4xYy0wLjktMC42LTEuMy0xLjktMC44LTNsMTEuOC0yMi4zYzAuNS0xIDAuNi0yLjYgMC4yLTMuNmwtMS40LTMuM2MtMC40LTEtMS43LTIuMi0yLjctMi42bC0zNC45LTEzYy0xLTAuNC0xLTAuOCAwLjEtMC45bDIyLjQtMi4xYzEuMS0wLjEgMi45IDAuMSA0IDAuM2wxOS45IDUuNmMxLjEgMC4zIDEuOCAxLjQgMS42IDIuNWwtNyAzNy44Yy0wLjIgMS4xLTAuMiAyLjYgMC4xIDMuNXMxLjMgMS42IDIuNCAxLjlsMTMuOCAzYzEuMSAwLjMgMi45IDAuMyA0IDBsMTIuOS0zYzEuMS0wLjMgMi4yLTEuMSAyLjQtMS45IDAuMy0wLjggMC4zLTIuNCAwLjEtMy41bC02LjgtMzcuOWMtMC4yLTEuMSAwLjUtMi4zIDEuNi0yLjVsMTkuOS01LjZjMS4xLTAuMyAyLjktMC40IDQtMC4zbDIyLjQgMi4xYzEuMSAwLjEgMS4yIDAuNSAwLjEgMC45bC0zNC43IDEzLjJjLTEgMC40LTIuMyAxLjUtMi43IDIuNmwtMS40IDMuM2MtMC40IDEtMC40IDIuNyAwLjIgMy42bDExLjkgMjIuM2MwLjUgMSAwLjIgMi4zLTAuOCAzbC0yNi45IDE4LjJjLTEuOCAxLjgtMS42IDQuNyAwLjMgNi40bDEyLjggMTEuNmMwLjggMC44IDIuNCAxLjggMy40IDIuMmwxOCA4LjVjMSAwLjUgMi41IDAuMyAzLjQtMC40bDUuNy00LjZjMy0yLjQgNS4zLTUuNyA2LjYtOS4zbDEuNi00LjNjMC40LTEgMC4zLTIuOC0wLjEtMy44bC01LjgtMTMuOGMtMC40LTEtMC4yLTIuNSAwLjYtMy40bDI3LjktMjkuN2MwLjgtMC44IDEuOS0yLjIgMi43LTMtMC40LTAuMyAxLjEtMi4xIDEuNi00LjF6Ii8+Cgo8L3N2Zz4K",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$b([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isBraveWallet]) };}
} Brave.__initStatic(); Brave.__initStatic2();

function _optionalChain$a(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Coin98 extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Coin98',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA0MC43IDQwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA0MC43IDQwIiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBmaWxsPSIjRDlCNDMyIiBkPSJtMzMuMyAwaC0yNS45Yy00LjEgMC03LjQgMy4zLTcuNCA3LjN2MjUuNGMwIDQgMy4zIDcuMyA3LjQgNy4zaDI1LjljNC4xIDAgNy40LTMuMyA3LjQtNy4zdi0yNS40YzAtNC0zLjMtNy4zLTcuNC03LjN6Ii8+CjxwYXRoIGZpbGw9IiMyNTI1MjUiIGQ9Im0zMy4zIDBoLTI1LjljLTQuMSAwLTcuNCAzLjMtNy40IDcuM3YyNS40YzAgNCAzLjMgNy4zIDcuNCA3LjNoMjUuOWM0LjEgMCA3LjQtMy4zIDcuNC03LjN2LTI1LjRjMC00LTMuMy03LjMtNy40LTcuM3ptLTYuMyAxMGMzIDAgNS41IDIuNCA1LjUgNS40IDAgMC45LTAuMiAxLjgtMC42IDIuNi0wLjctMC41LTEuNS0xLTIuMy0xLjMgMC4yLTAuNCAwLjMtMC45IDAuMy0xLjMgMC0xLjUtMS4zLTIuOC0yLjgtMi44LTEuNiAwLTIuOCAxLjMtMi44IDIuOCAwIDAuNSAwLjEgMC45IDAuMyAxLjMtMC44IDAuMy0xLjYgMC43LTIuMyAxLjMtMC41LTAuOC0wLjYtMS43LTAuNi0yLjYtMC4xLTMgMi4zLTUuNCA1LjMtNS40em0tMTMuMyAyMGMtMyAwLTUuNS0yLjQtNS41LTUuNGgyLjZjMCAxLjUgMS4zIDIuOCAyLjggMi44czIuOC0xLjMgMi44LTIuOGgyLjZjMC4yIDMtMi4zIDUuNC01LjMgNS40em0wLTcuNWMtMy41IDAtNi4zLTIuOC02LjMtNi4yczIuOC02LjMgNi4zLTYuMyA2LjQgMi44IDYuNCA2LjNjMCAzLjQtMi45IDYuMi02LjQgNi4yem0xMy4zIDcuNWMtMy41IDAtNi40LTIuOC02LjQtNi4yIDAtMy41IDIuOC02LjMgNi40LTYuMyAzLjUgMCA2LjMgMi44IDYuMyA2LjMgMC4xIDMuNC0yLjggNi4yLTYuMyA2LjJ6bTMuOC02LjNjMCAyLjEtMS43IDMuNy0zLjggMy43cy0zLjgtMS43LTMuOC0zLjdjMC0yLjEgMS43LTMuNyAzLjgtMy43IDIuMSAwLjEgMy44IDEuNyAzLjggMy43em0tMTMuNC03LjRjMCAyLjEtMS43IDMuNy0zLjggMy43cy0zLjgtMS43LTMuOC0zLjdjMC0yLjEgMS43LTMuNyAzLjgtMy43IDIuMiAwIDMuOCAxLjYgMy44IDMuN3oiLz4KPC9zdmc+Cg==",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$a([window, 'optionalAccess', _2 => _2.coin98]) };}
} Coin98.__initStatic(); Coin98.__initStatic2();

function _optionalChain$9(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Coinbase extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Coinbase',
    logo: "data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHhtbG5zOnhsaW5rPSdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyB2aWV3Qm94PScwIDAgNDg4Ljk2IDQ4OC45Nic+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOnVybCgjbGluZWFyLWdyYWRpZW50KTt9LmNscy0ye2ZpbGw6IzQzNjFhZDt9PC9zdHlsZT48bGluZWFyR3JhZGllbnQgaWQ9J2xpbmVhci1ncmFkaWVudCcgeDE9JzI1MCcgeTE9JzcuMzUnIHgyPScyNTAnIHkyPSc0OTYuMzInIGdyYWRpZW50VHJhbnNmb3JtPSdtYXRyaXgoMSwgMCwgMCwgLTEsIDAsIDUwMiknIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBvZmZzZXQ9JzAnIHN0b3AtY29sb3I9JyMzZDViYTknLz48c3RvcCBvZmZzZXQ9JzEnIHN0b3AtY29sb3I9JyM0ODY4YjEnLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cGF0aCBjbGFzcz0nY2xzLTEnIGQ9J00yNTAsNS42OEMxMTQuODcsNS42OCw1LjUyLDExNSw1LjUyLDI1MC4xN1MxMTQuODcsNDk0LjY1LDI1MCw0OTQuNjUsNDk0LjQ4LDM4NS4yOSw0OTQuNDgsMjUwLjE3LDM4NS4xMyw1LjY4LDI1MCw1LjY4Wm0wLDM4Ny41NEExNDMuMDYsMTQzLjA2LDAsMSwxLDM5My4wNSwyNTAuMTcsMTQzLjExLDE0My4xMSwwLDAsMSwyNTAsMzkzLjIyWicgdHJhbnNmb3JtPSd0cmFuc2xhdGUoLTUuNTIgLTUuNjgpJy8+PHBhdGggY2xhc3M9J2Nscy0yJyBkPSdNMjg0LjY5LDI5Ni4wOUgyMTUuMzFhMTEsMTEsMCwwLDEtMTAuOS0xMC45VjIxNS40OGExMSwxMSwwLDAsMSwxMC45LTEwLjkxSDI4NWExMSwxMSwwLDAsMSwxMC45LDEwLjkxdjY5LjcxQTExLjA3LDExLjA3LDAsMCwxLDI4NC42OSwyOTYuMDlaJyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgtNS41MiAtNS42OCknLz48L3N2Zz4=",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return (_optionalChain$9([window, 'optionalAccess', _5 => _5.ethereum, 'optionalAccess', _6 => _6.isCoinbaseWallet]) || _optionalChain$9([window, 'optionalAccess', _7 => _7.ethereum, 'optionalAccess', _8 => _8.isWalletLink])) };}
} Coinbase.__initStatic(); Coinbase.__initStatic2();

function _optionalChain$8(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class CryptoCom extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Crypto.com | DeFi Wallet',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA4OS45IDEwMi44IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA4OS45IDEwMi44IiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOiMwMzMxNkM7fQo8L3N0eWxlPgoKPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTUuMzc1MSAtMTEzLjYxKSI+Cgk8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzE3OTQgMCAwIC4zMTQ2NSAtMS4wNDczIDMwLjQ0NykiPgoJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Im0xNjEuNiAyNjQuMy0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6bTAgMC0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6Ii8+CgkJPHBhdGggY2xhc3M9InN0MSIgZD0ibTIxNy41IDUyNy4xaC0yMC4xbC0yNC4xLTIyLjF2LTExLjNsMjQuOS0yMy44di0zNy43bDMyLjYtMjEuMyAzNy4xIDI4LjEtNTAuNCA4OC4xem0tODMuMy01OS42IDMuNy0zNS40LTEyLjItMzEuN2g3MmwtMTEuOSAzMS43IDMuNCAzNS40aC01NXptMTYuNCAzNy41LTI0LjEgMjIuNGgtMjAuNGwtNTAuNy04OC40IDM3LjQtMjcuOCAzMi45IDIxdjM3LjdsMjQuOSAyMy44djExLjN6bS00NC44LTE3MC4xaDExMS40bDEzLjMgNTYuN2gtMTM3LjdsMTMtNTYuN3ptNTUuOC03MC42LTE0MS40IDgxLjZ2MTYzLjNsMTQxLjQgODEuNiAxNDEuNC04MS42di0xNjMuM2wtMTQxLjQtODEuNnoiLz4KCTwvZz4KPC9nPgo8L3N2Zz4K",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$8([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isDeficonnectProvider]) };}
} CryptoCom.__initStatic(); CryptoCom.__initStatic2();

function _optionalChain$7(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class HyperPay extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'HyperPay',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjA0LjcgMjAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMDQuNyAyMDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHBhdGggZmlsbD0iIzFBNzJGRSIgZD0iTTEwMi41LDUuMkM1MC44LDUuMiw4LjgsNDcuMiw4LjgsOTlzNDIsOTMuNSw5My44LDkzLjVzOTMuOC00Miw5My44LTkzLjhTMTU0LjIsNS4yLDEwMi41LDUuMnogTTEyNy4yLDExOS4yCgljLTYuMiwwLTIxLjcsMC4zLTIxLjcsMC4zbC03LDI3aC0yOWw2LjgtMjYuNUgzMWw3LjItMjEuOGMwLDAsNzguOCwwLjIsODUuMiwwYzYuNS0wLjIsMTYuNS0xLjgsMTYuOC0xNC44YzAuMy0xNy44LTI3LTE2LjgtMjkuMi0xCgljLTEuNSwxMC0xLjUsMTIuNS0xLjUsMTIuNUg4My44bDUtMjMuNUg0N2w2LjMtMjJjMCwwLDYxLjIsMC4yLDcyLjgsMC4yczQyLjIsMyw0Mi4yLDMxLjJDMTY4LjIsMTEyLDEzOC41LDExOS4zLDEyNy4yLDExOS4yCglMMTI3LjIsMTE5LjJ6Ii8+Cjwvc3ZnPgo=",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$7([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isHyperPay]) };}
} HyperPay.__initStatic(); HyperPay.__initStatic2();

function _optionalChain$6(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class MetaMask extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'MetaMask',
    logo: "data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0ODUuOTMgNDUwLjU2Jz48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzgyODQ4Nzt9LmNscy0ye2ZpbGw6I2UyNzcyNjtzdHJva2U6I2UyNzcyNjt9LmNscy0xMCwuY2xzLTExLC5jbHMtMiwuY2xzLTMsLmNscy00LC5jbHMtNSwuY2xzLTYsLmNscy03LC5jbHMtOCwuY2xzLTl7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uY2xzLTN7ZmlsbDojZTM3NzI1O3N0cm9rZTojZTM3NzI1O30uY2xzLTR7ZmlsbDojZDZjMGIzO3N0cm9rZTojZDZjMGIzO30uY2xzLTV7ZmlsbDojMjQzNDQ3O3N0cm9rZTojMjQzNDQ3O30uY2xzLTZ7ZmlsbDojY2Q2MzI4O3N0cm9rZTojY2Q2MzI4O30uY2xzLTd7ZmlsbDojZTM3NTI1O3N0cm9rZTojZTM3NTI1O30uY2xzLTh7ZmlsbDojZjY4NTFmO3N0cm9rZTojZjY4NTFmO30uY2xzLTl7ZmlsbDojYzFhZTllO3N0cm9rZTojYzFhZTllO30uY2xzLTEwe2ZpbGw6IzE3MTcxNztzdHJva2U6IzE3MTcxNzt9LmNscy0xMXtmaWxsOiM3NjNlMWE7c3Ryb2tlOiM3NjNlMWE7fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSdjbHMtMScgZD0nTTI0Ny45MSwzNTYuMjlhMjYsMjYsMCwxLDAtMjYsMjZBMjYsMjYsMCwwLDAsMjQ3LjkxLDM1Ni4yOVonIHRyYW5zZm9ybT0ndHJhbnNsYXRlKC03Ljk3IC0yMS4zMyknLz48cGF0aCBjbGFzcz0nY2xzLTEnIGQ9J00yNDYuNTUsMTQ5LjcxYTI2LDI2LDAsMSwwLTI2LDI2QTI2LDI2LDAsMCwwLDI0Ni41NSwxNDkuNzFaJyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgtNy45NyAtMjEuMzMpJy8+PGNpcmNsZSBjbGFzcz0nY2xzLTEnIGN4PScxNDguNCcgY3k9JzIzMC4wNScgcj0nMjUuOTknLz48cG9seWdvbiBjbGFzcz0nY2xzLTInIHBvaW50cz0nNDYxLjI4IDAuNSAyNzIuMDYgMTQxLjAzIDMwNy4wNSA1OC4xMiA0NjEuMjggMC41Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzI0LjQ2IDAuNSAyMTIuMTYgMTQyLjM3IDE3OC44OCA1OC4xMiAyNC40NiAwLjUnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMzkzLjIgMzI2LjI2IDM0Mi44MSA0MDMuNDcgNDUwLjYzIDQzMy4xNCA0ODEuNjMgMzI3Ljk3IDM5My4yIDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPSc0LjQ5IDMyNy45NyAzNS4zIDQzMy4xNCAxNDMuMTMgNDAzLjQ3IDkyLjczIDMyNi4yNiA0LjQ5IDMyNy45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPScxMzcuMDQgMTk1LjggMTA3IDI0MS4yNSAyMTQuMDYgMjQ2LjAxIDIxMC4yNiAxMzAuOTYgMTM3LjA0IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzM0OC43IDE5NS44IDI3NC41MyAxMjkuNjMgMjcyLjA2IDI0Ni4wMSAzNzguOTQgMjQxLjI1IDM0OC43IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzE0My4xMyA0MDMuNDcgMjA3LjQxIDM3Mi4wOSAxNTEuODggMzI4LjczIDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAzNDIuODEgNDAzLjQ3IDMzMy44NyAzMjguNzMgMjc4LjM0IDM3Mi4wOScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPSczNDIuODEgNDAzLjQ3IDI3OC4zNCAzNzIuMDkgMjgzLjQ3IDQxNC4xMiAyODIuOSA0MzEuODEgMzQyLjgxIDQwMy40NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPScxNDMuMTMgNDAzLjQ3IDIwMy4wMyA0MzEuODEgMjAyLjY1IDQxNC4xMiAyMDcuNDEgMzcyLjA5IDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTUnIHBvaW50cz0nMjAzLjk4IDMwMC45NyAxNTAuMzUgMjg1LjE4IDE4OC4yIDI2Ny44OCAyMDMuOTggMzAwLjk3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy01JyBwb2ludHM9JzI4MS43NiAzMDAuOTcgMjk3LjU1IDI2Ny44OCAzMzUuNTggMjg1LjE4IDI4MS43NiAzMDAuOTcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTYnIHBvaW50cz0nMTQzLjEzIDQwMy40NyAxNTIuMjUgMzI2LjI2IDkyLjczIDMyNy45NyAxNDMuMTMgNDAzLjQ3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy02JyBwb2ludHM9JzMzMy42OCAzMjYuMjYgMzQyLjgxIDQwMy40NyAzOTMuMiAzMjcuOTcgMzMzLjY4IDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPSczNzguOTQgMjQxLjI1IDI3Mi4wNiAyNDYuMDEgMjgxLjk1IDMwMC45NyAyOTcuNzQgMjY3Ljg4IDMzNS43NyAyODUuMTggMzc4Ljk0IDI0MS4yNScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE4OC4zOSAyNjcuODggMjAzLjk4IDMwMC45NyAyMTQuMDYgMjQ2LjAxIDEwNyAyNDEuMjUgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNycgcG9pbnRzPScxMDcgMjQxLjI1IDE1MS44OCAzMjguNzMgMTUwLjM1IDI4NS4xOCAxMDcgMjQxLjI1Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzMzNS43NyAyODUuMTggMzMzLjg3IDMyOC43MyAzNzguOTQgMjQxLjI1IDMzNS43NyAyODUuMTgnLz48cG9seWdvbiBjbGFzcz0nY2xzLTcnIHBvaW50cz0nMjE0LjA2IDI0Ni4wMSAyMDMuOTggMzAwLjk3IDIxNi41MyAzNjUuODIgMjE5LjM4IDI4MC40MyAyMTQuMDYgMjQ2LjAxJy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzI3Mi4wNiAyNDYuMDEgMjY2LjkzIDI4MC4yNCAyNjkuMjEgMzY1LjgyIDI4MS45NSAzMDAuOTcgMjcyLjA2IDI0Ni4wMScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyODEuOTUgMzAwLjk3IDI2OS4yMSAzNjUuODIgMjc4LjM0IDM3Mi4wOSAzMzMuODcgMzI4LjczIDMzNS43NyAyODUuMTggMjgxLjk1IDMwMC45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE1MS44OCAzMjguNzMgMjA3LjQxIDM3Mi4wOSAyMTYuNTMgMzY1LjgyIDIwMy45OCAzMDAuOTcgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOScgcG9pbnRzPScyODIuOSA0MzEuODEgMjgzLjQ3IDQxNC4xMiAyNzguNzIgNDA5Ljk0IDIwNy4wMiA0MDkuOTQgMjAyLjY1IDQxNC4xMiAyMDMuMDMgNDMxLjgxIDE0My4xMyA0MDMuNDcgMTY0LjA1IDQyMC41OCAyMDYuNDUgNDUwLjA2IDI3OS4yOSA0NTAuMDYgMzIxLjg5IDQyMC41OCAzNDIuODEgNDAzLjQ3IDI4Mi45IDQzMS44MScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTAnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAyNjkuMjEgMzY1LjgyIDIxNi41MyAzNjUuODIgMjA3LjQxIDM3Mi4wOSAyMDIuNjUgNDE0LjEyIDIwNy4wMiA0MDkuOTQgMjc4LjcyIDQwOS45NCAyODMuNDcgNDE0LjEyIDI3OC4zNCAzNzIuMDknLz48cG9seWdvbiBjbGFzcz0nY2xzLTExJyBwb2ludHM9JzQ2OS4yNyAxNTAuMTYgNDg1LjQzIDcyLjU3IDQ2MS4yOCAwLjUgMjc4LjM0IDEzNi4yOCAzNDguNyAxOTUuOCA0NDguMTYgMjI0LjkgNDcwLjIyIDE5OS4yMyA0NjAuNzEgMTkyLjM4IDQ3NS45MiAxNzguNSA0NjQuMTMgMTY5LjM3IDQ3OS4zNSAxNTcuNzcgNDY5LjI3IDE1MC4xNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTEnIHBvaW50cz0nMC41IDcyLjU3IDE2LjY2IDE1MC4xNiA2LjM5IDE1Ny43NyAyMS42MSAxNjkuMzcgMTAuMDEgMTc4LjUgMjUuMjIgMTkyLjM4IDE1LjcxIDE5OS4yMyAzNy41OCAyMjQuOSAxMzcuMDQgMTk1LjggMjA3LjQxIDEzNi4yOCAyNC40NiAwLjUgMC41IDcyLjU3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzQ0OC4xNiAyMjQuOSAzNDguNyAxOTUuOCAzNzguOTQgMjQxLjI1IDMzMy44NyAzMjguNzMgMzkzLjIgMzI3Ljk3IDQ4MS42MyAzMjcuOTcgNDQ4LjE2IDIyNC45Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzEzNy4wNCAxOTUuOCAzNy41OCAyMjQuOSA0LjQ5IDMyNy45NyA5Mi43MyAzMjcuOTcgMTUxLjg4IDMyOC43MyAxMDcgMjQxLjI1IDEzNy4wNCAxOTUuOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyNzIuMDYgMjQ2LjAxIDI3OC4zNCAxMzYuMjggMzA3LjI0IDU4LjEyIDE3OC44OCA1OC4xMiAyMDcuNDEgMTM2LjI4IDIxNC4wNiAyNDYuMDEgMjE2LjM0IDI4MC42MiAyMTYuNTMgMzY1LjgyIDI2OS4yMSAzNjUuODIgMjY5LjU5IDI4MC42MiAyNzIuMDYgMjQ2LjAxJy8+PC9zdmc+",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ 
    return(
      _optionalChain$6([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isMetaMask]) &&
      Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!PocketUniverse)(?!RevokeCash)/)).length == 1
    )
  };}
} MetaMask.__initStatic(); MetaMask.__initStatic2();

function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Opera extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Opera',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA3NS42IDc1LjYiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMzMzMyAwIDAgLTEuMzMzMyAwIDEwNy4yKSI+CiAgCiAgPGxpbmVhckdyYWRpZW50IGlkPSJvcGVyYUxvZ28wMDAwMDAxMjM1MTEiIHgxPSItMTA3LjM0IiB4Mj0iLTEwNi4zNCIgeTE9Ii0xMzcuODUiIHkyPSItMTM3Ljg1IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAgLTczLjI1NyAtNzMuMjU3IDAgLTEwMDc1IC03Nzg0LjEpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRkYxQjJEIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjMiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjYxNCIvPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iI0E3MDAxNCIgb2Zmc2V0PSIxIi8+CiAgPC9saW5lYXJHcmFkaWVudD4KICAKICA8cGF0aCBmaWxsPSJ1cmwoI29wZXJhTG9nbzAwMDAwMDEyMzUxMSkiIGQ9Im0yOC4zIDgwLjRjLTE1LjYgMC0yOC4zLTEyLjctMjguMy0yOC4zIDAtMTUuMiAxMi0yNy42IDI3LTI4LjNoMS40YzcuMyAwIDEzLjkgMi43IDE4LjkgNy4yLTMuMy0yLjItNy4yLTMuNS0xMS40LTMuNS02LjggMC0xMi44IDMuMy0xNi45IDguNi0zLjEgMy43LTUuMiA5LjItNS4zIDE1LjN2MS4zYzAuMSA2LjEgMi4yIDExLjYgNS4zIDE1LjMgNC4xIDUuMyAxMC4xIDguNiAxNi45IDguNiA0LjIgMCA4LTEuMyAxMS40LTMuNS01IDQuNS0xMS42IDcuMi0xOC44IDcuMi0wLjEgMC4xLTAuMSAwLjEtMC4yIDAuMXoiLz4KICAKICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9Ii0xMDcuMDYiIHgyPSItMTA2LjA2IiB5MT0iLTEzOC4wNCIgeTI9Ii0xMzguMDQiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMCAtNjQuNzkyIC02NC43OTIgMCAtODkwNi4yIC02ODYwLjQpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjOUMwMDAwIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iLjciLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iMSIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPHBhdGggZD0ibTE5IDY4YzIuNiAzLjEgNiA0LjkgOS42IDQuOSA4LjMgMCAxNC45LTkuNCAxNC45LTIwLjlzLTYuNy0yMC45LTE0LjktMjAuOWMtMy43IDAtNyAxLjktOS42IDQuOSA0LjEtNS4zIDEwLjEtOC42IDE2LjktOC42IDQuMiAwIDggMS4zIDExLjQgMy41IDUuOCA1LjIgOS41IDEyLjcgOS41IDIxLjFzLTMuNyAxNS45LTkuNSAyMS4xYy0zLjMgMi4yLTcuMiAzLjUtMTEuNCAzLjUtNi44IDAuMS0xMi44LTMuMy0xNi45LTguNiIgZmlsbD0idXJsKCNiKSIvPgo8L2c+Cjwvc3ZnPgo=",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$5([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isOpera]) };}
} Opera.__initStatic(); Opera.__initStatic2();

function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

const POLL_SPEED = 500; // 0.5 seconds
const MAX_POLLS = 240; // 120 seconds

const sendTransaction$2 = async ({ transaction, wallet })=> {
  transaction = new Transaction(transaction);
  await transaction.prepare({ wallet });
  await submit$2({ transaction, wallet }).then(({ signature })=>{
    if(signature) {
      transaction.id = signature;
      transaction.url = Blockchains.findByName(transaction.blockchain).explorerUrlFor({ transaction });
      if (transaction.sent) transaction.sent(transaction);

      let count = 0;
      const interval = setInterval(async ()=> {
        count++;
        if(count >= MAX_POLLS) { return clearInterval(interval) }

        const provider = await getProvider(transaction.blockchain);
        const { value } = await provider.getSignatureStatus(signature);
        const confirmationStatus = _optionalChain$4([value, 'optionalAccess', _ => _.confirmationStatus]);
        if(confirmationStatus) {
          const hasReachedSufficientCommitment = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized';
          if (hasReachedSufficientCommitment) {
            if(value.err) {
              transaction._failed = true;
              const confirmedTransaction = await provider.getConfirmedTransaction(signature);
              const failedReason = _optionalChain$4([confirmedTransaction, 'optionalAccess', _2 => _2.meta, 'optionalAccess', _3 => _3.logMessages]) ? confirmedTransaction.meta.logMessages[confirmedTransaction.meta.logMessages.length - 1] : null;
              if(transaction.failed) transaction.failed(transaction, failedReason);
            } else {
              transaction._succeeded = true;
              if (transaction.succeeded) transaction.succeeded(transaction);
            }
            return clearInterval(interval)
          }
        }
      }, POLL_SPEED);
    } else {
      throw('Submitting transaction failed!')
    }
  });
  return transaction
};

const submit$2 = ({ transaction, wallet })=> {
  if(transaction.instructions) {
    return submitInstructions({ transaction, wallet })
  } else {
    return submitSimpleTransfer$2({ transaction, wallet })
  }
};

const submitSimpleTransfer$2 = async ({ transaction, wallet })=> {
  let fromPubkey = new PublicKey(await wallet.account());
  let toPubkey = new PublicKey(transaction.to);
  const provider = await getProvider(transaction.blockchain);
  let recentBlockhash = (await provider.getLatestBlockhash()).blockhash;
  const instructions = [
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: parseInt(Transaction.bigNumberify(transaction.value, transaction.blockchain), 10)
    })
  ];
  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash,
    instructions,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);
  return window.solana.signAndSendTransaction(transactionV0)
};

const submitInstructions = async ({ transaction, wallet })=> {
  let fromPubkey = new PublicKey(await wallet.account());
  const provider = await getProvider(transaction.blockchain);
  let recentBlockhash = (await provider.getLatestBlockhash()).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash,
    instructions: transaction.instructions,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);
  let signers = transaction.instructions.map((instruction)=>instruction.signers).filter(Boolean).flat();
  if(signers.length) {
    transactionV0.sign(Array.from(new Set(signers)));
  }
  return window.solana.signAndSendTransaction(transactionV0)
};

function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class WindowSolana {

  static __initStatic() {this.info = {
    name: 'Wallet (Solana)',
    logo: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Cgkuc3Qye2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDE2NTIzNDE5NTQ5NTc2MDU4MDgwMDAwMDAwNjMwMzAwNDA2OTM1MjExODk1MV8pO30KCS5zdDN7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDkyNDIyMzgxNjc5OTg1OTI5MTcwMDAwMDA2ODU0NzIyMTYxOTE4MTIzNjUzXyk7fQo8L3N0eWxlPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgxLjcsMTEwLjJoNjQuN1Y0Ni41YzAtMjUuNy0yMC44LTQ2LjUtNDYuNS00Ni41SDQ2LjVDMjAuOCwwLDAsMjAuOCwwLDQ2LjV2NjUuMWgzNS43bDI2LjktMjYuOQoJYzEuNS0xLjUsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoNzguNmM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN2MyNS41LDUuMyw0MiwzMC4yLDM2LjcsNTUuN2MtMS42LDcuNS00LjksMTQuNi05LjgsMjAuNQoJYy0wLjksMS4xLTEuOSwyLjItMywzLjNjLTEuMSwxLjEtMi4yLDIuMS0zLjMsM2MtMjAuMSwxNi42LTQ5LjksMTMuOC02Ni41LTYuM2MtNC45LTUuOS04LjMtMTMtOS44LTIwLjZINzMuMmwtMjYuOSwyNi44CgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40aC0wLjFoLTAuNUgwdjc0aDI4LjhsMTguMi0xOC4yYzEuNS0xLjYsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoMjkuOQoJYzUuMi0yNS41LDMwLjItNDEuOSw1NS43LTM2LjdzNDEuOSwzMC4yLDM2LjcsNTUuN3MtMzAuMiw0MS45LTU1LjcsMzYuN2MtMTguNS0zLjgtMzIuOS0xOC4yLTM2LjctMzYuN0g1Ny43bC0xOC4yLDE4LjMKCWMtMS41LDEuNS0zLjYsMi41LTUuNywyLjdsMCwwaC0wLjRIMHYzNC4yaDU2LjNjMC4yLDAsMC4zLDAsMC41LDBoMC4xaDAuNGwwLDBjMi4yLDAuMiw0LjIsMS4yLDUuOCwyLjhsMjgsMjhoNTcuNwoJYzUuMy0yNS41LDMwLjItNDIsNTUuNy0zNi43czQyLDMwLjIsMzYuNyw1NS43Yy0xLjcsOC4xLTUuNSwxNS43LTExLDIxLjljLTAuNiwwLjctMS4yLDEuMy0xLjksMnMtMS4zLDEuMy0yLDEuOQoJYy0xOS41LDE3LjMtNDkuMywxNS42LTY2LjctMy45Yy01LjUtNi4yLTkuMy0xMy43LTExLTIxLjlIODcuMWMtMS4xLDAtMi4xLTAuMi0zLjEtMC41aC0wLjFsLTAuMy0wLjFsLTAuMi0wLjFsLTAuMi0wLjFsLTAuMy0wLjEKCWgtMC4xYy0wLjktMC41LTEuOC0xLjEtMi42LTEuOGwtMjgtMjhIMHY1My41YzAuMSwyNS43LDIwLjksNDYuNCw0Ni41LDQ2LjRoMzUzLjNjMjUuNywwLDQ2LjUtMjAuOCw0Ni41LTQ2LjV2LTYzLjZoLTY0LjcKCWMtNDMuMiwwLTc4LjItMzUtNzguMi03OC4ybDAsMEMzMDMuNSwxNDUuMiwzMzguNSwxMTAuMiwzODEuNywxMTAuMnoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyMC45LDI5OC4xYzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjIwLjksMzEyLjQsMjIwLjksMjk4LjFMMjIwLjksMjk4LjF6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMTkuNiw5MS41YzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjE5LjYsMTA1LjgsMjE5LjYsOTEuNXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4Mi4yLDEyOC44aC0wLjVjLTMyLjksMC01OS42LDI2LjctNTkuNiw1OS42bDAsMGwwLDBjMCwzMi45LDI2LjcsNTkuNiw1OS42LDU5LjZsMCwwaDAuNQoJYzMyLjksMCw1OS42LTI2LjcsNTkuNi01OS42bDAsMEM0NDEuOCwxNTUuNCw0MTUuMSwxMjguOCwzODIuMiwxMjguOHogTTM5Ni42LDIxOS40aC0zMWw4LjktMzIuNWMtNy43LTMuNy0xMS0xMi45LTcuNC0yMC42CgljMy43LTcuNywxMi45LTExLDIwLjYtNy40YzcuNywzLjcsMTEsMTIuOSw3LjQsMjAuNmMtMS41LDMuMi00LjEsNS44LTcuNCw3LjRMMzk2LjYsMjE5LjR6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTQ5LjAwNzciIHkxPSIxMzkuMzA5MyIgeDI9IjEyMi4xMjMxIiB5Mj0iMTkwLjgwNDIiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAwIDMwLjUzNTQpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMEZGQTMiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNEQzFGRkYiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTExMi43LDIwMy41YzAuMy0wLjMsMC43LTAuNSwxLjEtMC41aDM4LjhjMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOAoJYy0wLjcsMC0xLjEtMC45LTAuNi0xLjRMMTEyLjcsMjAzLjV6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjEzNy4yNTMzIiB5MT0iMTMzLjE3MjUiIHgyPSIxMTAuMzY4NyIgeTI9IjE4NC42Njc0IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMCAzMC41MzU0KSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBGRkEzIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojREMxRkZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfKTsiIGQ9Ik0xMTIuNywxNzQuOWMwLjMtMC4zLDAuNy0wLjUsMS4xLTAuNWgzOC44CgljMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOGMtMC43LDAtMS4xLTAuOS0wLjYtMS40TDExMi43LDE3NC45eiIvPgo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxNDMuMDkyOSIgeTE9IjEzNi4yMjEyIiB4Mj0iMTE2LjIwODIiIHkyPSIxODcuNzE2MiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgMzAuNTM1NCkiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzAwRkZBMyIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6I0RDMUZGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyk7IiBkPSJNMTQ1LjYsMTg5LjFjLTAuMy0wLjMtMC43LTAuNS0xLjEtMC41CgloLTM4LjhjLTAuNywwLTEuMSwwLjktMC42LDEuNGw3LjcsNy43YzAuMywwLjMsMC43LDAuNSwxLjEsMC41aDM4LjhjMC43LDAsMS4xLTAuOSwwLjYtMS40TDE0NS42LDE4OS4xeiIvPgo8L3N2Zz4K',
    blockchains: supported$1.solana
  };}

   static __initStatic2() {this.isAvailable = async()=>{ 
    return (
      _optionalChain$3([window, 'optionalAccess', _4 => _4.solana]) &&
      !_optionalChain$3([window, 'optionalAccess', _5 => _5.solana, 'optionalAccess', _6 => _6.isPhantom]) &&
      !window.coin98
    )
  };}
  
  constructor () {
    this.name = this.constructor.info.name;
    this.logo = this.constructor.info.logo;
    this.blockchains = this.constructor.info.blockchains;
    this.sendTransaction = (transaction)=>{ 
      return sendTransaction$2({
        wallet: this,
        transaction
      })
    };
  }

  async account() {
    if(_optionalChain$3([window, 'optionalAccess', _7 => _7.solana]) == undefined){ return }
    if(_optionalChain$3([window, 'optionalAccess', _8 => _8.solana, 'optionalAccess', _9 => _9.publicKey])) { return window.solana.publicKey.toString() }
    if(_optionalChain$3([window, 'optionalAccess', _10 => _10.solana, 'optionalAccess', _11 => _11.isBraveWallet]) != true) {
      let publicKey;
      try { ({ publicKey } = await window.solana.connect({ onlyIfTrusted: true })); } catch (e) {}
      if(publicKey){ return publicKey.toString() }
    }
  }

  async connect() {
    if(!_optionalChain$3([window, 'optionalAccess', _12 => _12.solana])) { return undefined }
    let { publicKey } = await window.solana.connect();
    return publicKey.toString()
  }

  on(event, callback) {
    let internalCallback;
    switch (event) {
      case 'account':
        internalCallback = (publicKey) => callback(_optionalChain$3([publicKey, 'optionalAccess', _13 => _13.toString, 'call', _14 => _14()]));
        window.solana.on('accountChanged', internalCallback);
        break
    }
    return internalCallback
  }

  off(event, internalCallback) {
    switch (event) {
      case 'account':
        console.log('removeListener');
        window.solana.removeListener('accountChanged', internalCallback);
        break
    }
    return internalCallback
  }

  async connectedTo(input) {
    return input == 'solana'
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      reject({ code: 'NOT_SUPPORTED' });
    })
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      reject({ code: 'NOT_SUPPORTED' });
    })
  }

  async sign(message) {
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");
    return JSON.stringify(signedMessage.signature)
  }
} WindowSolana.__initStatic(); WindowSolana.__initStatic2();

function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Phantom extends WindowSolana {

  static __initStatic() {this.info = {
    name: 'Phantom',
    logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz48cGF0aCBkPSJNMTEwLjU4NCA2NC45MTQySDk5LjE0MkM5OS4xNDIgNDEuNzY1MSA4MC4xNzMgMjMgNTYuNzcyNCAyM0MzMy42NjEyIDIzIDE0Ljg3MTYgNDEuMzA1NyAxNC40MTE4IDY0LjA1ODNDMTMuOTM2IDg3LjU3NyAzNi4yNDEgMTA4IDYwLjAxODYgMTA4SDYzLjAwOTRDODMuOTcyMyAxMDggMTEyLjA2OSA5MS43NjY3IDExNi40NTkgNzEuOTg3NEMxMTcuMjcgNjguMzQxMyAxMTQuMzU4IDY0LjkxNDIgMTEwLjU4NCA2NC45MTQyWk0zOS43Njg5IDY1Ljk0NTRDMzkuNzY4OSA2OS4wNDExIDM3LjIwOTUgNzEuNTcyOSAzNC4wODAyIDcxLjU3MjlDMzAuOTUwOSA3MS41NzI5IDI4LjM5MTYgNjkuMDM5OSAyOC4zOTE2IDY1Ljk0NTRWNTYuODQxNEMyOC4zOTE2IDUzLjc0NTcgMzAuOTUwOSA1MS4yMTM5IDM0LjA4MDIgNTEuMjEzOUMzNy4yMDk1IDUxLjIxMzkgMzkuNzY4OSA1My43NDU3IDM5Ljc2ODkgNTYuODQxNFY2NS45NDU0Wk01OS41MjI0IDY1Ljk0NTRDNTkuNTIyNCA2OS4wNDExIDU2Ljk2MzEgNzEuNTcyOSA1My44MzM4IDcxLjU3MjlDNTAuNzA0NSA3MS41NzI5IDQ4LjE0NTEgNjkuMDM5OSA0OC4xNDUxIDY1Ljk0NTRWNTYuODQxNEM0OC4xNDUxIDUzLjc0NTcgNTAuNzA1NiA1MS4yMTM5IDUzLjgzMzggNTEuMjEzOUM1Ni45NjMxIDUxLjIxMzkgNTkuNTIyNCA1My43NDU3IDU5LjUyMjQgNTYuODQxNFY2NS45NDU0WiIgZmlsbD0idXJsKCNwYWludDFfbGluZWFyKSIvPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhciIgeDE9IjY0IiB5MT0iMCIgeDI9IjY0IiB5Mj0iMTI4IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzUzNEJCMSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzU1MUJGOSIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyIiB4MT0iNjUuNDk5OCIgeTE9IjIzIiB4Mj0iNjUuNDk5OCIgeTI9IjEwOCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIHN0b3AtY29sb3I9IndoaXRlIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSJ3aGl0ZSIgc3RvcC1vcGFjaXR5PSIwLjgyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PC9zdmc+Cg=',
    blockchains: ['solana', 'ethereum', 'polygon']
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$2([window, 'optionalAccess', _3 => _3.solana, 'optionalAccess', _4 => _4.isPhantom]) };}
} Phantom.__initStatic(); Phantom.__initStatic2();

function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class Trust extends WindowEthereum {

  static __initStatic() {this.info = {
    name: 'Trust Wallet',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA5Ni41IDk2LjUiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDk2LjUgOTYuNSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgZmlsbD0iI0ZGRkZGRiIgd2lkdGg9Ijk2LjUiIGhlaWdodD0iOTYuNSIvPgo8cGF0aCBzdHJva2U9IiMzMzc1QkIiIHN0cm9rZS13aWR0aD0iNi4wNjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQgPSIxMCIgZmlsbD0ibm9uZSIgZD0ibTQ4LjUgMjAuMWM5LjYgOCAyMC42IDcuNSAyMy43IDcuNS0wLjcgNDUuNS01LjkgMzYuNS0yMy43IDQ5LjMtMTcuOC0xMi44LTIzLTMuNy0yMy43LTQ5LjMgMy4yIDAgMTQuMSAwLjUgMjMuNy03LjV6Ii8+Cjwvc3ZnPgo=",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return (_optionalChain$1([window, 'optionalAccess', _5 => _5.ethereum, 'optionalAccess', _6 => _6.isTrust]) || _optionalChain$1([window, 'optionalAccess', _7 => _7.ethereum, 'optionalAccess', _8 => _8.isTrustWallet])) };}
} Trust.__initStatic(); Trust.__initStatic2();

const transactionApiBlockchainNames = {
  'ethereum': 'mainnet',
  'bsc': 'bsc',
  'polygon': 'polygon',
};

const explorerBlockchainNames = {
  'ethereum': 'eth',
  'bsc': 'bnb',
  'polygon': 'matic',
};

class Safe {

  constructor ({ address, blockchain }) {
    this.address = address;
    this.blockchain = blockchain;
  }

  async transactionCount() {
    let transactionCount;
    let jsonResult = await fetch(`https://safe-transaction-${transactionApiBlockchainNames[this.blockchain]}.safe.global/api/v1/safes/${this.address}/all-transactions/`)
      .then((response) => response.json())
      .catch((error) => { console.error('Error:', error); });
    if(jsonResult && jsonResult.results && jsonResult.results.length) {
      transactionCount = jsonResult.results[0].nonce + 1;
    } else {
      transactionCount = parseInt((await request({
        blockchain: this.blockchain,
        address: this.address,
        api: [{"inputs":[],"name":"nonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
        method: 'nonce',
      })).toString(), 10);
    }
    return transactionCount
  }

  async retrieveTransaction({ blockchain, tx }) {
    const provider = await getProvider(blockchain);
    let jsonResult = await fetch(`https://safe-transaction-${transactionApiBlockchainNames[blockchain]}.safe.global/api/v1/multisig-transactions/${tx}/`)
      .then((response) => response.json())
      .catch((error) => { console.error('Error:', error); });
    if(jsonResult && jsonResult.isExecuted && jsonResult.transactionHash) {
      return await provider.getTransaction(jsonResult.transactionHash)
    } else {
      return undefined
    }
  }

  explorerUrlFor({ transaction }) {
    if(transaction) {
      return `https://app.safe.global/${explorerBlockchainNames[transaction.blockchain]}:${transaction.from}/transactions/tx?id=multisig_${transaction.from}_${transaction.id}`
    }
  }
}

const isSmartContractWallet = async(blockchain, address)=>{
  const provider = await getProvider(blockchain);
  const code = await provider.getCode(address);
  return (code != '0x')
};

const identifySmartContractWallet = async (blockchain, address)=>{
  let name; 
  try {
    name = await request({
      blockchain,
      address,
      api: [{ "constant": true, "inputs": [], "name": "NAME", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function"}],
      method: 'NAME'
    });
  } catch (e) {}
  if(name == 'Default Callback Handler') { return 'Safe' }
  
};

const getSmartContractWallet = async(blockchain, address)=> {
  if(!await isSmartContractWallet(blockchain, address)){ return }

  const type = await identifySmartContractWallet(blockchain, address);
  if(type == 'Safe') {
    return new Safe({ blockchain, address })
  } else if(type == 'Argent') {
    return new Argent({ blockchain, address })
  } else {
    if(smartContractWallet){ throw({ message: 'Unrecognized smart contract wallet not supported!', code: "SMART_CONTRACT_WALLET_NOT_SUPPORTED" }) }
  }
};

const sendTransaction$1 = async ({ transaction, wallet })=> {
  transaction = new Transaction(transaction);
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    throw({ code: 'WRONG_NETWORK' })
  }
  await transaction.prepare({ wallet });
  const smartContractWallet = await getSmartContractWallet(transaction.blockchain, transaction.from);
  let transactionCount = await wallet.transactionCount({ blockchain: transaction.blockchain, address: transaction.from });
  transaction.nonce = transactionCount;
  await submit$1({ transaction, wallet }).then((tx)=>{
    if (tx) {
      let blockchain = Blockchains.findByName(transaction.blockchain);
      transaction.id = tx;
      transaction.url = smartContractWallet && smartContractWallet.explorerUrlFor ? smartContractWallet.explorerUrlFor({ transaction }) : blockchain.explorerUrlFor({ transaction });
      if (transaction.sent) transaction.sent(transaction);
      retrieveTransaction({ blockchain: transaction.blockchain, tx, smartContractWallet }).then((sentTransaction)=>{
        transaction.id = sentTransaction.hash || transaction.id;
        transaction.url = blockchain.explorerUrlFor({ transaction });
        transaction.nonce = sentTransaction.nonce || transactionCount;
        sentTransaction.wait(1).then(() => {
          transaction._succeeded = true;
          if (transaction.succeeded) transaction.succeeded(transaction);
        }).catch((error)=>{
          if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
            if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 1) {
              transaction.id = error.replacement.hash;
              transaction._succeeded = true;
              if (transaction.succeeded) transaction.succeeded(transaction);
            } else if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 0) {
              transaction.id = error.replacement.hash;
              transaction._failed = true;
              if(transaction.failed) transaction.failed(transaction, error);  
            }
          } else {
            transaction._failed = true;
            if(transaction.failed) transaction.failed(transaction, error);
          }
        });
      });
    } else {
      throw('Submitting transaction failed!')
    }
  });
  return transaction
};

const retrieveTransaction = async ({ blockchain, tx, smartContractWallet })=>{
  const provider = await getProvider(blockchain);
  let retrieve = async()=>{
    try {
      if(smartContractWallet && smartContractWallet.retrieveTransaction) {
        return await smartContractWallet.retrieveTransaction({ blockchain, tx })
      } else {
        return await provider.getTransaction(tx)
      }
    } catch (e) {}
  };
  
  let sentTransaction;
  sentTransaction = await retrieve();
  while (!sentTransaction) {
    await (new Promise((resolve)=>setTimeout(resolve, 3000)));
    sentTransaction = await retrieve();
  }
  return sentTransaction
};

const submit$1 = ({ transaction, wallet }) => {
  if(transaction.method) {
    return submitContractInteraction$1({ transaction, wallet })
  } else {
    return submitSimpleTransfer$1({ transaction, wallet })
  }
};

const submitContractInteraction$1 = async ({ transaction, wallet })=>{
  const provider = await getProvider(transaction.blockchain);
  const gasPrice = await provider.getGasPrice();
  let gas = await estimate(transaction);
  const data = await transaction.getData();
  const value = transaction.value ? ethers.utils.hexlify(ethers.BigNumber.from(transaction.value)) : undefined;
  const nonce = ethers.utils.hexlify(transaction.nonce);
  gas = gas.add(gas.div(10));
  return wallet.connector.sendTransaction({
    from: transaction.from,
    to: transaction.to,
    value,
    data,
    gas: gas.toHexString(),
    gasPrice: gasPrice.toHexString(),
    nonce,
  })
};

const submitSimpleTransfer$1 = async ({ transaction, wallet })=>{
  const provider = await getProvider(transaction.blockchain);
  const gasPrice = await provider.getGasPrice();
  const gas = await estimate(transaction);
  const value = ethers.utils.hexlify(ethers.BigNumber.from(transaction.value));
  const nonce = ethers.utils.hexlify(transaction.nonce);
  return wallet.connector.sendTransaction({
    from: transaction.from,
    to: transaction.to,
    value,
    data: '0x',
    gas: gas.toHexString(),
    gasPrice: gasPrice.toHexString(),
    nonce,
  })
};

function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

const KEY = '_DePayWeb3WalletsConnectedWalletConnectV1Instance';

let currentPlainInstance;

const getPlainInstance = ()=>{
  if(currentPlainInstance) { return currentPlainInstance }
  currentPlainInstance = getWalletConnectInstance(()=>{});
  return currentPlainInstance
};

const isConnected = ()=>{
  return new Promise(async(resolve, reject)=>{
    
    setTimeout(()=>{ resolve(false); }, 800);

    if(!localStorage['walletconnect'] || JSON.parse(localStorage['walletconnect']).handshakeTopic.length == 0) {
      delete localStorage['walletconnect'];
      return resolve(false)
    }

    let connector = getPlainInstance();
    let accounts;

    try {
      let blockNumber = await connector.sendCustomRequest({ method: 'eth_blockNumber' });
      if(blockNumber) {
        accounts = await connector.sendCustomRequest({ method: 'eth_accounts' }); 
      } else {
        delete localStorage['walletconnect'];
      }
    } catch (error) {
      delete localStorage['walletconnect'];
      resolve(false);
    }

    return resolve(accounts && accounts.length)
  })
};

const getConnectedInstance$1 = async()=>{
  if(window[KEY]) { return window[KEY] }
  if(await isConnected()) { return new WalletConnectV1() }
};

const setConnectedInstance$1 = (value)=>{
  window[KEY] = value;
};

const getWalletConnectInstance = (connect)=>{
  return new WalletConnectClient({
    bridge: "https://walletconnect.depay.com",
    qrcodeModal: { 
      open: async(uri)=>connect({ uri }),
      close: ()=>{},
    }
  })
};

class WalletConnectV1 {

  static __initStatic() {this.info = {
    name: 'WalletConnect',
    logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0ndXRmLTgnPz48IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjUuNC4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAtLT48c3ZnIHZlcnNpb249JzEuMScgaWQ9J0xheWVyXzEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNTAwIDUwMCcgc3R5bGU9J2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTAwIDUwMDsnIHhtbDpzcGFjZT0ncHJlc2VydmUnPjxzdHlsZSB0eXBlPSd0ZXh0L2Nzcyc+IC5zdDB7ZmlsbDojNTk5MUNEO30KPC9zdHlsZT48ZyBpZD0nUGFnZS0xJz48ZyBpZD0nd2FsbGV0Y29ubmVjdC1sb2dvLWFsdCc+PHBhdGggaWQ9J1dhbGxldENvbm5lY3QnIGNsYXNzPSdzdDAnIGQ9J00xMDIuNywxNjJjODEuNS03OS44LDIxMy42LTc5LjgsMjk1LjEsMGw5LjgsOS42YzQuMSw0LDQuMSwxMC41LDAsMTQuNEwzNzQsMjE4LjkgYy0yLDItNS4zLDItNy40LDBsLTEzLjUtMTMuMmMtNTYuOC01NS43LTE0OS01NS43LTIwNS44LDBsLTE0LjUsMTQuMWMtMiwyLTUuMywyLTcuNCwwTDkxLjksMTg3Yy00LjEtNC00LjEtMTAuNSwwLTE0LjQgTDEwMi43LDE2MnogTTQ2Ny4xLDIyOS45bDI5LjksMjkuMmM0LjEsNCw0LjEsMTAuNSwwLDE0LjRMMzYyLjMsNDA1LjRjLTQuMSw0LTEwLjcsNC0xNC44LDBjMCwwLDAsMCwwLDBMMjUyLDMxMS45IGMtMS0xLTIuNy0xLTMuNywwaDBsLTk1LjUsOTMuNWMtNC4xLDQtMTAuNyw0LTE0LjgsMGMwLDAsMCwwLDAsMEwzLjQsMjczLjZjLTQuMS00LTQuMS0xMC41LDAtMTQuNGwyOS45LTI5LjIgYzQuMS00LDEwLjctNCwxNC44LDBsOTUuNSw5My41YzEsMSwyLjcsMSwzLjcsMGMwLDAsMCwwLDAsMGw5NS41LTkzLjVjNC4xLTQsMTAuNy00LDE0LjgsMGMwLDAsMCwwLDAsMGw5NS41LDkzLjUgYzEsMSwyLjcsMSwzLjcsMGw5NS41LTkzLjVDNDU2LjQsMjI1LjksNDYzLDIyNS45LDQ2Ny4xLDIyOS45eicvPjwvZz48L2c+PC9zdmc+Cg==",
    blockchains: supported$1.evm
  };}

  static __initStatic2() {this.isAvailable = async()=>{
    return (await getConnectedInstance$1()) != undefined
  };}

  constructor() {
    this.name = (localStorage[KEY+'_name'] && localStorage[KEY+'_name'] != 'undefined') ? localStorage[KEY+'_name'] : this.constructor.info.name;
    this.logo = (localStorage[KEY+'_logo'] && localStorage[KEY+'_logo'] != 'undefined') ? localStorage[KEY+'_logo'] : this.constructor.info.logo;
    this.blockchains = this.constructor.info.blockchains;
    this.sendTransaction = (transaction)=>{ 
      return sendTransaction$1({
        wallet: this,
        transaction
      })
    };
  }

  disconnect() {
    setConnectedInstance$1(undefined);
    localStorage[KEY+'_name'] = undefined;
    localStorage[KEY+'_logo'] = undefined;
    currentPlainInstance = undefined;
  }

  newWalletConnectInstance(connect) {
    let instance = getWalletConnectInstance(connect);

    instance.on("disconnect", (error, payload) => {
      this.disconnect();
      if (error) { throw error }
    });

    instance.on("modal_closed", ()=>{
      setConnectedInstance$1(undefined);
      this.connector = undefined;
    });

    return instance
  }

  async account() {
    if(!this.connector){ this.connector = getPlainInstance(); }
    let accounts;
    try{ accounts = await this.connector.sendCustomRequest({ method: 'eth_accounts' }); } catch (e) {}
    if(accounts && accounts.length) { return ethers.utils.getAddress(accounts[0]) }
  }

  async connect(options) {
    let connect = (options && options.connect) ? options.connect : ({uri})=>{};
    try {

      this.connector = WalletConnectV1.instance;

      if(this.connector == undefined){
        this.connector = this.newWalletConnectInstance(connect);
      }

      if(options && options.reconnect) {
        if(this.connector) {
          try{ await this.connector.killSession(); } catch (e2) {}
          this.disconnect();
        }
      }

      if((await isConnected())) {
        return await this.account()
      } else {

        let { accounts, chainId } = await this.connector.connect();

        if(_optionalChain([options, 'optionalAccess', _ => _.name])) { localStorage[KEY+'_name'] = this.name = options.name; }
        if(_optionalChain([options, 'optionalAccess', _2 => _2.logo])) { localStorage[KEY+'_logo'] = this.logo = options.logo; }

        if(accounts instanceof Array && accounts.length) {
          setConnectedInstance$1(this);
          accounts = accounts.map((account)=>ethers.utils.getAddress(account));

          return accounts[0]
        } else {
          return
        }
      }
      
    } catch (error) {
      console.log('WALLETCONNECT ERROR', error);
      return undefined
    }
  }

  async connectedTo(input) {
    let chainId = await this.connector.sendCustomRequest({ method: 'eth_chainId' });
    const blockchain = Blockchains.findById(chainId);
    if(input) {
      return input === blockchain.name
    } else {
      return blockchain.name
    }
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      let resolved, rejected;
      const blockchain = Blockchains.findByName(blockchainName);
      setTimeout(async()=>{
        if(!(await this.connectedTo(blockchainName)) && !resolved && !rejected){
          reject({ code: 'NOT_SUPPORTED' });
        } else {
          resolve();
        }
      }, 3000);
      this.connector.sendCustomRequest({ 
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: blockchain.id }],
      }).then(()=>{
        resolved = true;
        resolve();
      }).catch((error)=> {
        if(error && typeof error.message == 'string' && error.message.match('addEthereumChain')){ // chain not yet added
          this.addNetwork(blockchainName)
            .then(()=>this.switchTo(blockchainName).then(()=>{
              resolved = true;
              resolve();
            }))
            .catch(()=>{
              rejected = true;
              reject({ code: 'NOT_SUPPORTED' });
            });
        } else {
          rejected = true;
          reject({ code: 'NOT_SUPPORTED' });
        }
      });
    })
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName);
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
      }).then(resolve).catch(reject);
    })
  }

  on(event, callback) {
    let internalCallback;
    switch (event) {
      case 'account':
        internalCallback = (error, payload) => {
          if(payload && payload.params && payload.params[0].accounts && payload.params[0].accounts instanceof Array) {
            const accounts = payload.params[0].accounts.map((account)=>ethers.utils.getAddress(account));
            callback(accounts[0]);
          }
        };
        this.connector.on("session_update", internalCallback);
        break
    }
    return internalCallback
  }

  off(event, callback) {
    switch (event) {
      case 'account':
        this.connector.off("session_update");
        break
    }
  }

  async transactionCount({ blockchain, address }) {
    const smartContractWallet = await getSmartContractWallet(blockchain, address);
    if(smartContractWallet) {
      return await smartContractWallet.transactionCount()
    } else {
      return await request({ blockchain, method: 'transactionCount', address })
    }
  }

  async sign(message) {
    let blockchain = await this.connectedTo();
    let address = await this.account();
    const smartContractWallet = await getSmartContractWallet(blockchain, address);
    if(smartContractWallet){ throw({ message: 'Smart contract wallets are not supported for signing!', code: "SMART_CONTRACT_WALLET_NOT_SUPPORTED" }) }
    var params = [ethers.utils.toUtf8Bytes(message), address];
    let signature = await this.connector.signPersonalMessage(params);
    return signature
  }
} WalletConnectV1.__initStatic(); WalletConnectV1.__initStatic2();

WalletConnectV1.getConnectedInstance = getConnectedInstance$1;
WalletConnectV1.setConnectedInstance = setConnectedInstance$1;

const sendTransaction = async ({ transaction, wallet })=> {
  transaction = new Transaction(transaction);
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    await wallet.switchTo(transaction.blockchain);
  }
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    throw({ code: 'WRONG_NETWORK' })
  }
  await transaction.prepare({ wallet });
  let provider = new ethers.providers.Web3Provider(wallet.connector, 'any');
  let signer = provider.getSigner(0);
  await submit({ transaction, provider, signer }).then((sentTransaction)=>{
    if (sentTransaction) {
      transaction.id = sentTransaction.hash;
      transaction.nonce = sentTransaction.nonce;
      transaction.url = Blockchains.findByName(transaction.blockchain).explorerUrlFor({ transaction });
      if (transaction.sent) transaction.sent(transaction);
      sentTransaction.wait(1).then(() => {
        transaction._succeeded = true;
        if (transaction.succeeded) transaction.succeeded(transaction);
      }).catch((error)=>{
        if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
          if(error.replacement && error.replacement.hash) {
            transaction.id = error.replacement.hash;
            transaction.url = Blockchains.findByName(transaction.blockchain).explorerUrlFor({ transaction });
          }
          if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 1) {
            transaction._succeeded = true;
            if (transaction.succeeded) transaction.succeeded(transaction);
          } else if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 0) {
            transaction._failed = true;
            if(transaction.failed) transaction.failed(transaction, error);  
          }
        } else {
          transaction._failed = true;
          if(transaction.failed) transaction.failed(transaction, error);
        }
      });
    } else {
      throw('Submitting transaction failed!')
    }
  });
  return transaction
};

const submit = ({ transaction, provider, signer }) => {
  if(transaction.method) {
    return submitContractInteraction({ transaction, signer, provider })
  } else {
    return submitSimpleTransfer({ transaction, signer })
  }
};

const submitContractInteraction = ({ transaction, signer, provider })=>{
  let contract = new ethers.Contract(transaction.to, transaction.api, provider);
  let contractArguments = transaction.getContractArguments({ contract });
  let method = contract.connect(signer)[transaction.method];
  if(contractArguments) {
    return method(...contractArguments, {
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  } else {
    return method({
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  }
};

const submitSimpleTransfer = ({ transaction, signer })=>{
  return signer.sendTransaction({
    to: transaction.to,
    value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
  })
};

const getConnectedInstance = ()=>{
  return window._connectedWalletLinkInstance
};

const setConnectedInstance = (value)=>{
  window._connectedWalletLinkInstance = value;
};

class WalletLink {

  static __initStatic() {this.info = {
    name: 'Coinbase',
    logo: Coinbase.info.logo,
    blockchains: supported$1.evm,
  };}

  static __initStatic2() {this.isAvailable = async()=>{ return getConnectedInstance() != undefined };}

  constructor() {
    this.name = this.constructor.info.name;
    this.logo = this.constructor.info.logo;
    this.blockchains = this.constructor.info.blockchains;
    this.connector = WalletLink.instance || this.newWalletLinkInstance();
    this.sendTransaction = (transaction)=>{
      return sendTransaction({
        wallet: this,
        transaction
      })
    };
  }

  newWalletLinkInstance() {
    let instance = new CoinbaseWalletSDK({}).makeWeb3Provider();
    return instance
  }

  async account() {
    if(this.connectedAccounts == undefined) { return }
    return ethers.utils.getAddress(this.connectedAccounts[0])
  }

  async connect(options) {
    let relay = await this.connector._relayProvider();
    relay.setConnectDisabled(false);
    let accounts = await this.connector.enable();
    if(accounts instanceof Array && accounts.length) {
      setConnectedInstance(this);
    }
    accounts = accounts.map((account)=>ethers.utils.getAddress(account));
    this.connectedAccounts = accounts;
    this.connectedChainId = await this.connector.getChainId();
    return accounts[0]
  }

  async connectedTo(input) {
    let chainId = await this.connector.getChainId();
    const blockchain = Blockchains.findByNetworkId(chainId);
    if(input) {
      return input === blockchain.name
    } else {
      return blockchain.name
    }
  }

  switchTo(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName);
      this.connector.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: blockchain.id }],
      }).then(resolve).catch((error)=> {
        if(error.code === 4902){ // chain not yet added
          this.addNetwork(blockchainName)
            .then(()=>this.switchTo(blockchainName).then(resolve))
            .catch(reject);
        } else {
          reject(error);
        }
      });
    })
  }

  addNetwork(blockchainName) {
    return new Promise((resolve, reject)=>{
      const blockchain = Blockchains.findByName(blockchainName);
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
      }).then(resolve).catch(reject);
    })
  }

  on(event, callback) {
    let internalCallback;
    switch (event) {
      case 'account':
        internalCallback = (accounts) => callback(ethers.utils.getAddress(accounts[0]));
        this.connector.on('accountsChanged', internalCallback);
        break
    }
    return internalCallback
  }

  off(event, internalCallback) {
    switch (event) {
      case 'account':
        this.connector.removeListener('accountsChanged', internalCallback);
        break
    }
    return internalCallback
  }

  transactionCount({ blockchain, address }) {
    return request({ blockchain, method: 'transactionCount', address })
  }

  async sign(message) {
    await this.account();
    let provider = new ethers.providers.Web3Provider(this.connector, 'any');
    let signer = provider.getSigner(0);
    let signature = await signer.signMessage(message);
    return signature
  }
} WalletLink.__initStatic(); WalletLink.__initStatic2();

WalletLink.getConnectedInstance = getConnectedInstance;
WalletLink.setConnectedInstance = setConnectedInstance;

var wallets = {
  MetaMask,
  Phantom,
  Coinbase,
  Binance,
  Trust,
  Brave,
  Opera,
  Coin98,
  CryptoCom,
  HyperPay,
  WindowEthereum,
  WindowSolana,
  WalletConnectV1,
  WalletLink
};

const getWallets = async()=>{

  let availableWallets = await Promise.all(
    Object.keys(wallets).map(
      async(key)=>{
      
        let wallet = wallets[key];

        if(await wallet.isAvailable()) {
          let instance;
          
          if(wallet.getConnectedInstance) {
            instance = await wallet.getConnectedInstance();
            return instance
          } else {
            return new wallet
          }          
        }
      }
    )
  );

  return availableWallets.filter((wallet)=>wallet)
};

const supported = [
  wallets.MetaMask,
  wallets.Phantom,
  wallets.Coinbase,
  wallets.Binance,
  wallets.Trust,
  wallets.Brave,
  wallets.Opera,
  wallets.Coin98,
  wallets.CryptoCom,
  wallets.HyperPay,
  wallets.WalletConnectV1,
  wallets.WalletLink,
  wallets.WindowEthereum,
];

export { getWallets, supported, wallets };
