import { supported } from 'src'
import { supported as supportedBlockchains } from 'src/blockchains'

describe('supported wallets', () => {
  
  it('provides a list of supported wallets + basic data for classes and instances', () => {

    expect(supported[0].info.name).toEqual('MetaMask')
    expect(supported[0].info.logo).toEqual("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 485.93 450.56'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%23828487;%7D.cls-2%7Bfill:%23e27726;stroke:%23e27726;%7D.cls-10,.cls-11,.cls-2,.cls-3,.cls-4,.cls-5,.cls-6,.cls-7,.cls-8,.cls-9%7Bstroke-linecap:round;stroke-linejoin:round;%7D.cls-3%7Bfill:%23e37725;stroke:%23e37725;%7D.cls-4%7Bfill:%23d6c0b3;stroke:%23d6c0b3;%7D.cls-5%7Bfill:%23243447;stroke:%23243447;%7D.cls-6%7Bfill:%23cd6328;stroke:%23cd6328;%7D.cls-7%7Bfill:%23e37525;stroke:%23e37525;%7D.cls-8%7Bfill:%23f6851f;stroke:%23f6851f;%7D.cls-9%7Bfill:%23c1ae9e;stroke:%23c1ae9e;%7D.cls-10%7Bfill:%23171717;stroke:%23171717;%7D.cls-11%7Bfill:%23763e1a;stroke:%23763e1a;%7D%3C/style%3E%3C/defs%3E%3Cpath class='cls-1' d='M247.91,356.29a26,26,0,1,0-26,26A26,26,0,0,0,247.91,356.29Z' transform='translate(-7.97 -21.33)'/%3E%3Cpath class='cls-1' d='M246.55,149.71a26,26,0,1,0-26,26A26,26,0,0,0,246.55,149.71Z' transform='translate(-7.97 -21.33)'/%3E%3Ccircle class='cls-1' cx='148.4' cy='230.05' r='25.99'/%3E%3Cpolygon class='cls-2' points='461.28 0.5 272.06 141.03 307.05 58.12 461.28 0.5'/%3E%3Cpolygon class='cls-3' points='24.46 0.5 212.16 142.37 178.88 58.12 24.46 0.5'/%3E%3Cpolygon class='cls-3' points='393.2 326.26 342.81 403.47 450.63 433.14 481.63 327.97 393.2 326.26'/%3E%3Cpolygon class='cls-3' points='4.49 327.97 35.3 433.14 143.13 403.47 92.73 326.26 4.49 327.97'/%3E%3Cpolygon class='cls-3' points='137.04 195.8 107 241.25 214.06 246.01 210.26 130.96 137.04 195.8'/%3E%3Cpolygon class='cls-3' points='348.7 195.8 274.53 129.63 272.06 246.01 378.94 241.25 348.7 195.8'/%3E%3Cpolygon class='cls-3' points='143.13 403.47 207.41 372.09 151.88 328.73 143.13 403.47'/%3E%3Cpolygon class='cls-3' points='278.34 372.09 342.81 403.47 333.87 328.73 278.34 372.09'/%3E%3Cpolygon class='cls-4' points='342.81 403.47 278.34 372.09 283.47 414.12 282.9 431.81 342.81 403.47'/%3E%3Cpolygon class='cls-4' points='143.13 403.47 203.03 431.81 202.65 414.12 207.41 372.09 143.13 403.47'/%3E%3Cpolygon class='cls-5' points='203.98 300.97 150.35 285.18 188.2 267.88 203.98 300.97'/%3E%3Cpolygon class='cls-5' points='281.76 300.97 297.55 267.88 335.58 285.18 281.76 300.97'/%3E%3Cpolygon class='cls-6' points='143.13 403.47 152.25 326.26 92.73 327.97 143.13 403.47'/%3E%3Cpolygon class='cls-6' points='333.68 326.26 342.81 403.47 393.2 327.97 333.68 326.26'/%3E%3Cpolygon class='cls-6' points='378.94 241.25 272.06 246.01 281.95 300.97 297.74 267.88 335.77 285.18 378.94 241.25'/%3E%3Cpolygon class='cls-6' points='150.35 285.18 188.39 267.88 203.98 300.97 214.06 246.01 107 241.25 150.35 285.18'/%3E%3Cpolygon class='cls-7' points='107 241.25 151.88 328.73 150.35 285.18 107 241.25'/%3E%3Cpolygon class='cls-7' points='335.77 285.18 333.87 328.73 378.94 241.25 335.77 285.18'/%3E%3Cpolygon class='cls-7' points='214.06 246.01 203.98 300.97 216.53 365.82 219.38 280.43 214.06 246.01'/%3E%3Cpolygon class='cls-7' points='272.06 246.01 266.93 280.24 269.21 365.82 281.95 300.97 272.06 246.01'/%3E%3Cpolygon class='cls-8' points='281.95 300.97 269.21 365.82 278.34 372.09 333.87 328.73 335.77 285.18 281.95 300.97'/%3E%3Cpolygon class='cls-8' points='150.35 285.18 151.88 328.73 207.41 372.09 216.53 365.82 203.98 300.97 150.35 285.18'/%3E%3Cpolygon class='cls-9' points='282.9 431.81 283.47 414.12 278.72 409.94 207.02 409.94 202.65 414.12 203.03 431.81 143.13 403.47 164.05 420.58 206.45 450.06 279.29 450.06 321.89 420.58 342.81 403.47 282.9 431.81'/%3E%3Cpolygon class='cls-10' points='278.34 372.09 269.21 365.82 216.53 365.82 207.41 372.09 202.65 414.12 207.02 409.94 278.72 409.94 283.47 414.12 278.34 372.09'/%3E%3Cpolygon class='cls-11' points='469.27 150.16 485.43 72.57 461.28 0.5 278.34 136.28 348.7 195.8 448.16 224.9 470.22 199.23 460.71 192.38 475.92 178.5 464.13 169.37 479.35 157.77 469.27 150.16'/%3E%3Cpolygon class='cls-11' points='0.5 72.57 16.66 150.16 6.39 157.77 21.61 169.37 10.01 178.5 25.22 192.38 15.71 199.23 37.58 224.9 137.04 195.8 207.41 136.28 24.46 0.5 0.5 72.57'/%3E%3Cpolygon class='cls-8' points='448.16 224.9 348.7 195.8 378.94 241.25 333.87 328.73 393.2 327.97 481.63 327.97 448.16 224.9'/%3E%3Cpolygon class='cls-8' points='137.04 195.8 37.58 224.9 4.49 327.97 92.73 327.97 151.88 328.73 107 241.25 137.04 195.8'/%3E%3Cpolygon class='cls-8' points='272.06 246.01 278.34 136.28 307.24 58.12 178.88 58.12 207.41 136.28 214.06 246.01 216.34 280.62 216.53 365.82 269.21 365.82 269.59 280.62 272.06 246.01'/%3E%3C/svg%3E")
    expect(supported[0].info.install).toEqual('https://metamask.io/download.html')
    expect(supported[0].info.blockchains).toEqual(supportedBlockchains.evm)

    expect(supported[1].info.name).toEqual('Coinbase')
    expect(supported[1].info.logo).toEqual("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 488.96 488.96'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:url(%23linear-gradient);%7D.cls-2%7Bfill:%234361ad;%7D%3C/style%3E%3ClinearGradient id='linear-gradient' x1='250' y1='7.35' x2='250' y2='496.32' gradientTransform='matrix(1, 0, 0, -1, 0, 502)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%233d5ba9'/%3E%3Cstop offset='1' stop-color='%234868b1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath class='cls-1' d='M250,5.68C114.87,5.68,5.52,115,5.52,250.17S114.87,494.65,250,494.65,494.48,385.29,494.48,250.17,385.13,5.68,250,5.68Zm0,387.54A143.06,143.06,0,1,1,393.05,250.17,143.11,143.11,0,0,1,250,393.22Z' transform='translate(-5.52 -5.68)'/%3E%3Cpath class='cls-2' d='M284.69,296.09H215.31a11,11,0,0,1-10.9-10.9V215.48a11,11,0,0,1,10.9-10.91H285a11,11,0,0,1,10.9,10.91v69.71A11.07,11.07,0,0,1,284.69,296.09Z' transform='translate(-5.52 -5.68)'/%3E%3C/svg%3E")
    expect(supported[1].info.install).toEqual('https://wallet.coinbase.com')
    expect(supported[1].info.blockchains).toEqual(supportedBlockchains.evm)
    
    expect(supported[2].info.name).toEqual('WalletConnect')
    expect(supported[2].info.logo).toEqual("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!-- Generator: Adobe Illustrator 25.4.1, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 500 500' style='enable-background:new 0 0 500 500;' xml:space='preserve'%3E%3Cstyle type='text/css'%3E .st0%7Bfill:%235991CD;%7D%0A%3C/style%3E%3Cg id='Page-1'%3E%3Cg id='walletconnect-logo-alt'%3E%3Cpath id='WalletConnect' class='st0' d='M102.7,162c81.5-79.8,213.6-79.8,295.1,0l9.8,9.6c4.1,4,4.1,10.5,0,14.4L374,218.9 c-2,2-5.3,2-7.4,0l-13.5-13.2c-56.8-55.7-149-55.7-205.8,0l-14.5,14.1c-2,2-5.3,2-7.4,0L91.9,187c-4.1-4-4.1-10.5,0-14.4 L102.7,162z M467.1,229.9l29.9,29.2c4.1,4,4.1,10.5,0,14.4L362.3,405.4c-4.1,4-10.7,4-14.8,0c0,0,0,0,0,0L252,311.9 c-1-1-2.7-1-3.7,0h0l-95.5,93.5c-4.1,4-10.7,4-14.8,0c0,0,0,0,0,0L3.4,273.6c-4.1-4-4.1-10.5,0-14.4l29.9-29.2 c4.1-4,10.7-4,14.8,0l95.5,93.5c1,1,2.7,1,3.7,0c0,0,0,0,0,0l95.5-93.5c4.1-4,10.7-4,14.8,0c0,0,0,0,0,0l95.5,93.5 c1,1,2.7,1,3.7,0l95.5-93.5C456.4,225.9,463,225.9,467.1,229.9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E%0A")
    expect(supported[2].info.install).toEqual(undefined) // requires walletconnect connection (no install)
    expect(supported[2].info.blockchains).toEqual(supportedBlockchains.evm)

    expect(supported[3].info.name).toEqual('Coinbase')
    expect(supported[3].info.logo).toEqual("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 488.96 488.96'%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:url(%23linear-gradient);%7D.cls-2%7Bfill:%234361ad;%7D%3C/style%3E%3ClinearGradient id='linear-gradient' x1='250' y1='7.35' x2='250' y2='496.32' gradientTransform='matrix(1, 0, 0, -1, 0, 502)' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%233d5ba9'/%3E%3Cstop offset='1' stop-color='%234868b1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath class='cls-1' d='M250,5.68C114.87,5.68,5.52,115,5.52,250.17S114.87,494.65,250,494.65,494.48,385.29,494.48,250.17,385.13,5.68,250,5.68Zm0,387.54A143.06,143.06,0,1,1,393.05,250.17,143.11,143.11,0,0,1,250,393.22Z' transform='translate(-5.52 -5.68)'/%3E%3Cpath class='cls-2' d='M284.69,296.09H215.31a11,11,0,0,1-10.9-10.9V215.48a11,11,0,0,1,10.9-10.91H285a11,11,0,0,1,10.9,10.91v69.71A11.07,11.07,0,0,1,284.69,296.09Z' transform='translate(-5.52 -5.68)'/%3E%3C/svg%3E")
    expect(supported[3].info.install).toEqual('https://www.coinbase.com/wallet')
    expect(supported[3].info.blockchains).toEqual(supportedBlockchains.evm)

  });
});
