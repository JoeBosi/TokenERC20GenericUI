import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const POLYGON_AMOY_CHAIN_ID = 80002;
const POLYGON_AMOY_PARAMS = {
  chainId: '0x13882',
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

const DEV_PRIVATE_KEY = typeof __PRIVATE_KEY__ !== 'undefined' ? __PRIVATE_KEY__ : '';
const DEV_ADDRESS = typeof __ADDRES__ !== 'undefined' ? __ADDRES__ : '';
const RPC_URL = 'https://rpc-amoy.polygon.technology';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [polBalance, setPolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const checkNetwork = useCallback(async (currentChainId) => {
    if (currentChainId !== POLYGON_AMOY_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: POLYGON_AMOY_PARAMS.chainId }],
        });
        return true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [POLYGON_AMOY_PARAMS],
            });
            return true;
          } catch (addError) {
            setError('Impossibile aggiungere la rete Polygon Amoy');
            return false;
          }
        }
        setError('Impossibile switchare alla rete Polygon Amoy');
        return false;
      }
    }
    return true;
  }, []);

  const addTokenToMetaMask = useCallback(async (tokenAddress, tokenSymbol, tokenDecimals, tokenName) => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            name: tokenName,
          },
        },
      });
      return true;
    } catch (err) {
      console.log('Token add failed or rejected:', err);
      return false;
    }
  }, []);

  const fetchBalances = useCallback(async (currentAccount, currentProvider, tokenContract) => {
    if (!currentAccount || !currentProvider) return;
    try {
      const polBal = await currentProvider.getBalance(currentAccount);
      setPolBalance(ethers.formatEther(polBal));
      
      if (tokenContract) {
        const tokBal = await tokenContract.balanceOf(currentAccount);
        const decimals = await tokenContract.decimals();
        setTokenBalance(ethers.formatUnits(tokBal, decimals));
      }
    } catch (err) {
      console.log('Balance fetch error:', err);
    }
  }, []);

  const connect = useCallback(async (tokenContract = null) => {
    if (!window.ethereum) {
      setError('MetaMask non è installato. Installa MetaMask per continuare.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const currentChainId = parseInt(
        await window.ethereum.request({ method: 'eth_chainId' }),
        16
      );

      const isCorrectNetwork = await checkNetwork(currentChainId);
      if (!isCorrectNetwork) {
        setIsConnecting(false);
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setProvider(newProvider);
      setSigner(newSigner);
      
      // Fetch balances
      await fetchBalances(accounts[0], newProvider, tokenContract);
      
      // Auto-add token if contract provided
      if (tokenContract) {
        try {
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();
          const name = await tokenContract.name();
          await addTokenToMetaMask(tokenContract.target, symbol, decimals, name);
        } catch (err) {
          console.log('Auto token add error:', err);
        }
      }
    } catch (err) {
      setError(err.message || 'Errore durante la connessione');
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, fetchBalances, addTokenToMetaMask]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setError(null);
    setIsDevMode(false);
  }, []);

  const connectDev = useCallback(async () => {
    if (!DEV_PRIVATE_KEY) {
      setError('Chiave privata non configurata. Verifica il file .env');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Configure provider with higher gas price for Polygon Amoy (min 25 Gwei)
      const devProvider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Create wallet with custom gas settings
      const devWallet = new ethers.Wallet(DEV_PRIVATE_KEY, devProvider);
      
      // Override sendTransaction to include proper gas price
      const originalSendTransaction = devWallet.sendTransaction.bind(devWallet);
      devWallet.sendTransaction = async (tx) => {
        const updatedTx = {
          ...tx,
          maxFeePerGas: ethers.parseUnits('50', 'gwei'),  // 50 Gwei max fee
          maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'), // 30 Gwei priority (min 25 required)
        };
        return originalSendTransaction(updatedTx);
      };
      
      setAccount(DEV_ADDRESS || devWallet.address);
      setChainId(POLYGON_AMOY_CHAIN_ID);
      setProvider(devProvider);
      setSigner(devWallet);
      setIsDevMode(true);
    } catch (err) {
      setError('Errore connessione wallet dev: ' + (err.message || 'sconosciuto'));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
        if (provider) {
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
        }
      }
    };

    const handleChainChanged = async (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      
      if (newChainId !== POLYGON_AMOY_CHAIN_ID) {
        await checkNetwork(newChainId);
      }
      
      if (window.ethereum) {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        if (account) {
          const newSigner = await newProvider.getSigner();
          setSigner(newSigner);
        }
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, provider, disconnect, checkNetwork]);

  useEffect(() => {
    if (!window.ethereum) return;
    
    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        
        if (accounts.length > 0) {
          const currentChainId = parseInt(
            await window.ethereum.request({ method: 'eth_chainId' }),
            16
          );
          
          if (currentChainId === POLYGON_AMOY_CHAIN_ID) {
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await newProvider.getSigner();
            
            setAccount(accounts[0]);
            setChainId(currentChainId);
            setProvider(newProvider);
            setSigner(newSigner);
          }
        }
      } catch (err) {
        console.error('Errore verifica connessione:', err);
      }
    };
    
    checkConnection();
  }, []);

  const isCorrectNetwork = chainId === POLYGON_AMOY_CHAIN_ID;

  return {
    account,
    chainId,
    provider,
    signer,
    polBalance,
    tokenBalance,
    isConnecting,
    isConnected: !!account && isCorrectNetwork,
    isCorrectNetwork,
    isDevMode,
    error,
    connect,
    connectDev,
    disconnect,
    fetchBalances,
    addTokenToMetaMask,
  };
}
