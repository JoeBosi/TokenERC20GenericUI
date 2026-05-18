import React from 'react';

export function WalletConnector({ account, isConnecting, isCorrectNetwork, isDevMode, error, onConnect, onConnectDev, onDisconnect, onToggleMode }) {
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const [mode, setMode] = React.useState(isDevMode ? 'dev' : 'metamask');
  
  const handleToggle = () => {
    const newMode = mode === 'metamask' ? 'dev' : 'metamask';
    setMode(newMode);
    if (onToggleMode) onToggleMode(newMode === 'dev');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <h3 style={styles.title}>Wallet</h3>
            <p style={styles.subtitle}>
              {account 
                ? (isDevMode ? 'Dev Mode' : 'MetaMask') 
                : 'Select mode'}
            </p>
          </div>
          {account && (
            <div style={{
              ...styles.statusBadge,
              ...(isDevMode ? styles.statusBadgeDev : {}),
            }}>
              {isDevMode ? 'DEV' : '● LIVE'}
            </div>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* Mode Switch - iOS Style */}
        {!account && (
          <div style={styles.modeSwitch}>
            <button 
              onClick={() => setMode('metamask')}
              style={{
                ...styles.modeBtn,
                ...(mode === 'metamask' ? styles.modeBtnActive : {}),
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
              </svg>
              MetaMask
            </button>
            <button 
              onClick={() => setMode('dev')}
              style={{
                ...styles.modeBtn,
                ...(mode === 'dev' ? styles.modeBtnActive : styles.modeBtnInactive),
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              Dev Mode
            </button>
          </div>
        )}

        <div style={styles.content}>
          {!account ? (
            <div style={styles.buttons}>
              {mode === 'metamask' ? (
                <button
                  onClick={onConnect}
                  disabled={isConnecting}
                  style={{
                    ...styles.button,
                    ...(isConnecting ? styles.buttonDisabled : {}),
                  }}
                >
                  {isConnecting ? (
                    <span style={styles.loading}>
                      <span style={styles.spinner}></span>
                      Connecting...
                    </span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 12l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Connect MetaMask
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={onConnectDev}
                  disabled={isConnecting}
                  style={{
                    ...styles.button,
                    ...styles.devButton,
                    ...(isConnecting ? styles.buttonDisabled : {}),
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Connect Dev Mode
                </button>
              )}
            </div>
          ) : (
            <div style={styles.connected}>
              <div style={styles.addressRow}>
                <div style={styles.addressBadge}>
                  <div style={styles.statusDot}></div>
                  <span style={styles.address}>{formatAddress(account)}</span>
                </div>
                <button onClick={onDisconnect} style={styles.disconnectBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
              
              {!isCorrectNetwork && (
                <div style={styles.networkWarning}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Rete non corretta. Switcha a Polygon Amoy.
                </div>
              )}
            </div>
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
    justifyContent: 'space-between',
    marginBottom: '10px',
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
  statusBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#34C759',
    background: 'rgba(52, 199, 89, 0.1)',
    padding: '3px 8px',
    borderRadius: '100px',
  },
  statusBadgeDev: {
    color: '#FF9500',
    background: 'rgba(255, 149, 0, 0.1)',
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
  },
  modeSwitch: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    padding: '3px',
    background: '#E5E5EA',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#666',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: '#FFF',
    color: '#000',
    boxShadow: '0 0.5px 2px rgba(0,0,0,0.15)',
  },
  modeBtnInactive: {
    color: '#666',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: '#000',
    color: '#FFF',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  devButton: {
    background: '#333',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  connected: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  addressBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#F2F2F7',
    padding: '10px 14px',
    borderRadius: '12px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#34C759',
  },
  address: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'SF Mono, SFMono-Regular, monospace',
    color: '#1D1D1F',
  },
  disconnectBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: '#F2F2F7',
    color: '#FF3B30',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  networkWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'rgba(255, 204, 0, 0.12)',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#9A6D00',
    marginTop: '12px',
  },
};
