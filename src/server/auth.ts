import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'boutique-hmac-sha256-auth-secret-key-2026';
const revokedTokens = new Set<string>();

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    exp: Date.now() + 0.5 * 24 * 60 * 60 * 1000, // 12 hours expiration
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function getUserFromToken(token?: string): User | null {
  if (!token) return null;
  if (revokedTokens.has(token)) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      createdAt: payload.createdAt,
    };
  } catch {
    return null;
  }
}

export function revokeToken(token?: string) {
  if (token) revokedTokens.add(token);
}

export function getAuthUser(req: NextRequest): User | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  return getUserFromToken(token);
}
