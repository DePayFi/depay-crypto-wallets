(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@depay/web3-client-evm'), require('@depay/web3-blockchains'), require('ethers'), require('@depay/walletconnect-v2'), require('@depay/coinbase-wallet-sdk'), require('@depay/worldcoin-precompiled')) :
  typeof define === 'function' && define.amd ? define(['exports', '@depay/web3-client-evm', '@depay/web3-blockchains', 'ethers', '@depay/walletconnect-v2', '@depay/coinbase-wallet-sdk', '@depay/worldcoin-precompiled'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Web3Wallets = {}, global.Web3Client, global.Web3Blockchains, global.ethers, global.WalletConnectV2, global.CoinbaseWalletSdk, global.WorldcoinPrecompiled));
}(this, (function (exports, web3ClientEvm, Blockchains, ethers, walletconnectV2, coinbaseWalletSdk, worldcoinPrecompiled) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Blockchains__default = /*#__PURE__*/_interopDefaultLegacy(Blockchains);

  let supported$1 = ['ethereum', 'bsc', 'polygon', 'fantom', 'arbitrum', 'avalanche', 'gnosis', 'optimism', 'base', 'worldchain'];
  supported$1.evm = ['ethereum', 'bsc', 'polygon', 'fantom', 'arbitrum', 'avalanche', 'gnosis', 'optimism', 'base', 'worldchain'];
  supported$1.solana = [];

  function _optionalChain$p(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Transaction {

    constructor({
      blockchain,
      from,
      to,
      value,
      api,
      method,
      params,
      instructions,
      signers,
      alts,
      sent,
      succeeded,
      failed,
      accepted,
    }) {

      // required
      this.blockchain = blockchain;
      this.from = (from && from.match('0x')) ? ethers.ethers.utils.getAddress(from) : from;
      this.to = (to && to.match('0x')) ? ethers.ethers.utils.getAddress(to) : to;

      // optional
      this.value = _optionalChain$p([Transaction, 'access', _ => _.bigNumberify, 'call', _2 => _2(value, blockchain), 'optionalAccess', _3 => _3.toString, 'call', _4 => _4()]);
      this.api = api;
      this.method = method;
      this.params = params;
      this.accepted = accepted;
      this.sent = sent;
      this.succeeded = succeeded;
      this.failed = failed;
      this.instructions = instructions;
      this.signers = signers;
      this.alts = alts;

      // internal
      this._succeeded = false;
      this._failed = false;
    }

    async prepare({ wallet }) {
      this.from = await wallet.account(this.blockchain);
    }

    static bigNumberify(value, blockchain) {
      if (typeof value === 'number') {
        return ethers.ethers.utils.parseUnits(value.toString(), Blockchains__default['default'][blockchain].currency.decimals)
      } else if (value && value.toString) {
        return ethers.ethers.BigNumber.from(value.toString())
      } else {
        return value
      }
    }

    findFragment() {
      return this.getContract().interface.fragments.find((fragment) => {
        return(
          fragment.name == this.method &&
          (fragment.inputs && this.params && typeof(this.params) === 'object' ? fragment.inputs.length == Object.keys(this.params).length : true)
        )
      })
    }

    getParamType(param) {
      if(_optionalChain$p([param, 'optionalAccess', _5 => _5.components, 'optionalAccess', _6 => _6.length])) {
        return `(${param.components.map((param)=>this.getParamType(param)).join(',')})`
      } else {
        return param.type
      }
    }

    getMethodNameWithSignature() {
      let fragment = this.findFragment();
      if(fragment.inputs) {
        return `${this.method}(${fragment.inputs.map((param)=>this.getParamType(param)).join(',')})`
      } else {
        return this.method
      }
    }

    getContractArguments() {
      if(this.params instanceof Array) {
        return this.params
      } else if (this.params instanceof Object) {
        let fragment = this.findFragment();

        return fragment.inputs.map((input) => {
          return this.params[input.name]
        })
      }
    }

    getContract() {
      return new ethers.ethers.Contract(this.to, this.api)
    }

    async getData() {
      let contractArguments = this.getContractArguments();
      let populatedTransaction;
      if(contractArguments) {
        populatedTransaction = await this.getContract().populateTransaction[this.getMethodNameWithSignature()].apply(
          null, contractArguments
        );
      } else {
        populatedTransaction = await this.getContract().populateTransaction[this.getMethodNameWithSignature()].apply(null);
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

  function _optionalChain$o(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const sendTransaction$2 = async ({ transaction, wallet })=> {
    transaction = new Transaction(transaction);
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      await wallet.switchTo(transaction.blockchain);
    }
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      throw({ code: 'WRONG_NETWORK' })
    }
    await transaction.prepare({ wallet });
    let transactionCount = await web3ClientEvm.request({ blockchain: transaction.blockchain, method: 'transactionCount', address: transaction.from });
    transaction.nonce = transactionCount;
    let provider = new ethers.ethers.providers.Web3Provider(wallet.getProvider(), 'any');
    let signer = provider.getSigner(0);
    await submit$2({ transaction, provider, signer }).then((sentTransaction)=>{
      if (sentTransaction) {
        transaction.id = sentTransaction.hash;
        transaction.nonce = sentTransaction.nonce || transactionCount;
        transaction.url = Blockchains__default['default'].findByName(transaction.blockchain).explorerUrlFor({ transaction });
        if (transaction.sent) transaction.sent(transaction);
        retrieveConfirmedTransaction$2(sentTransaction).then(() => {
          transaction._succeeded = true;
          if (transaction.succeeded) transaction.succeeded(transaction);
        }).catch((error)=>{
          if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
            if(error.replacement && error.replacement.hash) {
              transaction.id = error.replacement.hash;
              transaction.url = Blockchains__default['default'].findByName(transaction.blockchain).explorerUrlFor({ transaction });
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

  const retrieveConfirmedTransaction$2 = (sentTransaction)=>{
    return new Promise((resolve, reject)=>{
      try {
        sentTransaction.wait(1).then(resolve).catch((error)=>{
          if(
            (error && _optionalChain$o([error, 'optionalAccess', _ => _.stack, 'optionalAccess', _2 => _2.match, 'call', _3 => _3('JSON-RPC error')])) ||
            (error && error.toString().match('undefined'))
          ) {
            setTimeout(()=>{
              retrieveConfirmedTransaction$2(sentTransaction)
                .then(resolve)
                .catch(reject);
            }, 500);
          } else {
            reject(error);
          }
        });
      } catch(error) {
        if(
          (error && _optionalChain$o([error, 'optionalAccess', _4 => _4.stack, 'optionalAccess', _5 => _5.match, 'call', _6 => _6('JSON-RPC error')])) ||
          (error && error.toString().match('undefined'))
        ) {
          setTimeout(()=>{
            retrieveConfirmedTransaction$2(sentTransaction)
              .then(resolve)
              .catch(reject);
          }, 500);
        } else {
          reject(error);
        }
      }
    })
  };

  const submit$2 = ({ transaction, provider, signer }) => {
    if(transaction.method) {
      return submitContractInteraction$2({ transaction, signer, provider })
    } else {
      return submitSimpleTransfer$2({ transaction, signer })
    }
  };

  const submitContractInteraction$2 = async ({ transaction, signer, provider })=>{
    let contract = new ethers.ethers.Contract(transaction.to, transaction.api, provider);
    let contractArguments = transaction.getContractArguments({ contract });
    let method = contract.connect(signer)[transaction.getMethodNameWithSignature()];
    let gas;
    try {
      gas = await web3ClientEvm.estimate(transaction);
      gas = gas.add(gas.div(10));
    } catch (e) {}
    if(contractArguments) {
      return await method(...contractArguments, {
        value: Transaction.bigNumberify(transaction.value, transaction.blockchain),
        gasLimit: _optionalChain$o([gas, 'optionalAccess', _7 => _7.toHexString, 'call', _8 => _8()])
      })
    } else {
      return await method({
        value: Transaction.bigNumberify(transaction.value, transaction.blockchain),
        gasLimit: _optionalChain$o([gas, 'optionalAccess', _9 => _9.toHexString, 'call', _10 => _10()])
      })
    }
  };

  const submitSimpleTransfer$2 = ({ transaction, signer })=>{
    return signer.sendTransaction({
      to: transaction.to,
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  };

  function _optionalChain$n(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  class WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Ethereum Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDojMzQzNDM0O30KCS5zdDJ7ZmlsbDojOEM4QzhDO30KCS5zdDN7ZmlsbDojM0MzQzNCO30KCS5zdDR7ZmlsbDojMTQxNDE0O30KCS5zdDV7ZmlsbDojMzkzOTM5O30KPC9zdHlsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4MS43LDExMC4yaDY0LjdWNDYuNWMwLTI1LjctMjAuOC00Ni41LTQ2LjUtNDYuNUg0Ni41QzIwLjgsMCwwLDIwLjgsMCw0Ni41djY1LjFoMzUuN2wyNi45LTI2LjkKCWMxLjUtMS41LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDc4LjZjNS4zLTI1LjUsMzAuMi00Miw1NS43LTM2LjdjMjUuNSw1LjMsNDIsMzAuMiwzNi43LDU1LjdjLTEuNiw3LjUtNC45LDE0LjYtOS44LDIwLjUKCWMtMC45LDEuMS0xLjksMi4yLTMsMy4zYy0xLjEsMS4xLTIuMiwyLjEtMy4zLDNjLTIwLjEsMTYuNi00OS45LDEzLjgtNjYuNS02LjNjLTQuOS01LjktOC4zLTEzLTkuOC0yMC42SDczLjJsLTI2LjksMjYuOAoJYy0xLjUsMS41LTMuNiwyLjUtNS43LDIuN2wwLDBoLTAuNGgtMC4xaC0wLjVIMHY3NGgyOC44bDE4LjItMTguMmMxLjUtMS42LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDI5LjkKCWM1LjItMjUuNSwzMC4yLTQxLjksNTUuNy0zNi43czQxLjksMzAuMiwzNi43LDU1LjdzLTMwLjIsNDEuOS01NS43LDM2LjdjLTE4LjUtMy44LTMyLjktMTguMi0zNi43LTM2LjdINTcuN2wtMTguMiwxOC4zCgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40SDB2MzQuMmg1Ni4zYzAuMiwwLDAuMywwLDAuNSwwaDAuMWgwLjRsMCwwYzIuMiwwLjIsNC4yLDEuMiw1LjgsMi44bDI4LDI4aDU3LjcKCWM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN3M0MiwzMC4yLDM2LjcsNTUuN2MtMS43LDguMS01LjUsMTUuNy0xMSwyMS45Yy0wLjYsMC43LTEuMiwxLjMtMS45LDJzLTEuMywxLjMtMiwxLjkKCWMtMTkuNSwxNy4zLTQ5LjMsMTUuNi02Ni43LTMuOWMtNS41LTYuMi05LjMtMTMuNy0xMS0yMS45SDg3LjFjLTEuMSwwLTIuMS0wLjItMy4xLTAuNWgtMC4xbC0wLjMtMC4xbC0wLjItMC4xbC0wLjItMC4xbC0wLjMtMC4xCgloLTAuMWMtMC45LTAuNS0xLjgtMS4xLTIuNi0xLjhsLTI4LTI4SDB2NTMuNWMwLjEsMjUuNywyMC45LDQ2LjQsNDYuNSw0Ni40aDM1My4zYzI1LjcsMCw0Ni41LTIwLjgsNDYuNS00Ni41di02My42aC02NC43CgljLTQzLjIsMC03OC4yLTM1LTc4LjItNzguMmwwLDBDMzAzLjUsMTQ1LjIsMzM4LjUsMTEwLjIsMzgxLjcsMTEwLjJ6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMjAuOSwyOTguMWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIyMC45LDMxMi40LDIyMC45LDI5OC4xTDIyMC45LDI5OC4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjE5LjYsOTEuNWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIxOS42LDEwNS44LDIxOS42LDkxLjV6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zODIuMiwxMjguOGgtMC41Yy0zMi45LDAtNTkuNiwyNi43LTU5LjYsNTkuNmwwLDBsMCwwYzAsMzIuOSwyNi43LDU5LjYsNTkuNiw1OS42bDAsMGgwLjUKCWMzMi45LDAsNTkuNi0yNi43LDU5LjYtNTkuNmwwLDBDNDQxLjgsMTU1LjQsNDE1LjEsMTI4LjgsMzgyLjIsMTI4Ljh6IE0zOTYuNiwyMTkuNGgtMzFsOC45LTMyLjVjLTcuNy0zLjctMTEtMTIuOS03LjQtMjAuNgoJYzMuNy03LjcsMTIuOS0xMSwyMC42LTcuNGM3LjcsMy43LDExLDEyLjksNy40LDIwLjZjLTEuNSwzLjItNC4xLDUuOC03LjQsNy40TDM5Ni42LDIxOS40eiIvPgo8ZyBpZD0iTGF5ZXJfeDAwMjBfMSI+Cgk8ZyBpZD0iXzE0MjEzOTQzNDI0MDAiPgoJCTxnPgoJCQk8cG9seWdvbiBjbGFzcz0ic3QxIiBwb2ludHM9IjEyOSwxNjYuMiAxMjguNywxNjcuMyAxMjguNywyMDEuNCAxMjksMjAxLjcgMTQ0LjgsMTkyLjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDE2Ni4yIDExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDMiIHBvaW50cz0iMTI5LDIwNC43IDEyOC44LDIwNC45IDEyOC44LDIxNyAxMjksMjE3LjYgMTQ0LjgsMTk1LjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDIxNy42IDEyOSwyMDQuNyAxMTMuMiwxOTUuNCAJCQkiLz4KCQkJPHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSIxMjksMjAxLjcgMTQ0LjgsMTkyLjQgMTI5LDE4NS4yIAkJCSIvPgoJCQk8cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJPC9nPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return (
        _optionalChain$n([window, 'optionalAccess', _38 => _38.ethereum]) &&
        // not MetaMask
        !(_optionalChain$n([window, 'optionalAccess', _39 => _39.ethereum, 'optionalAccess', _40 => _40.isMetaMask]) && Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!PocketUniverse)(?!RevokeCash)/)).length == 1) &&
        // not Coin98
        !_optionalChain$n([window, 'optionalAccess', _41 => _41.coin98]) &&
        // not Trust Wallet
        !(_optionalChain$n([window, 'optionalAccess', _42 => _42.ethereum, 'optionalAccess', _43 => _43.isTrust]) || _optionalChain$n([window, 'optionalAccess', _44 => _44.ethereum, 'optionalAccess', _45 => _45.isTrustWallet])) &&
        // not crypto.com
        !_optionalChain$n([window, 'optionalAccess', _46 => _46.ethereum, 'optionalAccess', _47 => _47.isDeficonnectProvider]) &&
        // not HyperPay
        !_optionalChain$n([window, 'optionalAccess', _48 => _48.ethereum, 'optionalAccess', _49 => _49.isHyperPay]) &&
        // not Phantom
        !(window.phantom && !window.glow && !_optionalChain$n([window, 'optionalAccess', _50 => _50.solana, 'optionalAccess', _51 => _51.isGlow]) && !['isBitKeep'].some((identifier)=>window.solana && window.solana[identifier])) &&
        // not Rabby
        !_optionalChain$n([window, 'optionalAccess', _52 => _52.ethereum, 'optionalAccess', _53 => _53.isRabby]) &&
        // not Backpack
        !_optionalChain$n([window, 'optionalAccess', _54 => _54.backpack, 'optionalAccess', _55 => _55.isBackpack]) &&
        // not TokenPocket
        !_optionalChain$n([window, 'optionalAccess', _56 => _56.ethereum, 'optionalAccess', _57 => _57.isTokenPocket]) && 
        // not BitKeep
        !_optionalChain$n([window, 'optionalAccess', _58 => _58.ethereum, 'optionalAccess', _59 => _59.isBitKeep]) && 
        // not Coinbase
        !(_optionalChain$n([window, 'optionalAccess', _60 => _60.ethereum, 'optionalAccess', _61 => _61.isCoinbaseWallet]) || _optionalChain$n([window, 'optionalAccess', _62 => _62.ethereum, 'optionalAccess', _63 => _63.isWalletLink])) &&
        // MetaMask through ProviderMap
        !_optionalChain$n([window, 'optionalAccess', _64 => _64.ethereum, 'optionalAccess', _65 => _65.providerMap, 'optionalAccess', _66 => _66.has, 'call', _67 => _67('MetaMask')]) &&
        // Brave Wallet
        !_optionalChain$n([window, 'optionalAccess', _68 => _68.ethereum, 'optionalAccess', _69 => _69.isBraveWallet]) &&
        // Uniswap Wallet
        !_optionalChain$n([window, 'optionalAccess', _70 => _70.ethereum, 'optionalAccess', _71 => _71.isUniswapWallet]) &&
        // Rainbow
        !_optionalChain$n([window, 'optionalAccess', _72 => _72.ethereum, 'optionalAccess', _73 => _73.isRainbow]) &&
        // OKX Wallet
        !_optionalChain$n([window, 'optionalAccess', _74 => _74.okxwallet])
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

    getProvider() { return window.ethereum }

    async account() {
      if(!this.getProvider()) { return undefined }
      const accounts = (await this.getProvider().request({ method: 'eth_accounts' })).map((address)=>ethers.ethers.utils.getAddress(address));
      return accounts[0]
    }

    async connect() {
      if(!this.getProvider()) { return undefined }
      const accounts = (await this.getProvider().request({ method: 'eth_requestAccounts' })).map((address)=>ethers.ethers.utils.getAddress(address));
      return accounts[0]
    }

    on(event, callback) {
      let internalCallback;
      switch (event) {
        case 'account':
          internalCallback = (accounts) => callback(ethers.ethers.utils.getAddress(accounts[0]));
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
      const blockchain = Blockchains__default['default'].findById(await this.getProvider().request({ method: 'eth_chainId' }));
      if(!blockchain) { return false }
      if(input) {
        return input === blockchain.name
      } else {
        return blockchain.name
      }
    }

    addNetwork(blockchainName) {
      return new Promise((resolve, reject)=>{
        const blockchain = Blockchains__default['default'].findByName(blockchainName);
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
        const blockchain = Blockchains__default['default'].findByName(blockchainName);
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
      return web3ClientEvm.request({ blockchain, method: 'transactionCount', address })
    }

    async sign(message) {
      if(typeof message === 'object') {
        let provider = this.getProvider();
        let account = await this.account();
        if((await this.connectedTo(Blockchains__default['default'].findByNetworkId(message.domain.chainId).name)) === false) {
          throw({ code: 'WRONG_NETWORK' })
        }
        let signature = await provider.request({
          method: 'eth_signTypedData_v4',
          params: [account, message],
          from: account,
        });
        return signature
      } else if (typeof message === 'string') {
        await this.account();
        let provider = new ethers.ethers.providers.Web3Provider(this.getProvider(), 'any');
        let signer = provider.getSigner(0);
        let signature = await signer.signMessage(message);
        return signature
      }
    }
  } WindowEthereum.__initStatic(); WindowEthereum.__initStatic2();

  function _optionalChain$m(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Binance extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Binance Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkzLjY4Ij48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5My42OCIgZmlsbD0iIzFlMjAyNCIvPjxwYXRoIGQ9Im01Ni45Miw0Ni41M2wzOS4wOC0yMi41NCwzOS4wOCwyMi41NC0xNC4zNSw4LjM2LTI0LjczLTE0LjE4LTI0LjczLDE0LjE4LTE0LjM1LTguMzZabTc4LjE3LDI4LjUzbC0xNC4zNS04LjM2LTI0LjczLDE0LjI3LTI0LjczLTE0LjI3LTE0LjM1LDguMzZ2MTYuNzFsMjQuNzMsMTQuMTh2MjguNDVsMTQuMzUsOC4zNiwxNC4zNS04LjM2di0yOC40NWwyNC43My0xNC4yN3YtMTYuNjNabTAsNDUuMTZ2LTE2LjcxbC0xNC4zNSw4LjM2djE2LjcxbDE0LjM1LTguMzZabTEwLjIxLDUuODJsLTI0LjczLDE0LjI3djE2LjcxbDM5LjA4LTIyLjU0di00NS4yNWwtMTQuMzUsOC4zNnYyOC40NVptLTE0LjM1LTY1LjI1bDE0LjM1LDguMzZ2MTYuNzFsMTQuMzUtOC4zNnYtMTYuNzFsLTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTQ5LjMsODUuNnYxNi43MWwxNC4zNSw4LjM2LDE0LjM1LTguMzZ2LTE2LjcxbC0xNC4zNSw4LjM2LTE0LjM1LTguMzZabS0yNC43My0yNi4xN2wxNC4zNSw4LjM2di0xNi43MWwtMTQuMzUtOC4zNnYxNi43MVptMjQuNzMtNTkuNDNsMTQuMzUsOC4zNiwxNC4zNS04LjM2LTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTM0Ljk1LDguMzZsMTQuMzUtOC4zNi0xNC4zNS04LjM2LTE0LjM1LDguMzZ2MTYuNzFsMTQuMzUsOC4zNnYtMTYuNzFabTAsMjguNDVsLTE0LjM1LTguMzZ2NDUuMTZsMzkuMDgsMjIuNTR2LTE2LjcxbC0yNC43My0xNC4yN3MwLTI4LjM2LDAtMjguMzZaIiBmaWxsPSIjZjBiOTBiIi8+PC9zdmc+",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return _optionalChain$m([window, 'optionalAccess', _2 => _2.BinanceChain]) &&
        !window.coin98 &&
        !window.trustwallet
    };}

    getProvider() { return window.BinanceChain }

  } Binance.__initStatic(); Binance.__initStatic2();

  var logos = {
    exodus: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yOTguMjAzIDgzLjc2NDVMMTcwLjQ0OSAwVjQ2LjgzMzJMMjUyLjQwNSAxMDAuMDg5TDI0Mi43NjMgMTMwLjU5OEgxNzAuNDQ5VjE2OS40MDJIMjQyLjc2M0wyNTIuNDA1IDE5OS45MTFMMTcwLjQ0OSAyNTMuMTY3VjMwMEwyOTguMjAzIDIxNi41MDNMMjc3LjMxMyAxNTAuMTM0TDI5OC4yMDMgODMuNzY0NVoiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xNjYxXzI5NSkiLz4KPHBhdGggZD0iTTU5LjMwMDcgMTY5LjQwMkgxMzEuMzQ2VjEzMC41OThINTkuMDMyOUw0OS42NTg5IDEwMC4wODlMMTMxLjM0NiA0Ni44MzMyVjBMMy41OTI1MyA4My43NjQ1TDI0LjQ4MzEgMTUwLjEzNEwzLjU5MjUzIDIxNi41MDNMMTMxLjYxNCAzMDBWMjUzLjE2N0w0OS42NTg5IDE5OS45MTFMNTkuMzAwNyAxNjkuNDAyWiIgZmlsbD0idXJsKCNwYWludDFfbGluZWFyXzE2NjFfMjk1KSIvPgo8bWFzayBpZD0ibWFzazBfMTY2MV8yOTUiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjMiIHk9IjAiIHdpZHRoPSIyOTYiIGhlaWdodD0iMzAwIj4KPHBhdGggZD0iTTI5OC4yMDQgODMuNzY0NUwxNzAuNDUgMFY0Ni44MzMyTDI1Mi40MDUgMTAwLjA4OUwyNDIuNzYzIDEzMC41OThIMTcwLjQ1VjE2OS40MDJIMjQyLjc2M0wyNTIuNDA1IDE5OS45MTFMMTcwLjQ1IDI1My4xNjdWMzAwTDI5OC4yMDQgMjE2LjUwM0wyNzcuMzEzIDE1MC4xMzRMMjk4LjIwNCA4My43NjQ1WiIgZmlsbD0idXJsKCNwYWludDJfbGluZWFyXzE2NjFfMjk1KSIvPgo8cGF0aCBkPSJNNTkuMzAxIDE2OS40MDJIMTMxLjM0N1YxMzAuNTk4SDU5LjAzMzJMNDkuNjU5MiAxMDAuMDg5TDEzMS4zNDcgNDYuODMzMlYwTDMuNTkyNzcgODMuNzY0NUwyNC40ODM0IDE1MC4xMzRMMy41OTI3NyAyMTYuNTAzTDEzMS42MTUgMzAwVjI1My4xNjdMNDkuNjU5MiAxOTkuOTExTDU5LjMwMSAxNjkuNDAyWiIgZmlsbD0idXJsKCNwYWludDNfbGluZWFyXzE2NjFfMjk1KSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMTY2MV8yOTUpIj4KPHJlY3QgeD0iMy43NTAyNCIgd2lkdGg9IjI5Mi41IiBoZWlnaHQ9IjMwMCIgZmlsbD0idXJsKCNwYWludDRfbGluZWFyXzE2NjFfMjk1KSIvPgo8L2c+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMTY2MV8yOTUiIHgxPSIyNTYuODc1IiB5MT0iMzIwLjYyNSIgeDI9IjE3MS4zIiB5Mj0iLTMyLjk0NTkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzBCNDZGOSIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNCQkZCRTAiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzE2NjFfMjk1IiB4MT0iMjU2Ljg3NSIgeTE9IjMyMC42MjUiIHgyPSIxNzEuMyIgeTI9Ii0zMi45NDU5IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwQjQ2RjkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjQkJGQkUwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQyX2xpbmVhcl8xNjYxXzI5NSIgeDE9IjI1Ni44NzUiIHkxPSIzMjAuNjI1IiB4Mj0iMTcxLjMiIHkyPSItMzIuOTQ1OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMEI0NkY5Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0JCRkJFMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50M19saW5lYXJfMTY2MV8yOTUiIHgxPSIyNTYuODc1IiB5MT0iMzIwLjYyNSIgeDI9IjE3MS4zIiB5Mj0iLTMyLjk0NTkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzBCNDZGOSIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNCQkZCRTAiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDRfbGluZWFyXzE2NjFfMjk1IiB4MT0iMjIuNTAwMiIgeTE9IjY3LjUiIHgyPSIxNzAuNjI1IiB5Mj0iMTc4LjEyNSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAuMTE5NzkyIiBzdG9wLWNvbG9yPSIjODk1MkZGIiBzdG9wLW9wYWNpdHk9IjAuODciLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjREFCREZGIiBzdG9wLW9wYWNpdHk9IjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K",
    phantom: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxMjggMTI4IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxMjggMTI4OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0FCOUZGMjt9Cjwvc3R5bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMy43LDEwOWMxMy42LDAsMjMuOS0xMS45LDMwLTIxLjJjLTAuNywyLjEtMS4yLDQuMS0xLjIsNi4xYzAsNS41LDMuMSw5LjQsOS4zLDkuNGM4LjUsMCwxNy42LTcuNSwyMi4zLTE1LjUKCWMtMC4zLDEuMi0wLjUsMi4yLTAuNSwzLjJjMCwzLjgsMi4xLDYuMiw2LjUsNi4yYzEzLjgsMCwyNy43LTI0LjUsMjcuNy00NS45YzAtMTYuNy04LjQtMzEuNC0yOS42LTMxLjQKCWMtMzcuMiwwLTc3LjMsNDUuNS03Ny4zLDc0LjhDMTEuMSwxMDYuMywxNy4zLDEwOSwyMy43LDEwOXogTTc1LjUsNDkuNWMwLTQuMSwyLjMtNy4xLDUuNy03LjFjMy4zLDAsNS42LDIuOSw1LjYsNy4xCgljMCw0LjEtMi4zLDcuMS01LjYsNy4xQzc3LjgsNTYuNyw3NS41LDUzLjcsNzUuNSw0OS41eiBNOTMuMiw0OS41YzAtNC4xLDIuMy03LjEsNS43LTcuMWMzLjMsMCw1LjYsMi45LDUuNiw3LjEKCWMwLDQuMS0yLjMsNy4xLTUuNiw3LjFDOTUuNSw1Ni43LDkzLjIsNTMuNyw5My4yLDQ5LjV6Ii8+Cjwvc3ZnPgo=",
    coin98: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA0MC43IDQwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA0MC43IDQwIiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBmaWxsPSIjRDlCNDMyIiBkPSJtMzMuMyAwaC0yNS45Yy00LjEgMC03LjQgMy4zLTcuNCA3LjN2MjUuNGMwIDQgMy4zIDcuMyA3LjQgNy4zaDI1LjljNC4xIDAgNy40LTMuMyA3LjQtNy4zdi0yNS40YzAtNC0zLjMtNy4zLTcuNC03LjN6Ii8+CjxwYXRoIGZpbGw9IiMyNTI1MjUiIGQ9Im0zMy4zIDBoLTI1LjljLTQuMSAwLTcuNCAzLjMtNy40IDcuM3YyNS40YzAgNCAzLjMgNy4zIDcuNCA3LjNoMjUuOWM0LjEgMCA3LjQtMy4zIDcuNC03LjN2LTI1LjRjMC00LTMuMy03LjMtNy40LTcuM3ptLTYuMyAxMGMzIDAgNS41IDIuNCA1LjUgNS40IDAgMC45LTAuMiAxLjgtMC42IDIuNi0wLjctMC41LTEuNS0xLTIuMy0xLjMgMC4yLTAuNCAwLjMtMC45IDAuMy0xLjMgMC0xLjUtMS4zLTIuOC0yLjgtMi44LTEuNiAwLTIuOCAxLjMtMi44IDIuOCAwIDAuNSAwLjEgMC45IDAuMyAxLjMtMC44IDAuMy0xLjYgMC43LTIuMyAxLjMtMC41LTAuOC0wLjYtMS43LTAuNi0yLjYtMC4xLTMgMi4zLTUuNCA1LjMtNS40em0tMTMuMyAyMGMtMyAwLTUuNS0yLjQtNS41LTUuNGgyLjZjMCAxLjUgMS4zIDIuOCAyLjggMi44czIuOC0xLjMgMi44LTIuOGgyLjZjMC4yIDMtMi4zIDUuNC01LjMgNS40em0wLTcuNWMtMy41IDAtNi4zLTIuOC02LjMtNi4yczIuOC02LjMgNi4zLTYuMyA2LjQgMi44IDYuNCA2LjNjMCAzLjQtMi45IDYuMi02LjQgNi4yem0xMy4zIDcuNWMtMy41IDAtNi40LTIuOC02LjQtNi4yIDAtMy41IDIuOC02LjMgNi40LTYuMyAzLjUgMCA2LjMgMi44IDYuMyA2LjMgMC4xIDMuNC0yLjggNi4yLTYuMyA2LjJ6bTMuOC02LjNjMCAyLjEtMS43IDMuNy0zLjggMy43cy0zLjgtMS43LTMuOC0zLjdjMC0yLjEgMS43LTMuNyAzLjgtMy43IDIuMSAwLjEgMy44IDEuNyAzLjggMy43em0tMTMuNC03LjRjMCAyLjEtMS43IDMuNy0zLjggMy43cy0zLjgtMS43LTMuOC0zLjdjMC0yLjEgMS43LTMuNyAzLjgtMy43IDIuMiAwIDMuOCAxLjYgMy44IDMuN3oiLz4KPC9zdmc+Cg==",
    coinbase: "data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHhtbG5zOnhsaW5rPSdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyB2aWV3Qm94PScwIDAgNDg4Ljk2IDQ4OC45Nic+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOnVybCgjbGluZWFyLWdyYWRpZW50KTt9LmNscy0ye2ZpbGw6IzQzNjFhZDt9PC9zdHlsZT48bGluZWFyR3JhZGllbnQgaWQ9J2xpbmVhci1ncmFkaWVudCcgeDE9JzI1MCcgeTE9JzcuMzUnIHgyPScyNTAnIHkyPSc0OTYuMzInIGdyYWRpZW50VHJhbnNmb3JtPSdtYXRyaXgoMSwgMCwgMCwgLTEsIDAsIDUwMiknIGdyYWRpZW50VW5pdHM9J3VzZXJTcGFjZU9uVXNlJz48c3RvcCBvZmZzZXQ9JzAnIHN0b3AtY29sb3I9JyMzZDViYTknLz48c3RvcCBvZmZzZXQ9JzEnIHN0b3AtY29sb3I9JyM0ODY4YjEnLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cGF0aCBjbGFzcz0nY2xzLTEnIGQ9J00yNTAsNS42OEMxMTQuODcsNS42OCw1LjUyLDExNSw1LjUyLDI1MC4xN1MxMTQuODcsNDk0LjY1LDI1MCw0OTQuNjUsNDk0LjQ4LDM4NS4yOSw0OTQuNDgsMjUwLjE3LDM4NS4xMyw1LjY4LDI1MCw1LjY4Wm0wLDM4Ny41NEExNDMuMDYsMTQzLjA2LDAsMSwxLDM5My4wNSwyNTAuMTcsMTQzLjExLDE0My4xMSwwLDAsMSwyNTAsMzkzLjIyWicgdHJhbnNmb3JtPSd0cmFuc2xhdGUoLTUuNTIgLTUuNjgpJy8+PHBhdGggY2xhc3M9J2Nscy0yJyBkPSdNMjg0LjY5LDI5Ni4wOUgyMTUuMzFhMTEsMTEsMCwwLDEtMTAuOS0xMC45VjIxNS40OGExMSwxMSwwLDAsMSwxMC45LTEwLjkxSDI4NWExMSwxMSwwLDAsMSwxMC45LDEwLjkxdjY5LjcxQTExLjA3LDExLjA3LDAsMCwxLDI4NC42OSwyOTYuMDlaJyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgtNS41MiAtNS42OCknLz48L3N2Zz4=",
    trust: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI4LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAzOTkuOCA0MTUuMSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzk5LjggNDE1LjE7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojMDUwMEZGO30KCS5zdDF7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Cjwvc3R5bGU+CjxnPgoJPHBhdGggY2xhc3M9InN0MCIgZD0iTTU1LjUsOTJsMTQ0LjQtNDd2MzI1Qzk2LjcsMzI2LjcsNTUuNSwyNDMuNiw1NS41LDE5Ni43TDU1LjUsOTJMNTUuNSw5MnoiLz4KCQoJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMzA1Ljk5NTMiIHkxPSIxODQ2LjAwMDIiIHgyPSIxOTYuODc1MiIgeTI9IjIxODkuMzQwMyIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTE4MjMuNzM5NykiPgoJCTxzdG9wICBvZmZzZXQ9IjIuMDAwMDAwZS0wMiIgc3R5bGU9InN0b3AtY29sb3I6IzAwMDBGRiIvPgoJCTxzdG9wICBvZmZzZXQ9IjguMDAwMDAwZS0wMiIgc3R5bGU9InN0b3AtY29sb3I6IzAwOTRGRiIvPgoJCTxzdG9wICBvZmZzZXQ9IjAuMTYiIHN0eWxlPSJzdG9wLWNvbG9yOiM0OEZGOTEiLz4KCQk8c3RvcCAgb2Zmc2V0PSIwLjQyIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5NEZGIi8+CgkJPHN0b3AgIG9mZnNldD0iMC42OCIgc3R5bGU9InN0b3AtY29sb3I6IzAwMzhGRiIvPgoJCTxzdG9wICBvZmZzZXQ9IjAuOSIgc3R5bGU9InN0b3AtY29sb3I6IzA1MDBGRiIvPgoJPC9saW5lYXJHcmFkaWVudD4KCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0zNDQuNCw5MkwxOTkuOSw0NXYzMjVjMTAzLjItNDMuMywxNDQuNS0xMjYuNCwxNDQuNS0xNzMuM1Y5MkwzNDQuNCw5MnoiLz4KPC9nPgo8L3N2Zz4K",
    brave: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyNTYgMzAxIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyNTYgMzAxIiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoKCTxwYXRoIGZpbGw9IiNGMTVBMjIiIGQ9Im0yMzYgMTA1LjQtNy44LTIxLjIgNS40LTEyLjJjMC43LTEuNiAwLjMtMy40LTAuOC00LjZsLTE0LjgtMTQuOWMtNi41LTYuNS0xNi4xLTguOC0yNC44LTUuN2wtNC4xIDEuNC0yMi42LTI0LjUtMzguMi0wLjNoLTAuM2wtMzguNSAwLjMtMjIuNiAyNC43LTQtMS40Yy04LjgtMy4xLTE4LjUtMC44LTI1IDUuOGwtMTUgMTUuMmMtMSAxLTEuMyAyLjQtMC44IDMuN2w1LjcgMTIuNy03LjggMjEuMiA1LjEgMTkuMiAyMyA4Ny4yYzIuNiAxMCA4LjcgMTguOCAxNy4yIDI0LjkgMCAwIDI3LjggMTkuNyA1NS4zIDM3LjUgMi40IDEuNiA1IDIuNyA3LjcgMi43czUuMi0xLjEgNy43LTIuN2MzMC45LTIwLjIgNTUuMy0zNy41IDU1LjMtMzcuNSA4LjQtNi4xIDE0LjUtMTQuOCAxNy4xLTI0LjlsMjIuOC04Ny4yIDQuOC0xOS40eiIvPgoJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0ibTEzMy4xIDE3OS40Yy0xLTAuNC0yLjEtMC44LTIuNC0wLjhoLTIuN2MtMC4zIDAtMS40IDAuMy0yLjQgMC44bC0xMSA0LjZjLTEgMC40LTIuNyAxLjItMy43IDEuN2wtMTYuNSA4LjZjLTEgMC41LTEuMSAxLjQtMC4yIDIuMWwxNC42IDEwLjNjMC45IDAuNyAyLjQgMS44IDMuMiAyLjVsNi41IDUuNmMwLjggMC44IDIuMiAxLjkgMyAyLjdsNi4yIDUuNmMwLjggMC44IDIuMiAwLjggMyAwbDYuNC01LjZjMC44LTAuOCAyLjItMS45IDMtMi43bDYuNS01LjdjMC44LTAuOCAyLjMtMS45IDMuMi0yLjVsMTQuNi0xMC40YzAuOS0wLjcgMC44LTEuNi0wLjItMi4xbC0xNi41LTguNGMtMS0wLjUtMi43LTEuMy0zLjctMS43bC0xMC45LTQuNnoiLz4KCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Im0yMTIuMiAxMDkuMmMwLjMtMS4xIDAuMy0xLjUgMC4zLTEuNSAwLTEuMS0wLjEtMy0wLjMtNGwtMC44LTIuNGMtMC41LTEtMS40LTIuNi0yLTMuNWwtOS41LTE0LjFjLTAuNi0wLjktMS43LTIuNC0yLjQtMy4zbC0xMi4zLTE1LjRjLTAuNy0wLjgtMS40LTEuNi0xLjQtMS41aC0wLjJzLTAuOSAwLjItMiAwLjNsLTE4LjggMy43Yy0xLjEgMC4zLTIuOSAwLjYtNCAwLjhsLTAuMyAwLjFjLTEuMSAwLjItMi45IDAuMS00LTAuM2wtMTUuOC01LjFjLTEuMS0wLjMtMi45LTAuOC0zLjktMS4xIDAgMC0zLjItMC44LTUuOC0wLjctMi42IDAtNS44IDAuNy01LjggMC43LTEuMSAwLjMtMi45IDAuOC0zLjkgMS4xbC0xNS44IDUuMWMtMS4xIDAuMy0yLjkgMC40LTQgMC4zbC0wLjMtMC4xYy0xLjEtMC4yLTIuOS0wLjYtNC0wLjhsLTE5LTMuNWMtMS4xLTAuMy0yLTAuMy0yLTAuM2gtMC4yYy0wLjEgMC0wLjggMC43LTEuNCAxLjVsLTEyLjMgMTUuMmMtMC43IDAuOC0xLjggMi40LTIuNCAzLjNsLTkuNSAxNC4xYy0wLjYgMC45LTEuNSAyLjUtMiAzLjVsLTAuOCAyLjRjLTAuMiAxLjEtMC4zIDMtMC4zIDQuMSAwIDAgMCAwLjMgMC4zIDEuNSAwLjYgMiAyIDMuOSAyIDMuOSAwLjcgMC44IDEuOSAyLjMgMi43IDNsMjcuOSAyOS43YzAuOCAwLjggMSAyLjQgMC42IDMuNGwtNS44IDEzLjhjLTAuNCAxLTAuNSAyLjctMC4xIDMuOGwxLjYgNC4zYzEuMyAzLjYgMy42IDYuOCA2LjcgOS4zbDUuNyA0LjZjMC44IDAuNyAyLjQgMC45IDMuNCAwLjRsMTcuOS04LjVjMS0wLjUgMi41LTEuNSAzLjQtMi4zbDEyLjgtMTEuNmMxLjktMS43IDEuOS00LjYgMC4zLTYuNGwtMjYuOS0xOC4xYy0wLjktMC42LTEuMy0xLjktMC44LTNsMTEuOC0yMi4zYzAuNS0xIDAuNi0yLjYgMC4yLTMuNmwtMS40LTMuM2MtMC40LTEtMS43LTIuMi0yLjctMi42bC0zNC45LTEzYy0xLTAuNC0xLTAuOCAwLjEtMC45bDIyLjQtMi4xYzEuMS0wLjEgMi45IDAuMSA0IDAuM2wxOS45IDUuNmMxLjEgMC4zIDEuOCAxLjQgMS42IDIuNWwtNyAzNy44Yy0wLjIgMS4xLTAuMiAyLjYgMC4xIDMuNXMxLjMgMS42IDIuNCAxLjlsMTMuOCAzYzEuMSAwLjMgMi45IDAuMyA0IDBsMTIuOS0zYzEuMS0wLjMgMi4yLTEuMSAyLjQtMS45IDAuMy0wLjggMC4zLTIuNCAwLjEtMy41bC02LjgtMzcuOWMtMC4yLTEuMSAwLjUtMi4zIDEuNi0yLjVsMTkuOS01LjZjMS4xLTAuMyAyLjktMC40IDQtMC4zbDIyLjQgMi4xYzEuMSAwLjEgMS4yIDAuNSAwLjEgMC45bC0zNC43IDEzLjJjLTEgMC40LTIuMyAxLjUtMi43IDIuNmwtMS40IDMuM2MtMC40IDEtMC40IDIuNyAwLjIgMy42bDExLjkgMjIuM2MwLjUgMSAwLjIgMi4zLTAuOCAzbC0yNi45IDE4LjJjLTEuOCAxLjgtMS42IDQuNyAwLjMgNi40bDEyLjggMTEuNmMwLjggMC44IDIuNCAxLjggMy40IDIuMmwxOCA4LjVjMSAwLjUgMi41IDAuMyAzLjQtMC40bDUuNy00LjZjMy0yLjQgNS4zLTUuNyA2LjYtOS4zbDEuNi00LjNjMC40LTEgMC4zLTIuOC0wLjEtMy44bC01LjgtMTMuOGMtMC40LTEtMC4yLTIuNSAwLjYtMy40bDI3LjktMjkuN2MwLjgtMC44IDEuOS0yLjIgMi43LTMtMC40LTAuMyAxLjEtMi4xIDEuNi00LjF6Ii8+Cgo8L3N2Zz4K",
    magicEden: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjAwIDIwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8cmVjdCB4PSIwIiBmaWxsPSIjRTQyNTc1IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPgo8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTMxLjgsNzcuNWw4LjksMTAuNWMxLDEuMiwxLjksMi4xLDIuMywyLjdjMi43LDIuNyw0LjIsNi4yLDQuMiwxMGMtMC4zLDQuNC0zLjEsNy40LTUuOCwxMC42bC02LjMsNy4zCglsLTMuMywzLjhjLTAuMSwwLjEtMC4yLDAuMy0wLjIsMC41YzAsMC4yLDAsMC4zLDAuMSwwLjVjMC4xLDAuMiwwLjIsMC4zLDAuMywwLjRjMC4yLDAuMSwwLjMsMC4xLDAuNSwwLjFoMzIuNgoJYzUsMCwxMS4zLDQuMiwxMC45LDEwLjVjMCwyLjktMS4yLDUuNy0zLjMsNy43Yy0yLjEsMi00LjksMy4yLTcuOCwzLjJIMTE0Yy0zLjQsMC0xMi40LDAuNC0xNC45LTcuM2MtMC41LTEuNi0wLjYtMy4zLTAuMi01CgljMC43LTIuNCwxLjktNC43LDMuNC02LjhjMi42LTMuOCw1LjMtNy42LDguMS0xMS4zYzMuNS00LjgsNy4yLTkuNSwxMC43LTE0LjRjMC4xLTAuMiwwLjItMC40LDAuMi0wLjZjMC0wLjItMC4xLTAuNC0wLjItMC42CglsLTEzLTE1LjJjLTAuMS0wLjEtMC4yLTAuMi0wLjMtMC4zYy0wLjEtMC4xLTAuMy0wLjEtMC40LTAuMWMtMC4xLDAtMC4zLDAtMC40LDAuMWMtMC4xLDAuMS0wLjIsMC4yLTAuMywwLjMKCWMtMy41LDQuNi0xOC43LDI1LjEtMjEuOSwyOS4yYy0zLjIsNC4xLTExLjIsNC40LTE1LjcsMEw0OC44LDkzLjRjLTAuMS0wLjEtMC4zLTAuMi0wLjUtMC4zYy0wLjIsMC0wLjQsMC0wLjUsMC4xCgljLTAuMiwwLjEtMC4zLDAuMi0wLjQsMC4zYy0wLjEsMC4yLTAuMiwwLjMtMC4yLDAuNXYzOC42YzAsMi43LTAuOCw1LjQtMi40LDcuN2MtMS42LDIuMy0zLjgsNC02LjQsNC45Yy0xLjcsMC42LTMuNSwwLjctNS4yLDAuNQoJYy0xLjgtMC4yLTMuNC0wLjktNC45LTEuOWMtMS40LTEtMi42LTIuMy0zLjQtMy45Yy0wLjgtMS41LTEuMi0zLjMtMS4yLTVWNjUuNWMwLjEtMi41LDEtNC45LDIuNi02LjljMS42LTIsMy43LTMuNCw2LjItNC4xCgljMi4xLTAuNiw0LjMtMC41LDYuNCwwYzIuMSwwLjYsNCwxLjcsNS41LDMuMmwzMS4yLDMwLjhjMC4xLDAuMSwwLjIsMC4yLDAuMywwLjJjMC4xLDAsMC4zLDAuMSwwLjQsMC4xYzAuMSwwLDAuMy0wLjEsMC40LTAuMQoJYzAuMS0wLjEsMC4yLTAuMiwwLjMtMC4zbDIyLjItMzAuMmMxLTEuMiwyLjMtMi4yLDMuOC0yLjljMS41LTAuNywzLTEuMSw0LjctMS4xaDU3LjZjMS42LDAsMy4xLDAuMyw0LjYsMXMyLjcsMS42LDMuOCwyLjgKCWMxLDEuMiwxLjgsMi41LDIuMyw0YzAuNSwxLjUsMC42LDMuMSwwLjQsNC42Yy0wLjQsMi43LTEuOCw1LjEtMy45LDYuOXMtNC44LDIuNy03LjUsMi43aC0zMi4zYy0wLjIsMC0wLjMsMC4xLTAuNSwwLjEKCWMtMC4xLDAuMS0wLjIsMC4yLTAuMywwLjNjLTAuMSwwLjEtMC4xLDAuMy0wLjEsMC41UzEzMS43LDc3LjQsMTMxLjgsNzcuNXoiLz4KPC9zdmc+Cg==",
    okx: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI4LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAzMzYuMSAzMzYuMSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzM2LjEgMzM2LjE7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KPC9zdHlsZT4KPHBhdGggZD0iTTMxMy43LDBIMjIuNEMxMCwwLDAsMTAsMCwyMi40djI5MS4zYzAsMTIuNCwxMCwyMi40LDIyLjQsMjIuNGgyOTEuM2MxMi40LDAsMjIuNC0xMCwyMi40LTIyLjRWMjIuNAoJQzMzNi4xLDEwLDMyNi4xLDAsMzEzLjcsMHoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIwNC41LDEzMC43aC02NC43Yy0yLjcsMC01LDIuMi01LDV2NjQuN2MwLDIuNywyLjIsNSw1LDVoNjQuN2MyLjcsMCw1LTIuMiw1LTV2LTY0LjcKCUMyMDkuNSwxMzIuOSwyMDcuMiwxMzAuNywyMDQuNSwxMzAuN3oiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyOS44LDU2LjFINjUuMWMtMi43LDAtNSwyLjItNSw1djY0LjdjMCwyLjcsMi4yLDUsNSw1aDY0LjdjMi44LDAsNS0yLjIsNS01VjYxCglDMTM0LjgsNTguMywxMzIuNSw1Ni4xLDEyOS44LDU2LjF6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNzkuMSw1Ni4xaC02NC43Yy0yLjcsMC01LDIuMi01LDV2NjQuN2MwLDIuNywyLjIsNSw1LDVoNjQuN2MyLjcsMCw1LTIuMiw1LTVWNjEKCUMyODQuMSw1OC4zLDI4MS45LDU2LjEsMjc5LjEsNTYuMXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyOS44LDIwNS40SDY1LjFjLTIuNywwLTUsMi4yLTUsNXY2NC43YzAsMi43LDIuMiw1LDUsNWg2NC43YzIuOCwwLDUtMi4yLDUtNXYtNjQuNwoJQzEzNC44LDIwNy42LDEzMi41LDIwNS40LDEyOS44LDIwNS40eiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjc5LjEsMjA1LjRoLTY0LjdjLTIuNywwLTUsMi4yLTUsNXY2NC43YzAsMi43LDIuMiw1LDUsNWg2NC43YzIuNywwLDUtMi4yLDUtNXYtNjQuNwoJQzI4NC4xLDIwNy42LDI4MS45LDIwNS40LDI3OS4xLDIwNS40eiIvPgo8L3N2Zz4K",
  };

  function _optionalChain$l(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class BraveEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Brave',
      logo: logos.brave,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$l([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isBraveWallet]) };}

    getProvider() { 
      return window.ethereum
    }
  } BraveEVM.__initStatic(); BraveEVM.__initStatic2();

  function _optionalChain$k(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Coin98EVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Coin98',
      logo: logos.coin98,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$k([window, 'optionalAccess', _2 => _2.coin98]) };}

    getProvider() { return window.coin98.provider }
    
  } Coin98EVM.__initStatic(); Coin98EVM.__initStatic2();

  function _optionalChain$j(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class CoinbaseEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Coinbase',
      logo: logos.coinbase,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    getProvider() { 
      if(_optionalChain$j([window, 'optionalAccess', _9 => _9.ethereum, 'optionalAccess', _10 => _10.providerMap, 'optionalAccess', _11 => _11.has, 'call', _12 => _12('CoinbaseWallet')])) {
        return _optionalChain$j([window, 'optionalAccess', _13 => _13.ethereum, 'optionalAccess', _14 => _14.providerMap, 'optionalAccess', _15 => _15.get, 'call', _16 => _16('CoinbaseWallet')])
      } else {
        return window.ethereum
      }
    }

    static __initStatic2() {this.isAvailable = async()=>{ 
      return(
        (
          _optionalChain$j([window, 'optionalAccess', _17 => _17.ethereum, 'optionalAccess', _18 => _18.isCoinbaseWallet]) || _optionalChain$j([window, 'optionalAccess', _19 => _19.ethereum, 'optionalAccess', _20 => _20.isWalletLink])
        ) || (
          _optionalChain$j([window, 'optionalAccess', _21 => _21.ethereum, 'optionalAccess', _22 => _22.providerMap, 'optionalAccess', _23 => _23.has, 'call', _24 => _24('CoinbaseWallet')])
        )
      )
    };}
  } CoinbaseEVM.__initStatic(); CoinbaseEVM.__initStatic2();

  function _optionalChain$i(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class CryptoCom extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Crypto.com | DeFi Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA4OS45IDEwMi44IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA4OS45IDEwMi44IiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOiMwMzMxNkM7fQo8L3N0eWxlPgoKPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTUuMzc1MSAtMTEzLjYxKSI+Cgk8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzE3OTQgMCAwIC4zMTQ2NSAtMS4wNDczIDMwLjQ0NykiPgoJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Im0xNjEuNiAyNjQuMy0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6bTAgMC0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6Ii8+CgkJPHBhdGggY2xhc3M9InN0MSIgZD0ibTIxNy41IDUyNy4xaC0yMC4xbC0yNC4xLTIyLjF2LTExLjNsMjQuOS0yMy44di0zNy43bDMyLjYtMjEuMyAzNy4xIDI4LjEtNTAuNCA4OC4xem0tODMuMy01OS42IDMuNy0zNS40LTEyLjItMzEuN2g3MmwtMTEuOSAzMS43IDMuNCAzNS40aC01NXptMTYuNCAzNy41LTI0LjEgMjIuNGgtMjAuNGwtNTAuNy04OC40IDM3LjQtMjcuOCAzMi45IDIxdjM3LjdsMjQuOSAyMy44djExLjN6bS00NC44LTE3MC4xaDExMS40bDEzLjMgNTYuN2gtMTM3LjdsMTMtNTYuN3ptNTUuOC03MC42LTE0MS40IDgxLjZ2MTYzLjNsMTQxLjQgODEuNiAxNDEuNC04MS42di0xNjMuM2wtMTQxLjQtODEuNnoiLz4KCTwvZz4KPC9nPgo8L3N2Zz4K",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$i([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isDeficonnectProvider]) };}
  } CryptoCom.__initStatic(); CryptoCom.__initStatic2();

  function _optionalChain$h(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class ExodusEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Exodus',
      logo: logos.exodus,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$h([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isExodus]) };}
  } ExodusEVM.__initStatic(); ExodusEVM.__initStatic2();

  function _optionalChain$g(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class HyperPay extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'HyperPay',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjA0LjcgMjAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMDQuNyAyMDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHBhdGggZmlsbD0iIzFBNzJGRSIgZD0iTTEwMi41LDUuMkM1MC44LDUuMiw4LjgsNDcuMiw4LjgsOTlzNDIsOTMuNSw5My44LDkzLjVzOTMuOC00Miw5My44LTkzLjhTMTU0LjIsNS4yLDEwMi41LDUuMnogTTEyNy4yLDExOS4yCgljLTYuMiwwLTIxLjcsMC4zLTIxLjcsMC4zbC03LDI3aC0yOWw2LjgtMjYuNUgzMWw3LjItMjEuOGMwLDAsNzguOCwwLjIsODUuMiwwYzYuNS0wLjIsMTYuNS0xLjgsMTYuOC0xNC44YzAuMy0xNy44LTI3LTE2LjgtMjkuMi0xCgljLTEuNSwxMC0xLjUsMTIuNS0xLjUsMTIuNUg4My44bDUtMjMuNUg0N2w2LjMtMjJjMCwwLDYxLjIsMC4yLDcyLjgsMC4yczQyLjIsMyw0Mi4yLDMxLjJDMTY4LjIsMTEyLDEzOC41LDExOS4zLDEyNy4yLDExOS4yCglMMTI3LjIsMTE5LjJ6Ii8+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$g([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isHyperPay]) };}
  } HyperPay.__initStatic(); HyperPay.__initStatic2();

  function _optionalChain$f(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class MagicEdenEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Magic Eden',
      logo: logos.magicEden,
      blockchains: ['ethereum', 'polygon'],
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$f([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isMagicEden])
      )
    };}
  } MagicEdenEVM.__initStatic(); MagicEdenEVM.__initStatic2();

  function _optionalChain$e(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class MetaMask extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'MetaMask',
      logo: "data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0ODUuOTMgNDUwLjU2Jz48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzgyODQ4Nzt9LmNscy0ye2ZpbGw6I2UyNzcyNjtzdHJva2U6I2UyNzcyNjt9LmNscy0xMCwuY2xzLTExLC5jbHMtMiwuY2xzLTMsLmNscy00LC5jbHMtNSwuY2xzLTYsLmNscy03LC5jbHMtOCwuY2xzLTl7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uY2xzLTN7ZmlsbDojZTM3NzI1O3N0cm9rZTojZTM3NzI1O30uY2xzLTR7ZmlsbDojZDZjMGIzO3N0cm9rZTojZDZjMGIzO30uY2xzLTV7ZmlsbDojMjQzNDQ3O3N0cm9rZTojMjQzNDQ3O30uY2xzLTZ7ZmlsbDojY2Q2MzI4O3N0cm9rZTojY2Q2MzI4O30uY2xzLTd7ZmlsbDojZTM3NTI1O3N0cm9rZTojZTM3NTI1O30uY2xzLTh7ZmlsbDojZjY4NTFmO3N0cm9rZTojZjY4NTFmO30uY2xzLTl7ZmlsbDojYzFhZTllO3N0cm9rZTojYzFhZTllO30uY2xzLTEwe2ZpbGw6IzE3MTcxNztzdHJva2U6IzE3MTcxNzt9LmNscy0xMXtmaWxsOiM3NjNlMWE7c3Ryb2tlOiM3NjNlMWE7fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSdjbHMtMScgZD0nTTI0Ny45MSwzNTYuMjlhMjYsMjYsMCwxLDAtMjYsMjZBMjYsMjYsMCwwLDAsMjQ3LjkxLDM1Ni4yOVonIHRyYW5zZm9ybT0ndHJhbnNsYXRlKC03Ljk3IC0yMS4zMyknLz48cGF0aCBjbGFzcz0nY2xzLTEnIGQ9J00yNDYuNTUsMTQ5LjcxYTI2LDI2LDAsMSwwLTI2LDI2QTI2LDI2LDAsMCwwLDI0Ni41NSwxNDkuNzFaJyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgtNy45NyAtMjEuMzMpJy8+PGNpcmNsZSBjbGFzcz0nY2xzLTEnIGN4PScxNDguNCcgY3k9JzIzMC4wNScgcj0nMjUuOTknLz48cG9seWdvbiBjbGFzcz0nY2xzLTInIHBvaW50cz0nNDYxLjI4IDAuNSAyNzIuMDYgMTQxLjAzIDMwNy4wNSA1OC4xMiA0NjEuMjggMC41Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzI0LjQ2IDAuNSAyMTIuMTYgMTQyLjM3IDE3OC44OCA1OC4xMiAyNC40NiAwLjUnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMzkzLjIgMzI2LjI2IDM0Mi44MSA0MDMuNDcgNDUwLjYzIDQzMy4xNCA0ODEuNjMgMzI3Ljk3IDM5My4yIDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPSc0LjQ5IDMyNy45NyAzNS4zIDQzMy4xNCAxNDMuMTMgNDAzLjQ3IDkyLjczIDMyNi4yNiA0LjQ5IDMyNy45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPScxMzcuMDQgMTk1LjggMTA3IDI0MS4yNSAyMTQuMDYgMjQ2LjAxIDIxMC4yNiAxMzAuOTYgMTM3LjA0IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzM0OC43IDE5NS44IDI3NC41MyAxMjkuNjMgMjcyLjA2IDI0Ni4wMSAzNzguOTQgMjQxLjI1IDM0OC43IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzE0My4xMyA0MDMuNDcgMjA3LjQxIDM3Mi4wOSAxNTEuODggMzI4LjczIDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAzNDIuODEgNDAzLjQ3IDMzMy44NyAzMjguNzMgMjc4LjM0IDM3Mi4wOScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPSczNDIuODEgNDAzLjQ3IDI3OC4zNCAzNzIuMDkgMjgzLjQ3IDQxNC4xMiAyODIuOSA0MzEuODEgMzQyLjgxIDQwMy40NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPScxNDMuMTMgNDAzLjQ3IDIwMy4wMyA0MzEuODEgMjAyLjY1IDQxNC4xMiAyMDcuNDEgMzcyLjA5IDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTUnIHBvaW50cz0nMjAzLjk4IDMwMC45NyAxNTAuMzUgMjg1LjE4IDE4OC4yIDI2Ny44OCAyMDMuOTggMzAwLjk3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy01JyBwb2ludHM9JzI4MS43NiAzMDAuOTcgMjk3LjU1IDI2Ny44OCAzMzUuNTggMjg1LjE4IDI4MS43NiAzMDAuOTcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTYnIHBvaW50cz0nMTQzLjEzIDQwMy40NyAxNTIuMjUgMzI2LjI2IDkyLjczIDMyNy45NyAxNDMuMTMgNDAzLjQ3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy02JyBwb2ludHM9JzMzMy42OCAzMjYuMjYgMzQyLjgxIDQwMy40NyAzOTMuMiAzMjcuOTcgMzMzLjY4IDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPSczNzguOTQgMjQxLjI1IDI3Mi4wNiAyNDYuMDEgMjgxLjk1IDMwMC45NyAyOTcuNzQgMjY3Ljg4IDMzNS43NyAyODUuMTggMzc4Ljk0IDI0MS4yNScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE4OC4zOSAyNjcuODggMjAzLjk4IDMwMC45NyAyMTQuMDYgMjQ2LjAxIDEwNyAyNDEuMjUgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNycgcG9pbnRzPScxMDcgMjQxLjI1IDE1MS44OCAzMjguNzMgMTUwLjM1IDI4NS4xOCAxMDcgMjQxLjI1Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzMzNS43NyAyODUuMTggMzMzLjg3IDMyOC43MyAzNzguOTQgMjQxLjI1IDMzNS43NyAyODUuMTgnLz48cG9seWdvbiBjbGFzcz0nY2xzLTcnIHBvaW50cz0nMjE0LjA2IDI0Ni4wMSAyMDMuOTggMzAwLjk3IDIxNi41MyAzNjUuODIgMjE5LjM4IDI4MC40MyAyMTQuMDYgMjQ2LjAxJy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzI3Mi4wNiAyNDYuMDEgMjY2LjkzIDI4MC4yNCAyNjkuMjEgMzY1LjgyIDI4MS45NSAzMDAuOTcgMjcyLjA2IDI0Ni4wMScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyODEuOTUgMzAwLjk3IDI2OS4yMSAzNjUuODIgMjc4LjM0IDM3Mi4wOSAzMzMuODcgMzI4LjczIDMzNS43NyAyODUuMTggMjgxLjk1IDMwMC45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE1MS44OCAzMjguNzMgMjA3LjQxIDM3Mi4wOSAyMTYuNTMgMzY1LjgyIDIwMy45OCAzMDAuOTcgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOScgcG9pbnRzPScyODIuOSA0MzEuODEgMjgzLjQ3IDQxNC4xMiAyNzguNzIgNDA5Ljk0IDIwNy4wMiA0MDkuOTQgMjAyLjY1IDQxNC4xMiAyMDMuMDMgNDMxLjgxIDE0My4xMyA0MDMuNDcgMTY0LjA1IDQyMC41OCAyMDYuNDUgNDUwLjA2IDI3OS4yOSA0NTAuMDYgMzIxLjg5IDQyMC41OCAzNDIuODEgNDAzLjQ3IDI4Mi45IDQzMS44MScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTAnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAyNjkuMjEgMzY1LjgyIDIxNi41MyAzNjUuODIgMjA3LjQxIDM3Mi4wOSAyMDIuNjUgNDE0LjEyIDIwNy4wMiA0MDkuOTQgMjc4LjcyIDQwOS45NCAyODMuNDcgNDE0LjEyIDI3OC4zNCAzNzIuMDknLz48cG9seWdvbiBjbGFzcz0nY2xzLTExJyBwb2ludHM9JzQ2OS4yNyAxNTAuMTYgNDg1LjQzIDcyLjU3IDQ2MS4yOCAwLjUgMjc4LjM0IDEzNi4yOCAzNDguNyAxOTUuOCA0NDguMTYgMjI0LjkgNDcwLjIyIDE5OS4yMyA0NjAuNzEgMTkyLjM4IDQ3NS45MiAxNzguNSA0NjQuMTMgMTY5LjM3IDQ3OS4zNSAxNTcuNzcgNDY5LjI3IDE1MC4xNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTEnIHBvaW50cz0nMC41IDcyLjU3IDE2LjY2IDE1MC4xNiA2LjM5IDE1Ny43NyAyMS42MSAxNjkuMzcgMTAuMDEgMTc4LjUgMjUuMjIgMTkyLjM4IDE1LjcxIDE5OS4yMyAzNy41OCAyMjQuOSAxMzcuMDQgMTk1LjggMjA3LjQxIDEzNi4yOCAyNC40NiAwLjUgMC41IDcyLjU3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzQ0OC4xNiAyMjQuOSAzNDguNyAxOTUuOCAzNzguOTQgMjQxLjI1IDMzMy44NyAzMjguNzMgMzkzLjIgMzI3Ljk3IDQ4MS42MyAzMjcuOTcgNDQ4LjE2IDIyNC45Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzEzNy4wNCAxOTUuOCAzNy41OCAyMjQuOSA0LjQ5IDMyNy45NyA5Mi43MyAzMjcuOTcgMTUxLjg4IDMyOC43MyAxMDcgMjQxLjI1IDEzNy4wNCAxOTUuOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyNzIuMDYgMjQ2LjAxIDI3OC4zNCAxMzYuMjggMzA3LjI0IDU4LjEyIDE3OC44OCA1OC4xMiAyMDcuNDEgMTM2LjI4IDIxNC4wNiAyNDYuMDEgMjE2LjM0IDI4MC42MiAyMTYuNTMgMzY1LjgyIDI2OS4yMSAzNjUuODIgMjY5LjU5IDI4MC42MiAyNzIuMDYgMjQ2LjAxJy8+PC9zdmc+",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isMetaMask = (provider)=> {
      return(
        _optionalChain$e([provider, 'optionalAccess', _3 => _3.isMetaMask]) &&
        Object.keys(provider).filter((key)=>key.match(/^is(?!Connected)(?!PocketUniverse)(?!WalletGuard)(?!RevokeCash)/)).length == 1
      )
    };}

    static __initStatic3() {this.getEip6963Provider = ()=>{
      return window['_eip6963Providers'] ? Object.values(window['_eip6963Providers']).find((provider)=>{
        return MetaMask.isMetaMask(provider)
      }) : undefined
    };}

    static __initStatic4() {this.isAvailable = async()=>{
      return(
        MetaMask.getEip6963Provider() ||
        MetaMask.isMetaMask(_optionalChain$e([window, 'optionalAccess', _4 => _4.ethereum]))
      )
    };}

    getProvider() {
      return MetaMask.getEip6963Provider() || (MetaMask.isMetaMask(_optionalChain$e([window, 'optionalAccess', _5 => _5.ethereum])) && _optionalChain$e([window, 'optionalAccess', _6 => _6.ethereum]))
    }
  } MetaMask.__initStatic(); MetaMask.__initStatic2(); MetaMask.__initStatic3(); MetaMask.__initStatic4();

  function _optionalChain$d(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class OKXEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'OKX',
      logo: logos.okx,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$d([window, 'optionalAccess', _2 => _2.okxwallet])
      )
    };}
  } OKXEVM.__initStatic(); OKXEVM.__initStatic2();

  function _optionalChain$c(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Opera extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Opera',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA3NS42IDc1LjYiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMzMzMyAwIDAgLTEuMzMzMyAwIDEwNy4yKSI+CiAgCiAgPGxpbmVhckdyYWRpZW50IGlkPSJvcGVyYUxvZ28wMDAwMDAxMjM1MTEiIHgxPSItMTA3LjM0IiB4Mj0iLTEwNi4zNCIgeTE9Ii0xMzcuODUiIHkyPSItMTM3Ljg1IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAgLTczLjI1NyAtNzMuMjU3IDAgLTEwMDc1IC03Nzg0LjEpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRkYxQjJEIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjMiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjYxNCIvPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iI0E3MDAxNCIgb2Zmc2V0PSIxIi8+CiAgPC9saW5lYXJHcmFkaWVudD4KICAKICA8cGF0aCBmaWxsPSJ1cmwoI29wZXJhTG9nbzAwMDAwMDEyMzUxMSkiIGQ9Im0yOC4zIDgwLjRjLTE1LjYgMC0yOC4zLTEyLjctMjguMy0yOC4zIDAtMTUuMiAxMi0yNy42IDI3LTI4LjNoMS40YzcuMyAwIDEzLjkgMi43IDE4LjkgNy4yLTMuMy0yLjItNy4yLTMuNS0xMS40LTMuNS02LjggMC0xMi44IDMuMy0xNi45IDguNi0zLjEgMy43LTUuMiA5LjItNS4zIDE1LjN2MS4zYzAuMSA2LjEgMi4yIDExLjYgNS4zIDE1LjMgNC4xIDUuMyAxMC4xIDguNiAxNi45IDguNiA0LjIgMCA4LTEuMyAxMS40LTMuNS01IDQuNS0xMS42IDcuMi0xOC44IDcuMi0wLjEgMC4xLTAuMSAwLjEtMC4yIDAuMXoiLz4KICAKICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9Ii0xMDcuMDYiIHgyPSItMTA2LjA2IiB5MT0iLTEzOC4wNCIgeTI9Ii0xMzguMDQiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMCAtNjQuNzkyIC02NC43OTIgMCAtODkwNi4yIC02ODYwLjQpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjOUMwMDAwIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iLjciLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iMSIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPHBhdGggZD0ibTE5IDY4YzIuNiAzLjEgNiA0LjkgOS42IDQuOSA4LjMgMCAxNC45LTkuNCAxNC45LTIwLjlzLTYuNy0yMC45LTE0LjktMjAuOWMtMy43IDAtNyAxLjktOS42IDQuOSA0LjEtNS4zIDEwLjEtOC42IDE2LjktOC42IDQuMiAwIDggMS4zIDExLjQgMy41IDUuOCA1LjIgOS41IDEyLjcgOS41IDIxLjFzLTMuNyAxNS45LTkuNSAyMS4xYy0zLjMgMi4yLTcuMiAzLjUtMTEuNCAzLjUtNi44IDAuMS0xMi44LTMuMy0xNi45LTguNiIgZmlsbD0idXJsKCNiKSIvPgo8L2c+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$c([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isOpera]) };}
  } Opera.__initStatic(); Opera.__initStatic2();

  function _optionalChain$b(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class PhantomEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Phantom',
      logo: logos.phantom,
      blockchains: ['ethereum', 'polygon'],
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        window.phantom &&
        window.phantom.ethereum &&
        ! _optionalChain$b([window, 'optionalAccess', _4 => _4.ethereum, 'optionalAccess', _5 => _5.isMagicEden]) &&
        ! _optionalChain$b([window, 'optionalAccess', _6 => _6.okxwallet])
      )
    };}

    getProvider() { 
      return _optionalChain$b([window, 'optionalAccess', _7 => _7.phantom, 'optionalAccess', _8 => _8.ethereum]) || window.ethereum
    }
  } PhantomEVM.__initStatic(); PhantomEVM.__initStatic2();

  function _optionalChain$a(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Rabby extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Rabby',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9ImthdG1hbl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjA0IDE1MiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjA0IDE1MjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOnVybCgjU1ZHSURfMV8pO30KCS5zdDF7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTE4MzY5MTkwNjY5MjcyNDcwNjgwMDAwMDE1NjE0NDY3MTMxNjE1Mjc5NDkxXyk7fQoJLnN0MntmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOnVybCgjU1ZHSURfMDAwMDAwNjU3Nzc0NTQ3NDc4MDEzNzcwNTAwMDAwMDcwMDM5OTUyODQ2NDY5NTk3NzVfKTt9Cgkuc3Qze2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDA5MTY5NjU3NTkzMjA0MzQxNTM5MDAwMDAwMTAyMTU2NDM5MjA1MDA3ODg1Nl8pO30KPC9zdHlsZT4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8xXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSI3MS4zNDE4IiB5MT0iNDE5LjA4NjkiIHgyPSIxNzUuMjg4MSIgeTI9IjQ0OC41NjQxIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMCAtMzQ2KSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojODc5N0ZGIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojQUFBOEZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNzYuNCw4NS40YzUuOS0xMy4yLTIzLjMtNTAuMS01MS4yLTY1LjNDMTA3LjUsOC4xLDg5LjMsOS43LDg1LjUsMTVjLTguMSwxMS40LDI3LDIxLjMsNTAuNCwzMi41CgljLTUuMSwyLjItOS44LDYuMi0xMi41LDExLjFDMTE0LjcsNDksOTUuNSw0MC44LDczLDQ3LjVjLTE1LjIsNC40LTI3LjgsMTUuMS0zMi43LDMwLjljLTEuMS0wLjUtMi41LTAuOC0zLjgtMC44CgljLTUuMiwwLTkuNSw0LjMtOS41LDkuNWMwLDUuMiw0LjMsOS41LDkuNSw5LjVjMSwwLDQtMC42LDQtMC42bDQ4LjgsMC4zYy0xOS41LDMxLjEtMzUsMzUuNS0zNSw0MC45czE0LjcsNCwyMC4zLDEuOQoJYzI2LjYtOS41LDU1LjItMzkuNSw2MC4xLTQ4LjFDMTU1LjMsOTMuOCwxNzIuNSw5My45LDE3Ni40LDg1LjR6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAwMzg0MDY0NTAzNDY5MjQ4NjkzNTAwMDAwMDA5NDQzOTczMDQwMTQ3OTk1NDdfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjE1My45OTAyIiB5MT0iNDIxLjM0NzQiIHgyPSI3OC45ODgzIiB5Mj0iMzQ2LjE2MTgiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAwIC0zNDYpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMzQjIyQTAiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiM1MTU2RDg7c3RvcC1vcGFjaXR5OjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDAzODQwNjQ1MDM0NjkyNDg2OTM1MDAwMDAwMDk0NDM5NzMwNDAxNDc5OTU0N18pOyIgZD0iCglNMTM2LjEsNDcuNUwxMzYuMSw0Ny41YzEuMS0wLjUsMS0yLjEsMC42LTMuM2MtMC42LTIuOS0xMi41LTE0LjYtMjMuNi0xOS44Yy0xNS4yLTcuMS0yNi4zLTYuOC0yNy45LTMuNWMzLDYuMywxNy40LDEyLjIsMzIuNCwxOC42CglDMTIzLjcsNDEuOSwxMzAuMiw0NC42LDEzNi4xLDQ3LjVMMTM2LjEsNDcuNXoiLz4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDE0NzIyMDY3MjYxNTU0Nzk0MjI0MDAwMDAxMTg5NDM0ODEwNDAwNzM1NDA0NF8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTE4Ljc4NjUiIHkxPSI0NTkuOTQ1OSIgeDI9IjQ2LjczODgiIHkyPSI0MTguNTIzNiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTM0NikiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzNCMUU4RiIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzZBNkZGQjtzdG9wLW9wYWNpdHk6MCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTQ3MjIwNjcyNjE1NTQ3OTQyMjQwMDAwMDExODk0MzQ4MTA0MDA3MzU0MDQ0Xyk7IiBkPSIKCU0xMTYuNywxMTEuMmMtMy0xLjEtNi41LTIuMi0xMC41LTMuMmM0LjEtNy41LDUuMS0xOC43LDEuMS0yNS43Yy01LjYtOS44LTEyLjUtMTUuMS0yOC45LTE1LjFjLTguOSwwLTMzLDMtMzMuNSwyMy4yCgljMCwyLjEsMCw0LDAuMiw1LjlsNDQuMSwwYy01LjksOS40LTExLjQsMTYuMy0xNi4zLDIxLjZjNS45LDEuNCwxMC42LDIuNywxNS4xLDRjNC4xLDEuMSw4LjEsMi4xLDEyLjEsMy4yCglDMTA2LjEsMTIwLjYsMTExLjgsMTE1LjgsMTE2LjcsMTExLjJ6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxMjg0NzQ1MTgwNjUxMjc5MDc2OTAwMDAwMDg3OTM1NDY5MjM0OTg1OTA4NjFfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjY2LjM2MDQiIHkxPSI0MjcuNjAyIiB4Mj0iMTE1LjA1OTMiIHkyPSI0ODkuNDc5MiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTM0NikiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6Izg4OThGRiIvPgoJPHN0b3AgIG9mZnNldD0iMC45ODM5IiBzdHlsZT0ic3RvcC1jb2xvcjojNUY0N0YxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxMjg0NzQ1MTgwNjUxMjc5MDc2OTAwMDAwMDg3OTM1NDY5MjM0OTg1OTA4NjFfKTsiIGQ9Ik0zOS43LDkzLjljMS43LDE1LjIsMTAuNSwyMS4zLDI4LjIsMjMKCWMxNy44LDEuNywyNy45LDAuNiw0MS40LDEuN2MxMS4zLDEsMjEuNCw2LjgsMjUuMSw0LjhjMy4zLTEuNywxLjQtOC4yLTMtMTIuNGMtNS45LTUuNC0xNC05LTI4LjEtMTAuNWMyLjktNy44LDIuMS0xOC43LTIuNC0yNC42CgljLTYuMy04LjYtMTguMS0xMi40LTMzLTEwLjhDNTIuMyw2Ny4xLDM3LjQsNzQuOSwzOS43LDkzLjl6Ii8+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return(
        _optionalChain$a([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isRabby])
      )
    };}
  } Rabby.__initStatic(); Rabby.__initStatic2();

  function _optionalChain$9(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Rainbow extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Rainbow',
      logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzhIMjZDNTYuOTI3OSAzOCA4MiA2My4wNzIxIDgyIDk0VjEwMEg5NEM5Ny4zMTM3IDEwMCAxMDAgOTcuMzEzNyAxMDAgOTRDMTAwIDUzLjEzMDkgNjYuODY5MSAyMCAyNiAyMEMyMi42ODYzIDIwIDIwIDIyLjY4NjMgMjAgMjZWMzhaIiBmaWxsPSJ1cmwoI3BhaW50MV9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNODQgOTRIMTAwQzEwMCA5Ny4zMTM3IDk3LjMxMzcgMTAwIDk0IDEwMEg4NFY5NFoiIGZpbGw9InVybCgjcGFpbnQyX2xpbmVhcl82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiAyMEwyNiAzNkgyMEwyMCAyNkMyMCAyMi42ODYzIDIyLjY4NjMgMjAgMjYgMjBaIiBmaWxsPSJ1cmwoI3BhaW50M19saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzZIMjZDNTguMDMyNSAzNiA4NCA2MS45Njc1IDg0IDk0VjEwMEg2NlY5NEM2NiA3MS45MDg2IDQ4LjA5MTQgNTQgMjYgNTRIMjBWMzZaIiBmaWxsPSJ1cmwoI3BhaW50NF9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNNjggOTRIODRWMTAwSDY4Vjk0WiIgZmlsbD0idXJsKCNwYWludDVfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDUyTDIwIDM2TDI2IDM2TDI2IDUySDIwWiIgZmlsbD0idXJsKCNwYWludDZfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDYyQzIwIDY1LjMxMzcgMjIuNjg2MyA2OCAyNiA2OEM0MC4zNTk0IDY4IDUyIDc5LjY0MDYgNTIgOTRDNTIgOTcuMzEzNyA1NC42ODYzIDEwMCA1OCAxMDBINjhWOTRDNjggNzAuODA0IDQ5LjE5NiA1MiAyNiA1MkgyMFY2MloiIGZpbGw9InVybCgjcGFpbnQ3X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik01MiA5NEg2OFYxMDBINThDNTQuNjg2MyAxMDAgNTIgOTcuMzEzNyA1MiA5NFoiIGZpbGw9InVybCgjcGFpbnQ4X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiA2OEMyMi42ODYzIDY4IDIwIDY1LjMxMzcgMjAgNjJMMjAgNTJMMjYgNTJMMjYgNjhaIiBmaWxsPSJ1cmwoI3BhaW50OV9yYWRpYWxfNjJfMzI5KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzYyXzMyOSIgeDE9IjYwIiB5MT0iMCIgeDI9IjYwIiB5Mj0iMTIwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxNzQyOTkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDAxRTU5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQxX3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYgOTQpIHJvdGF0ZSgtOTApIHNjYWxlKDc0KSI+CjxzdG9wIG9mZnNldD0iMC43NzAyNzciIHN0b3AtY29sb3I9IiNGRjQwMDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODc1NEM5Ii8+CjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQyX2xpbmVhcl82Ml8zMjkiIHgxPSI4MyIgeTE9Ijk3IiB4Mj0iMTAwIiB5Mj0iOTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGNDAwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDNfbGluZWFyXzYyXzMyOSIgeDE9IjIzIiB5MT0iMjAiIHgyPSIyMyIgeTI9IjM3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY0MDAwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ0X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYgOTQpIHJvdGF0ZSgtOTApIHNjYWxlKDU4KSI+CjxzdG9wIG9mZnNldD0iMC43MjM5MjkiIHN0b3AtY29sb3I9IiNGRkY3MDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY5OTAxIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ1X2xpbmVhcl82Ml8zMjkiIHgxPSI2OCIgeTE9Ijk3IiB4Mj0iODQiIHkyPSI5NyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRkZGNzAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfNjJfMzI5IiB4MT0iMjMiIHkxPSI1MiIgeDI9IjIzIiB5Mj0iMzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRjcwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjk5MDEiLz4KPC9saW5lYXJHcmFkaWVudD4KPHJhZGlhbEdyYWRpZW50IGlkPSJwYWludDdfcmFkaWFsXzYyXzMyOSIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgyNiA5NCkgcm90YXRlKC05MCkgc2NhbGUoNDIpIj4KPHN0b3Agb2Zmc2V0PSIwLjU5NTEzIiBzdG9wLWNvbG9yPSIjMDBBQUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50OF9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDUxIDk3KSBzY2FsZSgxNyA0NS4zMzMzKSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMEFBRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDFEQTQwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ5X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjMgNjkpIHJvdGF0ZSgtOTApIHNjYWxlKDE3IDMyMi4zNykiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBBQUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.getEip6963Provider = ()=>{
      return window['_eip6963Providers'] ? Object.values(window['_eip6963Providers']).find((provider)=>{
        return _optionalChain$9([provider, 'optionalAccess', _4 => _4.isRainbow])
      }) : undefined
    };}

    static __initStatic3() {this.isAvailable = async()=>{
      return(
        Rainbow.getEip6963Provider() ||
        _optionalChain$9([window, 'optionalAccess', _5 => _5.rainbow, 'optionalAccess', _6 => _6.isRainbow])
      )
    };}

    getProvider() {
      return Rainbow.getEip6963Provider() || _optionalChain$9([window, 'optionalAccess', _7 => _7.rainbow])
    }

  } Rainbow.__initStatic(); Rainbow.__initStatic2(); Rainbow.__initStatic3();

  function _optionalChain$8(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class TokenPocket extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'TP Wallet (TokenPocket)',
      logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8bWFzayBpZD0ibWFzazBfNDA4XzIyNSIgc3R5bGU9Im1hc2stdHlwZTphbHBoYSIgbWFza1VuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCI+CjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiNDNEM0QzQiLz4KPC9tYXNrPgo8ZyBtYXNrPSJ1cmwoI21hc2swXzQwOF8yMjUpIj4KPHBhdGggZD0iTTEwNDEuNTIgMEgtMjdWMTAyNEgxMDQxLjUyVjBaIiBmaWxsPSIjMjk4MEZFIi8+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF80MDhfMjI1KSI+CjxwYXRoIGQ9Ik00MDYuNzk2IDQzOC42NDNINDA2LjkyN0M0MDYuNzk2IDQzNy44NTcgNDA2Ljc5NiA0MzYuOTQgNDA2Ljc5NiA0MzYuMTU0VjQzOC42NDNaIiBmaWxsPSIjMjlBRUZGIi8+CjxwYXRoIGQ9Ik02NjcuNjAyIDQ2My41MzNINTIzLjI0OVY3MjQuMDc2QzUyMy4yNDkgNzM2LjM4OSA1MzMuMjA0IDc0Ni4zNDUgNTQ1LjUxNyA3NDYuMzQ1SDY0NS4zMzNDNjU3LjY0NyA3NDYuMzQ1IDY2Ny42MDIgNzM2LjM4OSA2NjcuNjAyIDcyNC4wNzZWNDYzLjUzM1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00NTMuNTYzIDI3N0g0NDguNzE2SDE5MC4yNjlDMTc3Ljk1NSAyNzcgMTY4IDI4Ni45NTUgMTY4IDI5OS4yNjlWMzg5LjY1M0MxNjggNDAxLjk2NyAxNzcuOTU1IDQxMS45MjIgMTkwLjI2OSA0MTEuOTIySDI1MC45MThIMjc1LjAyMVY0MzguNjQ0VjcyNC43MzFDMjc1LjAyMSA3MzcuMDQ1IDI4NC45NzYgNzQ3IDI5Ny4yODkgNzQ3SDM5Mi4xMjhDNDA0LjQ0MSA3NDcgNDE0LjM5NiA3MzcuMDQ1IDQxNC4zOTYgNzI0LjczMVY0MzguNjQ0VjQzNi4xNTZWNDExLjkyMkg0MzguNDk5SDQ0OC4zMjNINDUzLjE3QzQ5MC4zNzIgNDExLjkyMiA1MjAuNjMxIDM4MS42NjMgNTIwLjYzMSAzNDQuNDYxQzUyMS4wMjQgMzA3LjI1OSA0OTAuNzY1IDI3NyA0NTMuNTYzIDI3N1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02NjcuNzM1IDQ2My41MzNWNjQ1LjM1QzY3Mi43MTMgNjQ2LjUyOSA2NzcuODIxIDY0Ny40NDYgNjgzLjA2MSA2NDguMjMyQzY5MC4zOTcgNjQ5LjI4IDY5Ny45OTQgNjQ5LjkzNSA3MDUuNTkyIDY1MC4wNjZDNzA1Ljk4NSA2NTAuMDY2IDcwNi4zNzggNjUwLjA2NiA3MDYuOTAyIDY1MC4wNjZWNTA1LjQ1QzY4NS4wMjYgNTA0LjAwOSA2NjcuNzM1IDQ4NS44MDEgNjY3LjczNSA0NjMuNTMzWiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzQwOF8yMjUpIi8+CjxwYXRoIGQ9Ik03MDkuNzgxIDI3N0M2MDYuODIyIDI3NyA1MjMuMjQ5IDM2MC41NzMgNTIzLjI0OSA0NjMuNTMzQzUyMy4yNDkgNTUyLjA4NCA1ODQuOTQ2IDYyNi4yMjUgNjY3LjczMyA2NDUuMzVWNDYzLjUzM0M2NjcuNzMzIDQ0MC4zNDcgNjg2LjU5NiA0MjEuNDg0IDcwOS43ODEgNDIxLjQ4NEM3MzIuOTY3IDQyMS40ODQgNzUxLjgzIDQ0MC4zNDcgNzUxLjgzIDQ2My41MzNDNzUxLjgzIDQ4My4wNTEgNzM4LjYgNDk5LjQyNSA3MjAuNTIzIDUwNC4xNEM3MTcuMTE3IDUwNS4wNTcgNzEzLjQ0OSA1MDUuNTgxIDcwOS43ODEgNTA1LjU4MVY2NTAuMDY2QzcxMy40NDkgNjUwLjA2NiA3MTYuOTg2IDY0OS45MzUgNzIwLjUyMyA2NDkuODA0QzgxOC41MDUgNjQ0LjE3MSA4OTYuMzE0IDU2Mi45NTYgODk2LjMxNCA0NjMuNTMzQzg5Ni40NDUgMzYwLjU3MyA4MTIuODcyIDI3NyA3MDkuNzgxIDI3N1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik03MDkuNzggNjUwLjA2NlY1MDUuNTgxQzcwOC43MzMgNTA1LjU4MSA3MDcuODE2IDUwNS41ODEgNzA2Ljc2OCA1MDUuNDVWNjUwLjA2NkM3MDcuODE2IDY1MC4wNjYgNzA4Ljg2NCA2NTAuMDY2IDcwOS43OCA2NTAuMDY2WiIgZmlsbD0id2hpdGUiLz4KPC9nPgo8L2c+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfNDA4XzIyNSIgeDE9IjcwOS44NDQiIHkxPSI1NTYuODI3IiB4Mj0iNjY3Ljc1MyIgeTI9IjU1Ni44MjciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0id2hpdGUiLz4KPHN0b3Agb2Zmc2V0PSIwLjk2NjciIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuMzIzMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzQwOF8yMjUiPgo8cmVjdCB3aWR0aD0iNzI4LjQ0OCIgaGVpZ2h0PSI0NzAiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNjggMjc3KSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$8([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isTokenPocket])
      )
    };}
  } TokenPocket.__initStatic(); TokenPocket.__initStatic2();

  function _optionalChain$7(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class TrustEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Trust Wallet',
      logo: logos.trust,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        (_optionalChain$7([window, 'optionalAccess', _5 => _5.ethereum, 'optionalAccess', _6 => _6.isTrust]) || _optionalChain$7([window, 'optionalAccess', _7 => _7.ethereum, 'optionalAccess', _8 => _8.isTrustWallet])) &&
        Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!Debug)(?!TrustWallet)(?!MetaMask)(?!PocketUniverse)(?!RevokeCash)/)).length == 1
      )
    };}
  } TrustEVM.__initStatic(); TrustEVM.__initStatic2();

  function _optionalChain$6(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Uniswap extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Uniswap',
      logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQxIiBoZWlnaHQ9IjY0MCIgdmlld0JveD0iMCAwIDY0MSA2NDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0yMjQuNTM0IDEyMy4yMjZDMjE4LjY5MiAxMjIuMzIgMjE4LjQ0NSAxMjIuMjEzIDIyMS4xOTUgMTIxLjc5MUMyMjYuNDY0IDEyMC45OCAyMzguOTA1IDEyMi4wODUgMjQ3LjQ3OSAxMjQuMTIzQzI2Ny40OTQgMTI4Ljg4MSAyODUuNzA3IDE0MS4wNjkgMzA1LjE0OCAxNjIuNzE0TDMxMC4zMTMgMTY4LjQ2NUwzMTcuNzAxIDE2Ny4yNzdDMzQ4LjgyOCAxNjIuMjc1IDM4MC40OTMgMTY2LjI1IDQwNi45NzggMTc4LjQ4NUM0MTQuMjY0IDE4MS44NTEgNDI1Ljc1MiAxODguNTUyIDQyNy4xODcgMTkwLjI3NEM0MjcuNjQ1IDE5MC44MjIgNDI4LjQ4NSAxOTQuMzU1IDQyOS4wNTMgMTk4LjEyNEM0MzEuMDIgMjExLjE2NCA0MzAuMDM2IDIyMS4xNiA0MjYuMDQ3IDIyOC42MjVDNDIzLjg3NyAyMzIuNjg4IDQyMy43NTYgMjMzLjk3NSA0MjUuMjE1IDIzNy40NTJDNDI2LjM4IDI0MC4yMjcgNDI5LjYyNyAyNDIuMjggNDMyLjg0MyAyNDIuMjc2QzQzOS40MjUgMjQyLjI2NyA0NDYuNTA5IDIzMS42MjcgNDQ5Ljc5MSAyMTYuODIzTDQ1MS4wOTUgMjEwLjk0M0w0NTMuNjc4IDIxMy44NjhDNDY3Ljg0NiAyMjkuOTIgNDc4Ljk3NCAyNTEuODExIDQ4MC44ODUgMjY3LjM5M0w0ODEuMzgzIDI3MS40NTVMNDc5LjAwMiAyNjcuNzYyQzQ3NC45MDMgMjYxLjQwNyA0NzAuNzg1IDI1Ny4wOCA0NjUuNTEyIDI1My41OTFDNDU2LjAwNiAyNDcuMzAxIDQ0NS45NTUgMjQ1LjE2MSA0MTkuMzM3IDI0My43NThDMzk1LjI5NiAyNDIuNDkxIDM4MS42OSAyNDAuNDM4IDM2OC4xOTggMjM2LjAzOEMzNDUuMjQ0IDIyOC41NTQgMzMzLjY3MiAyMTguNTg3IDMwNi40MDUgMTgyLjgxMkMyOTQuMjk0IDE2Ni45MjMgMjg2LjgwOCAxNTguMTMxIDI3OS4zNjIgMTUxLjA1MUMyNjIuNDQyIDEzNC45NjQgMjQ1LjgxNiAxMjYuNTI3IDIyNC41MzQgMTIzLjIyNloiIGZpbGw9IiNGRjAwN0EiLz4KPHBhdGggZD0iTTQzMi42MSAxNTguNzA0QzQzMy4yMTUgMTQ4LjA1NyA0MzQuNjU5IDE0MS4wMzMgNDM3LjU2MiAxMzQuNjJDNDM4LjcxMSAxMzIuMDgxIDQzOS43ODggMTMwLjAwMyA0MzkuOTU0IDEzMC4wMDNDNDQwLjEyIDEzMC4wMDMgNDM5LjYyMSAxMzEuODc3IDQzOC44NDQgMTM0LjE2N0M0MzYuNzMzIDE0MC4zOTIgNDM2LjM4NyAxNDguOTA1IDQzNy44NCAxNTguODExQzQzOS42ODYgMTcxLjM3OSA0NDAuNzM1IDE3My4xOTIgNDU0LjAxOSAxODYuNzY5QzQ2MC4yNSAxOTMuMTM3IDQ2Ny40OTcgMjAxLjE2OCA0NzAuMTI0IDIwNC42MTZMNDc0LjkwMSAyMTAuODg2TDQ3MC4xMjQgMjA2LjQwNUM0NjQuMjgyIDIwMC45MjYgNDUwLjg0NyAxOTAuMjQgNDQ3Ljg3OSAxODguNzEyQzQ0NS44OSAxODcuNjg4IDQ0NS41OTQgMTg3LjcwNSA0NDQuMzY2IDE4OC45MjdDNDQzLjIzNSAxOTAuMDUzIDQ0Mi45OTcgMTkxLjc0NCA0NDIuODQgMTk5Ljc0MUM0NDIuNTk2IDIxMi4yMDQgNDQwLjg5NyAyMjAuMjA0IDQzNi43OTcgMjI4LjIwM0M0MzQuNTggMjMyLjUyOSA0MzQuMjMgMjMxLjYwNiA0MzYuMjM3IDIyNi43MjNDNDM3LjczNSAyMjMuMDc3IDQzNy44ODcgMjIxLjQ3NCA0MzcuODc2IDIwOS40MDhDNDM3Ljg1MyAxODUuMTY3IDQzNC45NzUgMTc5LjMzOSA0MTguMDk3IDE2OS4zNTVDNDEzLjgyMSAxNjYuODI2IDQwNi43NzYgMTYzLjE3OCA0MDIuNDQyIDE2MS4yNDlDMzk4LjEwNyAxNTkuMzIgMzk0LjY2NCAxNTcuNjM5IDM5NC43ODkgMTU3LjUxNEMzOTUuMjY3IDE1Ny4wMzggNDExLjcyNyAxNjEuODQyIDQxOC4zNTIgMTY0LjM5QzQyOC4yMDYgMTY4LjE4MSA0MjkuODMzIDE2OC42NzIgNDMxLjAzIDE2OC4yMTVDNDMxLjgzMiAxNjcuOTA5IDQzMi4yMiAxNjUuNTcyIDQzMi42MSAxNTguNzA0WiIgZmlsbD0iI0ZGMDA3QSIvPgo8cGF0aCBkPSJNMjM1Ljg4MyAyMDAuMTc1QzIyNC4wMjIgMTgzLjg0NiAyMTYuNjg0IDE1OC44MDkgMjE4LjI3MiAxNDAuMDkzTDIxOC43NjQgMTM0LjMwMUwyMjEuNDYzIDEzNC43OTRDMjI2LjUzNCAxMzUuNzE5IDIzNS4yNzUgMTM4Ljk3MyAyMzkuMzY5IDE0MS40NTlDMjUwLjYwMiAxNDguMjgxIDI1NS40NjUgMTU3LjI2MyAyNjAuNDEzIDE4MC4zMjhDMjYxLjg2MiAxODcuMDgzIDI2My43NjMgMTk0LjcyOCAyNjQuNjM4IDE5Ny4zMTdDMjY2LjA0NyAyMDEuNDgzIDI3MS4zNjkgMjExLjIxNCAyNzUuNjk2IDIxNy41MzRDMjc4LjgxMyAyMjIuMDg1IDI3Ni43NDMgMjI0LjI0MiAyNjkuODUzIDIyMy42MkMyNTkuMzMxIDIyMi42NyAyNDUuMDc4IDIxMi44MzQgMjM1Ljg4MyAyMDAuMTc1WiIgZmlsbD0iI0ZGMDA3QSIvPgo8cGF0aCBkPSJNNDE4LjIyMyAzMjEuNzA3QzM2Mi43OTMgMjk5LjM4OSAzNDMuMjcxIDI4MC4wMTcgMzQzLjI3MSAyNDcuMzMxQzM0My4yNzEgMjQyLjUyMSAzNDMuNDM3IDIzOC41ODUgMzQzLjYzOCAyMzguNTg1QzM0My44NCAyMzguNTg1IDM0NS45ODUgMjQwLjE3MyAzNDguNDA0IDI0Mi4xMTNDMzU5LjY0NCAyNTEuMTI4IDM3Mi4yMzEgMjU0Ljk3OSA0MDcuMDc2IDI2MC4wNjJDNDI3LjU4IDI2My4wNTQgNDM5LjExOSAyNjUuNDcgNDQ5Ljc2MyAyNjlDNDgzLjU5NSAyODAuMjIgNTA0LjUyNyAzMDIuOTkgNTA5LjUxOCAzMzQuMDA0QzUxMC45NjkgMzQzLjAxNiA1MTAuMTE4IDM1OS45MTUgNTA3Ljc2NiAzNjguODIyQzUwNS45MSAzNzUuODU3IDUwMC4yNDUgMzg4LjUzNyA0OTguNzQyIDM4OS4wMjNDNDk4LjMyNSAzODkuMTU4IDQ5Ny45MTcgMzg3LjU2MiA0OTcuODEgMzg1LjM4OUM0OTcuMjQgMzczLjc0NCA0OTEuMzU1IDM2Mi40MDYgNDgxLjQ3MiAzNTMuOTEzQzQ3MC4yMzUgMzQ0LjI1NyA0NTUuMTM3IDMzNi41NjkgNDE4LjIyMyAzMjEuNzA3WiIgZmlsbD0iI0ZGMDA3QSIvPgo8cGF0aCBkPSJNMzc5LjMxIDMzMC45NzhDMzc4LjYxNSAzMjYuODQ2IDM3Ny40MTEgMzIxLjU2OCAzNzYuNjMzIDMxOS4yNUwzNzUuMjE5IDMxNS4wMzZMMzc3Ljg0NiAzMTcuOTg1QzM4MS40ODEgMzIyLjA2NSAzODQuMzU0IDMyNy4yODcgMzg2Ljc4OSAzMzQuMjQxQzM4OC42NDcgMzM5LjU0OSAzODguODU2IDM0MS4xMjcgMzg4Ljg0MiAzNDkuNzUzQzM4OC44MjggMzU4LjIyMSAzODguNTk2IDM1OS45OTYgMzg2Ljg4IDM2NC43NzNDMzg0LjE3NCAzNzIuMzA3IDM4MC44MTYgMzc3LjY0OSAzNzUuMTgxIDM4My4zODNDMzY1LjA1NiAzOTMuNjg4IDM1Mi4wMzggMzk5LjM5MyAzMzMuMjUzIDQwMS43NkMzMjkuOTg3IDQwMi4xNzEgMzIwLjQ3IDQwMi44NjQgMzEyLjEwMyA0MDMuMjk5QzI5MS4wMTYgNDA0LjM5NSAyNzcuMTM4IDQwNi42NjEgMjY0LjY2OCA0MTEuMDRDMjYyLjg3NSA0MTEuNjcgMjYxLjI3NCA0MTIuMDUyIDI2MS4xMTIgNDExLjg5QzI2MC42MDcgNDExLjM4OCAyNjkuMDk4IDQwNi4zMjYgMjc2LjExMSA0MDIuOTQ4QzI4NS45OTkgMzk4LjE4NSAyOTUuODQyIDM5NS41ODYgMzE3Ljg5NyAzOTEuOTEzQzMyOC43OTIgMzkwLjA5OCAzNDAuMDQzIDM4Ny44OTcgMzQyLjkgMzg3LjAyMUMzNjkuODggMzc4Ljc0OSAzODMuNzQ4IDM1Ny40MDIgMzc5LjMxIDMzMC45NzhaIiBmaWxsPSIjRkYwMDdBIi8+CjxwYXRoIGQ9Ik00MDQuNzE5IDM3Ni4xMDVDMzk3LjM1NSAzNjAuMjczIDM5NS42NjQgMzQ0Ljk4OCAzOTkuNjk4IDMzMC43MzJDNDAwLjEzIDMyOS4yMDkgNDAwLjgyNCAzMjcuOTYyIDQwMS4yNDIgMzI3Ljk2MkM0MDEuNjU5IDMyNy45NjIgNDAzLjM5NyAzMjguOTAyIDQwNS4xMDMgMzMwLjA1QzQwOC40OTcgMzMyLjMzNSA0MTUuMzAzIDMzNi4xODIgNDMzLjQzNyAzNDYuMDY5QzQ1Ni4wNjUgMzU4LjQwNiA0NjguOTY2IDM2Ny45NTkgNDc3Ljc0IDM3OC44NzNDNDg1LjQyMyAzODguNDMyIDQ5MC4xNzggMzk5LjMxOCA0OTIuNDY3IDQxMi41OTNDNDkzLjc2MiA0MjAuMTEzIDQ5My4wMDMgNDM4LjIwNiA0OTEuMDc0IDQ0NS43NzhDNDg0Ljk5IDQ2OS42NTMgNDcwLjg1IDQ4OC40MDYgNDUwLjY4MiA0OTkuMzQ5QzQ0Ny43MjcgNTAwLjk1MiA0NDUuMDc1IDUwMi4yNjkgNDQ0Ljc4OCA1MDIuMjc1QzQ0NC41MDEgNTAyLjI4IDQ0NS41NzcgNDk5LjU0MyA0NDcuMTggNDk2LjE5MUM0NTMuOTY1IDQ4Mi4wMDkgNDU0LjczNyA0NjguMjE0IDQ0OS42MDggNDUyLjg1OUM0NDYuNDY3IDQ0My40NTcgNDQwLjA2NCA0MzEuOTg1IDQyNy4xMzUgNDEyLjU5NkM0MTIuMTAzIDM5MC4wNTQgNDA4LjQxNyAzODQuMDU0IDQwNC43MTkgMzc2LjEwNVoiIGZpbGw9IiNGRjAwN0EiLz4KPHBhdGggZD0iTTE5Ni41MTkgNDYxLjUyNUMyMTcuMDg5IDQ0NC4xNTcgMjQyLjY4MiA0MzEuODE5IDI2NS45OTYgNDI4LjAzMkMyNzYuMDQzIDQyNi4zOTkgMjkyLjc4IDQyNy4wNDcgMzAyLjA4NCA0MjkuNDI4QzMxNi45OTggNDMzLjI0NSAzMzAuMzM4IDQ0MS43OTMgMzM3LjI3NiA0NTEuOTc4QzM0NC4wNTcgNDYxLjkzMiAzNDYuOTY2IDQ3MC42MDYgMzQ5Ljk5NSA0ODkuOTA2QzM1MS4xODkgNDk3LjUxOSAzNTIuNDg5IDUwNS4xNjQgMzUyLjg4MiA1MDYuODk1QzM1NS4xNTYgNTE2Ljg5NyAzNTkuNTgzIDUyNC44OTIgMzY1LjA2NyA1MjguOTA3QzM3My43NzkgNTM1LjI4MyAzODguNzggNTM1LjY4IDQwMy41MzYgNTI5LjkyNEM0MDYuMDQxIDUyOC45NDcgNDA4LjIxNSA1MjguMjcxIDQwOC4zNjggNTI4LjQyNEM0MDguOTAzIDUyOC45NTUgNDAxLjQ3MyA1MzMuOTMgMzk2LjIzIDUzNi41NDhDMzg5LjE3NyA1NDAuMDcxIDM4My41NjggNTQxLjQzNCAzNzYuMTE1IDU0MS40MzRDMzYyLjYgNTQxLjQzNCAzNTEuMzc5IDUzNC41NTggMzQyLjAxNiA1MjAuNTM5QzM0MC4xNzQgNTE3Ljc4IDMzNi4wMzIgNTA5LjUxNiAzMzIuODEzIDUwMi4xNzZDMzIyLjkyOCA0NzkuNjI4IDMxOC4wNDYgNDcyLjc1OSAzMDYuNTY4IDQ2NS4yNDJDMjk2LjU3OSA0NTguNzAxIDI4My42OTcgNDU3LjUzIDI3NC4wMDYgNDYyLjI4MkMyNjEuMjc2IDQ2OC41MjMgMjU3LjcyNCA0ODQuNzkxIDI2Ni44NDIgNDk1LjEwMUMyNzAuNDY1IDQ5OS4xOTggMjc3LjIyMyA1MDIuNzMyIDI4Mi43NDkgNTAzLjQxOUMyOTMuMDg2IDUwNC43MDUgMzAxLjk3IDQ5Ni44NDEgMzAxLjk3IDQ4Ni40MDRDMzAxLjk3IDQ3OS42MjcgMjk5LjM2NSA0NzUuNzYgMjkyLjgwOCA0NzIuODAxQzI4My44NTIgNDY4Ljc2IDI3NC4yMjYgNDczLjQ4MyAyNzQuMjcyIDQ4MS44OTdDMjc0LjI5MiA0ODUuNDg0IDI3NS44NTQgNDg3LjczNyAyNzkuNDUgNDg5LjM2NEMyODEuNzU3IDQ5MC40MDggMjgxLjgxMSA0OTAuNDkxIDI3OS45MjkgNDkwLjFDMjcxLjcxMiA0ODguMzk2IDI2OS43ODcgNDc4LjQ5IDI3Ni4zOTQgNDcxLjkxM0MyODQuMzI2IDQ2NC4wMTggMzAwLjcyOSA0NjcuNTAyIDMwNi4zNjIgNDc4LjI3OUMzMDguNzI4IDQ4Mi44MDUgMzA5LjAwMyA0OTEuODIgMzA2Ljk0IDQ5Ny4yNjRDMzAyLjMyMiA1MDkuNDQ4IDI4OC44NTkgNTE1Ljg1NSAyNzUuMjAxIDUxMi4zNjhDMjY1LjkwMyA1MDkuOTk0IDI2Mi4xMTcgNTA3LjQyNCAyNTAuOTA2IDQ5NS44NzZDMjMxLjQyNSA0NzUuODA5IDIyMy44NjIgNDcxLjkyIDE5NS43NzcgNDY3LjUzNkwxOTAuMzk1IDQ2Ni42OTZMMTk2LjUxOSA0NjEuNTI1WiIgZmlsbD0iI0ZGMDA3QSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTQ5LjYyMDIgMTIuMDAzMUMxMTQuNjc4IDkwLjk2MzggMjE0Ljk3NyAyMTMuOTAxIDIxOS45NTcgMjIwLjc4NEMyMjQuMDY4IDIyNi40NjcgMjIyLjUyMSAyMzEuNTc2IDIxNS40NzggMjM1LjU4QzIxMS41NjEgMjM3LjgwNyAyMDMuNTA4IDI0MC4wNjMgMTk5LjQ3NiAyNDAuMDYzQzE5NC45MTYgMjQwLjA2MyAxODkuNzc5IDIzNy44NjcgMTg2LjAzOCAyMzQuMzE4QzE4My4zOTMgMjMxLjgxIDE3Mi43MjEgMjE1Ljg3NCAxNDguMDg0IDE3Ny42NDZDMTI5LjIzMyAxNDguMzk2IDExMy40NTcgMTI0LjEzMSAxMTMuMDI3IDEyMy43MjVDMTEyLjAzMiAxMjIuNzg1IDExMi4wNDkgMTIyLjgxNyAxNDYuMTYyIDE4My44NTRDMTY3LjU4MiAyMjIuMTgxIDE3NC44MTMgMjM1LjczMSAxNzQuODEzIDIzNy41NDNDMTc0LjgxMyAyNDEuMjI5IDE3My44MDggMjQzLjE2NiAxNjkuMjYxIDI0OC4yMzhDMTYxLjY4MSAyNTYuNjk0IDE1OC4yOTMgMjY2LjE5NSAxNTUuODQ3IDI4NS44NTlDMTUzLjEwNCAzMDcuOTAyIDE0NS4zOTQgMzIzLjQ3MyAxMjQuMDI2IDM1MC4xMjJDMTExLjUxOCAzNjUuNzIyIDEwOS40NzEgMzY4LjU4MSAxMDYuMzE1IDM3NC44NjlDMTAyLjMzOSAzODIuNzg2IDEwMS4yNDYgMzg3LjIyMSAxMDAuODAzIDM5Ny4yMTlDMTAwLjMzNSA0MDcuNzkgMTAxLjI0NyA0MTQuNjE5IDEwNC40NzcgNDI0LjcyNkMxMDcuMzA0IDQzMy41NzUgMTEwLjI1NSA0MzkuNDE3IDExNy44IDQ1MS4xMDRDMTI0LjMxMSA0NjEuMTg4IDEyOC4wNjEgNDY4LjY4MyAxMjguMDYxIDQ3MS42MTRDMTI4LjA2MSA0NzMuOTQ3IDEyOC41MDYgNDczLjk1IDEzOC41OTYgNDcxLjY3MkMxNjIuNzQxIDQ2Ni4yMTkgMTgyLjM0OCA0NTYuNjI5IDE5My4zNzUgNDQ0Ljg3N0MyMDAuMTk5IDQzNy42MDMgMjAxLjgwMSA0MzMuNTg2IDIwMS44NTMgNDIzLjYxOEMyMDEuODg3IDQxNy4wOTggMjAxLjY1OCA0MTUuNzMzIDE5OS44OTYgNDExLjk4MkMxOTcuMDI3IDQwNS44NzcgMTkxLjgwNCA0MDAuODAxIDE4MC4yOTIgMzkyLjkzMkMxNjUuMjA5IDM4Mi42MjEgMTU4Ljc2NyAzNzQuMzIgMTU2Ljk4NyAzNjIuOTA0QzE1NS41MjcgMzUzLjUzNyAxNTcuMjIxIDM0Ni45MjggMTY1LjU2NSAzMjkuNDRDMTc0LjIwMiAzMTEuMzM4IDE3Ni4zNDIgMzAzLjYyNCAxNzcuNzkgMjg1LjM3OEMxNzguNzI1IDI3My41ODkgMTgwLjAyIDI2OC45NCAxODMuNDA3IDI2NS4yMDlDMTg2LjkzOSAyNjEuMzE3IDE5MC4xMTkgMjYwIDE5OC44NjEgMjU4LjgwNUMyMTMuMTEzIDI1Ni44NTggMjIyLjE4OCAyNTMuMTcxIDIyOS42NDggMjQ2LjI5N0MyMzYuMTE5IDI0MC4zMzQgMjM4LjgyNyAyMzQuNTg4IDIzOS4yNDMgMjI1LjkzOEwyMzkuNTU4IDIxOS4zODJMMjM1Ljk0MiAyMTUuMTY2QzIyMi44NDYgMTk5Ljg5NiA0MC44NSAwIDQwLjA0NCAwQzM5Ljg3MTkgMCA0NC4xODEzIDUuNDAxNzggNDkuNjIwMiAxMi4wMDMxWk0xMzUuNDEyIDQwOS4xOEMxMzguMzczIDQwMy45MzcgMTM2LjggMzk3LjE5NSAxMzEuODQ3IDM5My45MDJDMTI3LjE2NyAzOTAuNzkgMTE5Ljg5NyAzOTIuMjU2IDExOS44OTcgMzk2LjMxMUMxMTkuODk3IDM5Ny41NDggMTIwLjU4MiAzOTguNDQ5IDEyMi4xMjQgMzk5LjI0M0MxMjQuNzIgNDAwLjU3OSAxMjQuOTA5IDQwMi4wODEgMTIyLjg2NiA0MDUuMTUyQzEyMC43OTcgNDA4LjI2MiAxMjAuOTY0IDQxMC45OTYgMTIzLjMzNyA0MTIuODU0QzEyNy4xNjIgNDE1Ljg0OSAxMzIuNTc2IDQxNC4yMDIgMTM1LjQxMiA0MDkuMThaIiBmaWxsPSIjRkYwMDdBIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjQ4LjU1MiAyNjIuMjQ0QzI0MS44NjIgMjY0LjI5OSAyMzUuMzU4IDI3MS4zOSAyMzMuMzQ0IDI3OC44MjZDMjMyLjExNiAyODMuMzYyIDIzMi44MTMgMjkxLjMxOSAyMzQuNjUzIDI5My43NzZDMjM3LjYyNSAyOTcuNzQ1IDI0MC40OTkgMjk4Ljc5MSAyNDguMjgyIDI5OC43MzZDMjYzLjUxOCAyOTguNjMgMjc2Ljc2NCAyOTIuMDk1IDI3OC4zMDQgMjgzLjkyNUMyNzkuNTY3IDI3Ny4yMjkgMjczLjc0OSAyNjcuOTQ4IDI2NS43MzYgMjYzLjg3NEMyNjEuNjAxIDI2MS43NzIgMjUyLjgwNyAyNjAuOTM4IDI0OC41NTIgMjYyLjI0NFpNMjY2LjM2NCAyNzYuMTcyQzI2OC43MTQgMjcyLjgzNCAyNjcuNjg2IDI2OS4yMjUgMjYzLjY5IDI2Ni43ODVDMjU2LjA4IDI2Mi4xMzggMjQ0LjU3MSAyNjUuOTgzIDI0NC41NzEgMjczLjE3M0MyNDQuNTcxIDI3Ni43NTIgMjUwLjU3MiAyODAuNjU2IDI1Ni4wNzQgMjgwLjY1NkMyNTkuNzM1IDI4MC42NTYgMjY0Ljc0NiAyNzguNDczIDI2Ni4zNjQgMjc2LjE3MloiIGZpbGw9IiNGRjAwN0EiLz4KPC9zdmc+Cg==",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.getEip6963Provider = ()=>{
      return window['_eip6963Providers'] ? Object.values(window['_eip6963Providers']).find((provider)=>{
        return _optionalChain$6([provider, 'optionalAccess', _4 => _4.isUniswapWallet])
      }) : undefined
    };}

    static __initStatic3() {this.isAvailable = async()=>{
      return(
        Uniswap.getEip6963Provider() ||
        _optionalChain$6([window, 'optionalAccess', _5 => _5.ethereum, 'optionalAccess', _6 => _6.isUniswapWallet])
      )
    };}

    getProvider() {
      return Uniswap.getEip6963Provider() || (_optionalChain$6([window, 'optionalAccess', _7 => _7.ethereum, 'optionalAccess', _8 => _8.isUniswapWallet]) && _optionalChain$6([window, 'optionalAccess', _9 => _9.ethereum]))
    }
  } Uniswap.__initStatic(); Uniswap.__initStatic2(); Uniswap.__initStatic3();

  const transactionApiBlockchainNames = {
    'ethereum': 'mainnet',
    'bsc': 'bsc',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'base': 'base',
    'avalanche': 'avalanche',
    'gnosis': 'gnosis-chain',
    'optimism': 'optimism',
    'worldchain': 'optimism',
  };

  const explorerBlockchainNames = {
    'ethereum': 'eth',
    'bsc': 'bnb',
    'polygon': 'matic',
    'arbitrum': 'arb1',
    'base': 'base',
    'avalanche': 'avax',
    'gnosis': 'gno',
    'optimism': 'oeth',
    'worldchain': 'oeth',
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
        transactionCount = parseInt((await web3ClientEvm.request({
          blockchain: this.blockchain,
          address: this.address,
          api: [{"inputs":[],"name":"nonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
          method: 'nonce',
        })).toString(), 10);
      }
      return transactionCount
    }

    async retrieveTransaction({ blockchain, tx }) {
      const provider = await web3ClientEvm.getProvider(blockchain);
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
    const provider = await web3ClientEvm.getProvider(blockchain);
    const code = await provider.getCode(address);
    return (code != '0x')
  };

  const identifySmartContractWallet = async (blockchain, address)=>{
    let name; 
    try {
      name = await web3ClientEvm.request({
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

  function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const sendTransaction$1 = async ({ transaction, wallet })=> {
    transaction = new Transaction(transaction);
    await transaction.prepare({ wallet });
    let transactionCount = await web3ClientEvm.request({ blockchain: transaction.blockchain, method: 'transactionCount', address: transaction.from });
    transaction.nonce = transactionCount;
    await submit$1({ transaction, wallet }).then(async (response)=>{
      if(typeof response == 'string') {
        let blockchain = Blockchains__default['default'][transaction.blockchain];
        transaction.id = response;
        transaction.url = blockchain.explorerUrlFor({ transaction });
        if (transaction.sent) transaction.sent(transaction);
        let sentTransaction = await retrieveTransaction(transaction.id, transaction.blockchain);
        transaction.nonce = sentTransaction.nonce || transactionCount;
        if(!sentTransaction) {
          transaction._failed = true;
          if(transaction.failed) transaction.failed(transaction, 'Error retrieving transaction');
        } else {
          retrieveConfirmedTransaction$1(sentTransaction).then(() => {
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
        }
      } else {
        throw(response)
      }
    });
    return transaction
  };

  const retrieveConfirmedTransaction$1 = (sentTransaction)=>{
    return new Promise((resolve, reject)=>{
      try {
        sentTransaction.wait(1).then(resolve).catch((error)=>{
          if(
            (error && _optionalChain$5([error, 'optionalAccess', _ => _.stack, 'optionalAccess', _2 => _2.match, 'call', _3 => _3('JSON-RPC error')])) ||
            (error && error.toString().match('undefined'))
          ) {
            setTimeout(()=>{
              retrieveConfirmedTransaction$1(sentTransaction)
                .then(resolve)
                .catch(reject);
            }, 500);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        if(
          (error && _optionalChain$5([error, 'optionalAccess', _4 => _4.stack, 'optionalAccess', _5 => _5.match, 'call', _6 => _6('JSON-RPC error')])) ||
          (error && error.toString().match('undefined'))
        ) {
          setTimeout(()=>{
              retrieveConfirmedTransaction$1(sentTransaction)
                .then(resolve)
                .catch(reject);
            }, 500);
        } else {
          reject(error);
        }
      } 
    })
  };

  const retrieveTransaction = (tx, blockchain)=>{
    return new Promise(async(resolve, reject)=>{
      try {
        let sentTransaction;
        const provider = await web3ClientEvm.getProvider(blockchain);
        sentTransaction = await provider.getTransaction(tx);
        const maxRetries = 120;
        let attempt = 1;
        while (attempt <= maxRetries && !sentTransaction) {
          sentTransaction = await provider.getTransaction(tx);
          await (new Promise((resolve)=>setTimeout(resolve, 5000)));
          attempt++;
        }
        resolve(sentTransaction);
      } catch (error) {
        if(
          (error && _optionalChain$5([error, 'optionalAccess', _7 => _7.stack, 'optionalAccess', _8 => _8.match, 'call', _9 => _9('JSON-RPC error')])) ||
          (error && error.toString().match('undefined'))
        ) {
          setTimeout(()=>{
            retrieveTransaction(tx, blockchain)
              .then(resolve)
              .catch(reject);
          }, 500);
        } else {
          reject(error);
        }
      }
    })
  };

  const submit$1 = ({ transaction, wallet }) => {
    if(transaction.method) {
      return submitContractInteraction$1({ transaction, wallet })
    } else {
      return submitSimpleTransfer$1({ transaction, wallet })
    }
  };

  const submitContractInteraction$1 = async ({ transaction, wallet })=>{
    const provider = await web3ClientEvm.getProvider(transaction.blockchain);
    const blockchain = Blockchains__default['default'][transaction.blockchain];
    let gas;
    try {
      gas = await web3ClientEvm.estimate(transaction);
      gas = gas.add(gas.div(10));
    } catch (e2) {}
    const gasPrice = await provider.getGasPrice();
    return wallet.signClient.request({
      topic: wallet.session.topic,
      chainId: `${blockchain.namespace}:${blockchain.networkId}`,
      request: {
        method: 'eth_sendTransaction',
        params: [{
          from: transaction.from,
          to: transaction.to,
          value: transaction.value ? ethers.ethers.BigNumber.from(transaction.value.toString()).toHexString() : undefined,
          data: await transaction.getData(),
          gas: _optionalChain$5([gas, 'optionalAccess', _10 => _10.toHexString, 'call', _11 => _11()]),
          gasLimit: _optionalChain$5([gas, 'optionalAccess', _12 => _12.toHexString, 'call', _13 => _13()]),
          gasPrice: gasPrice.toHexString(),
          nonce: ethers.ethers.utils.hexlify(transaction.nonce),
        }]
      }
    }).catch((e)=>{console.log('ERROR', e);})
  };

  const submitSimpleTransfer$1 = async ({ transaction, wallet })=>{
    const provider = await web3ClientEvm.getProvider(transaction.blockchain);
    let blockchain = Blockchains__default['default'][transaction.blockchain];
    let gas;
    try {
      gas = await web3ClientEvm.estimate(transaction);
      gas = gas.add(gas.div(10));
    } catch (e3) {}
    const gasPrice = await provider.getGasPrice();
    return wallet.signClient.request({
      topic: wallet.session.topic,
      chainId: `${blockchain.namespace}:${blockchain.networkId}`,
      request: {
        method: 'eth_sendTransaction',
        params: [{
          from: transaction.from,
          to: transaction.to,
          value: transaction.value ? ethers.ethers.BigNumber.from(transaction.value.toString()).toHexString() : undefined,
          data: '0x0',
          gas: _optionalChain$5([gas, 'optionalAccess', _14 => _14.toHexString, 'call', _15 => _15()]),
          gasLimit: _optionalChain$5([gas, 'optionalAccess', _16 => _16.toHexString, 'call', _17 => _17()]),
          gasPrice: _optionalChain$5([gasPrice, 'optionalAccess', _18 => _18.toHexString, 'call', _19 => _19()]),
          nonce: ethers.ethers.utils.hexlify(transaction.nonce)
        }]
      }
    }).catch((e)=>{console.log('ERROR', e);})
  };

  function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const KEY = 'depay:wallets:wc2';

  const DEFAULT_CONFIGURATION = {
    events: ['accountsChanged'],
    methods: [
      "eth_sendTransaction",
      "personal_sign",
      "eth_signTypedData",
      "eth_signTypedData_v4",
    ]
  };

  const getConnectedInstance$1 = async()=>{
    if(await WalletConnectV2.isAvailable()) { return new WalletConnectV2() }
  };

  const getLastSession = async(walletName)=>{
    if(!localStorage[KEY+":projectId"]) { return }
    if(walletName !== localStorage[KEY+":lastSessionWalletName"]) { return }
    let signClient = await getSignClient();
    let existingSessions;
    try { existingSessions = signClient.find(getWalletConnectV2Config(walletName)); } catch (e) {}
    const lastSession = existingSessions ? existingSessions[existingSessions.length-1] : undefined;
    if(lastSession && localStorage[KEY+":lastExpiredSessionTopic"] !== lastSession.topic && lastSession.expiry > Math.ceil(Date.now()/1000)) {
      const result = await Promise.race([signClient.ping({ topic: lastSession.topic }), new Promise((resolve)=>setTimeout(resolve, 1500))]);
      if(result) {
        return lastSession
      } else {
        localStorage[KEY+":lastExpiredSessionTopic"] = lastSession.topic;
        return
      }
    }
  };

  const getWalletConnectV2Config = (walletName)=>{
    const methods = DEFAULT_CONFIGURATION.methods;
    const events = DEFAULT_CONFIGURATION.events;

    let requiredNamespaces = {};
    requiredNamespaces['eip155'] = {
      chains: [`eip155:1`],
    };
    if(requiredNamespaces['eip155']) {
      requiredNamespaces['eip155'].methods = methods;
      requiredNamespaces['eip155'].events = events;
    }

    let optionalNamespaces = {};
    optionalNamespaces['eip155'] = {
      chains: supported$1.evm.map((blockchain)=>`${Blockchains__default['default'][blockchain].namespace}:${Blockchains__default['default'][blockchain].networkId}`),
    };
    if(_optionalChain$4([optionalNamespaces, 'optionalAccess', _ => _.eip155]) && _optionalChain$4([optionalNamespaces, 'optionalAccess', _2 => _2.eip155, 'optionalAccess', _3 => _3.chains, 'optionalAccess', _4 => _4.length])) {
      optionalNamespaces['eip155'].methods = methods;
      optionalNamespaces['eip155'].events = events;
    }

    return { requiredNamespaces, optionalNamespaces }
  };

  const getSignClient = ()=>{
    if(window.getSignClientPromise) { return window.getSignClientPromise }
    window.getSignClientPromise = new Promise(async(resolve)=>{
      const signClient = await walletconnectV2.SignClient.init({
        projectId: localStorage[KEY+":projectId"],
        metadata: {
          name: document.title || 'dApp',
          description: _optionalChain$4([document, 'access', _5 => _5.querySelector, 'call', _6 => _6('meta[name="description"]'), 'optionalAccess', _7 => _7.getAttribute, 'call', _8 => _8('content')]) || document.title || 'dApp',
          url: location.href,
          icons: [_optionalChain$4([document, 'access', _9 => _9.querySelector, 'call', _10 => _10("link[rel~='icon'], link[rel~='shortcut icon']"), 'optionalAccess', _11 => _11.href]) || `${location.origin}/favicon.ico`]
        }
      });
      resolve(signClient);
    });

    return window.getSignClientPromise
  };

  class WalletConnectV2 {

    static __initStatic() {this.info = {
      name: 'WalletConnect V2',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0nMS4wJyBlbmNvZGluZz0ndXRmLTgnPz48IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjUuNC4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAtLT48c3ZnIHZlcnNpb249JzEuMScgaWQ9J0xheWVyXzEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNTAwIDUwMCcgc3R5bGU9J2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTAwIDUwMDsnIHhtbDpzcGFjZT0ncHJlc2VydmUnPjxzdHlsZSB0eXBlPSd0ZXh0L2Nzcyc+IC5zdDB7ZmlsbDojNTk5MUNEO30KPC9zdHlsZT48ZyBpZD0nUGFnZS0xJz48ZyBpZD0nd2FsbGV0Y29ubmVjdC1sb2dvLWFsdCc+PHBhdGggaWQ9J1dhbGxldENvbm5lY3QnIGNsYXNzPSdzdDAnIGQ9J00xMDIuNywxNjJjODEuNS03OS44LDIxMy42LTc5LjgsMjk1LjEsMGw5LjgsOS42YzQuMSw0LDQuMSwxMC41LDAsMTQuNEwzNzQsMjE4LjkgYy0yLDItNS4zLDItNy40LDBsLTEzLjUtMTMuMmMtNTYuOC01NS43LTE0OS01NS43LTIwNS44LDBsLTE0LjUsMTQuMWMtMiwyLTUuMywyLTcuNCwwTDkxLjksMTg3Yy00LjEtNC00LjEtMTAuNSwwLTE0LjQgTDEwMi43LDE2MnogTTQ2Ny4xLDIyOS45bDI5LjksMjkuMmM0LjEsNCw0LjEsMTAuNSwwLDE0LjRMMzYyLjMsNDA1LjRjLTQuMSw0LTEwLjcsNC0xNC44LDBjMCwwLDAsMCwwLDBMMjUyLDMxMS45IGMtMS0xLTIuNy0xLTMuNywwaDBsLTk1LjUsOTMuNWMtNC4xLDQtMTAuNyw0LTE0LjgsMGMwLDAsMCwwLDAsMEwzLjQsMjczLjZjLTQuMS00LTQuMS0xMC41LDAtMTQuNGwyOS45LTI5LjIgYzQuMS00LDEwLjctNCwxNC44LDBsOTUuNSw5My41YzEsMSwyLjcsMSwzLjcsMGMwLDAsMCwwLDAsMGw5NS41LTkzLjVjNC4xLTQsMTAuNy00LDE0LjgsMGMwLDAsMCwwLDAsMGw5NS41LDkzLjUgYzEsMSwyLjcsMSwzLjcsMGw5NS41LTkzLjVDNDU2LjQsMjI1LjksNDYzLDIyNS45LDQ2Ny4xLDIyOS45eicvPjwvZz48L2c+PC9zdmc+Cg==",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async(options)=>{ 
      return !! await getLastSession(_optionalChain$4([options, 'optionalAccess', _13 => _13.walletName]))
    };}

    constructor() {
      this.name = (localStorage[KEY+':name'] && localStorage[KEY+':name'] != undefined) ? localStorage[KEY+':name'] : this.constructor.info.name;
      this.logo = (localStorage[KEY+':logo'] && localStorage[KEY+':logo'] != undefined) ? localStorage[KEY+':logo'] : this.constructor.info.logo;
      this.sendTransaction = (transaction)=>{
        return sendTransaction$1({
          wallet: this,
          transaction
        })
      };
    }

    async account() {
      if(_optionalChain$4([this, 'access', _14 => _14.session, 'optionalAccess', _15 => _15.namespaces, 'optionalAccess', _16 => _16.eip155, 'optionalAccess', _17 => _17.accounts, 'optionalAccess', _18 => _18.length])) {
        return this.session.namespaces.eip155.accounts[0].split(':')[2]
      }
    }

    async setSessionBlockchains() {
      if(!this.session || (!_optionalChain$4([this, 'access', _19 => _19.session, 'optionalAccess', _20 => _20.namespaces, 'optionalAccess', _21 => _21.eip155]) && !_optionalChain$4([this, 'access', _22 => _22.session, 'optionalAccess', _23 => _23.optionalNamespaces, 'optionalAccess', _24 => _24.eip155]))) { return }
      if(this.session.namespaces.eip155.chains) {
        this.blockchains = this.session.namespaces.eip155.chains.map((chainIdentifier)=>_optionalChain$4([Blockchains__default['default'], 'access', _25 => _25.findByNetworkId, 'call', _26 => _26(chainIdentifier.split(':')[1]), 'optionalAccess', _27 => _27.name])).filter(Boolean);
      } else if(this.session.namespaces.eip155.accounts) {
        this.blockchains = this.session.namespaces.eip155.accounts.map((accountIdentifier)=>_optionalChain$4([Blockchains__default['default'], 'access', _28 => _28.findByNetworkId, 'call', _29 => _29(accountIdentifier.split(':')[1]), 'optionalAccess', _30 => _30.name])).filter(Boolean);
      }
    }

    async connect(options) {
      
      let connect = (options && options.connect) ? options.connect : ({uri})=>{};
      
      try {

        this.walletName = _optionalChain$4([options, 'optionalAccess', _31 => _31.name]);

        // delete localStorage[`wc@2:client:0.3//session`] // DELETE WC SESSIONS
        this.signClient = await getSignClient();

        this.signClient.on("session_delete", (session)=> {
          if(_optionalChain$4([session, 'optionalAccess', _32 => _32.topic]) === _optionalChain$4([this, 'access', _33 => _33.session, 'optionalAccess', _34 => _34.topic])) {
            localStorage[KEY+':name'] = undefined;
            localStorage[KEY+':logo'] = undefined;
            this.signClient = undefined;
            this.session = undefined;
          }
        });

        this.signClient.on("session_update", async(session)=> {
          if(_optionalChain$4([session, 'optionalAccess', _35 => _35.topic]) === _optionalChain$4([this, 'access', _36 => _36.session, 'optionalAccess', _37 => _37.topic])) {
            this.session = this.signClient.session.get(session.topic);
            await this.setSessionBlockchains();
          }
        });

        this.signClient.on("session_event", (event)=> {
          if(_optionalChain$4([event, 'optionalAccess', _38 => _38.topic]) === _optionalChain$4([this, 'access', _39 => _39.session, 'optionalAccess', _40 => _40.topic])) {}
        });

        const connectWallet = async()=>{
          const { uri, approval } = await this.signClient.connect(getWalletConnectV2Config(this.walletName));
          await connect({ uri });
          this.session = await approval();
          localStorage[KEY+":lastSessionWalletName"] = this.walletName;
          await new Promise(resolve=>setTimeout(resolve, 500)); // to prevent race condition within WalletConnect
        };

        const lastSession = _optionalChain$4([this, 'optionalAccess', _41 => _41.walletName, 'optionalAccess', _42 => _42.length]) ? await getLastSession(this.walletName) : undefined;
        if(lastSession) {
          this.session = lastSession;
        } else {
          await connectWallet();
        }

        let meta = _optionalChain$4([this, 'access', _43 => _43.session, 'optionalAccess', _44 => _44.peer, 'optionalAccess', _45 => _45.metadata]);
        if(meta && meta.name) {
          this.name = meta.name;
          localStorage[KEY+':name'] = meta.name;
          if(_optionalChain$4([meta, 'optionalAccess', _46 => _46.icons]) && meta.icons.length) {
            this.logo = meta.icons[0];
            localStorage[KEY+':logo'] = this.logo;
          }
        }
        if(_optionalChain$4([options, 'optionalAccess', _47 => _47.name])) { localStorage[KEY+':name'] = this.name = options.name; }
        if(_optionalChain$4([options, 'optionalAccess', _48 => _48.logo])) { localStorage[KEY+':logo'] = this.logo = options.logo; }

        await this.setSessionBlockchains();

        return await this.account()

      } catch (error) {
        console.log('WALLETCONNECT ERROR', error);
      }
    }

    async connectedTo(input) {
      if(input) {
        return this.blockchains.indexOf(input) > -1
      } else {
        return this.blockchains
      }
    }

    getValidChainId() {
      return `eip155:${Blockchains__default['default'][this.blockchains[0]].networkId}`
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

    on(event, callback) {
      let internalCallback;
      switch (event) {
        case 'account':
          internalCallback = async(event)=> {
            if(_optionalChain$4([event, 'optionalAccess', _49 => _49.topic]) === _optionalChain$4([this, 'access', _50 => _50.session, 'optionalAccess', _51 => _51.topic]) && event.params.event.name === 'accountsChanged') {
              callback(await this.account());
            }
          };
          this.signClient.on("session_event", internalCallback);
          break
      }
      return internalCallback
    }

    off(event, callback) {
      switch (event) {
        case 'account':
          this.signClient.off("session_event", callback);
          break
      }
    }

    async transactionCount({ blockchain, address }) {
      const smartContractWallet = await getSmartContractWallet(blockchain, address);
      if(smartContractWallet) {
        return await smartContractWallet.transactionCount()
      } else {
        return await web3ClientEvm.request({ blockchain, method: 'transactionCount', address })
      }
    }

    async sign(message) {
      if(typeof message === 'object') {
        let account = await this.account();
        let signature = await this.signClient.request({
          topic: this.session.topic,
          chainId: this.getValidChainId(),
          request:{
            method: 'eth_signTypedData_v4',
            params: [account, JSON.stringify(message)],
          }
        });
        return signature
      } else if (typeof message === 'string') {
        const address = await this.account();
        const params = [ethers.ethers.utils.hexlify(ethers.ethers.utils.toUtf8Bytes(message)), address];
        let signature = await this.signClient.request({
          topic: this.session.topic,
          chainId: this.getValidChainId(),
          request:{
            method: 'personal_sign',
            params
          }
        });
        if(typeof signature == 'object') {
          signature = ethers.ethers.utils.hexlify(signature);
        }
        return signature
      }
    }
  } WalletConnectV2.__initStatic(); WalletConnectV2.__initStatic2();

  WalletConnectV2.getConnectedInstance = getConnectedInstance$1;

  function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  const sendTransaction = async ({ transaction, wallet })=> {
    transaction = new Transaction(transaction);
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      await wallet.switchTo(transaction.blockchain);
    }
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      throw({ code: 'WRONG_NETWORK' })
    }
    await transaction.prepare({ wallet });
    let provider = new ethers.ethers.providers.Web3Provider(wallet.connector, 'any');
    let signer = provider.getSigner(0);
    await submit({ transaction, provider, signer }).then((sentTransaction)=>{
      if (sentTransaction) {
        transaction.id = sentTransaction.hash;
        transaction.nonce = sentTransaction.nonce;
        transaction.url = Blockchains__default['default'].findByName(transaction.blockchain).explorerUrlFor({ transaction });
        if (transaction.sent) transaction.sent(transaction);
        retrieveConfirmedTransaction(sentTransaction).then(() => {
          transaction._succeeded = true;
          if (transaction.succeeded) transaction.succeeded(transaction);
        }).catch((error)=>{
          if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
            if(error.replacement && error.replacement.hash) {
              transaction.id = error.replacement.hash;
              transaction.url = Blockchains__default['default'].findByName(transaction.blockchain).explorerUrlFor({ transaction });
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

  const retrieveConfirmedTransaction = (sentTransaction)=>{
    return new Promise((resolve, reject)=>{
      try {

        sentTransaction.wait(1).then(resolve).catch((error)=>{
          if(
            (error && _optionalChain$3([error, 'optionalAccess', _ => _.stack, 'optionalAccess', _2 => _2.match, 'call', _3 => _3('JSON-RPC error')])) ||
            (error && error.toString().match('undefined'))
          ) {
            setTimeout(()=>{
              retrieveConfirmedTransaction(sentTransaction)
                .then(resolve)
                .catch(reject);
            }, 500);
          } else {
            reject(error);
          }
        });
      } catch(error) {
        if(
          (error && _optionalChain$3([error, 'optionalAccess', _4 => _4.stack, 'optionalAccess', _5 => _5.match, 'call', _6 => _6('JSON-RPC error')])) ||
          (error && error.toString().match('undefined'))
        ) {
          setTimeout(()=>{
            retrieveConfirmedTransaction(sentTransaction)
              .then(resolve)
              .catch(reject);
          }, 500);
        } else {
          reject(error);
        }
      }
    })
  };

  const submit = ({ transaction, provider, signer }) => {
    if(transaction.method) {
      return submitContractInteraction({ transaction, signer, provider })
    } else {
      return submitSimpleTransfer({ transaction, signer })
    }
  };

  const submitContractInteraction = ({ transaction, signer, provider })=>{
    let contract = new ethers.ethers.Contract(transaction.to, transaction.api, provider);
    let contractArguments = transaction.getContractArguments({ contract });
    let method = contract.connect(signer)[transaction.getMethodNameWithSignature()];
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

  function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const getConnectedInstance = ()=>{
    return window._connectedWalletLinkInstance
  };

  const setConnectedInstance = (value)=>{
    window._connectedWalletLinkInstance = value;
  };

  class WalletLink {

    static __initStatic() {this.info = {
      name: 'Coinbase',
      logo: logos.coinbase,
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return getConnectedInstance() != undefined };}

    constructor() {
      this.name = this.constructor.info.name;
      this.logo = this.constructor.info.logo;
      this.blockchains = this.constructor.info.blockchains;
      // RESET WalletLink (do not recover connections!)
      Object.keys(localStorage).forEach((key)=>{
        if(key.match("-walletlink:https://www.walletlink.org")) {
          delete localStorage[key];  
        }
      });
      this.connector = WalletLink.instance || this.newWalletLinkInstance();
      this.sendTransaction = (transaction)=>{
        return sendTransaction({
          wallet: this,
          transaction
        })
      };
    }

    newWalletLinkInstance() {
      let instance = new coinbaseWalletSdk.CoinbaseWalletSDK({ enableMobileWalletLink: true }).makeWeb3Provider();
      return instance
    }

    async account() {
      if(this.connectedAccounts == undefined) { return }
      return ethers.ethers.utils.getAddress(this.connectedAccounts[0])
    }

    async connect(options) {

      let connect = (options && options.connect) ? options.connect : ({uri})=>{};
      await connect({ uri: this.connector.qrUrl });
      
      _optionalChain$2([document, 'access', _ => _.querySelector, 'call', _2 => _2('.-cbwsdk-css-reset'), 'optionalAccess', _3 => _3.setAttribute, 'call', _4 => _4('style', 'display: none;')]);
      _optionalChain$2([document, 'access', _5 => _5.querySelector, 'call', _6 => _6('.-cbwsdk-extension-dialog-container'), 'optionalAccess', _7 => _7.setAttribute, 'call', _8 => _8('style', 'display: none;')]);
      setTimeout(()=>{
        if(_optionalChain$2([this, 'optionalAccess', _9 => _9.connector, 'optionalAccess', _10 => _10._relay, 'optionalAccess', _11 => _11.ui, 'optionalAccess', _12 => _12.linkFlow, 'optionalAccess', _13 => _13.isOpen])){
          this.connector._relay.ui.linkFlow.isOpen = false;
        }
      }, 10);

      let relay = await this.connector._relayProvider();
      relay.setConnectDisabled(false);

      let accounts = await this.connector.enable();
      if(accounts instanceof Array && accounts.length) {
        setConnectedInstance(this);
      }
      accounts = accounts.map((account)=>ethers.ethers.utils.getAddress(account));
      this.connectedAccounts = accounts;
      this.connectedChainId = await this.connector.getChainId();
      return accounts[0]
    }

    async connectedTo(input) {
      let chainId = await this.connector.getChainId();
      const blockchain = Blockchains__default['default'].findByNetworkId(chainId);
      if(!blockchain) { return false }
      if(input) {
        return input === blockchain.name
      } else {
        return blockchain.name
      }
    }

    switchTo(blockchainName) {
      return new Promise((resolve, reject)=>{
        const blockchain = Blockchains__default['default'].findByName(blockchainName);
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
        const blockchain = Blockchains__default['default'].findByName(blockchainName);
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
          internalCallback = (accounts) => callback(ethers.ethers.utils.getAddress(accounts[0]));
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
      return web3ClientEvm.request({ blockchain, method: 'transactionCount', address })
    }

    async sign(message) {
      if(typeof message === 'object') {
        let provider = this.connector;
        let account = await this.account();
        if((await this.connectedTo(Blockchains__default['default'].findByNetworkId(message.domain.chainId).name)) === false) {
          throw({ code: 'WRONG_NETWORK' })
        }
        let signature = await provider.request({
          method: 'eth_signTypedData_v4',
          params: [account, message],
          from: account,
        });
        return signature
      } else if (typeof message === 'string') {
        await this.account();
        let provider = new ethers.ethers.providers.Web3Provider(this.connector, 'any');
        let signer = provider.getSigner(0);
        let signature = await signer.signMessage(message);
        return signature
      }
    }
  } WalletLink.__initStatic(); WalletLink.__initStatic2();

  WalletLink.getConnectedInstance = getConnectedInstance;
  WalletLink.setConnectedInstance = setConnectedInstance;

  function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  class WorldApp {

    static __initStatic() {this.info = {
      name: 'World App',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMzIDMyIj4KICA8Zz4KICAgIDxnPgogICAgICA8cmVjdCBmaWxsPSIjMDAwMDAwIiB3aWR0aD0iMzMiIGhlaWdodD0iMzIiLz4KICAgIDwvZz4KICAgIDxnPgogICAgICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMjQuNywxMi41Yy0uNS0xLjEtMS4xLTItMS45LTIuOHMtMS44LTEuNS0yLjgtMS45Yy0xLjEtLjUtMi4zLS43LTMuNS0uN3MtMi40LjItMy41LjdjLTEuMS41LTIsMS4xLTIuOCwxLjlzLTEuNSwxLjgtMS45LDIuOGMtLjUsMS4xLS43LDIuMy0uNywzLjVzLjIsMi40LjcsMy41LDEuMSwyLDEuOSwyLjhjLjguOCwxLjgsMS41LDIuOCwxLjksMS4xLjUsMi4zLjcsMy41LjdzMi40LS4yLDMuNS0uNywyLTEuMSwyLjgtMS45LDEuNS0xLjgsMS45LTIuOGMuNS0xLjEuNy0yLjMuNy0zLjVzLS4yLTIuNC0uNy0zLjVaTTEzLjUsMTUuMmMuNC0xLjQsMS43LTIuNSwzLjItMi41aDYuMmMuNC44LjcsMS42LjcsMi41aC0xMC4xWk0yMy43LDE2LjhjMCwuOS0uNCwxLjctLjcsMi41aC02LjJjLTEuNSwwLTIuOC0xLjEtMy4yLTIuNWgxMC4xWk0xMS40LDEwLjljMS40LTEuNCwzLjItMi4xLDUuMS0yLjFzMy44LjcsNS4xLDIuMWguMWMwLC4xLTUsLjEtNSwuMS0xLjMsMC0yLjYuNS0zLjUsMS41LS43LjctMS4yLDEuNy0xLjQsMi43aC0yLjVjLjItMS42LjktMy4xLDIuMS00LjNaTTE2LjUsMjMuMmMtMS45LDAtMy44LS43LTUuMS0yLjEtMS4yLTEuMi0xLjktMi43LTIuMS00LjNoMi41Yy4yLDEsLjcsMS45LDEuNCwyLjcuOS45LDIuMiwxLjUsMy41LDEuNWg1LS4xYy0xLjQsMS41LTMuMiwyLjItNS4xLDIuMloiLz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=",
      blockchains: ["worldchain"]
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return Boolean(
        _optionalChain$1([window, 'optionalAccess', _2 => _2.WorldApp])
      )
    };}
    
    constructor () {
      worldcoinPrecompiled.MiniKit.install();
      this.name = this.constructor.info.name;
      this.logo = this.constructor.info.logo;
      this.blockchains = this.constructor.info.blockchains;
      this.sendTransaction = this.sendTransaction;
    }

    sendTransaction(transaction) {
      console.log('sendTransaction', transaction);
      transaction = new Transaction(transaction);
      console.log('after transaction wrapping transaction.sent', transaction.sent);
      console.log('after transaction wrapping transaction.succeeded', transaction.succeeded);
      console.log('after transaction wrapping transaction.failed', transaction.failed);

      return new Promise(async(resolve, reject)=>{
        await transaction.prepare({ wallet: this });
        console.log('after prepare transaction', transaction);
        transaction.nonce = (await this.transactionCount({ blockchain: 'worldchain', address: transaction.from })).toString();
        console.log('after nonce transaction', transaction);

        console.log('before MiniKit.subscribe');
        worldcoinPrecompiled.MiniKit.subscribe(worldcoinPrecompiled.ResponseEvent.MiniAppSendTransaction, (payload)=> {
          console.log('payload', payload);
          if (payload.status == "success") {
            console.log('before transaction.accepted', transaction);
            if (transaction.accepted) { transaction.accepted(); }
            console.log('after transaction.accepted', transaction);
            this.fetchTransaction(transaction, payload).then((transactionHash)=>{
              if(transactionHash) {
                resolve(transaction);
              } else {
                reject('Fetching transaction failed!');
              }
            }).catch(reject);
          } else {
            reject('Submitting transaction failed!');
          }
        });
        console.log('after MiniKit.subscribe');

        console.log('before MiniKit.commands.sendTransaction', {
          transaction: [
            {
              address: transaction.to,
              abi: _optionalChain$1([transaction, 'access', _3 => _3.api, 'optionalAccess', _4 => _4.filter, 'call', _5 => _5((fragment)=>fragment.name === transaction.method && _optionalChain$1([fragment, 'optionalAccess', _6 => _6.inputs, 'optionalAccess', _7 => _7.length]) ===  _optionalChain$1([transaction, 'access', _8 => _8.params, 'optionalAccess', _9 => _9.args, 'optionalAccess', _10 => _10.length]))]),
              functionName: transaction.method,
              args: _optionalChain$1([transaction, 'access', _11 => _11.params, 'optionalAccess', _12 => _12.args])
            },
          ],
          permit2: [_optionalChain$1([transaction, 'access', _13 => _13.params, 'optionalAccess', _14 => _14.permit2])]
        });
        worldcoinPrecompiled.MiniKit.commands.sendTransaction({
          transaction: [
            {
              address: transaction.to,
              abi: _optionalChain$1([transaction, 'access', _15 => _15.api, 'optionalAccess', _16 => _16.filter, 'call', _17 => _17((fragment)=>fragment.name === transaction.method && _optionalChain$1([fragment, 'optionalAccess', _18 => _18.inputs, 'optionalAccess', _19 => _19.length]) ===  _optionalChain$1([transaction, 'access', _20 => _20.params, 'optionalAccess', _21 => _21.args, 'optionalAccess', _22 => _22.length]))]),
              functionName: transaction.method,
              args: _optionalChain$1([transaction, 'access', _23 => _23.params, 'optionalAccess', _24 => _24.args])
            },
          ],
          permit2: [_optionalChain$1([transaction, 'access', _25 => _25.params, 'optionalAccess', _26 => _26.permit2])]
        });
        console.log('after MiniKit.commands.sendTransaction');
      })
    }

    retryFetchTransaction(transaction, payload, attempt) {
      console.log('Retry Fetch transaction', attempt);
      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          this.fetchTransaction(transaction, payload, attempt+1).then(resolve).catch(reject);
        }, (attempt < 30 ? 500 : 1000));
      })
    }

    fetchTransaction(transaction, payload, attempt = 1) {
      return new Promise((resolve, reject)=>{
        console.log('Before fetch');
        fetch(`https://public.depay.com/transactions/worldchain/${payload.transaction_id}`, {
          headers: { "Content-Type": "application/json" },
        }).then((response)=>{
          console.log('After fetch', response);
          if(response.ok) {
            console.log('Before json');
            response.json().then((transactionJSON)=>{
              console.log('After json', transactionJSON);
              if(_optionalChain$1([transactionJSON, 'optionalAccess', _27 => _27.external_id])) {
                transaction.id = _optionalChain$1([transactionJSON, 'optionalAccess', _28 => _28.external_id]);
                transaction.url = Blockchains__default['default']['worldchain'].explorerUrlFor({ transaction });
                console.log('before transaction.sent', transaction.sent);
                if (transaction.sent) { transaction.sent(transaction); }
                console.log('Before provider');
                web3ClientEvm.getProvider('worldchain').then((provider)=>{
                  console.log('After provider', provider);
                  console.log('Before wait transaction', transactionJSON.external_id);
                  provider.waitForTransaction(transactionJSON.external_id).then((receipt)=>{
                    console.log('After receipt', receipt);
                    if(receipt && receipt.status == 1) {
                      transaction._succeeded = true;
                      console.log('before transaction.succeeded', transaction.succeeded);
                      if (transaction.succeeded) { transaction.succeeded(transaction); }
                      resolve(transaction);
                    } else {
                      if (transaction.failed) { transaction.failed(transaction, 'Transaction failed'); }
                    }
                  }).catch(reject);
                }).catch(reject);
              } else {
                this.retryFetchTransaction(transaction, payload, attempt).then(resolve).catch(reject);
              }
            }).catch(()=>this.retryFetchTransaction(transaction, payload, attempt).then(resolve).catch(reject));
          } else {
            this.retryFetchTransaction(transaction, payload, attempt).then(resolve).catch(reject);
          }
        }).catch(()=>this.retryFetchTransaction(transaction, payload, attempt).then(resolve).catch(reject));
      })
    }

    getProvider() {
      return this
    }

    async account() {
      if(!this.getProvider()) { return undefined }
      return worldcoinPrecompiled.MiniKit.walletAddress
    }

    connect() {

      return new Promise( async(resolve, reject)=>{

        if(worldcoinPrecompiled.MiniKit.walletAddress) {
          return resolve(worldcoinPrecompiled.MiniKit.walletAddress)
        }

        worldcoinPrecompiled.MiniKit.subscribe(worldcoinPrecompiled.ResponseEvent.MiniAppWalletAuth, async (payload) => {
          if (payload.status === "error") {
            return reject(payload.message)
          } else {
            return resolve(worldcoinPrecompiled.MiniKit.walletAddress || _optionalChain$1([window, 'access', _29 => _29.MiniKit, 'optionalAccess', _30 => _30.walletAddress]))
          }
        });

        const { finalPayload } = await worldcoinPrecompiled.MiniKit.commandsAsync.walletAuth({
          nonce: crypto.randomUUID().replace(/-/g, ""),
          expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
          statement: "Connect World App (v17.6.2)"
        });

        if(finalPayload.status == 'error') {
          return reject(finalPayload.message)
        } else {
          return resolve(worldcoinPrecompiled.MiniKit.walletAddress || _optionalChain$1([window, 'access', _31 => _31.MiniKit, 'optionalAccess', _32 => _32.walletAddress]))
        }
      })
    }

    on(event, callback) {}

    off(event, internalCallback) {}

    async connectedTo(input) {
      if(input) {
        return input === 'worldchain'
      } else {
        return 'worldchain'
      }
    }

    addNetwork(blockchainName) {
      return new Promise((resolve, reject)=>{
        reject({ code: 'NOT_SUPPORTED' });
      })
    }

    switchTo(blockchainName) {
      return new Promise((resolve, reject)=>{
        reject({ code: 'NOT_SUPPORTED' });
      })
    }

    async transactionCount({ blockchain, address }) {
      if(!_optionalChain$1([worldcoinPrecompiled.MiniKit, 'optionalAccess', _33 => _33.walletAddress])) {
        return 0
      } else {
        return web3ClientEvm.request({
          blockchain: 'worldchain',
          address: _optionalChain$1([worldcoinPrecompiled.MiniKit, 'optionalAccess', _34 => _34.walletAddress]),
          api: [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"}],"name":"AddedOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"approvedHash","type":"bytes32"},{"indexed":true,"internalType":"address","name":"owner","type":"address"}],"name":"ApproveHash","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"handler","type":"address"}],"name":"ChangedFallbackHandler","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"guard","type":"address"}],"name":"ChangedGuard","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"threshold","type":"uint256"}],"name":"ChangedThreshold","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"module","type":"address"}],"name":"DisabledModule","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"module","type":"address"}],"name":"EnabledModule","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"txHash","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"payment","type":"uint256"}],"name":"ExecutionFailure","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"module","type":"address"}],"name":"ExecutionFromModuleFailure","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"module","type":"address"}],"name":"ExecutionFromModuleSuccess","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"txHash","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"payment","type":"uint256"}],"name":"ExecutionSuccess","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"}],"name":"RemovedOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"SafeReceived","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"initiator","type":"address"},{"indexed":false,"internalType":"address[]","name":"owners","type":"address[]"},{"indexed":false,"internalType":"uint256","name":"threshold","type":"uint256"},{"indexed":false,"internalType":"address","name":"initializer","type":"address"},{"indexed":false,"internalType":"address","name":"fallbackHandler","type":"address"}],"name":"SafeSetup","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"msgHash","type":"bytes32"}],"name":"SignMsg","type":"event"},{"stateMutability":"nonpayable","type":"fallback"},{"inputs":[],"name":"VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"_threshold","type":"uint256"}],"name":"addOwnerWithThreshold","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"hashToApprove","type":"bytes32"}],"name":"approveHash","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"approvedHashes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_threshold","type":"uint256"}],"name":"changeThreshold","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"dataHash","type":"bytes32"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"bytes","name":"signatures","type":"bytes"},{"internalType":"uint256","name":"requiredSignatures","type":"uint256"}],"name":"checkNSignatures","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"dataHash","type":"bytes32"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"bytes","name":"signatures","type":"bytes"}],"name":"checkSignatures","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"prevModule","type":"address"},{"internalType":"address","name":"module","type":"address"}],"name":"disableModule","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"domainSeparator","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"module","type":"address"}],"name":"enableModule","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"},{"internalType":"uint256","name":"safeTxGas","type":"uint256"},{"internalType":"uint256","name":"baseGas","type":"uint256"},{"internalType":"uint256","name":"gasPrice","type":"uint256"},{"internalType":"address","name":"gasToken","type":"address"},{"internalType":"address","name":"refundReceiver","type":"address"},{"internalType":"uint256","name":"_nonce","type":"uint256"}],"name":"encodeTransactionData","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"},{"internalType":"uint256","name":"safeTxGas","type":"uint256"},{"internalType":"uint256","name":"baseGas","type":"uint256"},{"internalType":"uint256","name":"gasPrice","type":"uint256"},{"internalType":"address","name":"gasToken","type":"address"},{"internalType":"addresspayable","name":"refundReceiver","type":"address"},{"internalType":"bytes","name":"signatures","type":"bytes"}],"name":"execTransaction","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"}],"name":"execTransactionFromModule","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"}],"name":"execTransactionFromModuleReturnData","outputs":[{"internalType":"bool","name":"success","type":"bool"},{"internalType":"bytes","name":"returnData","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getChainId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"start","type":"address"},{"internalType":"uint256","name":"pageSize","type":"uint256"}],"name":"getModulesPaginated","outputs":[{"internalType":"address[]","name":"array","type":"address[]"},{"internalType":"address","name":"next","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getOwners","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"offset","type":"uint256"},{"internalType":"uint256","name":"length","type":"uint256"}],"name":"getStorageAt","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getThreshold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"},{"internalType":"uint256","name":"safeTxGas","type":"uint256"},{"internalType":"uint256","name":"baseGas","type":"uint256"},{"internalType":"uint256","name":"gasPrice","type":"uint256"},{"internalType":"address","name":"gasToken","type":"address"},{"internalType":"address","name":"refundReceiver","type":"address"},{"internalType":"uint256","name":"_nonce","type":"uint256"}],"name":"getTransactionHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"module","type":"address"}],"name":"isModuleEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"prevOwner","type":"address"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"_threshold","type":"uint256"}],"name":"removeOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"enumEnum.Operation","name":"operation","type":"uint8"}],"name":"requiredTxGas","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"handler","type":"address"}],"name":"setFallbackHandler","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"guard","type":"address"}],"name":"setGuard","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_owners","type":"address[]"},{"internalType":"uint256","name":"_threshold","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"address","name":"fallbackHandler","type":"address"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"payment","type":"uint256"},{"internalType":"addresspayable","name":"paymentReceiver","type":"address"}],"name":"setup","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"signedMessages","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"targetContract","type":"address"},{"internalType":"bytes","name":"calldataPayload","type":"bytes"}],"name":"simulateAndRevert","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"prevOwner","type":"address"},{"internalType":"address","name":"oldOwner","type":"address"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"swapOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
          method: 'nonce'
        })
      }
    }

    async sign(message) {
      
      return new Promise((resolve, reject)=>{

        worldcoinPrecompiled.MiniKit.subscribe(worldcoinPrecompiled.ResponseEvent.MiniAppSignMessage, async (payload) => {
          if (payload.status === "error") {
            return reject()
          } else {
            return resolve(payload.signature)
          }
        });

        worldcoinPrecompiled.MiniKit.commands.signMessage({ message });

      })
    }
  } WorldApp.__initStatic(); WorldApp.__initStatic2();

  var wallets = {
    MetaMask,
    CoinbaseEVM,
    Binance,
    TrustEVM,
    Rabby,
    Uniswap,
    Rainbow,
    BraveEVM,
    Opera,
    MagicEdenEVM,
    OKXEVM,
    Coin98EVM,
    CryptoCom,
    HyperPay,
    TokenPocket,
    ExodusEVM,
    PhantomEVM,
    WorldApp,

    // standards
    WindowEthereum,
    WalletConnectV2,
    WalletLink
  };

  function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  const getWallets = async(args)=>{

    let drip = (args && typeof args.drip === 'function') ? args.drip : undefined;

    // eip6963
    window['_eip6963Providers'] = {};
    const announceProvider = (event)=>{
      if(_optionalChain([event, 'optionalAccess', _ => _.detail, 'optionalAccess', _2 => _2.info, 'optionalAccess', _3 => _3.uuid])) {
        window['_eip6963Providers'][_optionalChain([event, 'optionalAccess', _4 => _4.detail, 'optionalAccess', _5 => _5.info, 'optionalAccess', _6 => _6.uuid])] = event.detail.provider;
      }
    };
    window.addEventListener("eip6963:announceProvider", announceProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.removeEventListener("eip6963:announceProvider", announceProvider);

    let availableWallets = await Promise.all(
      
      Object.keys(wallets).map(
        
        async(key)=>{
        
          let wallet = wallets[key];

          if(await wallet.isAvailable()) {
            let instance;
            
            if(wallet.getConnectedInstance) {
              instance = await wallet.getConnectedInstance();
              if(drip && instance) { drip(instance); }
              return instance
            } else {
              if(drip && wallet) { drip(wallet); }
              return new wallet
            }
          }
        }
      )
    );

    return availableWallets.filter(Boolean)
  };

  const supported = [
    wallets.MetaMask,
    wallets.CoinbaseEVM,
    wallets.Binance,
    wallets.TrustEVM,
    wallets.Rabby,
    wallets.Uniswap,
    wallets.Rainbow,
    wallets.PhantomEVM,
    wallets.BraveEVM,
    wallets.OKXEvm,
    wallets.MagicEdenEVM,
    wallets.Opera,
    wallets.Coin98EVM,
    wallets.Coin98SVM,
    wallets.CryptoCom,
    wallets.HyperPay,
    wallets.TokenPocket,
    wallets.ExodusEVM,
    wallets.WorldApp,

    // standards
    wallets.WalletConnectV2,
    wallets.WalletLink,
    wallets.WindowEthereum,
  ];

  exports.getWallets = getWallets;
  exports.supported = supported;
  exports.wallets = wallets;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
