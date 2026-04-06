# Open Warrant Standard (OWS) v1.0

> Like JWT for authentication, OWS is for execution authorization.

**Specification URL:** https://regulator.ai/api/v1/ows/spec  
**Reference Implementation:** Vienna OS ([GitHub](https://github.com/risk-ai/vienna-os))

---

## Overview

The Open Warrant Standard (OWS) defines a portable, interoperable format for AI agent execution warrants. An OWS token is a cryptographically signed authorization that specifies:

- **Who** is authorized (agent identity)
- **What** they can do (scoped actions)
- **When** the authorization is valid (time-limited)
- **Why** the action was authorized (objective + approvals)
- **How much** risk was accepted (risk tier)
- **What constraints** apply (parameter limits)

## Token Format

An OWS token is three base64url-encoded JSON parts, dot-separated:

```
<header>.<payload>.<signature>
```

This is intentionally similar to JWT — any developer who's worked with JWT can immediately understand OWS.

### Header

```json
{
  "alg": "HS256",
  "typ": "OWS",
  "kid": "vienna-primary",
  "ver": "1.0",
  "chn": "sha256:abc..."   // Optional: Merkle chain hash
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alg` | string | ✅ | Signing algorithm (`HS256`, `RS256`, `ES256`, `none`) |
| `typ` | string | ✅ | Token type (always `"OWS"`) |
| `kid` | string | | Key identifier |
| `ver` | string | ✅ | Specification version (currently `"1.0"`) |
| `chn` | string | | Merkle chain hash (links to warrant chain) |

### Payload (Claims)

```json
{
  "wid": "wrt_20260406_abc123",
  "iss": "vienna-os",
  "sub": "billing-agent-v2",
  "aud": "stripe-api",
  "iat": 1712419200,
  "exp": 1712421000,
  "tier": "T1",
  "scope": ["payment.refund", "payment.read"],
  "deny": ["payment.create"],
  "obj": "Process customer refund for order #4521",
  "pid": "plan_refund_4521",
  "cst": {
    "amount": { "max": 100, "min": 1 },
    "currency": { "enum": ["USD", "EUR"] }
  }
}
```

#### Required Claims

| Claim | Type | Description |
|-------|------|-------------|
| `wid` | string | Warrant ID (unique) |
| `iss` | string | Issuer (governance platform identifier) |
| `sub` | string | Subject (agent being authorized) |
| `aud` | string \| string[] | Audience (target system) |
| `iat` | integer | Issued at (Unix timestamp, seconds) |
| `exp` | integer | Expires at (Unix timestamp, seconds) |
| `tier` | string | Risk tier (`T0`, `T1`, `T2`, `T3`) |
| `scope` | string[] | Allowed actions |
| `obj` | string | Human-readable objective |
| `pid` | string | Plan ID |

#### Optional Claims

| Claim | Type | Description |
|-------|------|-------------|
| `nbf` | integer | Not before (Unix timestamp) |
| `deny` | string[] | Explicitly denied actions (overrides scope) |
| `aid` | string[] | Approval IDs (required for T2+) |
| `tsr` | string | Truth snapshot reference |
| `cst` | object | Parameter constraints |
| `jst` | string | Justification (required for T3) |
| `rbk` | string | Rollback plan reference (required for T3) |
| `hsh` | string | Content hash of payload |
| `prv` | string | Previous warrant hash in chain |
| `mrt` | string | Merkle root at time of issuance |
| `x-*` | any | Custom extension claims |

### Signature

Computed over `base64url(header).base64url(payload)` using the algorithm specified in the header.

## Risk Tiers

| Tier | Label | Approval | Max TTL | Additional Requirements |
|------|-------|----------|---------|------------------------|
| `T0` | Informational | None | 60 min | — |
| `T1` | Low Risk | None (policy auto) | 30 min | — |
| `T2` | Medium Risk | Single human | 15 min | `aid` with 1+ approval |
| `T3` | High Risk | Multi-party (2+) | 5 min | `aid` with 2+ approvals + `jst` + `rbk` |

## Verification

Any party with the verification key can validate an OWS token:

```javascript
import { OpenWarrantStandard } from '@vienna-os/sdk';

const ows = new OpenWarrantStandard();
ows.registerKey({
  kid: 'vienna-primary',
  alg: 'HS256',
  secret: process.env.OWS_SHARED_SECRET,
});

// Verify token
const result = ows.verify(token, {
  action: 'payment.refund',
  params: { amount: 49.99, currency: 'USD' },
});

if (result.valid) {
  console.log('Warrant valid:', result.payload.obj);
} else {
  console.error('Warrant invalid:', result.reason);
}
```

### Verification Steps

1. **Parse** — split on `.`, base64url-decode each part
2. **Check type** — header `typ` must be `"OWS"`
3. **Verify signature** — recompute and compare
4. **Check expiration** — `exp` must be in the future (with clock skew tolerance)
5. **Check not-before** — `nbf` must be in the past (if present)
6. **Check scope** — action must be in `scope` and not in `deny`
7. **Check constraints** — parameters must satisfy `cst` rules
8. **Check tier requirements** — T2 must have `aid`, T3 must have `aid` + `jst` + `rbk`

## API Endpoints

### Public (no authentication)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/ows/spec` | OWS specification (JSON Schema) |
| `POST` | `/api/v1/ows/verify` | Parse and inspect an OWS token |

### Authenticated

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ows/issue` | Convert a Vienna warrant to OWS format |

## Implementing OWS

Any governance platform can implement OWS by:

1. **Issuing tokens** that conform to the payload schema
2. **Signing tokens** with HMAC or asymmetric keys
3. **Verifying tokens** using the standard verification steps

The specification is available as a JSON Schema at `/api/v1/ows/spec`.

Vienna OS is the reference implementation. The source code is at:
`services/vienna-lib/governance/open-warrant-standard.ts`

## Relationship to JWT

| | JWT | OWS |
|---|-----|-----|
| **Purpose** | Authentication/identity | Execution authorization |
| **Format** | header.payload.signature | header.payload.signature |
| **Claims** | sub, iss, aud, iat, exp | + wid, tier, scope, deny, obj, pid, aid, cst |
| **Scope model** | Flat string scopes | Typed actions + deny list + constraints |
| **Risk awareness** | No | Yes (T0-T3 tiers) |
| **Time-limited** | Yes (exp) | Yes (exp + tier-based caps) |
| **Chain support** | No | Yes (chn, prv, mrt claims) |
| **Approval tracking** | No | Yes (aid claim) |

OWS is NOT a replacement for JWT. JWT handles identity ("who are you?"). OWS handles authorization ("what are you allowed to do, with what constraints, authorized by whom?").

---

*Open Warrant Standard v1.0 — Created by Vienna OS / ai.ventures*
