import logos from '../logos'
import WindowEthereum from './WindowEthereum'
import { supported } from '../blockchains'

export default class PhantomEVM extends WindowEthereum {

  static info = {
    name: 'Phantom',
    logo: logos.phantom,
    blockchains: supported.evm,
    platform: 'evm',
  }

  static isAvailable = async()=>{
    return (
      window.phantom &&
      window.phantom.ethereum
    )
  }
}
