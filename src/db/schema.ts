import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['SUPER_ADMIN', 'ADMIN'] }).notNull().default('ADMIN'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  codeNo: text('code_no').notNull().unique(),
  category: text('category').notNull(),
  pricePerUnit: integer('price_per_unit').notNull(), // stored in cents/kobo
  quantityInStock: integer('quantity_in_stock').notNull().default(0),
  weightPerUnit: real('weight_per_unit').notNull().default(0.0), // weight per unit in kg
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const productImages = sqliteTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  productTitle: text('product_title').notNull(),
  productCode: text('product_code').notNull(),
  quantitySold: integer('quantity_sold').notNull(),
  unitPrice: integer('unit_price').notNull(),
  totalAmount: integer('total_amount').notNull(),
  soldByUserId: integer('sold_by_user_id').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const categorySettings = sqliteTable('category_settings', {
  category: text('category').primaryKey(),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
});

export const savedCarts = sqliteTable('saved_carts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  items: text('items').notNull(), // JSON string of SavedCartItem[]
  totalAmount: integer('total_amount').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  customerNote: text('customer_note'),
  status: text('status', { enum: ['PENDING', 'PROCESSED', 'CANCELLED'] }).notNull().default('PENDING'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  processedAt: text('processed_at'),
  processedByUserId: integer('processed_by_user_id'),
});

