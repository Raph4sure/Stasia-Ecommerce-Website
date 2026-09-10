import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/src/server/auth';

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
