import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { savedCarts } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeDatabase();
    const { code } = await params;
    const normCode = code.toUpperCase().trim();

    const found = await db
      .select()
      .from(savedCarts)
      .where(eq(savedCarts.code, normCode))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Order code not found or expired.' }, { status: 404 });
    }

    const cart = found[0];
    return NextResponse.json({
      ...cart,
      items: JSON.parse(cart.items),
    });
  } catch (err: any) {
    console.error('Error looking up order code:', err);
    return NextResponse.json({ error: 'Failed to look up order code' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { code } = await params;
    const normCode = code.toUpperCase().trim();

    const found = await db
      .select()
      .from(savedCarts)
      .where(eq(savedCarts.code, normCode))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Order code not found' }, { status: 404 });
    }

    const { status } = await req.json();
    if (!status || !['PENDING', 'PROCESSED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    await db
      .update(savedCarts)
      .set({
        status,
        processedAt: status !== 'PENDING' ? new Date().toISOString() : null,
        processedByUserId: status !== 'PENDING' ? user.id : null,
      })
      .where(eq(savedCarts.code, normCode));

    const updated = await db
      .select()
      .from(savedCarts)
      .where(eq(savedCarts.code, normCode))
      .limit(1);

    return NextResponse.json({
      ...updated[0],
      items: JSON.parse(updated[0].items),
    });
  } catch (err: any) {
    console.error('Error updating order code status:', err);
    return NextResponse.json({ error: 'Failed to update order code status' }, { status: 500 });
  }
}
