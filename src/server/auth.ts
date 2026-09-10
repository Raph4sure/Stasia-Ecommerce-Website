import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../types';

// Persistent secret for HMAC signing so sessions survive server restarts and dev reloads
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

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const user = getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  req.user = user;
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const user = getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  if (user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Super Admin privileges required.' });
  }

  req.user = user;
  next();
}
