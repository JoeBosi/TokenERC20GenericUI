// Key-protection MVP endpoint (see /SECRETS.md).
//
//   GET  /api/wallet            -> { address, provider }   (no key ever exposed)
//   POST /api/wallet { message } -> { address, signature }  (signed server-side)
//
// The browser never receives the private key — only the public address and the
// signatures the protected signer produces. Swap the signer provider to AWS KMS
// and this endpoint is unchanged.

const signer = require('./_lib/signer');

const MAX_MESSAGE_LEN = 280;

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const address = await signer.getAddress();
      return res.status(200).json({ address, provider: signer.provider });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const message = body.message;
      if (typeof message !== 'string' || message.length === 0) {
        return res.status(400).json({ error: 'Provide a non-empty "message" string to sign' });
      }
      if (message.length > MAX_MESSAGE_LEN) {
        return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LEN} chars)` });
      }
      const address = await signer.getAddress();
      const signature = await signer.signMessage(message);
      return res.status(200).json({ address, message, signature, provider: signer.provider });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Signing failed' });
  }
};
