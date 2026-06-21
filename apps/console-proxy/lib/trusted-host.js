/**
 * Host Header Allowlist Hardening
 *
 * Prevents Host header injection attacks by validating incoming
 * requests against a configured allowlist of trusted hosts.
 *
 * In Vercel (serverless), this is defence-in-depth; the edge layer
 * enforces TLS and canonical hostnames. For self-hosted deployments,
 * this is the primary guard.
 *
 * Configuration:
 *   ALLOWED_HOSTS env var — comma-separated list of allowed hostnames.
 *   Example: "console.regulator.ai,localhost:3100,127.0.0.1:3100"
 *
 *   ALLOWED_HOSTS=* disables the check (development only, never in production).
 */

const DEFAULT_ALLOWED_HOSTS = [
  'console.regulator.ai',
  'localhost',
  'localhost:3100',
  '127.0.0.1',
  '127.0.0.1:3100',
];

let _allowedHosts = null;

/**
 * Get the configured allowed hosts set.
 * @returns {Set<string>}
 */
function getAllowedHosts() {
  if (_allowedHosts !== null) return _allowedHosts;

  const env = process.env.ALLOWED_HOSTS;
  if (!env || env.trim() === '' || env.trim() === '*') {
    // Not configured or wildcard: allow all
    // In production, set ALLOWED_HOSTS to your specific domains for hardening.
    _allowedHosts = null;
    return null; // null = allow all
  }

  const hosts = env.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  _allowedHosts = new Set(hosts);
  return _allowedHosts;
}

/**
 * Validate the Host header of an incoming request.
 *
 * @param {import('http').IncomingMessage} req — Node.js request object
 * @returns {{ valid: boolean; host: string; reason?: string }}
 */
function validateHost(req) {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase().trim();
  const host = rawHost.split(':')[0]; // strip port for comparison

  const allowedHosts = getAllowedHosts();

  if (allowedHosts === null) {
    // Wildcard — allow all (dev mode)
    return { valid: true, host: rawHost };
  }

  // Accept exact match (with or without port) or port-stripped host
  if (allowedHosts.has(rawHost) || allowedHosts.has(host)) {
    return { valid: true, host: rawHost };
  }

  // Accept *.vercel.app for preview deployments (VERCEL env is set by Vercel platform)
  if (process.env.VERCEL && rawHost.endsWith('.vercel.app')) {
    return { valid: true, host: rawHost };
  }

  // Accept *.regulator.ai subdomains (console, api, etc.)
  if (rawHost.endsWith('.regulator.ai')) {
    return { valid: true, host: rawHost };
  }

  return {
    valid: false,
    host: rawHost,
    reason: `Host '${rawHost}' not in ALLOWED_HOSTS. Set ALLOWED_HOSTS env var.`,
  };
}

/**
 * Express/Node middleware that rejects requests with untrusted Host headers.
 *
 * Usage in server.js:
 *   const { hostHeaderMiddleware } = require('../lib/trusted-host');
 *   // At the top of the handler, before auth:
 *   const hostResult = validateHost(req);
 *   if (!hostResult.valid) return res.status(400).json({ error: hostResult.reason });
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {Function} next
 */
function hostHeaderMiddleware(req, res, next) {
  const result = validateHost(req);
  if (!result.valid) {
    console.warn('[security] Blocked request with untrusted Host:', result.host);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid Host header', code: 'INVALID_HOST' }));
    return;
  }
  next();
}

/**
 * Safe base URL from request (uses validated host, never raw header injection).
 * Use instead of `https://${req.headers.host}` everywhere.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string} e.g. "https://console.regulator.ai"
 */
function getBaseUrl(req) {
  const result = validateHost(req);
  if (!result.valid) {
    // Fall back to configured CONSOLE_URL in production, or localhost
    return process.env.CONSOLE_URL || 'http://localhost:3100';
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${result.host}`;
}

module.exports = { validateHost, hostHeaderMiddleware, getBaseUrl, getAllowedHosts };
