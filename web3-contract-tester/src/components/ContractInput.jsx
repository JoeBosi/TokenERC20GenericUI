import React, { useState, useEffect } from 'react';

const POLYGONSCAN_API_KEY = import.meta.env.VITE_POLYGONSCAN_API_KEY || '';
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function countFunctions(abiJsonString) {
  try {
    const parsed = JSON.parse(abiJsonString);
    return Array.isArray(parsed) ? parsed.filter((item) => item.type === 'function').length : -1;
  } catch {
    return -1;
  }
}

function buildEtherscanUrl(action, address, hasLocalKey) {
  if (import.meta.env.DEV && hasLocalKey) {
    // Local dev: call Etherscan V2 directly with the git-ignored local key.
    return `https://api.etherscan.io/v2/api?chainid=80002&module=contract&action=${action}&address=${address}&apikey=${POLYGONSCAN_API_KEY}`;
  }
  // Production: hit our same-origin proxy so the key never reaches the browser (see /docs/SECRETS.md).
  return `/api/etherscan?action=${action}&address=${encodeURIComponent(address)}`;
}

// EIP-1967-style proxies verify with an ABI that has no callable functions
// (just constructor/errors/fallback) — the real functions live on the
// implementation contract. Etherscan exposes "is this a proxy" + the linked
// implementation via getsourcecode's "Proxy" / "Implementation" fields.
async function fetchProxyInfo(address, hasLocalKey) {
  const res = await fetch(buildEtherscanUrl('getsourcecode', address, hasLocalKey));
  const data = await res.json();
  const info = Array.isArray(data.result) ? data.result[0] : null;
  const impl = info && info.Implementation;
  return {
    isProxy: !!info && info.Proxy === '1',
    implementation: ADDRESS_RE.test(impl || '') ? impl : null,
  };
}

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
  // Unlike the toast (which auto-dismisses), this stays on screen as long as the
  // loaded contract is a proxy — the user needs to keep seeing "the real contract
  // is at this other address" while they work, not just for 3.5 seconds.
  const [proxyNotice, setProxyNotice] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAbiFromExplorer = async () => {
    setProxyNotice(null);
    if (!contractAddress || contractAddress.trim().length < 10) {
      showToast('Enter a valid contract address first.');
      return;
    }
    const hasLocalKey =
      POLYGONSCAN_API_KEY && POLYGONSCAN_API_KEY !== 'YourPolygonscanApiKeyHere';
    if (import.meta.env.PROD && !hasLocalKey) {
      // In production the key lives only on the server (see /docs/SECRETS.md), so a
      // missing local key is fine — but if the proxy itself is unconfigured the
      // request below will report it. No client-side key check needed here.
    } else if (!hasLocalKey) {
      showToast('Missing Polygonscan API key. Set VITE_POLYGONSCAN_API_KEY in your .env for local dev.');
      return;
    }
    setFetchingAbi(true);
    try {
      const address = contractAddress.trim();
      const res = await fetch(buildEtherscanUrl('getabi', address, hasLocalKey));
      const data = await res.json();
      if (data.status === '1' && data.result) {
        if (countFunctions(data.result) > 0) {
          setAbi(data.result);
          showToast('ABI loaded successfully!', 'success');
        } else {
          // No callable functions — likely a proxy (constructor/errors/fallback only).
          // Try to resolve and load the linked implementation's ABI instead, while
          // keeping contractAddress pointed at the proxy (that's where calls go).
          let implAbiLoaded = false;
          let proxyInfo = { isProxy: false, implementation: null };
          try {
            proxyInfo = await fetchProxyInfo(address, hasLocalKey);
            if (proxyInfo.implementation) {
              const implRes = await fetch(buildEtherscanUrl('getabi', proxyInfo.implementation, hasLocalKey));
              const implData = await implRes.json();
              if (implData.status === '1' && implData.result && countFunctions(implData.result) > 0) {
                setAbi(implData.result);
                showToast('ABI loaded successfully!', 'success');
                setProxyNotice({
                  type: 'info',
                  message: `Proxy contract detected. The real contract (with the callable functions) lives at ${proxyInfo.implementation} — its ABI was loaded automatically. Calls are still sent to the address above; the proxy forwards them.`,
                });
                implAbiLoaded = true;
              }
            }
          } catch {
            // Fall through to the explanatory notice below.
          }
          if (!implAbiLoaded) {
            if (proxyInfo.implementation) {
              showToast('This address is a proxy — see the note below.');
              setProxyNotice({
                type: 'warning',
                message: `Proxy contract detected. The real contract is at ${proxyInfo.implementation}, but its source code isn't verified on Polygonscan, so its ABI can't be retrieved automatically. Verify it there, or use a known ABI (e.g. "ERC20 Preset") instead.`,
              });
            } else if (proxyInfo.isProxy) {
              showToast('This address is a proxy — see the note below.');
              setProxyNotice({
                type: 'warning',
                message: 'Proxy contract detected, but it isn\'t linked to an implementation address on Polygonscan yet, so the real ABI can\'t be retrieved automatically. Link it there ("Is this a proxy?") or paste the implementation\'s ABI manually.',
              });
            } else {
              showToast('This contract has no callable functions — see the note below.');
              setProxyNotice({
                type: 'warning',
                message: 'This contract has no callable functions. It looks like a proxy, but Polygonscan doesn\'t report an implementation link for it. Find the implementation address ("Read as Proxy" on Polygonscan) and fetch its ABI directly.',
              });
            }
          }
        }
      } else {
        const msg = data.result || data.error || 'ABI not found. Make sure the contract is verified on Amoy Polygonscan.';
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

        {proxyNotice && (
          <div style={{
            ...styles.toast,
            background: proxyNotice.type === 'info' ? 'rgba(0,122,255,0.08)' : 'rgba(255,149,0,0.10)',
            color: proxyNotice.type === 'info' ? '#0066CC' : '#B25E00',
            border: `0.5px solid ${proxyNotice.type === 'info' ? 'rgba(0,122,255,0.25)' : 'rgba(255,149,0,0.3)'}`,
          }}>
            {proxyNotice.type === 'info' ? '🔗 ' : '⚠️ '}{proxyNotice.message}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.field}>
            <label style={styles.label}>Contract Address</label>
            <div style={styles.addressRow}>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => {
                  setProxyNotice(null);
                  setContractAddress(e.target.value);
                }}
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
            <button onClick={() => { setProxyNotice(null); onClear(); }} style={styles.clearBtn}>
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
