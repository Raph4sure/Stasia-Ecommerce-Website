import { NextRequest, NextResponse } from 'next/server';
import { revokeToken } from '@/src/server/auth';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  revokeToken(token);
  return NextResponse.json({ success: true });
}
