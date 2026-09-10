import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { users, sales } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Super Admin privileges required.' }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allSales = await db.select().from(sales);
    const salesMap = new Map<number, { count: number; volume: number }>();
    for (const s of allSales) {
      const current = salesMap.get(s.soldByUserId) || { count: 0, volume: 0 };
      current.count += 1;
      current.volume += s.totalAmount;
      salesMap.set(s.soldByUserId, current);
    }

    const enrichedUsers = allUsers.map((u) => ({
      ...u,
      salesCount: salesMap.get(u.id)?.count || 0,
      totalSalesVolume: salesMap.get(u.id)?.volume || 0,
    }));

    return NextResponse.json(enrichedUsers);
  } catch (err: any) {
    console.error('Error fetching admin users:', err);
    return NextResponse.json({ error: 'Failed to retrieve admin list' }, { status: 500 });
  }
}
