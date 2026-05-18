import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const STORAGE_KEY_ADDRESS = 'contract_address';
const STORAGE_KEY_ABI = 'contract_abi';

// Default test values
const DEFAULT_CONTRACT_ADDRESS = '0x8Bc73fAe464d4ce567b702571933dFD3F118D53F';
const DEFAULT_ABI = [
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"blockAccount","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"unblockAccount","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isBlocked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"freeze","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"unfreeze","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isFrozen","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

export const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  }
];

export function useContract(provider, signer, fetchBalances) {
  const [contractAddress, setContractAddress] = useState('');
  const [abi, setAbi] = useState('');
  const [contract, setContract] = useState(null);
  const [parsedAbi, setParsedAbi] = useState([]);
  const [readMethods, setReadMethods] = useState([]);
  const [writeMethods, setWriteMethods] = useState([]);
  const [autoReadValues, setAutoReadValues] = useState({});
  const [error, setError] = useState(null);

  // Auto-read view methods without parameters
  const autoReadViewMethods = useCallback(async (contractInstance, readMethodsList) => {
    if (!contractInstance || !readMethodsList?.length) return;
    
    const noParamMethods = readMethodsList.filter(m => !m.inputs || m.inputs.length === 0);
    if (noParamMethods.length === 0) return;

    const values = {};
    for (const method of noParamMethods) {
      try {
        const result = await contractInstance[method.name]();
        // Format based on output type
        if (method.outputs && method.outputs[0]) {
          const outputType = method.outputs[0].type;
          if (outputType === 'uint256') {
            values[method.name] = result.toString();
          } else if (outputType === 'address') {
            values[method.name] = result;
          } else if (outputType === 'bool') {
            values[method.name] = result ? 'Sì' : 'No';
          } else {
            values[method.name] = result;
          }
        } else {
          values[method.name] = result;
        }
      } catch (err) {
        console.log(`[DEBUG] Auto-read failed for ${method.name}:`, err.message);
        values[method.name] = '—';
      }
    }
    setAutoReadValues(values);
  }, []);

  const refreshReadValues = useCallback(async () => {
    if (contract && readMethods.length > 0) {
      await autoReadViewMethods(contract, readMethods);
    }
  }, [contract, readMethods, autoReadViewMethods]);

  // Auto-refresh properties every 10 seconds
  useEffect(() => {
    if (!contract || !readMethods.length) return;
    
    // Initial read
    autoReadViewMethods(contract, readMethods);
    
    // Set up interval for auto-refresh (only for no-param methods)
    const interval = setInterval(() => {
      autoReadViewMethods(contract, readMethods);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [contract, readMethods, autoReadViewMethods]);

  useEffect(() => {
    console.log('[DEBUG] Initializing useContract...');
    const savedAddress = localStorage.getItem(STORAGE_KEY_ADDRESS);
    const savedAbi = localStorage.getItem(STORAGE_KEY_ABI);
    
    console.log('[DEBUG] Saved address:', savedAddress);
    console.log('[DEBUG] Saved ABI length:', savedAbi?.length);
    
    // Use saved values if available and not empty, otherwise use defaults
    if (savedAddress && savedAddress.trim() !== '') {
      console.log('[DEBUG] Using saved address');
      setContractAddress(savedAddress);
    } else {
      console.log('[DEBUG] Using default address:', DEFAULT_CONTRACT_ADDRESS);
      setContractAddress(DEFAULT_CONTRACT_ADDRESS);
    }
    
    if (savedAbi && savedAbi.trim() !== '' && savedAbi !== '[]') {
      console.log('[DEBUG] Using saved ABI');
      setAbi(savedAbi);
    } else {
      const defaultAbiString = JSON.stringify(DEFAULT_ABI, null, 2);
      console.log('[DEBUG] Using default ABI, length:', defaultAbiString.length);
      setAbi(defaultAbiString);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADDRESS, contractAddress);
    localStorage.setItem(STORAGE_KEY_ABI, abi);
  }, [contractAddress, abi]);

  useEffect(() => {
    console.log('[DEBUG] useContract effect triggered:', { 
      hasAbi: !!abi, 
      abiLength: abi?.length, 
      contractAddress, 
      hasProvider: !!provider,
      hasSigner: !!signer 
    });
    
    if (!abi || !contractAddress) {
      console.log('[DEBUG] Missing abi or contractAddress');
      setContract(null);
      setParsedAbi([]);
      setReadMethods([]);
      setWriteMethods([]);
      return;
    }

    try {
      const parsed = JSON.parse(abi);
      console.log('[DEBUG] ABI parsed, items:', parsed.length);
      setParsedAbi(parsed);
      setError(null);

      // Filter only functions
      const functions = Array.isArray(parsed) ? parsed.filter(item => item.type === 'function') : [];
      console.log('[DEBUG] Functions found:', functions.length);
      console.log('[DEBUG] Functions:', functions.map(f => f.name));
      
      const read = functions.filter(
        fn => fn.stateMutability === 'view' || fn.stateMutability === 'pure'
      );
      
      const write = functions.filter(
        fn => fn.stateMutability === 'nonpayable' || fn.stateMutability === 'payable'
      );

      console.log('[DEBUG] Read methods:', read.length, read.map(f => f.name));
      console.log('[DEBUG] Write methods:', write.length, write.map(f => f.name));

      setReadMethods(read);
      setWriteMethods(write);

      // Create contract instance if provider/signer available
      if (provider || signer) {
        const contractInstance = new ethers.Contract(contractAddress, parsed, signer || provider);
        console.log('[DEBUG] Contract instance created');
        setContract(contractInstance);
        
        // Auto-read view methods and fetch balances
        setTimeout(async () => {
          await autoReadViewMethods(contractInstance, read);
          if (fetchBalances && typeof fetchBalances === 'function') {
            const account = signer?.address || provider?.getSigner?.()?.address;
            if (account) await fetchBalances(account, provider, contractInstance);
          }
        }, 100);
      } else {
        console.log('[DEBUG] No provider/signer, contract methods available but not executable');
        setContract(null);
      }
    } catch (err) {
      console.error('[DEBUG] ABI parse error:', err);
      setError('ABI JSON non valido: ' + err.message);
      setContract(null);
      setParsedAbi([]);
      setReadMethods([]);
      setWriteMethods([]);
    }
  }, [abi, contractAddress, provider, signer]);

  const loadErc20Preset = useCallback(() => {
    setAbi(JSON.stringify(ERC20_ABI, null, 2));
  }, []);

  const clearContract = useCallback(() => {
    setContractAddress('');
    setAbi('');
    localStorage.removeItem(STORAGE_KEY_ADDRESS);
    localStorage.removeItem(STORAGE_KEY_ABI);
  }, []);

  const watchAsset = useCallback(async () => {
    if (!contract) throw new Error('Contratto non inizializzato');

    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();

      // Check if MetaMask is available
      if (!window.ethereum) {
        // Dev mode: just show token info
        console.log('[TOKEN INFO]', { name, symbol, decimals, address: contractAddress });
        throw new Error(`MetaMask non disponibile. Token: ${name} (${symbol}) - ${contractAddress}`);
      }

      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: contractAddress,
            symbol: symbol,
            decimals: Number(decimals),
            name: name,
          },
        },
      });
    } catch (err) {
      throw new Error('Errore aggiunta token: ' + err.message);
    }
  }, [contract, contractAddress]);

  return {
    contractAddress,
    setContractAddress,
    abi,
    setAbi,
    contract,
    parsedAbi,
    readMethods,
    writeMethods,
    autoReadValues,
    error,
    loadErc20Preset,
    clearContract,
    watchAsset,
    refreshReadValues,
  };
}
