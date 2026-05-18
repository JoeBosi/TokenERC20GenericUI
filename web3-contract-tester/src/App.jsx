import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';
import { WalletConnector } from './components/WalletConnector';
import { ContractInput } from './components/ContractInput';
import { MethodExecutor } from './components/MethodExecutor';

// Common OpenZeppelin AccessControl role hashes
const KNOWN_ROLES = {
  'DEFAULT_ADMIN_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'MINTER_ROLE': '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  'BURNER_ROLE': '0x3c11d16cbaffd01df69ce1c404f6340ee057497f0f34d91e20d8aa3e5a1c9d1c',
  'PAUSER_ROLE': '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
  'TRANSFER_ROLE': '0x5e6d48f5c28b8c65e2a7b5e5d5e8c5d6b7a8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
};

const STORAGE_KEY_CUSTOM_ROLES = 'w3ct_custom_roles';

function RoleExplorer({ contract, account, allRoles, customRoles, setCustomRoles }) {
  const [roleChecks, setRoleChecks] = useState({});
  const [checkAddress, setCheckAddress] = useState('');
  const [addressRoles, setAddressRoles] = useState({});
  const [roleMembers, setRoleMembers] = useState({});
  const [expandedRole, setExpandedRole] = useState(null);
  const [isEnumerable, setIsEnumerable] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  useEffect(() => {
    if (!contract || !account) return;
    
    const checkRoles = async () => {
      const results = {};
      for (const [name, hash] of Object.entries(allRoles)) {
        try {
          const hasRole = await contract.hasRole(hash, account);
          results[name] = hasRole;
        } catch {
          results[name] = null;
        }
      }
      setRoleChecks(results);
      
      // Check if contract supports enumerable
      try {
        await contract.getRoleMemberCount(KNOWN_ROLES.DEFAULT_ADMIN_ROLE);
        setIsEnumerable(true);
      } catch {
        setIsEnumerable(false);
      }
    };
    
    checkRoles();
  }, [contract, account, allRoles]);
  
  const checkAddressRoles = async () => {
    if (!contract || !checkAddress || !ethers.isAddress(checkAddress)) return;
    
    const results = {};
    for (const [name, hash] of Object.entries(allRoles)) {
      try {
        const hasRole = await contract.hasRole(hash, checkAddress);
        results[name] = hasRole;
      } catch {
        results[name] = null;
      }
    }
    setAddressRoles({ address: checkAddress, roles: results });
  };
  
  const addCustomRole = () => {
    if (!newRoleName) return;
    // Calculate keccak256 hash from role name (OpenZeppelin standard)
    const roleHash = ethers.id(newRoleName);
    setCustomRoles(prev => ({ ...prev, [newRoleName]: roleHash }));
    setNewRoleName('');
  };
  
  const removeCustomRole = (name) => {
    setCustomRoles(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };
  
  const loadRoleMembers = async (roleName, roleHash) => {
    if (!isEnumerable || !contract) return;
    
    try {
      const count = await contract.getRoleMemberCount(roleHash);
      const members = [];
      for (let i = 0; i < Math.min(Number(count), 10); i++) {
        const member = await contract.getRoleMember(roleHash, i);
        members.push(member);
      }
      setRoleMembers(prev => ({ ...prev, [roleName]: members }));
      setExpandedRole(expandedRole === roleName ? null : roleName);
    } catch (err) {
      console.log('Error loading members:', err);
    }
  };
  
  if (!contract) return null;
  
  return (
    <div style={roleStyles.card}>
      <div style={roleStyles.header}>
        <div style={roleStyles.titleSection}>
          <h3 style={roleStyles.title}>Roles</h3>
          <p style={roleStyles.subtitle}>{isEnumerable ? 'AccessControlEnumerable' : 'AccessControl'}</p>
        </div>
      </div>
      
      {/* Check custom address */}
      <div style={roleStyles.checkSection}>
        <div style={roleStyles.inputRow}>
          <input
            type="text"
            placeholder="0x... check address"
            value={checkAddress}
            onChange={(e) => setCheckAddress(e.target.value)}
            style={roleStyles.addressInput}
          />
          <button onClick={checkAddressRoles} style={roleStyles.checkBtn}>✓</button>
        </div>
        {addressRoles.address && (
          <div style={roleStyles.addressResult}>
            <p style={roleStyles.addressLabel}>{addressRoles.address.slice(0, 6)}...{addressRoles.address.slice(-4)}</p>
            <div style={roleStyles.miniRoles}>
              {Object.entries(addressRoles.roles).map(([name, has]) => 
                has === true ? <span key={name} style={roleStyles.miniRole}>{name.replace('_ROLE', '')}</span> : null
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Custom roles input */}
      <div style={roleStyles.customSection}>
        <p style={roleStyles.sectionLabel}>Add role (clear name):</p>
        <div style={roleStyles.customInputRow}>
          <input
            type="text"
            placeholder="es. WHITELIST_ROLE"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            style={roleStyles.customInput}
            onKeyPress={(e) => e.key === 'Enter' && addCustomRole()}
          />
          <button onClick={addCustomRole} style={roleStyles.addBtn}>+</button>
        </div>
        <p style={roleStyles.hintText}>keccak256 hash calculated automatically</p>
      </div>
      
      <div style={roleStyles.rolesList}>
        {Object.entries(roleChecks).map(([name, hasRole]) => (
          <div key={name}>
            <div 
              style={{
                ...roleStyles.roleRow,
                ...(isEnumerable ? roleStyles.clickable : {}),
              }}
              onClick={() => isEnumerable && loadRoleMembers(name, allRoles[name])}
            >
              <div style={roleStyles.roleInfo}>
                <span style={roleStyles.roleName}>{name}</span>
                {isEnumerable && <span style={roleStyles.hint}>👤</span>}
                {customRoles[name] && <span style={roleStyles.customBadge}>custom</span>}
              </div>
              <span style={{
                ...roleStyles.roleStatus,
                ...(hasRole === true ? roleStyles.hasRole : {}),
                ...(hasRole === false ? roleStyles.noRole : {}),
                ...(hasRole === null ? roleStyles.unknownRole : {}),
              }}>
                {hasRole === true ? '✓' : hasRole === false ? '—' : '?'}
              </span>
            </div>
            {expandedRole === name && roleMembers[name] && (
              <div style={roleStyles.membersList}>
                {roleMembers[name].length === 0 ? (
                  <span style={roleStyles.noMembers}>Nessun membro</span>
                ) : (
                  roleMembers[name].map((member, i) => (
                    <span key={i} style={roleStyles.member}>
                      {member.slice(0, 6)}...{member.slice(-4)}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Address Monitor Component
const STORAGE_KEY_ADDRESSES = 'w3ct_monitored_addresses';

function AddressMonitor({ contract, provider, tokenSymbol, allRoles, refreshTrigger }) {
  const [addresses, setAddresses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ADDRESSES);
    return saved ? JSON.parse(saved) : ['', '', '', '', ''];
  });
  const [balances, setBalances] = useState({});
  const [tokenBalances, setTokenBalances] = useState({});
  const [addressRoles, setAddressRoles] = useState({});
  
  // Save to localStorage when addresses change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(addresses));
  }, [addresses]);
  
  // Fetch balances and roles for all addresses
  useEffect(() => {
    if (!provider) return;
    
    const fetchData = async () => {
      const newBalances = {};
      const newTokenBalances = {};
      const newRoles = {};
      
      const rolesToCheck = allRoles || KNOWN_ROLES;
      
      for (const addr of addresses) {
        if (!addr || !ethers.isAddress(addr)) continue;
        
        try {
          // Get POL balance
          const balance = await provider.getBalance(addr);
          newBalances[addr] = ethers.formatEther(balance);
          
          // Get token balance if contract exists
          if (contract) {
            try {
              const tokenBal = await contract.balanceOf(addr);
              newTokenBalances[addr] = ethers.formatUnits(tokenBal, 18);
            } catch {
              // Token may not have balanceOf
            }
            
            // Get roles
            const roles = {};
            for (const [name, hash] of Object.entries(rolesToCheck)) {
              try {
                const hasRole = await contract.hasRole(hash, addr);
                roles[name] = hasRole;
              } catch {
                roles[name] = null;
              }
            }
            newRoles[addr] = roles;
          }
        } catch (err) {
          console.log('Error fetching data for', addr, err);
        }
      }
      
      setBalances(newBalances);
      setTokenBalances(newTokenBalances);
      setAddressRoles(newRoles);
    };
    
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [addresses, contract, provider, allRoles, refreshTrigger]);
  
  const updateAddress = (index, value) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
  };
  
  const resetAll = () => {
    setAddresses(['', '', '', '', '']);
    setBalances({});
    setTokenBalances({});
    setAddressRoles({});
    localStorage.removeItem(STORAGE_KEY_ADDRESSES);
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ROLES);
    // Also clear contract and ABI
    localStorage.removeItem('w3ct_contract_address');
    localStorage.removeItem('w3ct_contract_abi');
    window.location.reload();
  };
  
  const getActiveRoles = (addr) => {
    const roles = addressRoles[addr];
    if (!roles) return [];
    return Object.entries(roles)
      .filter(([_, has]) => has === true)
      .map(([name]) => name.replace('_ROLE', ''));
  };
  
  const formatTokenBalance = (addr) => {
    const bal = tokenBalances[addr];
    if (!bal) return null;
    const num = parseFloat(bal);
    if (num === 0) return null;
    return num > 1000000 ? `${(num / 1000000).toFixed(2)}M` : num.toFixed(4);
  };
  
  return (
    <div style={monitorStyles.card}>
      <div style={monitorStyles.header}>
        <div style={monitorStyles.titleSection}>
          <h3 style={monitorStyles.title}>Address Monitor</h3>
          <p style={monitorStyles.subtitle}>5 saved addresses</p>
        </div>
      </div>
      
      <div style={monitorStyles.addressList}>
        {addresses.map((addr, i) => (
          <div key={i} style={monitorStyles.addressRow}>
            <div style={monitorStyles.inputRow}>
              <span style={monitorStyles.index}>#{i + 1}</span>
              <input
                type="text"
                placeholder="0x..."
                value={addr}
                onChange={(e) => updateAddress(i, e.target.value)}
                style={monitorStyles.input}
              />
            </div>
            {ethers.isAddress(addr) && balances[addr] && (
              <div style={monitorStyles.info}>
                <div style={monitorStyles.balancesRow}>
                  <span style={monitorStyles.balance}>{parseFloat(balances[addr]).toFixed(4)} POL</span>
                  {formatTokenBalance(addr) && (
                    <span style={monitorStyles.tokenBalance}>
                      {formatTokenBalance(addr)} {tokenSymbol || 'TKN'}
                    </span>
                  )}
                </div>
                {getActiveRoles(addr).length > 0 && (
                  <div style={monitorStyles.roles}>
                    {getActiveRoles(addr).map(r => (
                      <span key={r} style={monitorStyles.roleTag}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={resetAll} style={monitorStyles.resetBtn}>
        Reset saved information
      </button>
    </div>
  );
}

const monitorStyles = {
  card: {
    background: '#FFF',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 20px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#000',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#666',
    margin: '2px 0 0 0',
  },
  addressList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  addressRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  index: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#999',
    minWidth: '20px',
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '8px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingLeft: '28px',
  },
  balance: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  balancesRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  tokenBalance: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#34C759',
    fontFamily: 'monospace',
  },
  roles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  roleTag: {
    fontSize: '9px',
    padding: '2px 6px',
    background: 'rgba(52, 199, 89, 0.15)',
    color: '#34C759',
    borderRadius: '100px',
    fontWeight: 600,
  },
  resetBtn: {
    marginTop: '12px',
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '0.5px solid #FF3B30',
    borderRadius: '10px',
    color: '#FF3B30',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

const roleStyles = {
  card: {
    background: '#FFF',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 20px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#000',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#666',
    margin: '2px 0 0 0',
  },
  checkSection: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  inputRow: {
    display: 'flex',
    gap: '6px',
  },
  addressInput: {
    flex: 1,
    padding: '8px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '8px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
  },
  checkBtn: {
    padding: '8px 12px',
    background: '#000',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  addressResult: {
    marginTop: '8px',
    padding: '8px',
    background: '#F2F2F7',
    borderRadius: '8px',
  },
  addressLabel: {
    fontSize: '11px',
    color: '#666',
    margin: '0 0 4px 0',
    fontFamily: 'monospace',
  },
  miniRoles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  miniRole: {
    fontSize: '9px',
    padding: '2px 6px',
    background: 'rgba(52, 199, 89, 0.15)',
    color: '#34C759',
    borderRadius: '100px',
    fontWeight: 600,
  },
  rolesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  roleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: '#F2F2F7',
    borderRadius: '8px',
  },
  clickable: {
    cursor: 'pointer',
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  roleName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#000',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: '10px',
    opacity: 0.5,
  },
  roleStatus: {
    fontSize: '13px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '100px',
    background: '#E5E5EA',
    color: '#666',
  },
  membersList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '6px 10px 10px',
    marginLeft: '10px',
  },
  member: {
    fontSize: '10px',
    padding: '3px 8px',
    background: '#E5E5EA',
    borderRadius: '100px',
    fontFamily: 'monospace',
    color: '#666',
  },
  noMembers: {
    fontSize: '11px',
    color: '#999',
    fontStyle: 'italic',
  },
  customSection: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    margin: '0 0 6px 0',
  },
  customInputRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '4px',
  },
  customInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '11px',
    border: 'none',
    borderRadius: '6px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
  },
  addBtn: {
    padding: '6px 12px',
    background: '#000',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  hintText: {
    fontSize: '10px',
    color: '#999',
    margin: '4px 0 0 0',
    fontStyle: 'italic',
  },
  customBadge: {
    fontSize: '8px',
    padding: '1px 4px',
    background: 'rgba(0, 122, 255, 0.15)',
    color: '#007AFF',
    borderRadius: '3px',
    fontWeight: 600,
  },
  hasRole: {
    background: 'rgba(52, 199, 89, 0.15)',
    color: '#34C759',
  },
  noRole: {
    background: 'rgba(0, 0, 0, 0.08)',
    color: '#999',
  },
  unknownRole: {
    background: 'rgba(255, 149, 0, 0.15)',
    color: '#FF9500',
  },
};

function App() {
  const {
    account,
    provider,
    signer,
    polBalance,
    tokenBalance,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    isDevMode,
    error: walletError,
    connect,
    connectDev,
    disconnect,
    fetchBalances,
  } = useWallet();

  const {
    contractAddress,
    setContractAddress,
    abi,
    setAbi,
    contract,
    readMethods,
    writeMethods,
    autoReadValues,
    error: contractError,
    loadErc20Preset,
    clearContract,
    watchAsset,
    refreshReadValues,
  } = useContract(provider, signer, fetchBalances);

  const [tokenSymbol, setTokenSymbol] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Custom roles state (shared between RoleExplorer and AddressMonitor)
  const [customRoles, setCustomRoles] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ROLES);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Save custom roles to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_ROLES, JSON.stringify(customRoles));
  }, [customRoles]);
  
  // Combine known and custom roles
  const allRoles = { ...KNOWN_ROLES, ...customRoles };

  // Fetch token symbol from contract
  useEffect(() => {
    if (!contract) {
      setTokenSymbol('');
      return;
    }
    
    const fetchSymbol = async () => {
      try {
        const symbol = await contract.symbol();
        setTokenSymbol(symbol);
      } catch {
        setTokenSymbol('');
      }
    };
    
    fetchSymbol();
  }, [contract]);

  return (
    <>
      <style>{`
        .app-container {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(300px, 22%) 1fr;
          gap: 24px;
          padding: 0 24px;
        }
        @media (max-width: 1024px) {
          .app-container {
            grid-template-columns: 280px 1fr;
            gap: 20px;
            padding: 0 20px;
          }
        }
        @media (max-width: 768px) {
          .app-container {
            grid-template-columns: 1fr;
            gap: 16px;
            padding: 0 16px;
          }
        }
      `}</style>
      <div style={styles.app}>
        <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style={styles.logoText}>Web3 Contract Tester</h1>
          </div>
          {isConnected && (
            <div style={styles.headerRight}>
              <div style={styles.addressBadge} onClick={() => navigator.clipboard.writeText(account)}>
                <span style={styles.addressLabel}>Wallet</span>
                <span style={styles.addressValue}>{account}</span>
              </div>
              <div style={styles.balances}>
                <div style={styles.balanceBadge}>
                  <span style={styles.balanceLabel}>POL</span>
                  <span style={styles.balanceValue}>{polBalance ? parseFloat(polBalance).toFixed(4) : '—'}</span>
                </div>
                {tokenBalance && (
                  <div style={styles.balanceBadge}>
                    <span style={styles.balanceLabel}>TOKEN</span>
                    <span style={styles.balanceValue}>{parseFloat(tokenBalance).toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={styles.networkBadge}>
            <span style={styles.networkDot}></span>
            Polygon Amoy
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div className="app-container">
          <div style={styles.leftColumn}>
            <WalletConnector
              account={account}
              isConnecting={isConnecting}
              isCorrectNetwork={isCorrectNetwork}
              isDevMode={isDevMode}
              error={walletError}
              onConnect={connect}
              onConnectDev={connectDev}
              onDisconnect={disconnect}
            />
            
            <ContractInput
              contractAddress={contractAddress}
              setContractAddress={setContractAddress}
              abi={abi}
              setAbi={setAbi}
              onLoadPreset={loadErc20Preset}
              onClear={clearContract}
              error={contractError}
            />
            
            {isConnected && contract && (
              <div style={styles.tokenAction}>
                <button onClick={watchAsset} style={styles.watchTokenBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="6"/>
                    <polyline points="8 13 6 21 12 18 18 21 16 13"/>
                  </svg>
                  Add to MetaMask
                </button>
              </div>
            )}
            
            {isConnected && (
              <RoleExplorer 
                contract={contract} 
                account={account}
                allRoles={allRoles}
                customRoles={customRoles}
                setCustomRoles={setCustomRoles}
              />
            )}
            
            {isConnected && (
              <AddressMonitor 
                contract={contract} 
                provider={provider} 
                tokenSymbol={tokenSymbol}
                allRoles={allRoles}
                refreshTrigger={refreshTrigger}
              />
            )}
          </div>
          
          <div style={styles.rightColumn}>
            <MethodExecutor
              contract={contract}
              readMethods={readMethods}
              writeMethods={writeMethods}
              autoReadValues={autoReadValues}
              onTransactionSuccess={() => setRefreshTrigger(prev => prev + 1)}
              onRefreshReads={refreshReadValues}
              account={account}
            />
          </div>

          {!isConnected && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
              <p style={styles.emptyTitle}>Connetti il tuo wallet</p>
              <p style={styles.emptySubtitle}>
                Connetti MetaMask e configura un contratto per iniziare il testing
              </p>
            </div>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Giuseppe Bosi
        </p>
      </footer>
    </div>
    </>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#F5F5F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#1D1D1F',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '10px 16px',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#000',
    margin: 0,
  },
  networkBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#666',
    padding: '4px 10px',
    background: '#E5E5EA',
    borderRadius: '100px',
  },
  networkDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#34C759',
  },
  balances: {
    display: 'flex',
    gap: '6px',
    marginRight: '10px',
  },
  balanceBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '4px 10px',
    background: '#E5E5EA',
    borderRadius: '8px',
    minWidth: '60px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  balanceLabel: {
    fontSize: '8px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#000',
    fontFamily: 'monospace',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginRight: '12px',
  },
  addressBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '4px 10px',
    background: '#E5E5EA',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s ease',
  },
  addressLabel: {
    fontSize: '8px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
  },
  addressValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#000',
    fontFamily: 'monospace',
  },
  main: {
    flex: 1,
    padding: '16px 0 80px',
    display: 'flex',
    justifyContent: 'center',
    overflowY: 'auto',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: '24px',
    padding: '0 24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0,
    overflow: 'hidden',
  },
  '@media (max-width: 1024px)': {
    container: {
      gridTemplateColumns: '320px 1fr',
      gap: '20px',
      padding: '0 20px',
    },
  },
  '@media (max-width: 768px)': {
    container: {
      gridTemplateColumns: '1fr',
      gap: '16px',
      padding: '0 16px',
    },
  },
  tokenAction: {
    marginBottom: '0',
  },
  watchTokenBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px 14px',
    background: '#FFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#007AFF',
    cursor: 'pointer',
    boxShadow: '0 0.5px 2px rgba(0,0,0,0.1)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#000',
    margin: '0 0 4px 0',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  footer: {
    padding: '4px 16px',
    textAlign: 'right',
    background: '#F5F5F7',
    borderTop: '0.5px solid #E5E5EA',
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
  },
  footerText: {
    fontSize: '10px',
    color: '#86868B',
    margin: 0,
  },
  footerAuthor: {
    color: '#1D1D1F',
    fontWeight: 500,
  },
};

export default App;
