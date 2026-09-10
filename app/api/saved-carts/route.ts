import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { savedCarts } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

function generateOrderCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let prefix = '';
  for (let i = 0; i < 3; i++) {
    prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();
    const body = await req.json();
    const { items, totalAmount, customerName, customerPhone, customerNote } = body;

    if (!Array.isArray(items) || items.length === 0 || totalAmount == null) {
      return NextResponse.json({ error: 'Cart items and total amount are required' }, { status: 400 });
    }

    let code = generateOrderCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .select()
        .from(savedCarts)
        .where(eq(savedCarts.code, code))
        .limit(1);
      if (existing.length === 0) break;
      code = generateOrderCode();
      attempts++;
    }

    const newCart = await db
      .insert(savedCarts)
      .values({
        code,
        items: JSON.stringify(items),
        totalAmount: Number(totalAmount),
        customerName: customerName ? String(customerName).trim() : null,
        customerPhone: customerPhone ? String(customerPhone).trim() : null,
        customerNote: customerNote ? String(customerNote).trim() : null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      code,
      cart: {
        ...newCart[0],
        items: JSON.parse(newCart[0].items),
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error saving cart:', err);
    return NextResponse.json({ error: 'Failed to generate order code' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'PENDING';

    let carts;
    if (statusParam === 'ALL') {
      carts = await db
        .select()
        .from(savedCarts)
        .orderBy(desc(savedCarts.createdAt));
    } else {
      const validStatus = (['PENDING', 'PROCESSED', 'CANCELLED'].includes(statusParam)
        ? statusParam
        : 'PENDING') as 'PENDING' | 'PROCESSED' | 'CANCELLED';

      carts = await db
        .select()
        .from(savedCarts)
        .where(eq(savedCarts.status, validStatus))
        .orderBy(desc(savedCarts.createdAt));
    }

    const parsedCarts = carts.map((c) => ({
      ...c,
      items: JSON.parse(c.items),
    }));

    return NextResponse.json(parsedCarts);
  } catch (err: any) {
    console.error('Error fetching saved carts:', err);
    return NextResponse.json({ error: 'Failed to retrieve saved carts' }, { status: 500 });
  }
}
