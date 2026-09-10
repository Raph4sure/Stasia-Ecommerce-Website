import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { categorySettings } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function GET() {
  try {
    await initializeDatabase();
    const cats = await db.select().from(categorySettings);
    const result = cats.map((c) => ({
      category: c.category,
      isAvailable: Boolean(c.isAvailable),
    }));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error fetching category settings:', err);
    return NextResponse.json({ error: 'Failed to retrieve categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { category, isAvailable } = await req.json();
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const normCat = category.trim();
    const existing = await db
      .select()
      .from(categorySettings)
      .where(eq(categorySettings.category, normCat))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(categorySettings)
        .set({ isAvailable: Boolean(isAvailable) })
        .where(eq(categorySettings.category, normCat));
    } else {
      await db.insert(categorySettings).values({
        category: normCat,
        isAvailable: Boolean(isAvailable),
      });
    }

    const updated = await db
      .select()
      .from(categorySettings)
      .where(eq(categorySettings.category, normCat))
      .limit(1);

    return NextResponse.json({
      category: updated[0].category,
      isAvailable: Boolean(updated[0].isAvailable),
    });
  } catch (err: any) {
    console.error('Error updating category settings:', err);
    return NextResponse.json({ error: 'Failed to update category setting' }, { status: 500 });
  }
}
