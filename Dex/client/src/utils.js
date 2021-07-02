import Web3 from 'web3'
import Dex from './contracts/Dex.json'
import ERC20Abi from './ERC20Abi.json'
import detectEthereumProvider from '@metamask/detect-provider'

const getWeb3 = () =>

    new Promise( async (resolve, reject) => {

        let provider = await detectEthereumProvider();

        if(provider) {

            await provider.request({ method: 'eth_requestAccounts' });

            try {

                const web3 = new Web3(window.ethereum);

                resolve(web3);

            } catch(error) {

                reject(error);

            }

        } reject('Install Metamask');
});

const getContracts = async web3 => {
    
    const networkId = await web3.eth.net.getId();
    console.log('networkId', networkId)
    const deployedNetwork = Dex.networks[networkId];
    console.log('deployedNetwork', deployedNetwork)
    const dex = new web3.eth.Contract(
      Dex.abi,
      deployedNetwork && deployedNetwork.address,
    );
    console.log('dex', dex)
    const tokens = await dex.methods.getTokens().call();
    console.log('tokens', tokens)
    let tokenContracts
    if(tokens) {
      tokenContracts = tokens.reduce((acc, token) => ({
        ...acc,
        [web3.utils.hexToUtf8(token.ticker)]: new web3.eth.Contract(
          ERC20Abi,
          token.tokenAddress
        )
      }), {});
    }
    
   
    return { dex, ...tokenContracts };
  }
  
  export { getWeb3, getContracts };