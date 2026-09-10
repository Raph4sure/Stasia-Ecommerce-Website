import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { products, productImages } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const prodId = Number(id);

    const found = await db
      .select()
      .from(products)
      .where(eq(products.id, prodId))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const imgs = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, prodId));

    return NextResponse.json({
      ...found[0],
      isAvailable: Boolean(found[0].isAvailable),
      images: imgs.map((i) => i.imageUrl),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve product' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const prodId = Number(id);

    const existing = await db
      .select()
      .from(products)
      .where(eq(products.id, prodId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      codeNo,
      category,
      pricePerUnit,
      quantityInStock,
      weightPerUnit,
      isAvailable,
      images,
    } = body;

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (codeNo !== undefined) updates.codeNo = codeNo.trim();
    if (category !== undefined) updates.category = category.trim();
    if (pricePerUnit !== undefined) updates.pricePerUnit = Number(pricePerUnit);
    if (quantityInStock !== undefined) updates.quantityInStock = Number(quantityInStock);
    if (weightPerUnit !== undefined) updates.weightPerUnit = Number(weightPerUnit);
    if (isAvailable !== undefined) updates.isAvailable = isAvailable ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      await db
        .update(products)
        .set(updates)
        .where(eq(products.id, prodId));
    }

    if (Array.isArray(images)) {
      await db.delete(productImages).where(eq(productImages.productId, prodId));
      for (const imgUrl of images) {
        if (typeof imgUrl === 'string' && imgUrl.trim()) {
          await db.insert(productImages).values({
            productId: prodId,
            imageUrl: imgUrl.trim(),
          });
        }
      }
    }

    const updatedProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, prodId))
      .limit(1);

    const updatedImgs = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, prodId));

    return NextResponse.json({
      ...updatedProduct[0],
      isAvailable: Boolean(updatedProduct[0].isAvailable),
      images: updatedImgs.map((i) => i.imageUrl),
    });
  } catch (err: any) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const prodId = Number(id);

    await db.delete(productImages).where(eq(productImages.productId, prodId));
    await db.delete(products).where(eq(products.id, prodId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
