// Single seam for SIGNING — the core of the key-protection MVP
// (see /docs/SECRETS.md and /docs/protected-wallet-mvp.md).
//
// The rest of the system NEVER holds a private key. It calls signer.getAddress()
// / signer.signMessage() / signer.signTransaction(). The actual key lives behind
// this seam. To graduate from the simulated provider to production-grade AWS KMS
// "sign-in-place" (the private key is generated inside the KMS and is never
// exportable), you implement the SAME interface with a KMS client and flip
// SIGNER_PROVIDER=kms — no other file changes.
//
//   provider 'local'  -> Tier "SIM": key held in the server process (DEV ONLY).
//   provider 'kms'    -> Tier 3: key never leaves AWS KMS; we only call sign().
//
// SECURITY: the 'local' provider is a stand-in so the flow is demonstrable today.
// It must ONLY ever hold a throwaway testnet key. Never point it at a key with
// real value — that is exactly the anti-pattern KMS exists to remove.

const { ethers } = require('ethers');

const PROVIDER = process.env.SIGNER_PROVIDER || 'local';

// ---- Provider: local (simulated) -----------------------------------------
let localWallet = null;
function getLocalWallet() {
  if (localWallet) return localWallet;
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  // If no key is supplied, generate an ephemeral one so the demo works with zero
  // setup. The key is created server-side and never sent to the client.
  localWallet = pk ? new ethers.Wallet(pk) : ethers.Wallet.createRandom();
  return localWallet;
}

// ---- Provider: kms (production target — stub) -----------------------------
// Implement with e.g. @rumblefishdev/eth-signer-kms or the AWS SDK + a DER->(r,s,v)
// adapter. getAddress() reads the KMS public key; signMessage/signTransaction call
// kms.Sign on the digest. The raw key is NEVER materialised in this process.
function kmsNotConfigured() {
  throw new Error('SIGNER_PROVIDER=kms selected but the KMS provider is not implemented yet');
}

async function getAddress() {
  if (PROVIDER === 'kms') return kmsNotConfigured();
  return getLocalWallet().address;
}

async function signMessage(message) {
  if (PROVIDER === 'kms') return kmsNotConfigured();
  return getLocalWallet().signMessage(message);
}

async function signTransaction(tx) {
  if (PROVIDER === 'kms') return kmsNotConfigured();
  return getLocalWallet().signTransaction(tx);
}

module.exports = { getAddress, signMessage, signTransaction, provider: PROVIDER };
