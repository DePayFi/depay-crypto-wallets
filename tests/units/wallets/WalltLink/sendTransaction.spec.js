import { ethers } from 'ethers'
import { getWallets, wallets } from 'src'
import { mock, connect, resetMocks, confirm, increaseBlock, fail } from '@depay/web3-mock'
import { provider } from '@depay/web3-client'
import { supported as supportedBlockchains } from 'src/blockchains'

describe('WalletLink: sendTransaction', () => {

  supportedBlockchains.evm.forEach((blockchain)=>{

    describe(blockchain, ()=> {

      let wallet

      const account = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      afterEach(resetMocks)
      beforeEach(async ()=>{
        resetMocks()
        mock({ accounts: { return: [account] }, blockchain, wallet: 'walletlink', connector: wallets.WalletLink })
        mock({ provider: provider(blockchain),  blockchain, wallet: 'walletlink', connector: wallets.WalletLink })
        await new wallets.WalletLink().connect()
        wallet = getWallets()[0]
        expect(wallet.name).toEqual('Coinbase')
      })

      let address = '0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92';
      let api = [{"inputs":[{"internalType":"address","name":"_configuration","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"configuration","outputs":[{"internalType":"contract DePayRouterV1Configuration","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"pluginAddress","type":"address"}],"name":"isApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"address[]","name":"addresses","type":"address[]"},{"internalType":"address[]","name":"plugins","type":"address[]"},{"internalType":"string[]","name":"data","type":"string[]"}],"name":"route","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
      let method = 'route';
      let params = {
        path: ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', '0xa0bEd124a09ac2Bd941b10349d8d224fe3c955eb'],
        amounts: ['7640757987460190', '10000000000000000000', '1623407305'],
        addresses: ['0x65aBbdEd9B937E38480A50eca85A8E4D2c8350E4'],
        plugins: ['0xe04b08Dfc6CaA0F4Ec523a3Ae283Ece7efE00019', '0x99F3F4685a7178F26EB4F4Ca8B75a1724F1577B9'],
        data: []
      };
      
      let transaction;
      let mockedTransaction;

      describe('complex contract transaction', ()=>{
        beforeEach(()=>{

          mockedTransaction = mock({
            blockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              api: api,
              method: method,
              params: params
            }
          })
          
          transaction = {
            blockchain,
            to: address,
            api: api,
            method: method,
            params: params
          };
        })
        
        it('allows to submit contract transaction', async ()=> {
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(submittedTransaction.id).toBeDefined()
          expect(submittedTransaction.url).toBeDefined()
          expect(submittedTransaction.blockchain).toEqual(blockchain)
          expect(submittedTransaction.from).toEqual(account)
          expect(submittedTransaction.nonce).toEqual(0)
          expect(submittedTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(submittedTransaction.api).toEqual(api)
          expect(submittedTransaction.method).toEqual(method)
          expect(submittedTransaction.params).toEqual(params)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('rejects sendTransaction if submitting contract transaction fails', async ()=> {
          mock({
            blockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              api: api,
              method: method,
              params: params,
              return: Error('something failed')
            }
          })
          await expect(
            wallet.sendTransaction(transaction)
          ).rejects.toEqual(Error('something failed'))
        })

        it('allows to pass params as array', async ()=> {
          transaction.params = [transaction.params.path, transaction.params.amounts, transaction.params.addresses, transaction.params.plugins, transaction.params.data]
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as number', async ()=> {
          transaction.value = 1
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as float', async ()=> {
          transaction.value = 1.0
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as string', async ()=> {
          transaction.value = '1000000000000000000'
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as BigNumber', async ()=> {
          transaction.value = ethers.BigNumber.from('1000000000000000000')
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('populates basic information for the transaction after sent', async () => {
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(submittedTransaction.id == undefined).toEqual(false)
          let blockexplorer = {
            'ethereum': 'https://etherscan.io/tx/',
            'bsc': 'https://bscscan.com/tx/',
            'polygon': 'https://polygonscan.com/tx/',
          }[blockchain]
          expect(submittedTransaction.url).toEqual(`${blockexplorer}${submittedTransaction.id}`)
        })

        it("calls the transaction's sent callback", async ()=> {
          let sentCallbackTransaction;
          transaction.sent = function(transaction){ sentCallbackTransaction = transaction  }
          await wallet.sendTransaction(transaction)
          expect(sentCallbackTransaction.id).toBeDefined()
          expect(sentCallbackTransaction.url).toBeDefined()
          expect(sentCallbackTransaction.blockchain).toEqual(blockchain)
          expect(sentCallbackTransaction.from).toEqual(account)
          expect(sentCallbackTransaction.nonce).toEqual(0)
          expect(sentCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(sentCallbackTransaction.api).toEqual(api)
          expect(sentCallbackTransaction.method).toEqual(method)
          expect(sentCallbackTransaction.params).toEqual(params)
        })

        it("calls the transaction's succeeded callback", async ()=> {
          let succeededCallbackTransaction
          transaction.succeeded = function(transaction){ succeededCallbackTransaction = transaction }
          let submittedTransaction = await wallet.sendTransaction(transaction)
          confirm(mockedTransaction)
          await submittedTransaction.success()
          expect(succeededCallbackTransaction.id).toBeDefined()
          expect(succeededCallbackTransaction.url).toBeDefined()
          expect(succeededCallbackTransaction.blockchain).toEqual(blockchain)
          expect(succeededCallbackTransaction.from).toEqual(account)
          expect(succeededCallbackTransaction.nonce).toEqual(0)
          expect(succeededCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(succeededCallbackTransaction.api).toEqual(api)
          expect(succeededCallbackTransaction.method).toEqual(method)
          expect(succeededCallbackTransaction.params).toEqual(params)
        })

        it("calls the transaction's failed callback", async ()=> {
          let failedCallbackTransaction
          transaction.failed = function(transaction){ failedCallbackTransaction = transaction }
          let submittedTransaction = await wallet.sendTransaction(transaction)
          fail(mockedTransaction)
          await submittedTransaction.failure()
          expect(failedCallbackTransaction.id).toBeDefined()
          expect(failedCallbackTransaction.url).toBeDefined()
          expect(failedCallbackTransaction.blockchain).toEqual(blockchain)
          expect(failedCallbackTransaction.from).toEqual(account)
          expect(failedCallbackTransaction.nonce).toEqual(0)
          expect(failedCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(failedCallbackTransaction.api).toEqual(api)
          expect(failedCallbackTransaction.method).toEqual(method)
          expect(failedCallbackTransaction.params).toEqual(params)
        })
      })

      describe('simple value transfer transaction', ()=>{
        beforeEach(()=>{

          mockedTransaction = mock({
            blockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              value: '1000000000000000000'
            }
          })
          
          transaction = {
            blockchain,
            to: address,
            value: 1
          };
        })

        it('allows to submit value transfer transaction', async ()=> {
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(submittedTransaction.id).toBeDefined()
          expect(submittedTransaction.url).toBeDefined()
          expect(submittedTransaction.blockchain).toEqual(blockchain)
          expect(submittedTransaction.from).toEqual(account)
          expect(submittedTransaction.nonce).toEqual(0)
          expect(submittedTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(submittedTransaction.value.toString()).toEqual('1000000000000000000')
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('rejects sendTransaction if submitting simple value transfer transaction fails', async ()=> {
          mock({
            blockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              value: '1000000000000000000',
              return: Error('something failed')
            }
          })
          await expect(
            wallet.sendTransaction(transaction)
          ).rejects.toEqual(Error('something failed'))
        })

        it('sets the from address if transaction has been sent', async ()=>{
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(submittedTransaction.from).toEqual(account)
        })

        it('sends transaction with value provided as number', async ()=> {
          transaction.value = 1
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as float', async ()=> {
          mockedTransaction = mock({
            blockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              value: '100000000000000000'
            }
          })
          transaction.value = 0.1
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as string', async ()=> {
          transaction.value = '1000000000000000000'
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('sends transaction with value provided as BigNumber', async ()=> {
          transaction.value = ethers.BigNumber.from('1000000000000000000')
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
        })

        it('populates basic information for the transaction after sent', async () => {
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(submittedTransaction.id == undefined).toEqual(false)
          let blockexplorer = {
            'ethereum': 'https://etherscan.io/tx/',
            'bsc': 'https://bscscan.com/tx/',
            'polygon': 'https://polygonscan.com/tx/'
          }[blockchain]
          expect(submittedTransaction.url).toEqual(`${blockexplorer}${submittedTransaction.id}`)
        })

        it("calls the transaction's sent callback", async ()=> {
          let sentCallbackTransaction;
          transaction.sent = function(transaction){ sentCallbackTransaction = transaction  }
          await wallet.sendTransaction(transaction)
          expect(sentCallbackTransaction.id).toBeDefined()
          expect(sentCallbackTransaction.url).toBeDefined()
          expect(sentCallbackTransaction.blockchain).toEqual(blockchain)
          expect(sentCallbackTransaction.from).toEqual(account)
          expect(sentCallbackTransaction.nonce).toEqual(0)
          expect(sentCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(sentCallbackTransaction.value.toString()).toEqual('1000000000000000000')
        });

        it("calls the transaction's succeeded callback", async ()=> {
          let succeededCallbackTransaction
          transaction.succeeded = function(transaction){ succeededCallbackTransaction = transaction }
          let submittedTransaction = await wallet.sendTransaction(transaction)
          confirm(mockedTransaction)
          await submittedTransaction.success()
          expect(succeededCallbackTransaction.id).toBeDefined()
          expect(succeededCallbackTransaction.url).toBeDefined()
          expect(succeededCallbackTransaction.blockchain).toEqual(blockchain)
          expect(succeededCallbackTransaction.from).toEqual(account)
          expect(succeededCallbackTransaction.nonce).toEqual(0)
          expect(succeededCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(succeededCallbackTransaction.value.toString()).toEqual('1000000000000000000')
        })

        it("calls the transaction's failed callback", async ()=> {
          let failedCallbackTransaction
          transaction.failed = function(transaction){ failedCallbackTransaction = transaction }
          let submittedTransaction = await wallet.sendTransaction(transaction)
          fail(mockedTransaction)
          await submittedTransaction.failure()
          expect(failedCallbackTransaction.id).toBeDefined()
          expect(failedCallbackTransaction.url).toBeDefined()
          expect(failedCallbackTransaction.blockchain).toEqual(blockchain)
          expect(failedCallbackTransaction.from).toEqual(account)
          expect(failedCallbackTransaction.nonce).toEqual(0)
          expect(failedCallbackTransaction.to).toEqual('0xae60aC8e69414C2Dc362D0e6a03af643d1D85b92')
          expect(failedCallbackTransaction.value.toString()).toEqual('1000000000000000000')
        })
      })

      describe('switch network', ()=>{

        let otherBlockchain
        
        beforeEach(()=>{

          otherBlockchain = ['ethereum', 'bsc', 'polygon'].filter((b)=>b != blockchain)[0]

          mockedTransaction = mock({
            blockchain: otherBlockchain,
            transaction: {
              to: '0xae60ac8e69414c2dc362d0e6a03af643d1d85b92',
              value: '1000000000000000000'
            }
          })
          
          transaction = {
            blockchain: otherBlockchain,
            to: address,
            value: 1
          }

          mock({ blockchain: otherBlockchain, accounts: { return: [account] } })
        })

        it('switches network if transaction is supposed to be sent on different network', async ()=> {
          connect(blockchain)
          let switchMock = mock({
            blockchain,
            network: {
              switchTo: otherBlockchain
            }
          })
          let submittedTransaction = await wallet.sendTransaction(transaction)
          expect(mockedTransaction).toHaveBeenCalled()
          expect(switchMock).toHaveBeenCalled()
        })
      })
    })
  })
})
