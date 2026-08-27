import * as crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export function generateSecurePin(): string {
  // Generate 6-digit numeric PIN or 8-character hex
  return crypto.randomBytes(3).toString('hex');
}

export function extractAuthToken(req: IncomingMessage, urlObj?: URL): string | null {
  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer') {
      return parts[1] || null;
    }
    if (parts.length === 2 && parts[0]?.toLowerCase() === 'basic') {
      try {
        const decoded = Buffer.from(parts[1]!, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        return colonIdx !== -1 ? decoded.slice(colonIdx + 1) : decoded;
      } catch {}
    }
  }

  // 2. Cookie header: agent_auth=<token>
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [k, v] = cookie.trim().split('=');
      if (k === 'agent_auth' && v) {
        return decodeURIComponent(v);
      }
    }
  }

  // 3. Query param: ?token=<token>
  if (urlObj) {
    const tokenQuery = urlObj.searchParams.get('token');
    if (tokenQuery) return tokenQuery;
  }

  return null;
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isRequestAuthorized(
  req: IncomingMessage,
  expectedPassword: string | undefined,
  urlObj?: URL
): boolean {
  if (!expectedPassword) return true; // Auth disabled
  const provided = extractAuthToken(req, urlObj);
  if (!provided) return false;
  return timingSafeCompare(provided, expectedPassword);
}
