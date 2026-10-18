import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Server-side half of the Vetto integration. Every function here fails open:
// a timeout or a Vetto outage must never cost you a real signup.

const API = 'https://usevetto.com';
const TIMEOUT_MS = 2500;

export type Decision = { ok: true } | { ok: false; message: string };

const ALLOW: Decision = { ok: true };
const DISPOSABLE = 'Please use a permanent email address. Temporary inboxes are not accepted.';
const DEAD = 'This email domain cannot receive mail. Please check it for typos.';

/**
 * Decide whether to accept a signup email on the server.
 *
 * - Pro (VETTO_SECRET_KEY set): trust a valid vetto_token from the form, and
 *   ask /v1/check when the token is missing or invalid (bots that skip the
 *   browser never get one).
 * - Free (no secret key): look the domain up with the keyless /v1/audit
 *   endpoint and reject throwaway and dead domains.
 */
export async function vettoDecision(email: string, token: string | null): Promise<Decision> {
  const secret = process.env.VETTO_SECRET_KEY;
  if (secret) {
    const payload = token ? verifyVettoToken(token, email, secret) : null;
    if (payload) return ALLOW;
    return checkWithSecret(email, secret);
  }
  return checkDomain(email);
}

type TokenPayload = { s: string; h: string; v: string; r: string[]; n: number; x: number };

/**
 * Offline verification of the vetto_token the script adds to the form.
 * token = base64url(payload) + "." + base64url(HMAC-SHA256(secret, payload part)).
 * Valid for 15 minutes, bound to the email, never issued for a blocked verdict.
 */
export function verifyVettoToken(token: string, email: string, secret: string): TokenPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('base64url'));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    const h = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    return p.x > Date.now() / 1000 && p.h === h && p.v !== 'block' ? p : null;
  } catch {
    return null;
  }
}

/** Pro: full server-side check (disposable, dead domain, Gmail aliases, your rules). */
async function checkWithSecret(email: string, secret: string): Promise<Decision> {
  try {
    const res = await fetch(`${API}/v1/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const v = await res.json();
    if (v.ok && v.verdict === 'block') return { ok: false, message: v.message || DISPOSABLE };
    return ALLOW;
  } catch {
    return ALLOW;
  }
}

const DEAD_STATUSES = new Set(['nxdomain', 'no_mx_a', 'null_mx', 'no_mail']);

/** Free: keyless domain lookup. Rate-limited to 300 calls/day per server IP. */
async function checkDomain(email: string): Promise<Decision> {
  const domain = email.split('@').pop()?.trim().toLowerCase();
  if (!domain) return ALLOW;
  try {
    const res = await fetch(`${API}/v1/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: [domain] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const v = await res.json();
    const r = v.ok && v.results ? v.results[domain] : null;
    if (r?.disposable) return { ok: false, message: DISPOSABLE };
    if (r && DEAD_STATUSES.has(r.status)) return { ok: false, message: DEAD };
    return ALLOW;
  } catch {
    return ALLOW;
  }
}
