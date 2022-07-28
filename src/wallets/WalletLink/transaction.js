import { Transaction } from '../../Transaction'
import { Blockchain } from '@depay/web3-blockchains'
import { ethers } from 'ethers'

const sendTransaction = async ({ transaction, wallet })=> {
  transaction = new Transaction(transaction)
  if((await wallet.connectedTo(transaction.blockchain)) == false) {
    await wallet.switchTo(transaction.blockchain)
  }
  await transaction.prepare({ wallet })
  let provider = new ethers.providers.Web3Provider(wallet.connector, 'any')
  let signer = provider.getSigner(0)
  await submit({ transaction, provider, signer }).then((sentTransaction)=>{
    if (sentTransaction) {
      transaction.id = sentTransaction.hash
      transaction.nonce = sentTransaction.nonce
      transaction.url = Blockchain.findByName(transaction.blockchain).explorerUrlFor({ transaction })
      if (transaction.sent) transaction.sent(transaction)
      sentTransaction.wait(1).then(() => {
        transaction._succeeded = true
        if (transaction.succeeded) transaction.succeeded(transaction)
      }).catch((error)=>{
        if(error && error.code && error.code == 'TRANSACTION_REPLACED') {
          if(error.replacement && error.replacement.hash) {
            transaction.id = error.replacement.hash
            transaction.url = Blockchain.findByName(transaction.blockchain).explorerUrlFor({ transaction })
          }
          if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 1) {
            transaction._succeeded = true
            if (transaction.succeeded) transaction.succeeded(transaction)
          } else if(error.replacement && error.replacement.hash && error.receipt && error.receipt.status == 0) {
            transaction._failed = true
            if(transaction.failed) transaction.failed(transaction, error)  
          }
        } else {
          transaction._failed = true
          if(transaction.failed) transaction.failed(transaction, error)
        }
      })
    } else {
      throw('Submitting transaction failed!')
    }
  })
  return transaction
}

const submit = ({ transaction, provider, signer }) => {
  if(transaction.method) {
    return submitContractInteraction({ transaction, signer, provider })
  } else {
    return submitSimpleTransfer({ transaction, signer })
  }
}

const submitContractInteraction = ({ transaction, signer, provider })=>{
  let contract = new ethers.Contract(transaction.to, transaction.api, provider)
  return contract
    .connect(signer)
    [transaction.method](...transaction.getContractArguments({ contract }), {
      value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
    })
}

const submitSimpleTransfer = ({ transaction, signer })=>{
  return signer.sendTransaction({
    to: transaction.to,
    value: Transaction.bigNumberify(transaction.value, transaction.blockchain)
  })
}

export {
  sendTransaction
}
