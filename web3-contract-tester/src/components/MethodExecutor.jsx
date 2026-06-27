import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export function MethodExecutor({ contract, readMethods, writeMethods, autoReadValues, onRefreshReads, account, onTransactionSuccess }) {
  const [methodInputs, setMethodInputs] = useState({});
  const [methodResults, setMethodResults] = useState({});
  const [executingMethods, setExecutingMethods] = useState(new Set());
  const [expandedMethods, setExpandedMethods] = useState(new Set());
  const [transactionEvents, setTransactionEvents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputChange = useCallback((methodName, paramIndex, value) => {
    setMethodInputs(prev => ({
      ...prev,
      [methodName]: {
        ...prev[methodName],
        [paramIndex]: value,
      },
    }));
  }, []);

  const toggleExpand = useCallback((methodName) => {
    setExpandedMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(methodName)) {
        newSet.delete(methodName);
      } else {
        newSet.add(methodName);
      }
      return newSet;
    });
  }, []);

  const executeMethod = useCallback(async (method, isRead) => {
    if (!contract) return;

    const methodName = method.name;
    setExecutingMethods(prev => new Set(prev).add(methodName));
    setMethodResults(prev => ({ ...prev, [methodName]: null }));

    try {
      const inputs = methodInputs[methodName] || {};
      const args = method.inputs.map((_, index) => {
        const value = inputs[index] || '';
        if (value === '') {
          throw new Error(`Parameter ${index + 1} is missing`);
        }
        return value;
      });

      let result;
      let events = [];
      if (isRead) {
        result = await contract[methodName](...args);
        if (typeof result === 'object' && result.toString) {
          result = result.toString();
        }
      } else {
        const tx = await contract[methodName](...args);
        result = await tx.wait();
        // Extract events from transaction receipt
        if (result?.logs) {
          events = result.logs.map((log, index) => {
            try {
              const parsed = contract.interface.parseLog(log);
              if (!parsed) return null;
              
              // Extract named args from the event fragment. In ethers v6 a Result
              // exposes positional values; named keys are taken from the fragment
              // inputs (iterating Object.entries skips them and yields nothing).
              const args = {};
              const eventInputs = parsed.fragment?.inputs || [];
              eventInputs.forEach((inp, i) => {
                const key = inp.name || `arg${i}`;
                const value = parsed.args?.[i];
                if (typeof value === 'bigint') {
                  args[key] = value.toString();
                } else if (typeof value === 'string' && ethers.isAddress(value)) {
                  args[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                  args[key] = JSON.stringify(value);
                } else {
                  args[key] = String(value);
                }
              });
              
              return {
                name: parsed.name || `Event ${index}`,
                signature: parsed.signature,
                args,
              };
            } catch {
              return null;
            }
          }).filter(e => e !== null);
        }
        
        result = {
          hash: tx.hash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed.toString(),
          status: result.status === 1 ? 'Success' : 'Failed',
          events: events,
        };
        
        // Store events for this method
        setTransactionEvents(prev => ({ ...prev, [methodName]: events }));
      }

      setMethodResults(prev => ({
        ...prev,
        [methodName]: {
          success: true,
          data: result,
          events: events,
          timestamp: Date.now(),
        },
      }));
      
      // Notify parent component for refresh
      if (!isRead && onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err) {
      const decodedError = decodeContractError(err);
      setMethodResults(prev => ({
        ...prev,
        [methodName]: {
          success: false,
          error: decodedError,
          rawError: err?.data || err?.message, // Keep raw for debugging
          timestamp: Date.now(),
        },
      }));
    } finally {
      setExecutingMethods(prev => {
        const newSet = new Set(prev);
        newSet.delete(methodName);
        return newSet;
      });
    }
  }, [contract, methodInputs]);

  const formatType = (type) => {
    if (type.includes('uint')) return 'number';
    if (type === 'address') return 'text';
    if (type === 'bool') return 'checkbox';
    return 'text';
  };

  // Known error selectors for common OpenZeppelin errors (v4 strings + v5 custom errors)
  const KNOWN_ERROR_SELECTORS = {
    '0xe2517d3f': 'Access denied: unauthorized account',
    '0x0f492d86': 'Access denied: missing required role',
    '0xd7a6a93f': 'Account blocked (blacklist)',
    '0x143c6fd7': 'Account frozen',
    '0xd93c0665': 'Contract is paused',
    '0x5e60214d': 'Invalid nonce',
    '0x074b1308': 'Invalid signature',
    '0x8baa579f': 'Insufficient balance',
    '0x3966b699': 'SafeERC20: low-level call failed',
    '0x64128d11': 'ERC20: insufficient allowance',
    '0x4b637e8a': 'ERC20: transfer amount exceeds balance',
    // OpenZeppelin v5 custom errors
    '0xe450d38c': 'ERC20: insufficient balance',
    '0xfb8f41b2': 'ERC20: insufficient allowance',
    '0x96c6fd1e': 'ERC20: invalid sender',
    '0xec442f05': 'ERC20: invalid receiver',
    '0x7939f424': 'ERC721: transfer of token that is not own',
    '0x30cd7471': 'ERC721: approve caller is not owner nor approved',
    '0x150b5f0b': 'ERC721: operator query for nonexistent token',
    '0xab357eac': 'ReentrancyGuard: reentrant call',
  };

  // Decode custom contract errors for human-readable messages
  const decodeContractError = (err) => {
    // Get error data from various possible locations
    let data = err?.data || err?.error?.data || err?.revert?.data;
    
    // Sometimes data is inside error.message as hex string
    if (!data && err?.message) {
      const hexMatch = err.message.match(/0x[a-fA-F0-9]+/);
      if (hexMatch) data = hexMatch[0];
    }
    
    if (!data) return err?.reason || err?.message || 'Unknown error';
    
    // Extract selector (first 10 chars: 0x + 8 hex)
    const selector = data.toString().slice(0, 10).toLowerCase();
    
    // Check known errors first (fast path)
    if (KNOWN_ERROR_SELECTORS[selector]) {
      return `❌ ${KNOWN_ERROR_SELECTORS[selector]}`;
    }
    
    // Try to parse with contract interface if available
    if (contract) {
      try {
        const parsed = contract.interface.parseError(data);
        if (parsed) {
          const args = Object.entries(parsed.args || {})
            .filter(([k]) => isNaN(k))
            .map(([k, v]) => {
              // Format addresses
              if (typeof v === 'string' && v.startsWith('0x') && v.length === 42) {
                return `${k}: ${v.slice(0, 6)}...${v.slice(-4)}`;
              }
              // Format big numbers
              if (typeof v === 'bigint') {
                return `${k}: ${v.toLocaleString()}`;
              }
              return `${k}: ${v}`;
            })
            .join(', ');
          
          return `❌ ${parsed.name}${args ? ` (${args})` : ''}`;
        }
      } catch {
        // Interface parse failed, already checked known errors above
      }
    }
    
    return err?.reason || err?.message || 'Unknown error';
  };

  // Helper to format event values for display
  const formatEventValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'bigint') {
      // Format big numbers with commas
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      // Truncate addresses
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }
    if (typeof value === 'boolean') {
      return value ? '✓ Yes' : '✗ No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
    }
    return String(value);
  };

  const getPlaceholder = (type, name) => {
    if (type.includes('uint')) return '123...';
    if (type === 'address') return '0x...';
    if (type === 'bool') return '';
    return name || 'value';
  };

  const renderMethodCard = (method, isRead, isConnected) => {
    const methodName = method.name;
    const isExpanded = expandedMethods.has(methodName);
    const isExecuting = executingMethods.has(methodName);
    const result = methodResults[methodName];
    const hasInputs = method.inputs && method.inputs.length > 0;

    return (
      <div key={methodName} style={styles.methodCard}>
        <div 
          style={styles.methodHeader}
          onClick={() => hasInputs && toggleExpand(methodName)}
        >
          <div style={styles.methodInfo}>
            <span style={{
              ...styles.badge,
              ...(isRead ? styles.readBadgeSmall : styles.writeBadgeSmall),
            }}>
              {isRead ? 'READ' : 'WRITE'}
            </span>
            <span style={styles.methodName}>{methodName}</span>
          </div>
          <div style={styles.methodActions}>
            {hasInputs && (
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{
                  ...styles.chevron,
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            )}
          </div>
        </div>

        {(isExpanded || !hasInputs) && (
          <div style={styles.methodBody}>
            {/* Auto-read value display for methods without inputs */}
            {!hasInputs && isRead && autoReadValues[methodName] && (
              <div style={styles.autoReadValue}>
                <span style={styles.autoReadLabel}>Current value:</span>
                <span style={styles.autoReadData}>{autoReadValues[methodName]}</span>
              </div>
            )}

            {hasInputs && (
              <div style={styles.inputsGrid}>
                {method.inputs.map((input, index) => (
                  <div key={index} style={styles.inputGroup}>
                    <label style={styles.inputLabel}>
                      {input.name || `param${index}`}
                      <span style={styles.typeTag}>{input.type}</span>
                    </label>
                    <input
                      type={formatType(input.type)}
                      value={(methodInputs[methodName]?.[index]) || ''}
                      onChange={(e) => handleInputChange(methodName, index, e.target.value)}
                      placeholder={getPlaceholder(input.type, input.name)}
                      style={styles.methodInput}
                    />
                  </div>
                ))}
              </div>
            )}

            {!isConnected && (
              <div style={styles.connectWarning}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Connect wallet to execute
              </div>
            )}

            <button
              onClick={() => executeMethod(method, isRead)}
              disabled={isExecuting || !isConnected}
              style={{
                ...styles.executeBtn,
                ...(isRead ? styles.readBtn : styles.writeBtn),
                ...((isExecuting || !isConnected) ? styles.executeBtnDisabled : {}),
              }}
            >
              {isExecuting ? (
                <span style={styles.loading}>
                  <span style={styles.spinner}></span>
                  Executing...
                </span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isRead ? (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    ) : (
                      <path d="M12 2v20M2 12h20"/>
                    )}
                    {isRead && <circle cx="12" cy="12" r="3"/>}
                  </svg>
                  {isRead ? 'Execute Read' : 'Execute Write'}
                </>
              )}
            </button>

            {result && (
              <div style={{
                ...styles.result,
                ...(result.success ? styles.resultSuccess : styles.resultError),
              }}>
                <div style={styles.resultHeader}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {result.success ? (
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    ) : (
                      <circle cx="12" cy="12" r="10"/>
                    )}
                    {result.success ? (
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    ) : (
                      <>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </>
                    )}
                  </svg>
                  <span style={styles.resultTitle}>
                    {result.success ? 'Success' : 'Error'}
                  </span>
                  <span style={styles.resultTime}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre style={styles.resultData}>
                  {result.success 
                    ? (typeof result.data === 'object' 
                        ? JSON.stringify(result.data, null, 2) 
                        : String(result.data))
                    : result.error
                  }
                </pre>
                
                {/* Events from transaction - Generalized for any ABI */}
                {result.events && result.events.length > 0 && (
                  <div style={styles.eventsSection}>
                    <div style={styles.eventsHeader}>📢 Events emitted:</div>
                    {result.events.map((event, idx) => (
                      <div key={idx} style={styles.eventCard}>
                        <div style={styles.eventHeader}>
                          <span style={styles.eventIndex}>#{idx + 1}</span>
                          <span style={styles.eventName}>{event.name}</span>
                        </div>
                        <div style={styles.eventArgs}>
                          {typeof event.args === 'object' && event.args !== null && !Array.isArray(event.args) ? (
                            Object.entries(event.args).length > 0 ? (
                              Object.entries(event.args).map(([key, value]) => (
                                <div key={key} style={styles.eventArg}>
                                  <span style={styles.argName}>{key}:</span>
                                  <span style={styles.argValue}>{formatEventValue(value)}</span>
                                </div>
                              ))
                            ) : (
                              <div style={styles.noArgs}>No arguments</div>
                            )
                          ) : (
                            <div style={styles.eventArg}>
                              <span style={styles.argValue}>{formatEventValue(event.args)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (readMethods.length === 0 && writeMethods.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.icon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div style={styles.titleSection}>
              <h3 style={styles.title}>Contract Methods</h3>
              <p style={styles.subtitle}>No methods found in ABI</p>
            </div>
          </div>
          <div style={styles.noContract}>
            <p>Enter a valid ABI with functions (type: "function")</p>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = !!contract;
  
  // Filter methods based on search query
  const filteredReadMethods = searchQuery
    ? readMethods.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : readMethods;
  const filteredWriteMethods = searchQuery
    ? writeMethods.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : writeMethods;

  return (
    <>
      <style>{`
        .methods-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .methods-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div style={styles.titleSection}>
            <h3 style={styles.title}>Contract Methods</h3>
          </div>
          <div style={styles.headerBadges}>
            <span style={styles.readBadge}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              {readMethods.length} read
            </span>
            <span style={styles.writeBadge}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 2v20M2 12h20"/>
              </svg>
              {writeMethods.length} write
            </span>
          </div>
        </div>
        
        {/* Search filter */}
        <div style={styles.searchRow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={styles.searchIcon}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearSearch} title="Clear search" aria-label="Clear search">×</button>
          )}
        </div>

        <div className="methods-grid">
          {filteredReadMethods.map(method => renderMethodCard(method, true, isConnected))}
          {filteredWriteMethods.map(method => renderMethodCard(method, false, isConnected))}
          {filteredReadMethods.length === 0 && filteredWriteMethods.length === 0 && (
            <div style={styles.noResults}>No methods found</div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

const styles = {
  container: {
    marginBottom: '0',
  },
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
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    marginRight: '12px',
    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
  },
  headerBadges: {
    display: 'flex',
    gap: '8px',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1D1D1F',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#86868B',
    margin: '2px 0 0 0',
  },
  readBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#34C759',
    background: 'rgba(52, 199, 89, 0.1)',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  writeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#FF9500',
    background: 'rgba(255, 149, 0, 0.1)',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: '#F2F2F7',
    borderRadius: '10px',
    marginBottom: '12px',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    color: '#000',
    outline: 'none',
    padding: 0,
  },
  clearSearch: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
  },
  methodCard: {
    background: '#F2F2F7',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  methodHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    cursor: 'pointer',
  },
  methodInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    fontSize: '8px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '100px',
  },
  readBadgeSmall: {
    background: 'rgba(52, 199, 89, 0.12)',
    color: '#34C759',
  },
  writeBadgeSmall: {
    background: 'rgba(0, 0, 0, 0.08)',
    color: '#666',
  },
  methodName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#000',
    fontFamily: 'monospace',
  },
  methodActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  chevron: {
    color: '#999',
    transition: 'transform 0.2s ease',
  },
  methodBody: {
    padding: '0 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  typeTag: {
    fontSize: '9px',
    padding: '1px 4px',
    background: '#E5E5EA',
    borderRadius: '3px',
    fontFamily: 'monospace',
    color: '#666',
  },
  methodInput: {
    padding: '8px 10px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '8px',
    background: '#FFF',
    color: '#000',
    fontFamily: 'monospace',
    boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
  },
  executeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    color: '#FFF',
  },
  readBtn: {
    background: '#34C759',
  },
  writeBtn: {
    background: '#000',
  },
  executeBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  result: {
    marginTop: '4px',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '13px',
  },
  resultSuccess: {
    background: 'rgba(52, 199, 89, 0.08)',
    border: '1px solid rgba(52, 199, 89, 0.15)',
  },
  resultError: {
    background: 'rgba(255, 59, 48, 0.08)',
    border: '1px solid rgba(255, 59, 48, 0.15)',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  resultTitle: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#1D1D1F',
  },
  resultTime: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#86868B',
  },
  resultData: {
    fontFamily: 'SF Mono, SFMono-Regular, monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#1D1D1F',
    margin: 0,
    overflowX: 'auto',
  },
  connectWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 12px',
    background: 'rgba(255, 204, 0, 0.12)',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#9A6D00',
    marginBottom: '10px',
  },
  noContract: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#86868B',
    fontSize: '15px',
  },
  autoReadValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '10px 12px',
    background: 'rgba(0, 122, 255, 0.08)',
    borderRadius: '10px',
    overflow: 'hidden',
    maxWidth: '100%',
  },
  autoReadLabel: {
    fontSize: '11px',
    color: '#86868B',
    fontWeight: 500,
  },
  autoReadData: {
    fontSize: '13px',
    color: '#007AFF',
    fontWeight: 600,
    fontFamily: 'SF Mono, SFMono-Regular, monospace',
    wordBreak: 'break-all',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  eventsSection: {
    marginTop: '14px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.04)',
    borderRadius: '10px',
  },
  eventsHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#000',
    marginBottom: '10px',
  },
  eventCard: {
    padding: '10px 12px',
    background: '#FFF',
    borderRadius: '8px',
    marginBottom: '8px',
    boxShadow: '0 0.5px 2px rgba(0,0,0,0.1)',
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  eventIndex: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#666',
    background: '#E5E5EA',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  eventName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#000',
  },
  eventArgs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  eventArg: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '12px',
  },
  argName: {
    fontWeight: 500,
    color: '#666',
    minWidth: '100px',
    fontFamily: 'monospace',
  },
  argValue: {
    color: '#000',
    fontWeight: 500,
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    flex: 1,
  },
  noArgs: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic',
  },
};
