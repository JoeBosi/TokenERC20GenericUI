import React, { useEffect, useState } from 'react';

// Key-protection MVP panel (see /SECRETS.md).
// Demonstrates the core promise: the app can show a wallet address and produce
// valid signatures from it, while the PRIVATE KEY never reaches the browser —
// it lives behind the server-side signer (/api/wallet), today simulated, later
// AWS KMS sign-in-place. The frontend code here is identical for both.

export function ProtectedWallet() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState('I control this wallet without holding its key.');
  const [signature, setSignature] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/wallet')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.address) { setAddress(d.address); setProvider(d.provider); }
        else setLoadError(d.error || 'Protected signer not available');
      })
      .catch(() => alive && setLoadError('Protected signer not reachable'));
    return () => { alive = false; };
  }, []);

  const sign = async () => {
    setSigning(true); setSignError(null); setSignature(null);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.signature) setSignature(data.signature);
      else setSignError(data.error || 'Signing failed');
    } catch {
      setSignError('Network error while signing');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.titleSection}>
          <h3 style={s.title}>Protected Wallet</h3>
          <p style={s.subtitle}>Server-signed · key never in the browser</p>
        </div>
        <span style={s.lock} title="The private key never leaves the server">🔒</span>
      </div>

      {loadError ? (
        <div style={s.error}>{loadError}</div>
      ) : (
        <>
          <div style={s.field}>
            <label style={s.label}>Protected address</label>
            <div style={s.addressBox}>{address || 'Loading…'}</div>
            {provider && (
              <span style={s.providerTag}>
                provider: {provider === 'local' ? 'local (simulated)' : provider}
              </span>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Message to sign</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={s.input}
            />
          </div>

          <button onClick={sign} disabled={signing || !address} style={{ ...s.signBtn, opacity: signing || !address ? 0.6 : 1 }}>
            {signing ? 'Signing…' : 'Sign on the server'}
          </button>

          {signError && <div style={s.error}>{signError}</div>}

          {signature && (
            <div style={s.field}>
              <label style={s.label}>Signature ✓ (produced server-side)</label>
              <div style={s.sigBox}>{signature}</div>
              <span style={s.note}>The browser received a signature — never the key.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  card: {
    background: '#FFF',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: '10px',
    borderBottom: '0.5px solid #E5E5EA',
  },
  titleSection: { flex: 1 },
  title: { fontSize: '17px', fontWeight: 600, color: '#000', margin: 0 },
  subtitle: { fontSize: '12px', color: '#666', margin: '2px 0 0 0' },
  lock: { fontSize: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: 500, color: '#000' },
  addressBox: {
    padding: '10px 12px',
    fontSize: '12px',
    borderRadius: '10px',
    background: '#F2F2F7',
    color: '#000',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  providerTag: { fontSize: '10px', color: '#34C759', fontWeight: 600 },
  input: {
    padding: '10px 12px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '10px',
    background: '#F2F2F7',
    color: '#000',
  },
  signBtn: {
    padding: '10px 14px',
    background: '#000',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#FFF',
    cursor: 'pointer',
  },
  sigBox: {
    padding: '10px 12px',
    fontSize: '11px',
    borderRadius: '10px',
    background: '#F2F2F7',
    color: '#1A7F3C',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  note: { fontSize: '10px', color: '#999', fontStyle: 'italic' },
  error: {
    background: 'rgba(255,59,48,0.1)',
    color: '#FF3B30',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '12px',
  },
};
