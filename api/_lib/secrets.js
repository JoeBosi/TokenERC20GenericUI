// Single seam for reading secrets. Nothing else in the app reads process.env
// for secrets directly — everything goes through getSecret(). To graduate a
// secret from a host env var (Tier 1) to Vault / AWS Secrets Manager (Tier 2)
// or to KMS sign-in-place (Tier 3), you replace ONLY this file's body; the
// proxy and the frontend never change. See /docs/SECRETS.md.

const cache = new Map();

/**
 * Resolve a server-side secret by name.
 * Tier 1 implementation: host-managed environment variables (encrypted at
 * rest by the platform, e.g. Vercel). Never use a VITE_/NEXT_PUBLIC_ prefix
 * here — those are shipped to the browser.
 *
 * @param {string} name e.g. "POLYGONSCAN_API_KEY"
 * @returns {Promise<string>}
 */
async function getSecret(name) {
  if (cache.has(name)) return cache.get(name);
  const value = process.env[name];
  if (!value) throw new Error(`Secret "${name}" is not configured`);
  cache.set(name, value);
  return value;
}

module.exports = { getSecret };
