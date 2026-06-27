# Secret & Key Management Strategy

A reusable, tiered strategy for handling secrets in this project — and in any
future project. It scales from "hide a read-only API key" all the way up to
"a wallet that signs on-chain" and "custodial user keys", **without changing
the calling code** each time. You move a secret up the ladder by swapping the
*provider*, not by rewriting the app.

> **One rule above all:** classify every secret by **blast radius** — what an
> attacker can do if they get it — and pick the tier from that, never from
> convenience.

---

## The golden rules (apply at every tier)

1. **A `VITE_` / `NEXT_PUBLIC_` prefix means PUBLIC.** Any env var with that
   prefix is compiled into the JavaScript bundle and shipped to every visitor.
   It is *not* a secret. Server-only secrets must have **no** such prefix.
2. **Secrets never live in the frontend.** Not even "temporarily". A frontend
   is a public binary you hand to attackers.
3. **Secrets never live in git.** `.env` is git-ignored; only `.env.example`
   (with placeholders) is committed.
4. **The app reads secrets through one abstraction, never `process.env`
   directly.** That single seam (`getSecret()` / `signer`) is what lets you
   move from env vars → KMS → HSM by editing one file.
5. **Least privilege + rotation + audit.** Each secret can do the minimum, can
   be rotated without a code change, and every privileged use is logged.
6. **Prefer not holding the secret at all.** The most secure secret is the one
   you never possess (MetaMask holds the user's key; a KMS holds the signing
   key and never exports it).

---

## The escalation ladder

Pick the **lowest tier that matches the blast radius**. Higher tiers cost more
effort but contain more damage.

| Tier | Secret type | Example | Where it lives | If leaked |
|------|-------------|---------|----------------|-----------|
| **0** | Not secret | RPC URL, chain id, contract address | Frontend / public env | Nothing |
| **1** | Low-value API key | Etherscan, Alchemy, OpenAI | Host env var, used **only server-side** behind a proxy | Quota abuse / cost — revocable |
| **2** | High-value secret at rest | DB credentials, webhook signing secret, exchange API key | Secrets manager (Vault / AWS Secrets Manager) or KMS-encrypted blob | Data access — serious, but bounded |
| **3** | **Signing key (operator wallet)** | The wallet your backend uses to send txs | **KMS/HSM — key generated inside, never exported**; you call `sign()` | Attacker can sign *while they hold access*, but **cannot exfiltrate the key**; revoke + rotate |
| **4** | **Custodial user keys** | Holding users' private keys for them | **Don't roll your own** — MPC/TEE provider, or per-user envelope encryption inside an isolated/enclave signer | Catastrophic + legal liability — design assuming you'll be attacked |

The crucial jump is **Tier 1 → Tier 3**. A leaked API key costs money. A leaked
private key empties a wallet **irreversibly, in seconds**. They are not the
same problem and must not share a mechanism. **Never** store a raw private key
as an environment variable or in any database, encrypted or not, if you can
have a KMS sign on your behalf instead.

---

## The reusable abstraction (the part you keep forever)

The whole point is that calling code looks the same at every tier:

```js
// Reading a secret — same call whether it's a Vercel env var or a Vault lease
const apiKey = await getSecret('POLYGONSCAN_API_KEY');

// Signing — same call whether the key is a local dev key or lives in AWS KMS
const signature = await signer.signTransaction(tx);
```

Only the **provider behind these** changes per tier. In this repo the seam is
[`api/_lib/secrets.js`](api/_lib/secrets.js). Today it reads host env vars
(Tier 1). To go to Tier 2/3 you replace *only that file's body* with a Vault or
KMS client — the proxy and the frontend never change.

```
frontend ──fetch──▶ /api/etherscan ──getSecret()──▶ [ provider ]
                     (serverless)                    Tier1: process.env
                                                      Tier2: Vault / Secrets Manager
                                                      Tier3: KMS .sign() (key never leaves)
```

---

## Tier 1 — concrete pattern used here (API key proxy)

This is implemented now for the Polygonscan/Etherscan key:

- **Secret name:** `POLYGONSCAN_API_KEY` — **no `VITE_` prefix**, so it is
  server-only and never bundled.
- **Server proxy:** [`api/etherscan.js`](api/etherscan.js) injects the key,
  validates input (allow-listed action, address regex), and forwards to
  Etherscan V2. The browser only ever talks to your own origin.
- **Frontend:** calls `/api/etherscan?...` in production. In **local dev** it
  may call Etherscan directly using a `VITE_POLYGONSCAN_API_KEY` from your
  git-ignored `.env` — acceptable because a dev bundle is never shipped to
  users. Production simply doesn't define the `VITE_` var, so it uses the proxy.

**Deploy step:** in Vercel → *Settings → Environment Variables*, set
`POLYGONSCAN_API_KEY` (server-side, **not** `VITE_`-prefixed) and redeploy.

Hardening you can add to any Tier-1 proxy later: same-origin/Origin check,
rate limiting (e.g. Upstash Redis), short edge caching, request logging.

---

## Tier 3 — when you add the signing wallet (read before you do)

For an **operator wallet that signs transactions server-side**, use a KMS that
supports the `secp256k1` curve Ethereum needs, so the **private key is created
inside the KMS and is never exportable**:

- **AWS KMS** supports `ECC_SECG_P256K1` signing keys. You never see the key;
  you call `kms.sign(hash)` and adapt the result into an Ethereum signature.
  Integrate with ethers via a custom signer (community libraries exist, e.g.
  `@rumblefishdev/eth-signer-kms` / `aws-kms-ethers-signer`).
- **Alternatives:** GCP Cloud KMS, Azure Key Vault (Managed HSM), or a
  dedicated HSM. Same principle: *sign-in-place, no export*.

Why this beats "encrypted private key in an env var": even a **full server
compromise** can't steal the key — the attacker can only sign while they hold
access, which you detect (audit logs) and cut off (revoke the IAM grant +
rotate). An exfiltrated raw key is game over forever.

Operational must-haves: a dedicated IAM role with least privilege, CloudTrail/
audit logging on every `sign`, alerting on anomalous volume, and a tested
key-rotation/incident runbook.

---

## Tier 4 — custodial user keys (strong recommendation: don't self-build)

Holding **users'** private keys is the highest-risk thing in this whole space —
technically *and* legally (you may become a regulated custodian). Default to
**not being custodial**: let MetaMask / WalletConnect hold the key (this app
already does this for normal use).

If product needs demand custody, use a specialist instead of inventing it:

- **MPC / TEE providers:** Turnkey, Privy, Fireblocks, DFNS, Web3Auth,
  Coinbase WaaS. The key is split/sharded or sealed in secure hardware; no
  single server (yours included) ever holds the whole key.

If you *must* self-host custody, the minimum bar is: **per-user envelope
encryption** (each user key encrypted with a per-user data key, data keys
wrapped by a KMS master key), decryption + signing only inside an **isolated
signer** (separate service, minimal surface, ideally a TEE such as AWS Nitro
Enclaves), strong per-user auth, complete audit trail, and an explicit legal/
compliance review. Treat a breach as "when", not "if".

---

## Portability (works on Vercel today, elsewhere tomorrow)

Because every secret goes through `getSecret()` / a `signer` interface:

- **Dev:** git-ignored `.env` (Tier 1 only — never a real private key).
- **Vercel:** encrypted env vars (Tier 1–2).
- **Dedicated backend / VPS:** point the same interface at Vault, AWS Secrets
  Manager, or KMS. No calling-code change.

Switching host or going from serverless to a real backend means re-pointing the
provider, not rewriting the app. That is the reusable system.

---

## Quick decision checklist

- [ ] Is it secret at all? If it ships to the browser, it can't be. → Tier 0.
- [ ] Read-only third-party API key? → Tier 1 proxy.
- [ ] Grants data/account access if leaked? → Tier 2 secrets manager.
- [ ] Can move funds / sign on-chain? → **Tier 3 KMS, never an env var.**
- [ ] Belongs to a *user*? → **Tier 4: use an MPC/TEE provider, not your own code.**
