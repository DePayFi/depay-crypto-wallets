import fetchMock from 'fetch-mock'
import { Blockchain } from '@depay/web3-blockchains'
import { getWallets, wallets } from 'src'
import { mock, resetMocks, trigger } from '@depay/web3-mock'
import { supported as supportedBlockchains } from 'src/blockchains'

describe('window.solana wallet', () => {

  supportedBlockchains.solana.forEach((blockchain)=>{

    describe(blockchain, ()=> {

      describe('with no supported wallet connected', ()=>{
        
        beforeEach(resetMocks)

        it('provides an account function that returns undefined', async () => {
          expect(await(new wallets.WindowSolana()).account()).toStrictEqual(undefined)
        })

        it('provides an connect function that returns undefined', async () => {
          expect(await new wallets.WindowSolana().connect()).toStrictEqual(undefined)
        })
      })

      describe('with supported wallet connected', ()=>{

        const account = '2UgCJaHU5y8NC4uWQcZYeV9a5RyYLF7iKYCybCsdFFD1'
        let wallet
        beforeEach(resetMocks)
        beforeEach(()=>mock({ blockchain, accounts: { return: [account] } }))
        beforeEach(()=> wallet = getWallets()[0] )

        it('should detect any solana wallet integration that integrates window.solana', () => {
          mock(blockchain)
          expect(wallet.name).toBe('Wallet (Solana)')
        });

        it('provides a connect function', async () => {
          mock(blockchain)
          expect(await wallet.connect()).toStrictEqual('2UgCJaHU5y8NC4uWQcZYeV9a5RyYLF7iKYCybCsdFFD1')
        });

        it('provides an account function', async () => {
          mock(blockchain)
          expect(await wallet.account()).toStrictEqual('2UgCJaHU5y8NC4uWQcZYeV9a5RyYLF7iKYCybCsdFFD1')
        });

        it('provides a logo', async () => {
          mock(blockchain)
          expect(wallet.logo).toStrictEqual("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA0NDYuNCAzNzYuOCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDQ2LjQgMzc2Ljg7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojODI4NDg3O30KCS5zdDF7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Cgkuc3Qye2ZpbGw6dXJsKCNTVkdJRF8wMDAwMDE2NTIzNDE5NTQ5NTc2MDU4MDgwMDAwMDAwNjMwMzAwNDA2OTM1MjExODk1MV8pO30KCS5zdDN7ZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDkyNDIyMzgxNjc5OTg1OTI5MTcwMDAwMDA2ODU0NzIyMTYxOTE4MTIzNjUzXyk7fQo8L3N0eWxlPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgxLjcsMTEwLjJoNjQuN1Y0Ni41YzAtMjUuNy0yMC44LTQ2LjUtNDYuNS00Ni41SDQ2LjVDMjAuOCwwLDAsMjAuOCwwLDQ2LjV2NjUuMWgzNS43bDI2LjktMjYuOQoJYzEuNS0xLjUsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoNzguNmM1LjMtMjUuNSwzMC4yLTQyLDU1LjctMzYuN2MyNS41LDUuMyw0MiwzMC4yLDM2LjcsNTUuN2MtMS42LDcuNS00LjksMTQuNi05LjgsMjAuNQoJYy0wLjksMS4xLTEuOSwyLjItMywzLjNjLTEuMSwxLjEtMi4yLDIuMS0zLjMsM2MtMjAuMSwxNi42LTQ5LjksMTMuOC02Ni41LTYuM2MtNC45LTUuOS04LjMtMTMtOS44LTIwLjZINzMuMmwtMjYuOSwyNi44CgljLTEuNSwxLjUtMy42LDIuNS01LjcsMi43bDAsMGgtMC40aC0wLjFoLTAuNUgwdjc0aDI4LjhsMTguMi0xOC4yYzEuNS0xLjYsMy42LTIuNSw1LjctMi43bDAsMGgwLjRoMjkuOQoJYzUuMi0yNS41LDMwLjItNDEuOSw1NS43LTM2LjdzNDEuOSwzMC4yLDM2LjcsNTUuN3MtMzAuMiw0MS45LTU1LjcsMzYuN2MtMTguNS0zLjgtMzIuOS0xOC4yLTM2LjctMzYuN0g1Ny43bC0xOC4yLDE4LjMKCWMtMS41LDEuNS0zLjYsMi41LTUuNywyLjdsMCwwaC0wLjRIMHYzNC4yaDU2LjNjMC4yLDAsMC4zLDAsMC41LDBoMC4xaDAuNGwwLDBjMi4yLDAuMiw0LjIsMS4yLDUuOCwyLjhsMjgsMjhoNTcuNwoJYzUuMy0yNS41LDMwLjItNDIsNTUuNy0zNi43czQyLDMwLjIsMzYuNyw1NS43Yy0xLjcsOC4xLTUuNSwxNS43LTExLDIxLjljLTAuNiwwLjctMS4yLDEuMy0xLjksMnMtMS4zLDEuMy0yLDEuOQoJYy0xOS41LDE3LjMtNDkuMywxNS42LTY2LjctMy45Yy01LjUtNi4yLTkuMy0xMy43LTExLTIxLjlIODcuMWMtMS4xLDAtMi4xLTAuMi0zLjEtMC41aC0wLjFsLTAuMy0wLjFsLTAuMi0wLjFsLTAuMi0wLjFsLTAuMy0wLjEKCWgtMC4xYy0wLjktMC41LTEuOC0xLjEtMi42LTEuOGwtMjgtMjhIMHY1My41YzAuMSwyNS43LDIwLjksNDYuNCw0Ni41LDQ2LjRoMzUzLjNjMjUuNywwLDQ2LjUtMjAuOCw0Ni41LTQ2LjV2LTYzLjZoLTY0LjcKCWMtNDMuMiwwLTc4LjItMzUtNzguMi03OC4ybDAsMEMzMDMuNSwxNDUuMiwzMzguNSwxMTAuMiwzODEuNywxMTAuMnoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIyMC45LDI5OC4xYzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjIwLjksMzEyLjQsMjIwLjksMjk4LjFMMjIwLjksMjk4LjF6Ii8+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yMTkuNiw5MS41YzAtMTQuNC0xMS42LTI2LTI2LTI2cy0yNiwxMS42LTI2LDI2czExLjYsMjYsMjYsMjZTMjE5LjYsMTA1LjgsMjE5LjYsOTEuNXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTM4Mi4yLDEyOC44aC0wLjVjLTMyLjksMC01OS42LDI2LjctNTkuNiw1OS42bDAsMGwwLDBjMCwzMi45LDI2LjcsNTkuNiw1OS42LDU5LjZsMCwwaDAuNQoJYzMyLjksMCw1OS42LTI2LjcsNTkuNi01OS42bDAsMEM0NDEuOCwxNTUuNCw0MTUuMSwxMjguOCwzODIuMiwxMjguOHogTTM5Ni42LDIxOS40aC0zMWw4LjktMzIuNWMtNy43LTMuNy0xMS0xMi45LTcuNC0yMC42CgljMy43LTcuNywxMi45LTExLDIwLjYtNy40YzcuNywzLjcsMTEsMTIuOSw3LjQsMjAuNmMtMS41LDMuMi00LjEsNS44LTcuNCw3LjRMMzk2LjYsMjE5LjR6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTQ5LjAwNzciIHkxPSIxMzkuMzA5MyIgeDI9IjEyMi4xMjMxIiB5Mj0iMTkwLjgwNDIiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAwIDMwLjUzNTQpIj4KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMEZGQTMiLz4KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNEQzFGRkYiLz4KPC9saW5lYXJHcmFkaWVudD4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTExMi43LDIwMy41YzAuMy0wLjMsMC43LTAuNSwxLjEtMC41aDM4LjhjMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOAoJYy0wLjcsMC0xLjEtMC45LTAuNi0xLjRMMTEyLjcsMjAzLjV6Ii8+CjxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9IjEzNy4yNTMzIiB5MT0iMTMzLjE3MjUiIHgyPSIxMTAuMzY4NyIgeTI9IjE4NC42Njc0IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMCAzMC41MzU0KSI+Cgk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBGRkEzIi8+Cgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojREMxRkZGIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxwYXRoIHN0eWxlPSJmaWxsOnVybCgjU1ZHSURfMDAwMDAxNzUzMTAwMjIwMDgyNTMzODQyNTAwMDAwMTEwOTY3OTQyODQ4NDUzNDEzNTVfKTsiIGQ9Ik0xMTIuNywxNzQuOWMwLjMtMC4zLDAuNy0wLjUsMS4xLTAuNWgzOC44CgljMC43LDAsMS4xLDAuOSwwLjYsMS40bC03LjcsNy43Yy0wLjMsMC4zLTAuNywwLjUtMS4xLDAuNWgtMzguOGMtMC43LDAtMS4xLTAuOS0wLjYtMS40TDExMi43LDE3NC45eiIvPgo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxNDMuMDkyOSIgeTE9IjEzNi4yMjEyIiB4Mj0iMTE2LjIwODIiIHkyPSIxODcuNzE2MiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAxIDAgMzAuNTM1NCkiPgoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzAwRkZBMyIvPgoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6I0RDMUZGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cGF0aCBzdHlsZT0iZmlsbDp1cmwoI1NWR0lEXzAwMDAwMDIyNTU3MTYwNTg5MTY1MTU3NTIwMDAwMDE1NDYyNjI0Mjk4Nzk4NTYzMjYxXyk7IiBkPSJNMTQ1LjYsMTg5LjFjLTAuMy0wLjMtMC43LTAuNS0xLjEtMC41CgloLTM4LjhjLTAuNywwLTEuMSwwLjktMC42LDEuNGw3LjcsNy43YzAuMywwLjMsMC43LDAuNSwxLjEsMC41aDM4LjhjMC43LDAsMS4xLTAuOSwwLjYtMS40TDE0NS42LDE4OS4xeiIvPgo8L3N2Zz4K")
        });

        it('provides the blockchains that are supported by the wallet', () => {
          mock(blockchain)
          expect(wallet.blockchains).toEqual(['solana'])
        });

        it('does not support to switch network', async ()=>{
          await expect(
            wallet.switchTo('fuse')
          ).rejects.toEqual({ code: 'NOT_SUPPORTED' })
        })

        it('adds the network if the network you request to switch to does not exist and switches to it afterwards', async ()=>{
          await expect(
            wallet.addNetwork('solana')
          ).rejects.toEqual({ code: 'NOT_SUPPORTED' })
        })
      })
    })
  })
})
