import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { sales, products } from '@/src/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must contain at least one item.' }, { status: 400 });
    }

    const createdSales = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const { productId, quantity } = item;
      const qty = Number(quantity);
      if (!productId || qty <= 0) {
        continue;
      }

      const prod = await db
        .select()
        .from(products)
        .where(eq(products.id, Number(productId)))
        .limit(1);

      if (prod.length === 0) {
        return NextResponse.json({ error: `Product ID ${productId} not found.` }, { status: 400 });
      }

      const product = prod[0];
      if (product.quantityInStock < qty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.title}". Requested: ${qty}, Available: ${product.quantityInStock}`,
          },
          { status: 400 }
        );
      }

      const totalAmount = product.pricePerUnit * qty;

      const newSale = await db
        .insert(sales)
        .values({
          productId: product.id,
          productTitle: product.title,
          productCode: product.codeNo,
          quantitySold: qty,
          unitPrice: product.pricePerUnit,
          totalAmount,
          soldByUserId: user.id,
          createdAt: now,
        })
        .returning();

      await db
        .update(products)
        .set({
          quantityInStock: product.quantityInStock - qty,
        })
        .where(eq(products.id, product.id));

      createdSales.push(newSale[0]);
    }

    return NextResponse.json({ success: true, sales: createdSales }, { status: 201 });
  } catch (err: any) {
    console.error('Error logging sale:', err);
    return NextResponse.json({ error: 'Failed to record sales transaction' }, { status: 500 });
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
    const timeframe = searchParams.get('timeframe') || 'all';
    const staffIdParam = searchParams.get('staffId');
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let effectiveTimeframe = timeframe;
    if (customStartDate && customEndDate) {
      effectiveTimeframe = 'custom';
    }

    const now = new Date();
    let startBoundary = new Date(0);
    let endBoundary = new Date(now.getFullYear() + 10, 11, 31, 23, 59, 59);

    if (effectiveTimeframe === 'today') {
      startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (effectiveTimeframe === 'week') {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diffToMonday), 23, 59, 59, 999);
    } else if (effectiveTimeframe === 'month') {
      startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (effectiveTimeframe === 'custom' && customStartDate && customEndDate) {
      startBoundary = new Date(customStartDate);
      startBoundary.setHours(0, 0, 0, 0);
      endBoundary = new Date(customEndDate);
      endBoundary.setHours(23, 59, 59, 999);
    }

    let allSales = await db.select().from(sales);

    // Apply role restriction: standard ADMIN can only see their own sales
    if (user.role !== 'SUPER_ADMIN') {
      allSales = allSales.filter((s) => s.soldByUserId === user.id);
    } else if (staffIdParam && !isNaN(Number(staffIdParam))) {
      const staffId = Number(staffIdParam);
      allSales = allSales.filter((s) => s.soldByUserId === staffId);
    }

    allSales = allSales.filter((s) => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= startBoundary && saleDate <= endBoundary;
    });

    allSales.sort((a, b) => {
      if (sortBy === 'quantity') {
        return sortOrder === 'asc'
          ? a.quantitySold - b.quantitySold
          : b.quantitySold - a.quantitySold;
      } else if (sortBy === 'price') {
        return sortOrder === 'asc'
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount;
      } else {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
    });

    const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalUnitsSold = allSales.reduce((acc, s) => acc + s.quantitySold, 0);
    const transactionsCount = allSales.length;

    return NextResponse.json({
      timeframe: effectiveTimeframe,
      sales: allSales,
      summary: {
        totalRevenue,
        totalUnitsSold,
        transactionsCount,
      },
    });
  } catch (err: any) {
    console.error('Error fetching sales:', err);
    return NextResponse.json({ error: 'Failed to retrieve sales logs' }, { status: 500 });
  }
}
