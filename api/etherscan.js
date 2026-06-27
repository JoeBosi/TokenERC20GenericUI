// Tier 1 secret proxy (see /SECRETS.md).
// The browser calls this same-origin endpoint instead of Etherscan directly,
// so the API key stays on the server and never reaches the client bundle.

const { getSecret } = require('./_lib/secrets');

// Only safe, read-only contract lookups are allowed through the proxy.
const ALLOWED_ACTIONS = new Set(['getabi', 'getsourcecode']);
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CHAIN_ID = '80002'; // Polygon Amoy

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = (req.query && req.query.action) || 'getabi';
  const address = (req.query && req.query.address) || '';

  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Unsupported action' });
  }
  if (!ADDRESS_RE.test(String(address))) {
    return res.status(400).json({ error: 'Invalid contract address' });
  }

  let apiKey;
  try {
    apiKey = await getSecret('POLYGONSCAN_API_KEY');
  } catch (e) {
    return res.status(500).json({ error: 'Server is missing POLYGONSCAN_API_KEY' });
  }

  const url =
    `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}` +
    `&module=contract&action=${action}&address=${address}&apikey=${apiKey}`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    // Verified ABIs rarely change — let the edge cache them briefly.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream request failed' });
  }
};
