(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@depay/web3-client'), require('@depay/web3-blockchains'), require('@depay/solana-web3.js'), require('ethers'), require('@depay/walletconnect-v2'), require('@depay/coinbase-wallet-sdk'), require('@depay/worldcoin-precompiled')) :
  typeof define === 'function' && define.amd ? define(['exports', '@depay/web3-client', '@depay/web3-blockchains', '@depay/solana-web3.js', 'ethers', '@depay/walletconnect-v2', '@depay/coinbase-wallet-sdk', '@depay/worldcoin-precompiled'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Web3Wallets = {}, global.Web3Client, global.Web3Blockchains, global.SolanaWeb3js, global.ethers, global.WalletConnectV2, global.CoinbaseWalletSdk, global.WorldcoinPrecompiled));
}(this, (function (exports, web3Client, Blockchains, solanaWeb3_js, ethers, walletconnectV2, coinbaseWalletSdk, worldcoinPrecompiled) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Blockchains__default = /*#__PURE__*/_interopDefaultLegacy(Blockchains);

  function _optionalChain$B(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
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
      this.value = _optionalChain$B([Transaction, 'access', _ => _.bigNumberify, 'call', _2 => _2(value, blockchain), 'optionalAccess', _3 => _3.toString, 'call', _4 => _4()]);
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
      if(_optionalChain$B([param, 'optionalAccess', _5 => _5.components, 'optionalAccess', _6 => _6.length])) {
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

  function _optionalChain$A(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const POLL_SPEED = 500; // 0.5 seconds
  const MAX_POLLS = 240; // 120 seconds

  const sendTransaction$3 = async ({ transaction, wallet })=> {
    transaction = new Transaction(transaction);
    await transaction.prepare({ wallet });
    await submit$3({ transaction, wallet }).then((signature)=>{
      if(signature) {
        transaction.id = signature;
        transaction.url = Blockchains__default['default'].findByName(transaction.blockchain).explorerUrlFor({ transaction });
        if (transaction.sent) transaction.sent(transaction);

        let count = 0;
        const interval = setInterval(async ()=> {
          count++;
          if(count >= MAX_POLLS) { return clearInterval(interval) }

          const provider = await web3Client.getProvider(transaction.blockchain);
          const { value } = await provider.getSignatureStatus(signature);
          const confirmationStatus = _optionalChain$A([value, 'optionalAccess', _ => _.confirmationStatus]);
          if(confirmationStatus) {
            const hasReachedSufficientCommitment = confirmationStatus === 'confirmed' || confirmationStatus === 'finalized';
            if (hasReachedSufficientCommitment) {
              if(value.err) {
                transaction._failed = true;
                const confirmedTransaction = await provider.getConfirmedTransaction(signature);
                const failedReason = _optionalChain$A([confirmedTransaction, 'optionalAccess', _2 => _2.meta, 'optionalAccess', _3 => _3.logMessages]) ? confirmedTransaction.meta.logMessages[confirmedTransaction.meta.logMessages.length - 1] : null;
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

  const submit$3 = async({ transaction, wallet })=> {

    let result = await submitThroughWallet({ transaction, wallet });

    let signature;

    if(typeof result === 'object' && result.signatures && result.message) {
      signature = await submitDirectly(result, await wallet.account());
    } else if (typeof result === 'object' && result.signature && result.signature.length) {
      signature = result.signature;
    } else if (typeof result === 'string' && result.length) {
      signature = result;
    }
    
    return signature
  };

  const submitDirectly = async(tx, from) =>{
    let provider = await web3Client.getProvider('solana');
    return await provider.sendRawTransaction(tx.serialize())
  };

  const submitThroughWallet = async({ transaction, wallet })=> {
    if(transaction.instructions) {
      return submitInstructions({ transaction, wallet })
    } else {
      return submitSimpleTransfer$3({ transaction, wallet })
    }
  };

  const submitSimpleTransfer$3 = async ({ transaction, wallet })=> {
    let fromPubkey = new solanaWeb3_js.PublicKey(await wallet.account());
    let toPubkey = new solanaWeb3_js.PublicKey(transaction.to);
    const provider = await web3Client.getProvider(transaction.blockchain);
    let recentBlockhash = (await provider.getLatestBlockhash()).blockhash;
    const instructions = [
      solanaWeb3_js.SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: parseInt(Transaction.bigNumberify(transaction.value, transaction.blockchain), 10)
      })
    ];
    const messageV0 = new solanaWeb3_js.TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash,
      instructions,
    }).compileToV0Message();
    const transactionV0 = new solanaWeb3_js.VersionedTransaction(messageV0);
    return wallet._sendTransaction(transactionV0)
  };

  const submitInstructions = async ({ transaction, wallet })=> {
    let fromPubkey = new solanaWeb3_js.PublicKey(await wallet.account());
    const provider = await web3Client.getProvider(transaction.blockchain);
    let recentBlockhash = (await provider.getLatestBlockhash()).blockhash;
    const messageV0 = new solanaWeb3_js.TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash,
      instructions: transaction.instructions,
    }).compileToV0Message(
      transaction.alts ? await Promise.all(transaction.alts.map(async(alt)=>{
        return (await web3Client.getProvider('solana')).getAddressLookupTable(new solanaWeb3_js.PublicKey(alt)).then((res) => res.value)
      })) : undefined);
    const transactionV0 = new solanaWeb3_js.VersionedTransaction(messageV0);
    if(transaction.signers && transaction.signers.length) {
      transactionV0.sign(Array.from(new Set(transaction.signers)));
    }
    return wallet._sendTransaction(transactionV0)
  };

  let supported$1 = ['ethereum', 'bsc', 'polygon', 'solana', 'fantom', 'arbitrum', 'avalanche', 'gnosis', 'optimism', 'base', 'worldchain'];
  supported$1.evm = ['ethereum', 'bsc', 'polygon', 'fantom', 'arbitrum', 'avalanche', 'gnosis', 'optimism', 'base', 'worldchain'];
  supported$1.solana = ['solana'];

  function _optionalChain$z(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class WindowSolana {

    static __initStatic() {this.info = {
      name: 'Solana Wallet',
      logo: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Cgkuc3Qye2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDE2NTIzNDE5NTQ5NTc2MDU4MDgwMDAwMDAwNjMwMzAwNDA2OTM1MjExODk1MV8pO30KCS5zdDN7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDkyNDIyMzgxNjc5OTg1OTI5MTcwMDAwMDA2ODU0NzIyMTYxOTE4MTIzNjUzXyk7fQo8L3N0eWxlPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgxLjcsMTEwLjJoNjQuN1Y0Ni41YzAtMjUuNy0yMC44LTQ2LjUtNDYuNS00Ni41SDQ2LjVDMjAuOCwwLDAsMjAuOCwwLDQ2LjV2NjUuMWgzNS43bDI2LjktMjYuOQoJYzEuNS0xLjUsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoNzguNmM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN2MyNS41LDUuMyw0MiwzMC4yLDM2LjcsNTUuN2MtMS42LDcuNS00LjksMTQuNi05LjgsMjAuNQoJYy0wLjksMS4xLTEuOSwyLjItMywzLjNjLTEuMSwxLjEtMi4yLDIuMS0zLjMsM2MtMjAuMSwxNi42LTQ5LjksMTMuOC02Ni41LTYuM2MtNC45LTUuOS04LjMtMTMtOS44LTIwLjZINzMuMmwtMjYuOSwyNi44CgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40aC0wLjFoLTAuNUgwdjc0aDI4LjhsMTguMi0xOC4yYzEuNS0xLjYsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoMjkuOQoJYzUuMi0yNS41LDMwLjItNDEuOSw1NS43LTM2LjdzNDEuOSwzMC4yLDM2LjcsNTUuN3MtMzAuMiw0MS45LTU1LjcsMzYuN2MtMTguNS0zLjgtMzIuOS0xOC4yLTM2LjctMzYuN0g1Ny43bC0xOC4yLDE4LjMKCWMtMS41LDEuNS0zLjYsMi41LTUuNywyLjdsMCwwaC0wLjRIMHYzNC4yaDU2LjNjMC4yLDAsMC4zLDAsMC41LDBoMC4xaDAuNGwwLDBjMi4yLDAuMiw0LjIsMS4yLDUuOCwyLjhsMjgsMjhoNTcuNwoJYzUuMy0yNS41LDMwLjItNDIsNTUuNy0zNi43czQyLDMwLjIsMzYuNyw1NS43Yy0xLjcsOC4xLTUuNSwxNS43LTExLDIxLjljLTAuNiwwLjctMS4yLDEuMy0xLjksMnMtMS4zLDEuMy0yLDEuOQoJYy0xOS41LDE3LjMtNDkuMywxNS42LTY2LjctMy45Yy01LjUtNi4yLTkuMy0xMy43LTExLTIxLjlIODcuMWMtMS4xLDAtMi4xLTAuMi0zLjEtMC41aC0wLjFsLTAuMy0wLjFsLTAuMi0wLjFsLTAuMi0wLjFsLTAuMy0wLjEKCWgtMC4xYy0wLjktMC41LTEuOC0xLjEtMi42LTEuOGwtMjgtMjhIMHY1My41YzAuMSwyNS43LDIwLjksNDYuNCw0Ni41LDQ2LjRoMzUzLjNjMjUuNywwLDQ2LjUtMjAuOCw0Ni41LTQ2LjV2LTYzLjZoLTY0LjcKCWMtNDMuMiwwLTc4LjItMzUtNzguMi03OC4ybDAsMEMzMDMuNSwxNDUuMiwzMzguNSwxMTAuMiwzODEuNywxMTAuMnoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyMC45LDI5OC4xYzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjIwLjksMzEyLjQsMjIwLjksMjk4LjFMMjIwLjksMjk4LjF6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMTkuNiw5MS41YzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjE5LjYsMTA1LjgsMjE5LjYsOTEuNXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4Mi4yLDEyOC44aC0wLjVjLTMyLjksMC01OS42LDI2LjctNTkuNiw1OS42bDAsMGwwLDBjMCwzMi45LDI2LjcsNTkuNiw1OS42LDU5LjZsMCwwaDAuNQoJYzMyLjksMCw1OS42LTI2LjcsNTkuNi01OS42bDAsMEM0NDEuOCwxNTUuNCw0MTUuMSwxMjguOCwzODIuMiwxMjguOHogTTM5Ni42LDIxOS40aC0zMWw4LjktMzIuNWMtNy43LTMuNy0xMS0xMi45LTcuNC0yMC42CgljMy43LTcuNywxMi45LTExLDIwLjYtNy40YzcuNywzLjcsMTEsMTIuOSw3LjQsMjAuNmMtMS41LDMuMi00LjEsNS44LTcuNCw3LjRMMzk2LjYsMjE5LjR6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTQ5LjAwNzciIHkxPSIxMzkuMzA5MyIgeDI9IjEyMi4xMjMxIiB5Mj0iMTkwLjgwNDIiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAwIDMwLjUzNTQpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMEZGQTMiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNEQzFGRkYiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTExMi43LDIwMy41YzAuMy0wLjMsMC43LTAuNSwxLjEtMC41aDM4LjhjMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOAoJYy0wLjcsMC0xLjEtMC45LTAuNi0xLjRMMTEyLjcsMjAzLjV6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjEzNy4yNTMzIiB5MT0iMTMzLjE3MjUiIHgyPSIxMTAuMzY4NyIgeTI9IjE4NC42Njc0IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMCAzMC41MzU0KSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBGRkEzIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojREMxRkZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfKTsiIGQ9Ik0xMTIuNywxNzQuOWMwLjMtMC4zLDAuNy0wLjUsMS4xLTAuNWgzOC44CgljMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOGMtMC43LDAtMS4xLTAuOS0wLjYtMS40TDExMi43LDE3NC45eiIvPgo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxNDMuMDkyOSIgeTE9IjEzNi4yMjEyIiB4Mj0iMTE2LjIwODIiIHkyPSIxODcuNzE2MiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgMzAuNTM1NCkiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzAwRkZBMyIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6I0RDMUZGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyk7IiBkPSJNMTQ1LjYsMTg5LjFjLTAuMy0wLjMtMC43LTAuNS0xLjEtMC41CgloLTM4LjhjLTAuNywwLTEuMSwwLjktMC42LDEuNGw3LjcsNy43YzAuMywwLjMsMC43LDAuNSwxLjEsMC41aDM4LjhjMC43LDAsMS4xLTAuOSwwLjYtMS40TDE0NS42LDE4OS4xeiIvPgo8L3N2Zz4K',
      blockchains: supported$1.solana
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return (
        _optionalChain$z([window, 'optionalAccess', _6 => _6.solana]) &&
        // not Phantom
        !(window.phantom && !window.glow && !window.solana.isGlow && !['isBitKeep'].some((identifier)=>window.solana && window.solana[identifier])) &&
        // not Coin98
        !window.coin98 &&
        // not BitKeep
        !(_optionalChain$z([window, 'optionalAccess', _7 => _7.solana]) && _optionalChain$z([window, 'optionalAccess', _8 => _8.solana, 'access', _9 => _9.isBitKeep])) && 
        // not Glow
        !window.solana.isGlow &&
        // not trust
        !window.trustwallet &&
        // Brave Wallet
        !window.solana.isBraveWallet &&
        // OKX Wallet
        !_optionalChain$z([window, 'optionalAccess', _10 => _10.okxwallet])
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

    getProvider() { return window.solana }

    async account() {
      const provider = this.getProvider();
      if(provider == undefined){ return }
      if(provider.publicKey) { return provider.publicKey.toString() }
      if(provider.isBraveWallet != true) {
        let publicKey;
        try { ({ publicKey } = await window.solana.connect({ onlyIfTrusted: true })); } catch (e) {}
        if(publicKey){ return publicKey.toString() }
      }
    }

    async connect() {
      const provider = this.getProvider();
      if(!provider) { return undefined }

      let result;
      try { result = await provider.connect(); } catch (e2) {}

      if(result && result.publicKey) {
        return result.publicKey.toString()
      } else {
        return provider.publicKey.toString()
      }
    }

    on(event, callback) {
      let internalCallback;
      switch (event) {
        case 'account':
          internalCallback = (publicKey) => callback(_optionalChain$z([publicKey, 'optionalAccess', _11 => _11.toString, 'call', _12 => _12()]));
          this.getProvider().on('accountChanged', internalCallback);
          break
      }
      return internalCallback
    }

    off(event, internalCallback) {
      switch (event) {
        case 'account':
          this.getProvider().removeListener('accountChanged', internalCallback);
          break
      }
      return internalCallback
    }

    async connectedTo(input) {
      if(input) {
        return input == 'solana'
      } else {
        return 'solana'
      }
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
      const signedMessage = await this.getProvider().signMessage(encodedMessage);
      if(signedMessage && signedMessage.signature) {
        return Array.from(signedMessage.signature)
      }
    }

    _sendTransaction(transaction) {
      return this.getProvider()
        .signAndSendTransaction(
          transaction,
          { skipPreflight: false } // requires default options to not raise error on phantom in app mobile (https://discord.com/channels/958228318132514876/974393659380334618/1089298098905423924)
        )
    }
  } WindowSolana.__initStatic(); WindowSolana.__initStatic2();

  function _optionalChain$y(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  class Backpack extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Backpack',
      logo: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAxMDAgMTAwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2NsaXAtcGF0aDp1cmwoI1NWR0lEXzAwMDAwMTA2ODQwODY0OTg0NTM1NTU0MzQwMDAwMDAwNDc2MjMzMDgyNzcwODcyOTcxXyk7fQoJLnN0MXtmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNFMzNFM0Y7fQo8L3N0eWxlPgo8Zz4KCTxkZWZzPgoJCTxyZWN0IGlkPSJTVkdJRF8xXyIgeD0iMjMuOCIgeT0iMTAuNCIgd2lkdGg9IjUyLjQiIGhlaWdodD0iNzYuMiIvPgoJPC9kZWZzPgoJPGNsaXBQYXRoIGlkPSJTVkdJRF8wMDAwMDE3ODE5NTUzMTM2ODQxNzQ3MDkwMDAwMDAxNDk2Njk4MDAxOTUxNjc4MTk3MF8iPgoJCTx1c2UgeGxpbms6aHJlZj0iI1NWR0lEXzFfIiAgc3R5bGU9Im92ZXJmbG93OnZpc2libGU7Ii8+Cgk8L2NsaXBQYXRoPgoJPGcgc3R5bGU9ImNsaXAtcGF0aDp1cmwoI1NWR0lEXzAwMDAwMTc4MTk1NTMxMzY4NDE3NDcwOTAwMDAwMDE0OTY2OTgwMDE5NTE2NzgxOTcwXyk7Ij4KCQk8cGF0aCBjbGFzcz0ic3QxIiBkPSJNNTUsMTYuNGMyLjgsMCw1LjQsMC40LDcuOCwxLjFjLTIuNC01LjUtNy4yLTcuMS0xMi43LTcuMWMtNS41LDAtMTAuNCwxLjYtMTIuNyw3LjFjMi40LTAuNyw1LTEuMSw3LjctMS4xCgkJCUg1NXogTTQ0LjQsMjEuOWMtMTMuMiwwLTIwLjcsMTAuNC0yMC43LDIzLjF2MTMuMWMwLDEuMywxLjEsMi4zLDIuNCwyLjNoNDcuNmMxLjMsMCwyLjQtMSwyLjQtMi4zVjQ1YzAtMTIuOC04LjctMjMuMS0yMS45LTIzLjEKCQkJSDQ0LjR6IE01MCw0NS4xYzQuNiwwLDguMy0zLjcsOC4zLTguM3MtMy43LTguMy04LjMtOC4zcy04LjMsMy43LTguMyw4LjNTNDUuNCw0NS4xLDUwLDQ1LjF6IE0yMy44LDY4LjFjMC0xLjMsMS4xLTIuMywyLjQtMi4zCgkJCWg0Ny42YzEuMywwLDIuNCwxLDIuNCwyLjNWODJjMCwyLjYtMi4xLDQuNi00LjgsNC42SDI4LjZjLTIuNiwwLTQuOC0yLjEtNC44LTQuNlY2OC4xeiIvPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=',
      blockchains: ['solana']
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$y([window, 'optionalAccess', _2 => _2.backpack]) &&
        window.backpack.isBackpack
      )
    };}

    getProvider() { return window.backpack }

    async sign(message) {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await this.getProvider().signMessage(encodedMessage);
      return Object.values(signature)
    }

    _sendTransaction(transaction) {
      return this.getProvider().sendAndConfirm(transaction)
    }
  } Backpack.__initStatic(); Backpack.__initStatic2();

  function _optionalChain$x(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  const sendTransaction$2 = async ({ transaction, wallet })=> {
    transaction = new Transaction(transaction);
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      await wallet.switchTo(transaction.blockchain);
    }
    if((await wallet.connectedTo(transaction.blockchain)) == false) {
      throw({ code: 'WRONG_NETWORK' })
    }
    await transaction.prepare({ wallet });
    let transactionCount = await web3Client.request({ blockchain: transaction.blockchain, method: 'transactionCount', address: transaction.from });
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
            (error && _optionalChain$x([error, 'optionalAccess', _ => _.stack, 'optionalAccess', _2 => _2.match, 'call', _3 => _3('JSON-RPC error')])) ||
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
          (error && _optionalChain$x([error, 'optionalAccess', _4 => _4.stack, 'optionalAccess', _5 => _5.match, 'call', _6 => _6('JSON-RPC error')])) ||
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
      gas = await web3Client.estimate(transaction);
      gas = gas.add(gas.div(10));
    } catch (e) {}
    if(contractArguments) {
      return await method(...contractArguments, {
        value: Transaction.bigNumberify(transaction.value, transaction.blockchain),
        gasLimit: _optionalChain$x([gas, 'optionalAccess', _7 => _7.toHexString, 'call', _8 => _8()])
      })
    } else {
      return await method({
        value: Transaction.bigNumberify(transaction.value, transaction.blockchain),
        gasLimit: _optionalChain$x([gas, 'optionalAccess', _9 => _9.toHexString, 'call', _10 => _10()])
      })
    }
  };

  const submitSimpleTransfer$2 = ({ transaction, signer })=>{
    return signer.sendTransaction({
      to: transaction.to,
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
  };

  function _optionalChain$w(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

  class WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Ethereum Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDojMzQzNDM0O30KCS5zdDJ7ZmlsbDojOEM4QzhDO30KCS5zdDN7ZmlsbDojM0MzQzNCO30KCS5zdDR7ZmlsbDojMTQxNDE0O30KCS5zdDV7ZmlsbDojMzkzOTM5O30KPC9zdHlsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4MS43LDExMC4yaDY0LjdWNDYuNWMwLTI1LjctMjAuOC00Ni41LTQ2LjUtNDYuNUg0Ni41QzIwLjgsMCwwLDIwLjgsMCw0Ni41djY1LjFoMzUuN2wyNi45LTI2LjkKCWMxLjUtMS41LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDc4LjZjNS4zLTI1LjUsMzAuMi00Miw1NS43LTM2LjdjMjUuNSw1LjMsNDIsMzAuMiwzNi43LDU1LjdjLTEuNiw3LjUtNC45LDE0LjYtOS44LDIwLjUKCWMtMC45LDEuMS0xLjksMi4yLTMsMy4zYy0xLjEsMS4xLTIuMiwyLjEtMy4zLDNjLTIwLjEsMTYuNi00OS45LDEzLjgtNjYuNS02LjNjLTQuOS01LjktOC4zLTEzLTkuOC0yMC42SDczLjJsLTI2LjksMjYuOAoJYy0xLjUsMS41LTMuNiwyLjUtNS43LDIuN2wwLDBoLTAuNGgtMC4xaC0wLjVIMHY3NGgyOC44bDE4LjItMTguMmMxLjUtMS42LDMuNi0yLjUsNS43LTIuN2wwLDBoMC40aDI5LjkKCWM1LjItMjUuNSwzMC4yLTQxLjksNTUuNy0zNi43czQxLjksMzAuMiwzNi43LDU1LjdzLTMwLjIsNDEuOS01NS43LDM2LjdjLTE4LjUtMy44LTMyLjktMTguMi0zNi43LTM2LjdINTcuN2wtMTguMiwxOC4zCgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40SDB2MzQuMmg1Ni4zYzAuMiwwLDAuMywwLDAuNSwwaDAuMWgwLjRsMCwwYzIuMiwwLjIsNC4yLDEuMiw1LjgsMi44bDI4LDI4aDU3LjcKCWM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN3M0MiwzMC4yLDM2LjcsNTUuN2MtMS43LDguMS01LjUsMTUuNy0xMSwyMS45Yy0wLjYsMC43LTEuMiwxLjMtMS45LDJzLTEuMywxLjMtMiwxLjkKCWMtMTkuNSwxNy4zLTQ5LjMsMTUuNi02Ni43LTMuOWMtNS41LTYuMi05LjMtMTMuNy0xMS0yMS45SDg3LjFjLTEuMSwwLTIuMS0wLjItMy4xLTAuNWgtMC4xbC0wLjMtMC4xbC0wLjItMC4xbC0wLjItMC4xbC0wLjMtMC4xCgloLTAuMWMtMC45LTAuNS0xLjgtMS4xLTIuNi0xLjhsLTI4LTI4SDB2NTMuNWMwLjEsMjUuNywyMC45LDQ2LjQsNDYuNSw0Ni40aDM1My4zYzI1LjcsMCw0Ni41LTIwLjgsNDYuNS00Ni41di02My42aC02NC43CgljLTQzLjIsMC03OC4yLTM1LTc4LjItNzguMmwwLDBDMzAzLjUsMTQ1LjIsMzM4LjUsMTEwLjIsMzgxLjcsMTEwLjJ6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMjAuOSwyOTguMWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIyMC45LDMxMi40LDIyMC45LDI5OC4xTDIyMC45LDI5OC4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjE5LjYsOTEuNWMwLTE0LjQtMTEuNi0yNi0yNi0yNnMtMjYsMTEuNi0yNiwyNnMxMS42LDI2LDI2LDI2UzIxOS42LDEwNS44LDIxOS42LDkxLjV6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zODIuMiwxMjguOGgtMC41Yy0zMi45LDAtNTkuNiwyNi43LTU5LjYsNTkuNmwwLDBsMCwwYzAsMzIuOSwyNi43LDU5LjYsNTkuNiw1OS42bDAsMGgwLjUKCWMzMi45LDAsNTkuNi0yNi43LDU5LjYtNTkuNmwwLDBDNDQxLjgsMTU1LjQsNDE1LjEsMTI4LjgsMzgyLjIsMTI4Ljh6IE0zOTYuNiwyMTkuNGgtMzFsOC45LTMyLjVjLTcuNy0zLjctMTEtMTIuOS03LjQtMjAuNgoJYzMuNy03LjcsMTIuOS0xMSwyMC42LTcuNGM3LjcsMy43LDExLDEyLjksNy40LDIwLjZjLTEuNSwzLjItNC4xLDUuOC03LjQsNy40TDM5Ni42LDIxOS40eiIvPgo8ZyBpZD0iTGF5ZXJfeDAwMjBfMSI+Cgk8ZyBpZD0iXzE0MjEzOTQzNDI0MDAiPgoJCTxnPgoJCQk8cG9seWdvbiBjbGFzcz0ic3QxIiBwb2ludHM9IjEyOSwxNjYuMiAxMjguNywxNjcuMyAxMjguNywyMDEuNCAxMjksMjAxLjcgMTQ0LjgsMTkyLjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDE2Ni4yIDExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDMiIHBvaW50cz0iMTI5LDIwNC43IDEyOC44LDIwNC45IDEyOC44LDIxNyAxMjksMjE3LjYgMTQ0LjgsMTk1LjQgCQkJIi8+CgkJCTxwb2x5Z29uIGNsYXNzPSJzdDIiIHBvaW50cz0iMTI5LDIxNy42IDEyOSwyMDQuNyAxMTMuMiwxOTUuNCAJCQkiLz4KCQkJPHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSIxMjksMjAxLjcgMTQ0LjgsMTkyLjQgMTI5LDE4NS4yIAkJCSIvPgoJCQk8cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjExMy4yLDE5Mi40IDEyOSwyMDEuNyAxMjksMTg1LjIgCQkJIi8+CgkJPC9nPgoJPC9nPgo8L2c+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return (
        _optionalChain$w([window, 'optionalAccess', _38 => _38.ethereum]) &&
        // not MetaMask
        !(_optionalChain$w([window, 'optionalAccess', _39 => _39.ethereum, 'optionalAccess', _40 => _40.isMetaMask]) && Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!PocketUniverse)(?!RevokeCash)/)).length == 1) &&
        // not Coin98
        !_optionalChain$w([window, 'optionalAccess', _41 => _41.coin98]) &&
        // not Trust Wallet
        !(_optionalChain$w([window, 'optionalAccess', _42 => _42.ethereum, 'optionalAccess', _43 => _43.isTrust]) || _optionalChain$w([window, 'optionalAccess', _44 => _44.ethereum, 'optionalAccess', _45 => _45.isTrustWallet])) &&
        // not crypto.com
        !_optionalChain$w([window, 'optionalAccess', _46 => _46.ethereum, 'optionalAccess', _47 => _47.isDeficonnectProvider]) &&
        // not HyperPay
        !_optionalChain$w([window, 'optionalAccess', _48 => _48.ethereum, 'optionalAccess', _49 => _49.isHyperPay]) &&
        // not Phantom
        !(window.phantom && !window.glow && !_optionalChain$w([window, 'optionalAccess', _50 => _50.solana, 'optionalAccess', _51 => _51.isGlow]) && !['isBitKeep'].some((identifier)=>window.solana && window.solana[identifier])) &&
        // not Rabby
        !_optionalChain$w([window, 'optionalAccess', _52 => _52.ethereum, 'optionalAccess', _53 => _53.isRabby]) &&
        // not Backpack
        !_optionalChain$w([window, 'optionalAccess', _54 => _54.backpack, 'optionalAccess', _55 => _55.isBackpack]) &&
        // not TokenPocket
        !_optionalChain$w([window, 'optionalAccess', _56 => _56.ethereum, 'optionalAccess', _57 => _57.isTokenPocket]) && 
        // not BitKeep
        !_optionalChain$w([window, 'optionalAccess', _58 => _58.ethereum, 'optionalAccess', _59 => _59.isBitKeep]) && 
        // not Coinbase
        !(_optionalChain$w([window, 'optionalAccess', _60 => _60.ethereum, 'optionalAccess', _61 => _61.isCoinbaseWallet]) || _optionalChain$w([window, 'optionalAccess', _62 => _62.ethereum, 'optionalAccess', _63 => _63.isWalletLink])) &&
        // MetaMask through ProviderMap
        !_optionalChain$w([window, 'optionalAccess', _64 => _64.ethereum, 'optionalAccess', _65 => _65.providerMap, 'optionalAccess', _66 => _66.has, 'call', _67 => _67('MetaMask')]) &&
        // Brave Wallet
        !_optionalChain$w([window, 'optionalAccess', _68 => _68.ethereum, 'optionalAccess', _69 => _69.isBraveWallet]) &&
        // Uniswap Wallet
        !_optionalChain$w([window, 'optionalAccess', _70 => _70.ethereum, 'optionalAccess', _71 => _71.isUniswapWallet]) &&
        // Rainbow
        !_optionalChain$w([window, 'optionalAccess', _72 => _72.ethereum, 'optionalAccess', _73 => _73.isRainbow]) &&
        // OKX Wallet
        !_optionalChain$w([window, 'optionalAccess', _74 => _74.okxwallet])
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
      return web3Client.request({ blockchain, method: 'transactionCount', address })
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

  function _optionalChain$v(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Binance extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Binance Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTIgMTkzLjY4Ij48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5My42OCIgZmlsbD0iIzFlMjAyNCIvPjxwYXRoIGQ9Im01Ni45Miw0Ni41M2wzOS4wOC0yMi41NCwzOS4wOCwyMi41NC0xNC4zNSw4LjM2LTI0LjczLTE0LjE4LTI0LjczLDE0LjE4LTE0LjM1LTguMzZabTc4LjE3LDI4LjUzbC0xNC4zNS04LjM2LTI0LjczLDE0LjI3LTI0LjczLTE0LjI3LTE0LjM1LDguMzZ2MTYuNzFsMjQuNzMsMTQuMTh2MjguNDVsMTQuMzUsOC4zNiwxNC4zNS04LjM2di0yOC40NWwyNC43My0xNC4yN3YtMTYuNjNabTAsNDUuMTZ2LTE2LjcxbC0xNC4zNSw4LjM2djE2LjcxbDE0LjM1LTguMzZabTEwLjIxLDUuODJsLTI0LjczLDE0LjI3djE2LjcxbDM5LjA4LTIyLjU0di00NS4yNWwtMTQuMzUsOC4zNnYyOC40NVptLTE0LjM1LTY1LjI1bDE0LjM1LDguMzZ2MTYuNzFsMTQuMzUtOC4zNnYtMTYuNzFsLTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTQ5LjMsODUuNnYxNi43MWwxNC4zNSw4LjM2LDE0LjM1LTguMzZ2LTE2LjcxbC0xNC4zNSw4LjM2LTE0LjM1LTguMzZabS0yNC43My0yNi4xN2wxNC4zNSw4LjM2di0xNi43MWwtMTQuMzUtOC4zNnYxNi43MVptMjQuNzMtNTkuNDNsMTQuMzUsOC4zNiwxNC4zNS04LjM2LTE0LjM1LTguMzYtMTQuMzUsOC4zNlptLTM0Ljk1LDguMzZsMTQuMzUtOC4zNi0xNC4zNS04LjM2LTE0LjM1LDguMzZ2MTYuNzFsMTQuMzUsOC4zNnYtMTYuNzFabTAsMjguNDVsLTE0LjM1LTguMzZ2NDUuMTZsMzkuMDgsMjIuNTR2LTE2LjcxbC0yNC43My0xNC4yN3MwLTI4LjM2LDAtMjguMzZaIiBmaWxsPSIjZjBiOTBiIi8+PC9zdmc+",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return _optionalChain$v([window, 'optionalAccess', _2 => _2.BinanceChain]) &&
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

  function _optionalChain$u(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class BraveEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Brave',
      logo: logos.brave,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$u([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isBraveWallet]) };}

    getProvider() { 
      return window.ethereum
    }
  } BraveEVM.__initStatic(); BraveEVM.__initStatic2();

  function _optionalChain$t(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class BraveSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Brave',
      logo: logos.brave,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$t([window, 'optionalAccess', _3 => _3.solana, 'optionalAccess', _4 => _4.isBraveWallet]) };}

    getProvider() { 
      return window.braveSolana
    }
  } BraveSVM.__initStatic(); BraveSVM.__initStatic2();

  function _optionalChain$s(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Coin98EVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Coin98',
      logo: logos.coin98,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$s([window, 'optionalAccess', _2 => _2.coin98]) };}

    getProvider() { return window.coin98.provider }
    
  } Coin98EVM.__initStatic(); Coin98EVM.__initStatic2();

  function _optionalChain$r(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Coin98SVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Coin98',
      logo: logos.coin98,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$r([window, 'optionalAccess', _3 => _3.coin98, 'optionalAccess', _4 => _4.sol]) };}

    getProvider() { return window.coin98.sol }

  } Coin98SVM.__initStatic(); Coin98SVM.__initStatic2();

  function _optionalChain$q(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class CoinbaseEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Coinbase',
      logo: logos.coinbase,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    getProvider() { 
      if(_optionalChain$q([window, 'optionalAccess', _9 => _9.ethereum, 'optionalAccess', _10 => _10.providerMap, 'optionalAccess', _11 => _11.has, 'call', _12 => _12('CoinbaseWallet')])) {
        return _optionalChain$q([window, 'optionalAccess', _13 => _13.ethereum, 'optionalAccess', _14 => _14.providerMap, 'optionalAccess', _15 => _15.get, 'call', _16 => _16('CoinbaseWallet')])
      } else {
        return window.ethereum
      }
    }

    static __initStatic2() {this.isAvailable = async()=>{ 
      return(
        (
          _optionalChain$q([window, 'optionalAccess', _17 => _17.ethereum, 'optionalAccess', _18 => _18.isCoinbaseWallet]) || _optionalChain$q([window, 'optionalAccess', _19 => _19.ethereum, 'optionalAccess', _20 => _20.isWalletLink])
        ) || (
          _optionalChain$q([window, 'optionalAccess', _21 => _21.ethereum, 'optionalAccess', _22 => _22.providerMap, 'optionalAccess', _23 => _23.has, 'call', _24 => _24('CoinbaseWallet')])
        )
      )
    };}
  } CoinbaseEVM.__initStatic(); CoinbaseEVM.__initStatic2();

  class CoinbaseSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Coinbase',
      logo: logos.coinbase,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    getProvider() { 
      return window.coinbaseSolana
    }

    static __initStatic2() {this.isAvailable = async()=>{ 
      return !!window.coinbaseSolana
    };}
  } CoinbaseSVM.__initStatic(); CoinbaseSVM.__initStatic2();

  function _optionalChain$p(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class CryptoCom extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Crypto.com | DeFi Wallet',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCA4OS45IDEwMi44IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA4OS45IDEwMi44IiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOiMwMzMxNkM7fQo8L3N0eWxlPgoKPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTUuMzc1MSAtMTEzLjYxKSI+Cgk8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzE3OTQgMCAwIC4zMTQ2NSAtMS4wNDczIDMwLjQ0NykiPgoJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Im0xNjEuNiAyNjQuMy0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6bTAgMC0xNDEuNCA4MS42djE2My4zbDE0MS40IDgxLjYgMTQxLjQtODEuNnYtMTYzLjNsLTE0MS40LTgxLjZ6Ii8+CgkJPHBhdGggY2xhc3M9InN0MSIgZD0ibTIxNy41IDUyNy4xaC0yMC4xbC0yNC4xLTIyLjF2LTExLjNsMjQuOS0yMy44di0zNy43bDMyLjYtMjEuMyAzNy4xIDI4LjEtNTAuNCA4OC4xem0tODMuMy01OS42IDMuNy0zNS40LTEyLjItMzEuN2g3MmwtMTEuOSAzMS43IDMuNCAzNS40aC01NXptMTYuNCAzNy41LTI0LjEgMjIuNGgtMjAuNGwtNTAuNy04OC40IDM3LjQtMjcuOCAzMi45IDIxdjM3LjdsMjQuOSAyMy44djExLjN6bS00NC44LTE3MC4xaDExMS40bDEzLjMgNTYuN2gtMTM3LjdsMTMtNTYuN3ptNTUuOC03MC42LTE0MS40IDgxLjZ2MTYzLjNsMTQxLjQgODEuNiAxNDEuNC04MS42di0xNjMuM2wtMTQxLjQtODEuNnoiLz4KCTwvZz4KPC9nPgo8L3N2Zz4K",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$p([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isDeficonnectProvider]) };}
  } CryptoCom.__initStatic(); CryptoCom.__initStatic2();

  function _optionalChain$o(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class ExodusEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Exodus',
      logo: logos.exodus,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$o([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isExodus]) };}
  } ExodusEVM.__initStatic(); ExodusEVM.__initStatic2();

  function _optionalChain$n(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class ExodusSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Exodus',
      logo: logos.exodus,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$n([window, 'optionalAccess', _3 => _3.solana, 'optionalAccess', _4 => _4.isExodus]) };}
  } ExodusSVM.__initStatic(); ExodusSVM.__initStatic2();

  class Glow extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Glow',
      logo: 'data:image/webp;base64,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',
      blockchains: ['solana']
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        window.solana &&
        window.solana.isGlow
      )
    };}
  } Glow.__initStatic(); Glow.__initStatic2();

  function _optionalChain$m(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class HyperPay extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'HyperPay',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjA0LjcgMjAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyMDQuNyAyMDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHBhdGggZmlsbD0iIzFBNzJGRSIgZD0iTTEwMi41LDUuMkM1MC44LDUuMiw4LjgsNDcuMiw4LjgsOTlzNDIsOTMuNSw5My44LDkzLjVzOTMuOC00Miw5My44LTkzLjhTMTU0LjIsNS4yLDEwMi41LDUuMnogTTEyNy4yLDExOS4yCgljLTYuMiwwLTIxLjcsMC4zLTIxLjcsMC4zbC03LDI3aC0yOWw2LjgtMjYuNUgzMWw3LjItMjEuOGMwLDAsNzguOCwwLjIsODUuMiwwYzYuNS0wLjIsMTYuNS0xLjgsMTYuOC0xNC44YzAuMy0xNy44LTI3LTE2LjgtMjkuMi0xCgljLTEuNSwxMC0xLjUsMTIuNS0xLjUsMTIuNUg4My44bDUtMjMuNUg0N2w2LjMtMjJjMCwwLDYxLjIsMC4yLDcyLjgsMC4yczQyLjIsMyw0Mi4yLDMxLjJDMTY4LjIsMTEyLDEzOC41LDExOS4zLDEyNy4yLDExOS4yCglMMTI3LjIsMTE5LjJ6Ii8+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$m([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isHyperPay]) };}
  } HyperPay.__initStatic(); HyperPay.__initStatic2();

  function _optionalChain$l(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class MagicEdenEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Magic Eden',
      logo: logos.magicEden,
      blockchains: ['ethereum', 'polygon'],
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$l([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isMagicEden])
      )
    };}
  } MagicEdenEVM.__initStatic(); MagicEdenEVM.__initStatic2();

  function _optionalChain$k(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class MagicEdenSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Magic Eden',
      logo: logos.magicEden,
      blockchains: ['solana'],
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$k([window, 'optionalAccess', _3 => _3.solana, 'optionalAccess', _4 => _4.isMagicEden])
      )
    };}
  } MagicEdenSVM.__initStatic(); MagicEdenSVM.__initStatic2();

  function _optionalChain$j(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class MetaMask extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'MetaMask',
      logo: "data:image/svg+xml;base64,PHN2ZyBpZD0nTGF5ZXJfMScgZGF0YS1uYW1lPSdMYXllciAxJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0ODUuOTMgNDUwLjU2Jz48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzgyODQ4Nzt9LmNscy0ye2ZpbGw6I2UyNzcyNjtzdHJva2U6I2UyNzcyNjt9LmNscy0xMCwuY2xzLTExLC5jbHMtMiwuY2xzLTMsLmNscy00LC5jbHMtNSwuY2xzLTYsLmNscy03LC5jbHMtOCwuY2xzLTl7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uY2xzLTN7ZmlsbDojZTM3NzI1O3N0cm9rZTojZTM3NzI1O30uY2xzLTR7ZmlsbDojZDZjMGIzO3N0cm9rZTojZDZjMGIzO30uY2xzLTV7ZmlsbDojMjQzNDQ3O3N0cm9rZTojMjQzNDQ3O30uY2xzLTZ7ZmlsbDojY2Q2MzI4O3N0cm9rZTojY2Q2MzI4O30uY2xzLTd7ZmlsbDojZTM3NTI1O3N0cm9rZTojZTM3NTI1O30uY2xzLTh7ZmlsbDojZjY4NTFmO3N0cm9rZTojZjY4NTFmO30uY2xzLTl7ZmlsbDojYzFhZTllO3N0cm9rZTojYzFhZTllO30uY2xzLTEwe2ZpbGw6IzE3MTcxNztzdHJva2U6IzE3MTcxNzt9LmNscy0xMXtmaWxsOiM3NjNlMWE7c3Ryb2tlOiM3NjNlMWE7fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSdjbHMtMScgZD0nTTI0Ny45MSwzNTYuMjlhMjYsMjYsMCwxLDAtMjYsMjZBMjYsMjYsMCwwLDAsMjQ3LjkxLDM1Ni4yOVonIHRyYW5zZm9ybT0ndHJhbnNsYXRlKC03Ljk3IC0yMS4zMyknLz48cGF0aCBjbGFzcz0nY2xzLTEnIGQ9J00yNDYuNTUsMTQ5LjcxYTI2LDI2LDAsMSwwLTI2LDI2QTI2LDI2LDAsMCwwLDI0Ni41NSwxNDkuNzFaJyB0cmFuc2Zvcm09J3RyYW5zbGF0ZSgtNy45NyAtMjEuMzMpJy8+PGNpcmNsZSBjbGFzcz0nY2xzLTEnIGN4PScxNDguNCcgY3k9JzIzMC4wNScgcj0nMjUuOTknLz48cG9seWdvbiBjbGFzcz0nY2xzLTInIHBvaW50cz0nNDYxLjI4IDAuNSAyNzIuMDYgMTQxLjAzIDMwNy4wNSA1OC4xMiA0NjEuMjggMC41Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzI0LjQ2IDAuNSAyMTIuMTYgMTQyLjM3IDE3OC44OCA1OC4xMiAyNC40NiAwLjUnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMzkzLjIgMzI2LjI2IDM0Mi44MSA0MDMuNDcgNDUwLjYzIDQzMy4xNCA0ODEuNjMgMzI3Ljk3IDM5My4yIDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPSc0LjQ5IDMyNy45NyAzNS4zIDQzMy4xNCAxNDMuMTMgNDAzLjQ3IDkyLjczIDMyNi4yNiA0LjQ5IDMyNy45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMycgcG9pbnRzPScxMzcuMDQgMTk1LjggMTA3IDI0MS4yNSAyMTQuMDYgMjQ2LjAxIDIxMC4yNiAxMzAuOTYgMTM3LjA0IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzM0OC43IDE5NS44IDI3NC41MyAxMjkuNjMgMjcyLjA2IDI0Ni4wMSAzNzguOTQgMjQxLjI1IDM0OC43IDE5NS44Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy0zJyBwb2ludHM9JzE0My4xMyA0MDMuNDcgMjA3LjQxIDM3Mi4wOSAxNTEuODggMzI4LjczIDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTMnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAzNDIuODEgNDAzLjQ3IDMzMy44NyAzMjguNzMgMjc4LjM0IDM3Mi4wOScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPSczNDIuODEgNDAzLjQ3IDI3OC4zNCAzNzIuMDkgMjgzLjQ3IDQxNC4xMiAyODIuOSA0MzEuODEgMzQyLjgxIDQwMy40NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNCcgcG9pbnRzPScxNDMuMTMgNDAzLjQ3IDIwMy4wMyA0MzEuODEgMjAyLjY1IDQxNC4xMiAyMDcuNDEgMzcyLjA5IDE0My4xMyA0MDMuNDcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTUnIHBvaW50cz0nMjAzLjk4IDMwMC45NyAxNTAuMzUgMjg1LjE4IDE4OC4yIDI2Ny44OCAyMDMuOTggMzAwLjk3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy01JyBwb2ludHM9JzI4MS43NiAzMDAuOTcgMjk3LjU1IDI2Ny44OCAzMzUuNTggMjg1LjE4IDI4MS43NiAzMDAuOTcnLz48cG9seWdvbiBjbGFzcz0nY2xzLTYnIHBvaW50cz0nMTQzLjEzIDQwMy40NyAxNTIuMjUgMzI2LjI2IDkyLjczIDMyNy45NyAxNDMuMTMgNDAzLjQ3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy02JyBwb2ludHM9JzMzMy42OCAzMjYuMjYgMzQyLjgxIDQwMy40NyAzOTMuMiAzMjcuOTcgMzMzLjY4IDMyNi4yNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPSczNzguOTQgMjQxLjI1IDI3Mi4wNiAyNDYuMDEgMjgxLjk1IDMwMC45NyAyOTcuNzQgMjY3Ljg4IDMzNS43NyAyODUuMTggMzc4Ljk0IDI0MS4yNScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNicgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE4OC4zOSAyNjcuODggMjAzLjk4IDMwMC45NyAyMTQuMDYgMjQ2LjAxIDEwNyAyNDEuMjUgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtNycgcG9pbnRzPScxMDcgMjQxLjI1IDE1MS44OCAzMjguNzMgMTUwLjM1IDI4NS4xOCAxMDcgMjQxLjI1Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzMzNS43NyAyODUuMTggMzMzLjg3IDMyOC43MyAzNzguOTQgMjQxLjI1IDMzNS43NyAyODUuMTgnLz48cG9seWdvbiBjbGFzcz0nY2xzLTcnIHBvaW50cz0nMjE0LjA2IDI0Ni4wMSAyMDMuOTggMzAwLjk3IDIxNi41MyAzNjUuODIgMjE5LjM4IDI4MC40MyAyMTQuMDYgMjQ2LjAxJy8+PHBvbHlnb24gY2xhc3M9J2Nscy03JyBwb2ludHM9JzI3Mi4wNiAyNDYuMDEgMjY2LjkzIDI4MC4yNCAyNjkuMjEgMzY1LjgyIDI4MS45NSAzMDAuOTcgMjcyLjA2IDI0Ni4wMScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyODEuOTUgMzAwLjk3IDI2OS4yMSAzNjUuODIgMjc4LjM0IDM3Mi4wOSAzMzMuODcgMzI4LjczIDMzNS43NyAyODUuMTggMjgxLjk1IDMwMC45NycvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScxNTAuMzUgMjg1LjE4IDE1MS44OCAzMjguNzMgMjA3LjQxIDM3Mi4wOSAyMTYuNTMgMzY1LjgyIDIwMy45OCAzMDAuOTcgMTUwLjM1IDI4NS4xOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOScgcG9pbnRzPScyODIuOSA0MzEuODEgMjgzLjQ3IDQxNC4xMiAyNzguNzIgNDA5Ljk0IDIwNy4wMiA0MDkuOTQgMjAyLjY1IDQxNC4xMiAyMDMuMDMgNDMxLjgxIDE0My4xMyA0MDMuNDcgMTY0LjA1IDQyMC41OCAyMDYuNDUgNDUwLjA2IDI3OS4yOSA0NTAuMDYgMzIxLjg5IDQyMC41OCAzNDIuODEgNDAzLjQ3IDI4Mi45IDQzMS44MScvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTAnIHBvaW50cz0nMjc4LjM0IDM3Mi4wOSAyNjkuMjEgMzY1LjgyIDIxNi41MyAzNjUuODIgMjA3LjQxIDM3Mi4wOSAyMDIuNjUgNDE0LjEyIDIwNy4wMiA0MDkuOTQgMjc4LjcyIDQwOS45NCAyODMuNDcgNDE0LjEyIDI3OC4zNCAzNzIuMDknLz48cG9seWdvbiBjbGFzcz0nY2xzLTExJyBwb2ludHM9JzQ2OS4yNyAxNTAuMTYgNDg1LjQzIDcyLjU3IDQ2MS4yOCAwLjUgMjc4LjM0IDEzNi4yOCAzNDguNyAxOTUuOCA0NDguMTYgMjI0LjkgNDcwLjIyIDE5OS4yMyA0NjAuNzEgMTkyLjM4IDQ3NS45MiAxNzguNSA0NjQuMTMgMTY5LjM3IDQ3OS4zNSAxNTcuNzcgNDY5LjI3IDE1MC4xNicvPjxwb2x5Z29uIGNsYXNzPSdjbHMtMTEnIHBvaW50cz0nMC41IDcyLjU3IDE2LjY2IDE1MC4xNiA2LjM5IDE1Ny43NyAyMS42MSAxNjkuMzcgMTAuMDEgMTc4LjUgMjUuMjIgMTkyLjM4IDE1LjcxIDE5OS4yMyAzNy41OCAyMjQuOSAxMzcuMDQgMTk1LjggMjA3LjQxIDEzNi4yOCAyNC40NiAwLjUgMC41IDcyLjU3Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzQ0OC4xNiAyMjQuOSAzNDguNyAxOTUuOCAzNzguOTQgMjQxLjI1IDMzMy44NyAzMjguNzMgMzkzLjIgMzI3Ljk3IDQ4MS42MyAzMjcuOTcgNDQ4LjE2IDIyNC45Jy8+PHBvbHlnb24gY2xhc3M9J2Nscy04JyBwb2ludHM9JzEzNy4wNCAxOTUuOCAzNy41OCAyMjQuOSA0LjQ5IDMyNy45NyA5Mi43MyAzMjcuOTcgMTUxLjg4IDMyOC43MyAxMDcgMjQxLjI1IDEzNy4wNCAxOTUuOCcvPjxwb2x5Z29uIGNsYXNzPSdjbHMtOCcgcG9pbnRzPScyNzIuMDYgMjQ2LjAxIDI3OC4zNCAxMzYuMjggMzA3LjI0IDU4LjEyIDE3OC44OCA1OC4xMiAyMDcuNDEgMTM2LjI4IDIxNC4wNiAyNDYuMDEgMjE2LjM0IDI4MC42MiAyMTYuNTMgMzY1LjgyIDI2OS4yMSAzNjUuODIgMjY5LjU5IDI4MC42MiAyNzIuMDYgMjQ2LjAxJy8+PC9zdmc+",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isMetaMask = (provider)=> {
      return(
        _optionalChain$j([provider, 'optionalAccess', _3 => _3.isMetaMask]) &&
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
        MetaMask.isMetaMask(_optionalChain$j([window, 'optionalAccess', _4 => _4.ethereum]))
      )
    };}

    getProvider() {
      return MetaMask.getEip6963Provider() || (MetaMask.isMetaMask(_optionalChain$j([window, 'optionalAccess', _5 => _5.ethereum])) && _optionalChain$j([window, 'optionalAccess', _6 => _6.ethereum]))
    }
  } MetaMask.__initStatic(); MetaMask.__initStatic2(); MetaMask.__initStatic3(); MetaMask.__initStatic4();

  function _optionalChain$i(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class OKXEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'OKX',
      logo: logos.okx,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$i([window, 'optionalAccess', _2 => _2.okxwallet])
      )
    };}
  } OKXEVM.__initStatic(); OKXEVM.__initStatic2();

  function _optionalChain$h(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class OKXSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'OKX',
      logo: logos.okx,
      blockchains: ['solana'],
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$h([window, 'optionalAccess', _3 => _3.solana, 'optionalAccess', _4 => _4.isOkxWallet])
      )
    };}
  } OKXSVM.__initStatic(); OKXSVM.__initStatic2();

  function _optionalChain$g(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Opera extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Opera',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCA3NS42IDc1LjYiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMzMzMyAwIDAgLTEuMzMzMyAwIDEwNy4yKSI+CiAgCiAgPGxpbmVhckdyYWRpZW50IGlkPSJvcGVyYUxvZ28wMDAwMDAxMjM1MTEiIHgxPSItMTA3LjM0IiB4Mj0iLTEwNi4zNCIgeTE9Ii0xMzcuODUiIHkyPSItMTM3Ljg1IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAgLTczLjI1NyAtNzMuMjU3IDAgLTEwMDc1IC03Nzg0LjEpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRkYxQjJEIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjMiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjFCMkQiIG9mZnNldD0iLjYxNCIvPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iI0E3MDAxNCIgb2Zmc2V0PSIxIi8+CiAgPC9saW5lYXJHcmFkaWVudD4KICAKICA8cGF0aCBmaWxsPSJ1cmwoI29wZXJhTG9nbzAwMDAwMDEyMzUxMSkiIGQ9Im0yOC4zIDgwLjRjLTE1LjYgMC0yOC4zLTEyLjctMjguMy0yOC4zIDAtMTUuMiAxMi0yNy42IDI3LTI4LjNoMS40YzcuMyAwIDEzLjkgMi43IDE4LjkgNy4yLTMuMy0yLjItNy4yLTMuNS0xMS40LTMuNS02LjggMC0xMi44IDMuMy0xNi45IDguNi0zLjEgMy43LTUuMiA5LjItNS4zIDE1LjN2MS4zYzAuMSA2LjEgMi4yIDExLjYgNS4zIDE1LjMgNC4xIDUuMyAxMC4xIDguNiAxNi45IDguNiA0LjIgMCA4LTEuMyAxMS40LTMuNS01IDQuNS0xMS42IDcuMi0xOC44IDcuMi0wLjEgMC4xLTAuMSAwLjEtMC4yIDAuMXoiLz4KICAKICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9Ii0xMDcuMDYiIHgyPSItMTA2LjA2IiB5MT0iLTEzOC4wNCIgeTI9Ii0xMzguMDQiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMCAtNjQuNzkyIC02NC43OTIgMCAtODkwNi4yIC02ODYwLjQpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjOUMwMDAwIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iLjciLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRjRCNEIiIG9mZnNldD0iMSIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPHBhdGggZD0ibTE5IDY4YzIuNiAzLjEgNiA0LjkgOS42IDQuOSA4LjMgMCAxNC45LTkuNCAxNC45LTIwLjlzLTYuNy0yMC45LTE0LjktMjAuOWMtMy43IDAtNyAxLjktOS42IDQuOSA0LjEtNS4zIDEwLjEtOC42IDE2LjktOC42IDQuMiAwIDggMS4zIDExLjQgMy41IDUuOCA1LjIgOS41IDEyLjcgOS41IDIxLjFzLTMuNyAxNS45LTkuNSAyMS4xYy0zLjMgMi4yLTcuMiAzLjUtMTEuNCAzLjUtNi44IDAuMS0xMi44LTMuMy0xNi45LTguNiIgZmlsbD0idXJsKCNiKSIvPgo8L2c+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ return _optionalChain$g([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isOpera]) };}
  } Opera.__initStatic(); Opera.__initStatic2();

  function _optionalChain$f(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
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
        ! _optionalChain$f([window, 'optionalAccess', _4 => _4.ethereum, 'optionalAccess', _5 => _5.isMagicEden]) &&
        ! _optionalChain$f([window, 'optionalAccess', _6 => _6.okxwallet])
      )
    };}

    getProvider() { 
      return _optionalChain$f([window, 'optionalAccess', _7 => _7.phantom, 'optionalAccess', _8 => _8.ethereum]) || window.ethereum
    }
  } PhantomEVM.__initStatic(); PhantomEVM.__initStatic2();

  function _optionalChain$e(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class PhantomSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Phantom',
      logo: logos.phantom,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        window.phantom &&
        !window.glow &&
        !_optionalChain$e([window, 'optionalAccess', _8 => _8.solana, 'optionalAccess', _9 => _9.isGlow]) &&
        !_optionalChain$e([window, 'optionalAccess', _10 => _10.solana, 'optionalAccess', _11 => _11.isExodus]) &&
        ! _optionalChain$e([window, 'optionalAccess', _12 => _12.ethereum, 'optionalAccess', _13 => _13.isMagicEden]) &&
        ! _optionalChain$e([window, 'optionalAccess', _14 => _14.okxwallet]) &&
        !['isBitKeep'].some((identifier)=>window.solana && window.solana[identifier])
      )
    };}

    getProvider() { 
      return _optionalChain$e([window, 'optionalAccess', _15 => _15.phantom, 'optionalAccess', _16 => _16.solana]) || window.solana
    }
  } PhantomSVM.__initStatic(); PhantomSVM.__initStatic2();

  function _optionalChain$d(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Rabby extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Rabby',
      logo: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9ImthdG1hbl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjA0IDE1MiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjA0IDE1MjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOnVybCgjU1ZHSURfMV8pO30KCS5zdDF7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTE4MzY5MTkwNjY5MjcyNDcwNjgwMDAwMDE1NjE0NDY3MTMxNjE1Mjc5NDkxXyk7fQoJLnN0MntmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOnVybCgjU1ZHSURfMDAwMDAwNjU3Nzc0NTQ3NDc4MDEzNzcwNTAwMDAwMDcwMDM5OTUyODQ2NDY5NTk3NzVfKTt9Cgkuc3Qze2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDA5MTY5NjU3NTkzMjA0MzQxNTM5MDAwMDAwMTAyMTU2NDM5MjA1MDA3ODg1Nl8pO30KPC9zdHlsZT4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8xXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSI3MS4zNDE4IiB5MT0iNDE5LjA4NjkiIHgyPSIxNzUuMjg4MSIgeTI9IjQ0OC41NjQxIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMCAtMzQ2KSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojODc5N0ZGIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojQUFBOEZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNzYuNCw4NS40YzUuOS0xMy4yLTIzLjMtNTAuMS01MS4yLTY1LjNDMTA3LjUsOC4xLDg5LjMsOS43LDg1LjUsMTVjLTguMSwxMS40LDI3LDIxLjMsNTAuNCwzMi41CgljLTUuMSwyLjItOS44LDYuMi0xMi41LDExLjFDMTE0LjcsNDksOTUuNSw0MC44LDczLDQ3LjVjLTE1LjIsNC40LTI3LjgsMTUuMS0zMi43LDMwLjljLTEuMS0wLjUtMi41LTAuOC0zLjgtMC44CgljLTUuMiwwLTkuNSw0LjMtOS41LDkuNWMwLDUuMiw0LjMsOS41LDkuNSw5LjVjMSwwLDQtMC42LDQtMC42bDQ4LjgsMC4zYy0xOS41LDMxLjEtMzUsMzUuNS0zNSw0MC45czE0LjcsNCwyMC4zLDEuOQoJYzI2LjYtOS41LDU1LjItMzkuNSw2MC4xLTQ4LjFDMTU1LjMsOTMuOCwxNzIuNSw5My45LDE3Ni40LDg1LjR6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAwMzg0MDY0NTAzNDY5MjQ4NjkzNTAwMDAwMDA5NDQzOTczMDQwMTQ3OTk1NDdfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjE1My45OTAyIiB5MT0iNDIxLjM0NzQiIHgyPSI3OC45ODgzIiB5Mj0iMzQ2LjE2MTgiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAwIC0zNDYpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMzQjIyQTAiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiM1MTU2RDg7c3RvcC1vcGFjaXR5OjAiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDAzODQwNjQ1MDM0NjkyNDg2OTM1MDAwMDAwMDk0NDM5NzMwNDAxNDc5OTU0N18pOyIgZD0iCglNMTM2LjEsNDcuNUwxMzYuMSw0Ny41YzEuMS0wLjUsMS0yLjEsMC42LTMuM2MtMC42LTIuOS0xMi41LTE0LjYtMjMuNi0xOS44Yy0xNS4yLTcuMS0yNi4zLTYuOC0yNy45LTMuNWMzLDYuMywxNy40LDEyLjIsMzIuNCwxOC42CglDMTIzLjcsNDEuOSwxMzAuMiw0NC42LDEzNi4xLDQ3LjVMMTM2LjEsNDcuNXoiLz4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8wMDAwMDE0NzIyMDY3MjYxNTU0Nzk0MjI0MDAwMDAxMTg5NDM0ODEwNDAwNzM1NDA0NF8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTE4Ljc4NjUiIHkxPSI0NTkuOTQ1OSIgeDI9IjQ2LjczODgiIHkyPSI0MTguNTIzNiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTM0NikiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzNCMUU4RiIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IzZBNkZGQjtzdG9wLW9wYWNpdHk6MCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMTQ3MjIwNjcyNjE1NTQ3OTQyMjQwMDAwMDExODk0MzQ4MTA0MDA3MzU0MDQ0Xyk7IiBkPSIKCU0xMTYuNywxMTEuMmMtMy0xLjEtNi41LTIuMi0xMC41LTMuMmM0LjEtNy41LDUuMS0xOC43LDEuMS0yNS43Yy01LjYtOS44LTEyLjUtMTUuMS0yOC45LTE1LjFjLTguOSwwLTMzLDMtMzMuNSwyMy4yCgljMCwyLjEsMCw0LDAuMiw1LjlsNDQuMSwwYy01LjksOS40LTExLjQsMTYuMy0xNi4zLDIxLjZjNS45LDEuNCwxMC42LDIuNywxNS4xLDRjNC4xLDEuMSw4LjEsMi4xLDEyLjEsMy4yCglDMTA2LjEsMTIwLjYsMTExLjgsMTE1LjgsMTE2LjcsMTExLjJ6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxMjg0NzQ1MTgwNjUxMjc5MDc2OTAwMDAwMDg3OTM1NDY5MjM0OTg1OTA4NjFfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjY2LjM2MDQiIHkxPSI0MjcuNjAyIiB4Mj0iMTE1LjA1OTMiIHkyPSI0ODkuNDc5MiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgLTM0NikiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6Izg4OThGRiIvPgoJPHN0b3AgIG9mZnNldD0iMC45ODM5IiBzdHlsZT0ic3RvcC1jb2xvcjojNUY0N0YxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxMjg0NzQ1MTgwNjUxMjc5MDc2OTAwMDAwMDg3OTM1NDY5MjM0OTg1OTA4NjFfKTsiIGQ9Ik0zOS43LDkzLjljMS43LDE1LjIsMTAuNSwyMS4zLDI4LjIsMjMKCWMxNy44LDEuNywyNy45LDAuNiw0MS40LDEuN2MxMS4zLDEsMjEuNCw2LjgsMjUuMSw0LjhjMy4zLTEuNywxLjQtOC4yLTMtMTIuNGMtNS45LTUuNC0xNC05LTI4LjEtMTAuNWMyLjktNy44LDIuMS0xOC43LTIuNC0yNC42CgljLTYuMy04LjYtMTguMS0xMi40LTMzLTEwLjhDNTIuMyw2Ny4xLDM3LjQsNzQuOSwzOS43LDkzLjl6Ii8+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{ 
      return(
        _optionalChain$d([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isRabby])
      )
    };}
  } Rabby.__initStatic(); Rabby.__initStatic2();

  function _optionalChain$c(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Rainbow extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Rainbow',
      logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzhIMjZDNTYuOTI3OSAzOCA4MiA2My4wNzIxIDgyIDk0VjEwMEg5NEM5Ny4zMTM3IDEwMCAxMDAgOTcuMzEzNyAxMDAgOTRDMTAwIDUzLjEzMDkgNjYuODY5MSAyMCAyNiAyMEMyMi42ODYzIDIwIDIwIDIyLjY4NjMgMjAgMjZWMzhaIiBmaWxsPSJ1cmwoI3BhaW50MV9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNODQgOTRIMTAwQzEwMCA5Ny4zMTM3IDk3LjMxMzcgMTAwIDk0IDEwMEg4NFY5NFoiIGZpbGw9InVybCgjcGFpbnQyX2xpbmVhcl82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiAyMEwyNiAzNkgyMEwyMCAyNkMyMCAyMi42ODYzIDIyLjY4NjMgMjAgMjYgMjBaIiBmaWxsPSJ1cmwoI3BhaW50M19saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzZIMjZDNTguMDMyNSAzNiA4NCA2MS45Njc1IDg0IDk0VjEwMEg2NlY5NEM2NiA3MS45MDg2IDQ4LjA5MTQgNTQgMjYgNTRIMjBWMzZaIiBmaWxsPSJ1cmwoI3BhaW50NF9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNNjggOTRIODRWMTAwSDY4Vjk0WiIgZmlsbD0idXJsKCNwYWludDVfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDUyTDIwIDM2TDI2IDM2TDI2IDUySDIwWiIgZmlsbD0idXJsKCNwYWludDZfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDYyQzIwIDY1LjMxMzcgMjIuNjg2MyA2OCAyNiA2OEM0MC4zNTk0IDY4IDUyIDc5LjY0MDYgNTIgOTRDNTIgOTcuMzEzNyA1NC42ODYzIDEwMCA1OCAxMDBINjhWOTRDNjggNzAuODA0IDQ5LjE5NiA1MiAyNiA1MkgyMFY2MloiIGZpbGw9InVybCgjcGFpbnQ3X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik01MiA5NEg2OFYxMDBINThDNTQuNjg2MyAxMDAgNTIgOTcuMzEzNyA1MiA5NFoiIGZpbGw9InVybCgjcGFpbnQ4X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiA2OEMyMi42ODYzIDY4IDIwIDY1LjMxMzcgMjAgNjJMMjAgNTJMMjYgNTJMMjYgNjhaIiBmaWxsPSJ1cmwoI3BhaW50OV9yYWRpYWxfNjJfMzI5KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzYyXzMyOSIgeDE9IjYwIiB5MT0iMCIgeDI9IjYwIiB5Mj0iMTIwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxNzQyOTkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDAxRTU5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQxX3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYgOTQpIHJvdGF0ZSgtOTApIHNjYWxlKDc0KSI+CjxzdG9wIG9mZnNldD0iMC43NzAyNzciIHN0b3AtY29sb3I9IiNGRjQwMDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODc1NEM5Ii8+CjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQyX2xpbmVhcl82Ml8zMjkiIHgxPSI4MyIgeTE9Ijk3IiB4Mj0iMTAwIiB5Mj0iOTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGNDAwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDNfbGluZWFyXzYyXzMyOSIgeDE9IjIzIiB5MT0iMjAiIHgyPSIyMyIgeTI9IjM3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY0MDAwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ0X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYgOTQpIHJvdGF0ZSgtOTApIHNjYWxlKDU4KSI+CjxzdG9wIG9mZnNldD0iMC43MjM5MjkiIHN0b3AtY29sb3I9IiNGRkY3MDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY5OTAxIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ1X2xpbmVhcl82Ml8zMjkiIHgxPSI2OCIgeTE9Ijk3IiB4Mj0iODQiIHkyPSI5NyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRkZGNzAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfNjJfMzI5IiB4MT0iMjMiIHkxPSI1MiIgeDI9IjIzIiB5Mj0iMzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRjcwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjk5MDEiLz4KPC9saW5lYXJHcmFkaWVudD4KPHJhZGlhbEdyYWRpZW50IGlkPSJwYWludDdfcmFkaWFsXzYyXzMyOSIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgyNiA5NCkgcm90YXRlKC05MCkgc2NhbGUoNDIpIj4KPHN0b3Agb2Zmc2V0PSIwLjU5NTEzIiBzdG9wLWNvbG9yPSIjMDBBQUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50OF9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDUxIDk3KSBzY2FsZSgxNyA0NS4zMzMzKSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMEFBRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDFEQTQwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ5X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjMgNjkpIHJvdGF0ZSgtOTApIHNjYWxlKDE3IDMyMi4zNykiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBBQUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.getEip6963Provider = ()=>{
      return window['_eip6963Providers'] ? Object.values(window['_eip6963Providers']).find((provider)=>{
        return _optionalChain$c([provider, 'optionalAccess', _4 => _4.isRainbow])
      }) : undefined
    };}

    static __initStatic3() {this.isAvailable = async()=>{
      return(
        Rainbow.getEip6963Provider() ||
        _optionalChain$c([window, 'optionalAccess', _5 => _5.rainbow, 'optionalAccess', _6 => _6.isRainbow])
      )
    };}

    getProvider() {
      return Rainbow.getEip6963Provider() || _optionalChain$c([window, 'optionalAccess', _7 => _7.rainbow])
    }

  } Rainbow.__initStatic(); Rainbow.__initStatic2(); Rainbow.__initStatic3();

  function _optionalChain$b(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


  const KEY$1 = '_DePayWeb3WalletsConnectedSolanaMobileWalletInstance';

  const base64StringToPublicKey = (base64String)=> {
    const binaryString = window.atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new solanaWeb3_js.PublicKey(bytes)
  };

  const getIdentity = ()=>{
    return({
      name: document.title,
      uri:  window.location.origin.toString(),
      icon: getFavicon()
    })
  };

  var getFavicon = function(){
    var favicon = 'favicon.ico';
    var nodeList = document.getElementsByTagName("link");
    for (var i = 0; i < nodeList.length; i++)
    {
      if((nodeList[i].getAttribute("rel") == "icon")||(nodeList[i].getAttribute("rel") == "shortcut icon"))
      {
        favicon = nodeList[i].getAttribute("href");
      }
    }
    const explodedPath = favicon.split('/');
    return explodedPath[explodedPath.length-1]
  };

  let authToken;

  class SolanaMobileWalletAdapter {

    static __initStatic() {this.info = {
      name: 'Solana Mobile Wallet',
      logo: "",
      blockchains: ['solana']
    };}

    constructor() {
      this.name = (localStorage[KEY$1+'_name'] && localStorage[KEY$1+'_name'] != undefined) ? localStorage[KEY$1+'_name'] : this.constructor.info.name;
      this.logo = (localStorage[KEY$1+'_logo'] && localStorage[KEY$1+'_logo'] != undefined) ? localStorage[KEY$1+'_logo'] : this.constructor.info.logo;
      this.blockchains = this.constructor.info.blockchains;
      this.sendTransaction = (transaction)=>{ 
        return sendTransaction$3({
          wallet: this,
          transaction
        })
      };
    }

    async authorize(wallet) {
      let authorization = await wallet.authorize({
        cluster: 'mainnet-beta',
        identity: getIdentity(),
      });
      if(!authorization || !authorization.auth_token || !authorization.accounts || authorization.accounts.length === 0) { return }
      authToken = authorization.auth_token;
      this._account = base64StringToPublicKey(authorization.accounts[0].address).toString();
      return authorization
    }

    async reauthorize(wallet, authToken) {
      let authorization = await wallet.reauthorize({
        auth_token: authToken,
        identity: getIdentity()
      });
      if(!authorization || !authorization.auth_token || !authorization.accounts || authorization.accounts.length === 0) { return }
      authToken = authorization.auth_token;
      this._account = base64StringToPublicKey(authorization.accounts[0].address).toString();
      return authorization
    }

    disconnect() {}

    async account() {
      return this._account
    }

    async connect(options) {
      await solanaWeb3_js.transact(
        async (wallet) => {
          await this.authorize(wallet);
          if(_optionalChain$b([options, 'optionalAccess', _ => _.name])) { localStorage[KEY$1+'_name'] = this.name = options.name; }
          if(_optionalChain$b([options, 'optionalAccess', _2 => _2.logo])) { localStorage[KEY$1+'_logo'] = this.logo = options.logo; }
        }
      );
      return this._account
    }

    static __initStatic2() {this.isAvailable = async()=>{
      return authToken
    };}

    async connectedTo(input) {
      if(input) {
        return input == 'solana'
      } else {
        return 'solana'
      }
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

    on(event, callback) {}

    off(event, callback) {}

    async sign(message) {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await solanaWeb3_js.transact(async (wallet) => {
        const authorization = await this.reauthorize(wallet, authToken);
        const signedMessages = await wallet.signMessages({
          addresses: [authorization.accounts[0].address],
          payloads: [encodedMessage],
        });
        return signedMessages[0]
      });
      return signedMessage
    }

    async _sendTransaction(transaction) {
      const signature = await solanaWeb3_js.transact(async (wallet) => {
        await this.reauthorize(wallet, authToken);
        const transactionSignatures = await wallet.signAndSendTransactions({
          transactions: [transaction]
        });
        return transactionSignatures[0]
      });
      return signature
    }
  } SolanaMobileWalletAdapter.__initStatic(); SolanaMobileWalletAdapter.__initStatic2();

  function _optionalChain$a(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class Solflare extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Solflare',
      logo: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MCA1MCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTAgNTA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Cgkuc3Qxe2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDA0MTI1OTU5ODg4MjM0NDgzNTI5MDAwMDAxMjg1ODg4NTIyOTkwNzM1MjI0MF8pO30KPC9zdHlsZT4KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8xXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxMC43OTg4IiB5MT0iMzkuOTEwOCIgeDI9IjMyLjM5NzYiIHkyPSIyMC4zNTc4IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIC0xIDAgNTIpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkMxMEIiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNGQjNGMkUiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTI1LjEsNDIuNGMwLjQsMCwwLjcsMC4zLDAuNywwLjdjMCwwLjQtMC4zLDAuNy0wLjcsMC43cy0wLjctMC4zLTAuNy0wLjdDMjQuNCw0Mi43LDI0LjcsNDIuNCwyNS4xLDQyLjR6CgkgTTI0LjMsOC4zYzAuNCwwLDAuNiwwLjMsMC43LDAuNmwwLjksNi4yYzAuMywyLjEsMi44LDMsNC4zLDEuNmw4LjYtNy44YzAuMi0wLjIsMC41LTAuMiwwLjcsMGMwLjIsMC4yLDAuMiwwLjUsMCwwLjdMMzIsMTguMgoJYy0xLjQsMS42LTAuNCw0LjEsMS43LDQuM2w2LjYsMC42YzAuMywwLDAuNiwwLjMsMC41LDAuNmMwLDAuMy0wLjIsMC41LTAuNSwwLjVsLTcsMS4xYy0yLDAuMy0yLjksMi43LTEuNiw0LjJsMi40LDIuOQoJYzAuMiwwLjIsMC4yLDAuNi0wLjEsMC44Yy0wLjIsMC4yLTAuNSwwLjItMC43LDBsLTMtMi4zYy0xLjYtMS4yLTQtMC4yLTQuMSwxLjhsLTAuNyw3LjljMCwwLjMtMC4zLDAuNi0wLjYsMC41CgljLTAuMywwLTAuNS0wLjItMC41LTAuNWwtMS4xLTcuNmMtMC4zLTIuMS0yLjgtMy00LjMtMS42TDEwLDM5LjljLTAuMiwwLjItMC41LDAuMi0wLjcsMGMtMC4yLTAuMi0wLjItMC40LDAtMC42bDgtOS4yCgljMS40LTEuNiwwLjQtNC4xLTEuNy00LjNsLTYuNi0wLjZjLTAuMywwLTAuNi0wLjMtMC41LTAuNmMwLTAuMywwLjItMC41LDAuNS0wLjVsNy0xLjFjMi0wLjMsMi45LTIuNywxLjYtNC4ybC0xLjctMgoJYy0wLjItMC4zLTAuMi0wLjcsMC4xLTFjMC4yLTAuMiwwLjYtMC4yLDAuOSwwbDIsMS41YzEuNiwxLjIsNCwwLjIsNC4xLTEuOGwwLjYtNi41QzIzLjUsOC41LDIzLjksOC4yLDI0LjMsOC4zeiBNNi43LDIzLjgKCWMwLjQsMCwwLjcsMC4zLDAuNywwLjdzLTAuMywwLjctMC43LDAuN2MtMC40LDAtMC43LTAuMy0wLjctMC43UzYuMywyMy44LDYuNywyMy44eiBNNDIuOSwyMy4xYzAuNCwwLDAuNywwLjMsMC43LDAuNwoJYzAsMC40LTAuMywwLjctMC43LDAuN2MtMC40LDAtMC43LTAuMy0wLjctMC43QzQyLjIsMjMuNCw0Mi41LDIzLjEsNDIuOSwyMy4xeiBNMjQuMiw2YzAuNCwwLDAuNywwLjMsMC43LDAuNwoJYzAsMC40LTAuMywwLjctMC43LDAuN2MtMC40LDAtMC43LTAuMy0wLjctMC43QzIzLjUsNi4zLDIzLjgsNiwyNC4yLDZ6Ii8+CjxyYWRpYWxHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxMDAzNTM3NjAxMTAwMjExMTQ0NDAwMDAwMDg4MDc5Mzk1MzE2NjY5Njc5MzhfIiBjeD0iLTIwMS40OTc5IiBjeT0iMjg1LjIxMTkiIHI9IjAuNzU5NyIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCg0Ljk5MjIgMTIuMDYzOSAxMi4xODExIC01LjA0MDcgLTI0NDUuMjIzNCAzODkwLjE2MzYpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojRkZDMTBCIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojRkIzRjJFIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxMDAzNTM3NjAxMTAwMjExMTQ0NDAwMDAwMDg4MDc5Mzk1MzE2NjY5Njc5MzhfKTsiIGQ9Ik0yNC42LDMwLjljMy44LDAsNi44LTMsNi44LTYuNwoJYzAtMy43LTMuMS02LjctNi44LTYuN3MtNi44LDMtNi44LDYuN0MxNy44LDI3LjksMjAuOSwzMC45LDI0LjYsMzAuOXoiLz4KPC9zdmc+Cg==',
      blockchains: ['solana']
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$a([window, 'optionalAccess', _2 => _2.solflare]) &&
        window.solflare.isSolflare
      )
    };}

    getProvider() { return window.solflare }

    _sendTransaction(transaction) { return this.getProvider().signTransaction(transaction) }
  } Solflare.__initStatic(); Solflare.__initStatic2();

  function _optionalChain$9(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class TokenPocket extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'TP Wallet (TokenPocket)',
      logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8bWFzayBpZD0ibWFzazBfNDA4XzIyNSIgc3R5bGU9Im1hc2stdHlwZTphbHBoYSIgbWFza1VuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCI+CjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiNDNEM0QzQiLz4KPC9tYXNrPgo8ZyBtYXNrPSJ1cmwoI21hc2swXzQwOF8yMjUpIj4KPHBhdGggZD0iTTEwNDEuNTIgMEgtMjdWMTAyNEgxMDQxLjUyVjBaIiBmaWxsPSIjMjk4MEZFIi8+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF80MDhfMjI1KSI+CjxwYXRoIGQ9Ik00MDYuNzk2IDQzOC42NDNINDA2LjkyN0M0MDYuNzk2IDQzNy44NTcgNDA2Ljc5NiA0MzYuOTQgNDA2Ljc5NiA0MzYuMTU0VjQzOC42NDNaIiBmaWxsPSIjMjlBRUZGIi8+CjxwYXRoIGQ9Ik02NjcuNjAyIDQ2My41MzNINTIzLjI0OVY3MjQuMDc2QzUyMy4yNDkgNzM2LjM4OSA1MzMuMjA0IDc0Ni4zNDUgNTQ1LjUxNyA3NDYuMzQ1SDY0NS4zMzNDNjU3LjY0NyA3NDYuMzQ1IDY2Ny42MDIgNzM2LjM4OSA2NjcuNjAyIDcyNC4wNzZWNDYzLjUzM1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00NTMuNTYzIDI3N0g0NDguNzE2SDE5MC4yNjlDMTc3Ljk1NSAyNzcgMTY4IDI4Ni45NTUgMTY4IDI5OS4yNjlWMzg5LjY1M0MxNjggNDAxLjk2NyAxNzcuOTU1IDQxMS45MjIgMTkwLjI2OSA0MTEuOTIySDI1MC45MThIMjc1LjAyMVY0MzguNjQ0VjcyNC43MzFDMjc1LjAyMSA3MzcuMDQ1IDI4NC45NzYgNzQ3IDI5Ny4yODkgNzQ3SDM5Mi4xMjhDNDA0LjQ0MSA3NDcgNDE0LjM5NiA3MzcuMDQ1IDQxNC4zOTYgNzI0LjczMVY0MzguNjQ0VjQzNi4xNTZWNDExLjkyMkg0MzguNDk5SDQ0OC4zMjNINDUzLjE3QzQ5MC4zNzIgNDExLjkyMiA1MjAuNjMxIDM4MS42NjMgNTIwLjYzMSAzNDQuNDYxQzUyMS4wMjQgMzA3LjI1OSA0OTAuNzY1IDI3NyA0NTMuNTYzIDI3N1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02NjcuNzM1IDQ2My41MzNWNjQ1LjM1QzY3Mi43MTMgNjQ2LjUyOSA2NzcuODIxIDY0Ny40NDYgNjgzLjA2MSA2NDguMjMyQzY5MC4zOTcgNjQ5LjI4IDY5Ny45OTQgNjQ5LjkzNSA3MDUuNTkyIDY1MC4wNjZDNzA1Ljk4NSA2NTAuMDY2IDcwNi4zNzggNjUwLjA2NiA3MDYuOTAyIDY1MC4wNjZWNTA1LjQ1QzY4NS4wMjYgNTA0LjAwOSA2NjcuNzM1IDQ4NS44MDEgNjY3LjczNSA0NjMuNTMzWiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzQwOF8yMjUpIi8+CjxwYXRoIGQ9Ik03MDkuNzgxIDI3N0M2MDYuODIyIDI3NyA1MjMuMjQ5IDM2MC41NzMgNTIzLjI0OSA0NjMuNTMzQzUyMy4yNDkgNTUyLjA4NCA1ODQuOTQ2IDYyNi4yMjUgNjY3LjczMyA2NDUuMzVWNDYzLjUzM0M2NjcuNzMzIDQ0MC4zNDcgNjg2LjU5NiA0MjEuNDg0IDcwOS43ODEgNDIxLjQ4NEM3MzIuOTY3IDQyMS40ODQgNzUxLjgzIDQ0MC4zNDcgNzUxLjgzIDQ2My41MzNDNzUxLjgzIDQ4My4wNTEgNzM4LjYgNDk5LjQyNSA3MjAuNTIzIDUwNC4xNEM3MTcuMTE3IDUwNS4wNTcgNzEzLjQ0OSA1MDUuNTgxIDcwOS43ODEgNTA1LjU4MVY2NTAuMDY2QzcxMy40NDkgNjUwLjA2NiA3MTYuOTg2IDY0OS45MzUgNzIwLjUyMyA2NDkuODA0QzgxOC41MDUgNjQ0LjE3MSA4OTYuMzE0IDU2Mi45NTYgODk2LjMxNCA0NjMuNTMzQzg5Ni40NDUgMzYwLjU3MyA4MTIuODcyIDI3NyA3MDkuNzgxIDI3N1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik03MDkuNzggNjUwLjA2NlY1MDUuNTgxQzcwOC43MzMgNTA1LjU4MSA3MDcuODE2IDUwNS41ODEgNzA2Ljc2OCA1MDUuNDVWNjUwLjA2NkM3MDcuODE2IDY1MC4wNjYgNzA4Ljg2NCA2NTAuMDY2IDcwOS43OCA2NTAuMDY2WiIgZmlsbD0id2hpdGUiLz4KPC9nPgo8L2c+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfNDA4XzIyNSIgeDE9IjcwOS44NDQiIHkxPSI1NTYuODI3IiB4Mj0iNjY3Ljc1MyIgeTI9IjU1Ni44MjciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0id2hpdGUiLz4KPHN0b3Agb2Zmc2V0PSIwLjk2NjciIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuMzIzMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzQwOF8yMjUiPgo8cmVjdCB3aWR0aD0iNzI4LjQ0OCIgaGVpZ2h0PSI0NzAiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNjggMjc3KSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=",
      blockchains: supported$1.evm
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        _optionalChain$9([window, 'optionalAccess', _3 => _3.ethereum, 'optionalAccess', _4 => _4.isTokenPocket])
      )
    };}
  } TokenPocket.__initStatic(); TokenPocket.__initStatic2();

  function _optionalChain$8(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class TrustEVM extends WindowEthereum {

    static __initStatic() {this.info = {
      name: 'Trust Wallet',
      logo: logos.trust,
      blockchains: supported$1.evm,
      platform: 'evm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return (
        (_optionalChain$8([window, 'optionalAccess', _5 => _5.ethereum, 'optionalAccess', _6 => _6.isTrust]) || _optionalChain$8([window, 'optionalAccess', _7 => _7.ethereum, 'optionalAccess', _8 => _8.isTrustWallet])) &&
        Object.keys(window.ethereum).filter((key)=>key.match(/^is(?!Connected)(?!Debug)(?!TrustWallet)(?!MetaMask)(?!PocketUniverse)(?!RevokeCash)/)).length == 1
      )
    };}
  } TrustEVM.__initStatic(); TrustEVM.__initStatic2();

  function _optionalChain$7(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class TrustSVM extends WindowSolana {

    static __initStatic() {this.info = {
      name: 'Trust Wallet',
      logo: logos.trust,
      blockchains: supported$1.solana,
      platform: 'svm',
    };}

    static __initStatic2() {this.isAvailable = async()=>{
      return _optionalChain$7([window, 'access', _3 => _3.solana, 'optionalAccess', _4 => _4.isTrustWallet])
    };}
  } TrustSVM.__initStatic(); TrustSVM.__initStatic2();

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
        transactionCount = parseInt((await web3Client.request({
          blockchain: this.blockchain,
          address: this.address,
          api: [{"inputs":[],"name":"nonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
          method: 'nonce',
        })).toString(), 10);
      }
      return transactionCount
    }

    async retrieveTransaction({ blockchain, tx }) {
      const provider = await web3Client.getProvider(blockchain);
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
    const provider = await web3Client.getProvider(blockchain);
    const code = await provider.getCode(address);
    return (code != '0x')
  };

  const identifySmartContractWallet = async (blockchain, address)=>{
    let name; 
    try {
      name = await web3Client.request({
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
    let transactionCount = await web3Client.request({ blockchain: transaction.blockchain, method: 'transactionCount', address: transaction.from });
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
        const provider = await web3Client.getProvider(blockchain);
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
    const provider = await web3Client.getProvider(transaction.blockchain);
    const blockchain = Blockchains__default['default'][transaction.blockchain];
    let gas;
    try {
      gas = await web3Client.estimate(transaction);
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
    const provider = await web3Client.getProvider(transaction.blockchain);
    let blockchain = Blockchains__default['default'][transaction.blockchain];
    let gas;
    try {
      gas = await web3Client.estimate(transaction);
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
        return await web3Client.request({ blockchain, method: 'transactionCount', address })
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
      return web3Client.request({ blockchain, method: 'transactionCount', address })
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
                web3Client.getProvider('worldchain').then((provider)=>{
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
        return web3Client.request({
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
    PhantomEVM,
    PhantomSVM,
    CoinbaseEVM,
    CoinbaseSVM,
    Binance,
    TrustEVM,
    TrustSVM,
    Backpack,
    Glow,
    Solflare,
    Rabby,
    Uniswap,
    Rainbow,
    BraveEVM,
    BraveSVM,
    MagicEdenEVM,
    MagicEdenSVM,
    OKXEVM,
    OKXSVM,
    Opera,
    Coin98EVM,
    Coin98SVM,
    CryptoCom,
    HyperPay,
    TokenPocket,
    ExodusEVM,
    ExodusSVM,
    WorldApp,

    // standards
    WindowEthereum,
    WindowSolana,
    SolanaMobileWalletAdapter,
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
    wallets.PhantomEVM,
    wallets.PhantomSVM,
    wallets.CoinbaseEVM,
    wallets.CoinbaseSVM,
    wallets.Binance,
    wallets.TrustEVM,
    wallets.TrustSVM,
    wallets.Backpack,
    wallets.Glow,
    wallets.Solflare,
    wallets.Rabby,
    wallets.Uniswap,
    wallets.Rainbow,
    wallets.BraveEVM,
    wallets.BraveSVM,
    wallets.Opera,
    wallets.Coin98EVM,
    wallets.Coin98SVM,
    wallets.CryptoCom,
    wallets.HyperPay,
    wallets.TokenPocket,
    wallets.MagicEdenEVM,
    wallets.MagicEdenSVM,
    wallets.OKXEVM,
    wallets.OKXSVM,
    wallets.ExodusEVM,
    wallets.ExodusSVM,
    wallets.WorldApp,

    // standards
    wallets.WalletConnectV2,
    wallets.SolanaMobileWalletAdapter,
    wallets.WalletLink,
    wallets.WindowEthereum,
  ];

  exports.getWallets = getWallets;
  exports.supported = supported;
  exports.wallets = wallets;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
