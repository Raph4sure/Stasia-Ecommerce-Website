import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const client = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Auto-initialize tables and default data
export async function initializeDatabase() {
  try {
    // 1. Users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN',
        created_at TEXT NOT NULL
      );
    `);

    // 2. Products table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        code_no TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        price_per_unit INTEGER NOT NULL,
        quantity_in_stock INTEGER NOT NULL DEFAULT 0,
        weight_per_unit REAL NOT NULL DEFAULT 0.0,
        is_available INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
    `);

    // Migration: ensure weight_per_unit column exists in products table
    try {
      await client.execute(`ALTER TABLE products ADD COLUMN weight_per_unit REAL NOT NULL DEFAULT 0.0;`);
    } catch {
      // column already exists
    }

    // 3. Product images table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // 4. Sales table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        product_title TEXT NOT NULL,
        product_code TEXT NOT NULL,
        quantity_sold INTEGER NOT NULL,
        unit_price INTEGER NOT NULL,
        total_amount INTEGER NOT NULL,
        sold_by_user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // 5. Category settings table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS category_settings (
        category TEXT PRIMARY KEY,
        is_available INTEGER NOT NULL DEFAULT 1
      );
    `);

    // 6. Saved Carts / Order Codes table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS saved_carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        items TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        customer_note TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        processed_at TEXT,
        processed_by_user_id INTEGER
      );
    `);

    // Check if super admin exists
    const existingUsers = await client.execute({
      sql: `SELECT COUNT(*) as count FROM users;`,
      args: [],
    });

    const userCount = Number(existingUsers.rows[0]?.count || 0);

    const superAdminPass = await bcrypt.hash('MA45goes@', 10);
    const salesStaffPass = await bcrypt.hash('StaffPass123!', 10);

    if (userCount === 0) {
      await client.execute({
        sql: `INSERT INTO users (email, password_hash, role, created_at) VALUES 
              ('raph4sure007@gmail.com', ?, 'SUPER_ADMIN', ?),
              ('superadmin@boutique.com', ?, 'SUPER_ADMIN', ?),
              ('sales@boutique.com', ?, 'ADMIN', ?);`,
        args: [
          superAdminPass,
          new Date().toISOString(),
          superAdminPass,
          new Date().toISOString(),
          salesStaffPass,
          new Date().toISOString(),
        ],
      });
      console.log('Default super admin and sales staff seeded.');
    } else {
      // Explicitly update Super Admin password to MA45goes@ as requested by user
      await client.execute({
        sql: `UPDATE users SET password_hash = ? WHERE role = 'SUPER_ADMIN';`,
        args: [superAdminPass],
      });
    }

    // Update default weights for sample catalog if zero
    await client.execute(`UPDATE products SET weight_per_unit = 0.65 WHERE code_no = 'CLT-101' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 1.20 WHERE code_no = 'BAG-202' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 1.80 WHERE code_no = 'WRP-303' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 0.90 WHERE code_no = 'FAB-404' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 0.80 WHERE code_no = 'CLT-105' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 0.45 WHERE code_no = 'BAG-206' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 0.70 WHERE code_no = 'FAB-407' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 1.40 WHERE code_no = 'WRP-308' AND (weight_per_unit IS NULL OR weight_per_unit = 0);`);
    await client.execute(`UPDATE products SET weight_per_unit = 0.50 WHERE weight_per_unit IS NULL OR weight_per_unit = 0;`);

    // Check if products exist
    const existingProducts = await client.execute({
      sql: `SELECT COUNT(*) as count FROM products;`,
      args: [],
    });

    const productCount = Number(existingProducts.rows[0]?.count || 0);

    if (productCount === 0) {
      const seedProducts = [
        {
          title: 'Royal Ankara Silk Kimono Robe',
          codeNo: 'CLT-101',
          category: 'Clothes',
          pricePerUnit: 14500, // $145.00
          quantityInStock: 18,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Handcrafted Monogram Leather Tote',
          codeNo: 'BAG-202',
          category: 'Bags',
          pricePerUnit: 22000, // $220.00
          quantityInStock: 8,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Aso-Oke Heritage Woven Wrapper (6 Yards)',
          codeNo: 'WRP-303',
          category: 'Wrappers',
          pricePerUnit: 18500, // $185.00
          quantityInStock: 4, // LOW STOCK (< 5)
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Swiss Voile Gold Embroidered Lace Fabric',
          codeNo: 'FAB-404',
          category: 'Fabrics',
          pricePerUnit: 16000, // $160.00
          quantityInStock: 12,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Pleated Linen Safari Blazer',
          codeNo: 'CLT-105',
          category: 'Clothes',
          pricePerUnit: 19500, // $195.00
          quantityInStock: 3, // LOW STOCK (< 5)
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Artisanal Woven Raffia Beach Clutch',
          codeNo: 'BAG-206',
          category: 'Bags',
          pricePerUnit: 8900, // $89.00
          quantityInStock: 15,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Brocade Metallic Jacquard Fabric (Yard)',
          codeNo: 'FAB-407',
          category: 'Fabrics',
          pricePerUnit: 7500, // $75.00
          quantityInStock: 2, // LOW STOCK (< 5)
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Luxe Velvet Festival Wrapper Set',
          codeNo: 'WRP-308',
          category: 'Wrappers',
          pricePerUnit: 24000, // $240.00
          quantityInStock: 9,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Embroidered Silk Caftan with Gold Filigree',
          codeNo: 'CLT-109',
          category: 'Clothes',
          pricePerUnit: 17500, // $175.00
          quantityInStock: 11,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Structured Calfskin Saddle Crossbody',
          codeNo: 'BAG-210',
          category: 'Bags',
          pricePerUnit: 26000, // $260.00
          quantityInStock: 6,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Heritage Hand-Dyed Adire Silk Wrapper',
          codeNo: 'WRP-311',
          category: 'Wrappers',
          pricePerUnit: 19500, // $195.00
          quantityInStock: 5,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Duchess Satin Rose Gold Brocade (Yard)',
          codeNo: 'FAB-412',
          category: 'Fabrics',
          pricePerUnit: 9200, // $92.00
          quantityInStock: 14,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Tailored Ankara Peplum Jacket & Trousers',
          codeNo: 'CLT-113',
          category: 'Clothes',
          pricePerUnit: 21000, // $210.00
          quantityInStock: 4,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Artisanal Woven Leather Minaudière',
          codeNo: 'BAG-214',
          category: 'Bags',
          pricePerUnit: 13000, // $130.00
          quantityInStock: 7,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Imperial George Beaded Wrapper Ensemble',
          codeNo: 'WRP-315',
          category: 'Wrappers',
          pricePerUnit: 28000, // $280.00
          quantityInStock: 3,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Pure Cashmere Wool Suiting Weave (Yard)',
          codeNo: 'FAB-416',
          category: 'Fabrics',
          pricePerUnit: 11500, // $115.00
          quantityInStock: 10,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&auto=format&fit=crop&q=80',
          ],
        },
      ];

      for (const item of seedProducts) {
        const insertRes = await client.execute({
          sql: `INSERT INTO products (title, code_no, category, price_per_unit, quantity_in_stock, is_available, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);`,
          args: [
            item.title,
            item.codeNo,
            item.category,
            item.pricePerUnit,
            item.quantityInStock,
            item.isAvailable,
            new Date().toISOString(),
          ],
        });

        const newProductId = Number(insertRes.lastInsertRowid);
        for (const img of item.images) {
          await client.execute({
            sql: `INSERT INTO product_images (product_id, image_url) VALUES (?, ?);`,
            args: [newProductId, img],
          });
        }
      }

      // Initial category settings
      const categories = ['Clothes', 'Bags', 'Wrappers', 'Fabrics'];
      for (const cat of categories) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO category_settings (category, is_available) VALUES (?, 1);`,
          args: [cat],
        });
      }

      // Initial seed sales to populate historical sales log
      const initialSales = [
        {
          productId: 1,
          productTitle: 'Royal Ankara Silk Kimono Robe',
          productCode: 'CLT-101',
          quantitySold: 2,
          unitPrice: 14500,
          totalAmount: 29000,
          soldByUserId: 2, // sales staff
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // Today
        },
        {
          productId: 2,
          productTitle: 'Handcrafted Monogram Leather Tote',
          productCode: 'BAG-202',
          quantitySold: 1,
          unitPrice: 22000,
          totalAmount: 22000,
          soldByUserId: 2, // sales staff
          createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // Today
        },
        {
          productId: 4,
          productTitle: 'Swiss Voile Gold Embroidered Lace Fabric',
          productCode: 'FAB-404',
          quantitySold: 3,
          unitPrice: 16000,
          totalAmount: 48000,
          soldByUserId: 1, // superadmin
          createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(), // 3 days ago (This week)
        },
        {
          productId: 6,
          productTitle: 'Artisanal Woven Raffia Beach Clutch',
          productCode: 'BAG-206',
          quantitySold: 2,
          unitPrice: 8900,
          totalAmount: 17800,
          soldByUserId: 2, // sales staff
          createdAt: new Date(Date.now() - 15 * 86400 * 1000).toISOString(), // 15 days ago (This month)
        },
      ];

      for (const sale of initialSales) {
        await client.execute({
          sql: `INSERT INTO sales (product_id, product_title, product_code, quantity_sold, unit_price, total_amount, sold_by_user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          args: [
            sale.productId,
            sale.productTitle,
            sale.productCode,
            sale.quantitySold,
            sale.unitPrice,
            sale.totalAmount,
            sale.soldByUserId,
            sale.createdAt,
          ],
        });
      }

      console.log('Boutique catalog and initial sales logs successfully seeded.');
    } else if (productCount < 16) {
      // Seed remaining items if previously fewer were seeded
      const additionalItems = [
        {
          title: 'Embroidered Silk Caftan with Gold Filigree',
          codeNo: 'CLT-109',
          category: 'Clothes',
          pricePerUnit: 17500,
          quantityInStock: 11,
          weightPerUnit: 0.75,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Structured Calfskin Saddle Crossbody',
          codeNo: 'BAG-210',
          category: 'Bags',
          pricePerUnit: 26000,
          quantityInStock: 6,
          weightPerUnit: 0.85,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Heritage Hand-Dyed Adire Silk Wrapper',
          codeNo: 'WRP-311',
          category: 'Wrappers',
          pricePerUnit: 19500,
          quantityInStock: 5,
          weightPerUnit: 1.10,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Duchess Satin Rose Gold Brocade (Yard)',
          codeNo: 'FAB-412',
          category: 'Fabrics',
          pricePerUnit: 9200,
          quantityInStock: 14,
          weightPerUnit: 0.60,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Tailored Ankara Peplum Jacket & Trousers',
          codeNo: 'CLT-113',
          category: 'Clothes',
          pricePerUnit: 21000,
          quantityInStock: 4,
          weightPerUnit: 0.95,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Artisanal Woven Leather Minaudière',
          codeNo: 'BAG-214',
          category: 'Bags',
          pricePerUnit: 13000,
          quantityInStock: 7,
          weightPerUnit: 0.50,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Imperial George Beaded Wrapper Ensemble',
          codeNo: 'WRP-315',
          category: 'Wrappers',
          pricePerUnit: 28000,
          quantityInStock: 3,
          weightPerUnit: 1.65,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80',
          ],
        },
        {
          title: 'Pure Cashmere Wool Suiting Weave (Yard)',
          codeNo: 'FAB-416',
          category: 'Fabrics',
          pricePerUnit: 11500,
          quantityInStock: 10,
          weightPerUnit: 0.80,
          isAvailable: 1,
          images: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&auto=format&fit=crop&q=80',
          ],
        },
      ];
      for (const item of additionalItems) {
        const check = await client.execute({
          sql: `SELECT id FROM products WHERE code_no = ?;`,
          args: [item.codeNo],
        });
        if (check.rows.length === 0) {
          const insertRes = await client.execute({
            sql: `INSERT INTO products (title, code_no, category, price_per_unit, quantity_in_stock, weight_per_unit, is_available, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              item.title,
              item.codeNo,
              item.category,
              item.pricePerUnit,
              item.quantityInStock,
              item.weightPerUnit,
              item.isAvailable,
              new Date().toISOString(),
            ],
          });
          const newProductId = Number(insertRes.lastInsertRowid);
          for (const img of item.images) {
            await client.execute({
              sql: `INSERT INTO product_images (product_id, image_url) VALUES (?, ?);`,
              args: [newProductId, img],
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
