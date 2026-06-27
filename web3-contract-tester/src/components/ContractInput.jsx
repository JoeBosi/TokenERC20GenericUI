import React, { useState, useEffect } from 'react';

const POLYGONSCAN_API_KEY = import.meta.env.VITE_POLYGONSCAN_API_KEY || '';

export function ContractInput({ 
  contractAddress, 
  setContractAddress, 
  abi, 
  setAbi, 
  onLoadPreset, 
  onClear, 
  error 
}) {
  const [fetchingAbi, setFetchingAbi] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAbiFromExplorer = async () => {
    if (!contractAddress || contractAddress.trim().length < 10) {
      showToast('Enter a valid contract address first.');
      return;
    }
    if (!POLYGONSCAN_API_KEY || POLYGONSCAN_API_KEY === 'YourPolygonscanApiKeyHere') {
      showToast('Missing Polygonscan API key. Set VITE_POLYGONSCAN_API_KEY in your environment.');
      return;
    }
    setFetchingAbi(true);
    try {
      // Etherscan API V2 unified endpoint (chainid 80002 = Polygon Amoy).
      // The legacy api-amoy.polygonscan.com V1 endpoint is deprecated.
      const url = `https://api.etherscan.io/v2/api?chainid=80002&module=contract&action=getabi&address=${contractAddress.trim()}&apikey=${POLYGONSCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === '1' && data.result) {
        setAbi(data.result);
        showToast('ABI loaded successfully!', 'success');
      } else {
        const msg = data.result || 'ABI not found. Make sure the contract is verified on Amoy Polygonscan.';
        showToast(msg);
      }
    } catch (e) {
      showToast('Network error while fetching ABI.');
    } finally {
      setFetchingAbi(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <h3 style={styles.title}>Contract</h3>
            <p style={styles.subtitle}>Address & ABI</p>
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {toast && (
          <div style={{
            ...styles.toast,
            background: toast.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.10)',
            color: toast.type === 'success' ? '#1A7F3C' : '#FF3B30',
            border: `0.5px solid ${toast.type === 'success' ? 'rgba(52,199,89,0.3)' : 'rgba(255,59,48,0.3)'}`,
          }}>
            {toast.message}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.field}>
            <label style={styles.label}>Contract Address</label>
            <div style={styles.addressRow}>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                onClick={fetchAbiFromExplorer}
                disabled={fetchingAbi}
                style={{
                  ...styles.fetchBtn,
                  opacity: fetchingAbi ? 0.6 : 1,
                }}
                title="Fetch ABI from Polygonscan"
              >
                {fetchingAbi ? (
                  <span style={styles.spinner} />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                Fetch ABI
              </button>
            </div>
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>ABI (JSON)</label>
              <div style={styles.actions}>
                <button onClick={onLoadPreset} style={styles.presetBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  ERC20 Preset
                </button>
              </div>
            </div>
            <textarea
              value={abi}
              onChange={(e) => setAbi(e.target.value)}
              placeholder="[{...}]"
              style={{
                ...styles.textarea,
                minHeight: abi ? '200px' : '120px',
              }}
            />
          </div>

          {(contractAddress || abi) && (
            <button onClick={onClear} style={styles.clearBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Clear data
            </button>
          )}
        </div>
      </div>
    </div>
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
  error: {
    background: 'rgba(255, 59, 48, 0.1)',
    color: '#FF3B30',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '12px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#000',
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  input: {
    padding: '10px 12px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '10px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '10px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
    resize: 'vertical',
    lineHeight: '1.4',
    minHeight: '100px',
  },
  presetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '5px 10px',
    background: '#E5E5EA',
    border: 'none',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#000',
    cursor: 'pointer',
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px',
    background: 'transparent',
    border: '0.5px solid rgba(255, 59, 48, 0.3)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#FF3B30',
    cursor: 'pointer',
  },
  toast: {
    padding: '9px 12px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  addressRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  fetchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '9px 11px',
    background: '#007AFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  spinner: {
    display: 'inline-block',
    width: '11px',
    height: '11px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
