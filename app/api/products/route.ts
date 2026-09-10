import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/src/db';
import { products, productImages } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/src/server/auth';

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get('public') === 'true';

    let allProducts;
    if (publicOnly) {
      allProducts = await db
        .select()
        .from(products)
        .where(eq(products.isAvailable, true))
        .orderBy(desc(products.createdAt));
    } else {
      allProducts = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt));
    }

    const allImages = await db.select().from(productImages);
    const imageMap = new Map<number, string[]>();
    for (const img of allImages) {
      const list = imageMap.get(img.productId) || [];
      list.push(img.imageUrl);
      imageMap.set(img.productId, list);
    }

    const result = allProducts.map((p) => ({
      ...p,
      isAvailable: Boolean(p.isAvailable),
      images: imageMap.get(p.id) || [],
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return NextResponse.json({ error: 'Failed to retrieve products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
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

    if (!title || !codeNo || !category || pricePerUnit == null) {
      return NextResponse.json(
        { error: 'Title, item code, category, and price are required' },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(products)
      .where(eq(products.codeNo, codeNo.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Item code "${codeNo}" already exists in the inventory.` },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(products)
      .values({
        title: title.trim(),
        codeNo: codeNo.trim(),
        category: category.trim(),
        pricePerUnit: Number(pricePerUnit),
        quantityInStock: Number(quantityInStock || 0),
        weightPerUnit: Number(weightPerUnit || 0.0),
        isAvailable: isAvailable !== false,
        createdAt: new Date().toISOString(),
      })
      .returning();

    const newProduct = inserted[0];

    if (Array.isArray(images) && images.length > 0) {
      for (const imgUrl of images) {
        if (typeof imgUrl === 'string' && imgUrl.trim()) {
          await db.insert(productImages).values({
            productId: newProduct.id,
            imageUrl: imgUrl.trim(),
          });
        }
      }
    }

    const savedImages = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, newProduct.id));

    return NextResponse.json(
      {
        ...newProduct,
        isAvailable: Boolean(newProduct.isAvailable),
        images: savedImages.map((i) => i.imageUrl),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
