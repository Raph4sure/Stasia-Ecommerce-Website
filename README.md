# Stasia Elegant Fabrique

Stasia Elegant Fabrique is a boutique ecommerce and point-of-sale application for luxury fabrics, clothing, wrappers, and accessories.

The application provides a public product catalog for visitors and a protected staff terminal for inventory, saved customer orders, sales, staff accounts, and database administration.

## Features

### Public storefront

-   Browse available products by category.
-   Search by product name, category, or Code No.
-   Sort by newest, name, or price.
-   Add products to a browser-based shopping cart without creating an account.
-   View product details, images, prices, stock status, and Code No.
-   Generate a saved order code for the seller.
-   Copy or share the generated order code through WhatsApp.
-   Cart contents persist in the visitor's browser local storage.

### Staff POS terminal

-   Search products by title or Code No.
-   Load a customer's saved order using its order code.
-   Review the saved items and available stock.
-   Process a sale from the register.
-   Automatically decrement inventory and create sales records.
-   Mark the related saved order as `PROCESSED`.
-   View restricted daily and weekly sales history.

### Super Admin console

-   Manage inventory, prices, quantities, weights, images, and public visibility.
-   Upload up to 10 product images per item.
-   Accept local image files or image URLs.
-   View product date added, stock, weight, valuation, and calculated subtotal.
-   Manage staff accounts and roles.
-   Reset staff passwords and revoke staff accounts.
-   Control category visibility in the public catalog.
-   Browse application database tables.
-   Select and delete multiple database rows.
-   Preview connected records before deletion.
-   Automatically delete product images when their product is deleted while preserving sales history and saved order snapshots.

## Technology

-   React 19
-   TypeScript
-   Vite
-   Express
-   Tailwind CSS
-   Drizzle ORM
-   LibSQL / SQLite
-   Turso for hosted production data
-   `bcryptjs` for password hashing
-   HMAC-signed authentication tokens
-   Lucide React icons

## Requirements

-   Node.js 20 or newer recommended
-   npm
-   SQLite CLI is optional and only needed for local database export/import
-   A Turso account for hosted persistent data

## Local Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application runs at:

```text
http://localhost:3000
```

The API health endpoint is:

```text
http://localhost:3000/api/health
```

## Available Scripts

```bash
npm run dev      # Start Express and Vite in development mode
npm run lint     # Run the TypeScript checker
npm run build    # Build the frontend and production server bundle
npm start        # Start the production server from dist/server.cjs
```

## Database Configuration

The application uses LibSQL through Drizzle ORM.

By default, local development uses:

```text
file:local.db
```

The database is selected in `src/db/index.ts`:

```ts
const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
```

For production, configure Turso:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_token
```

The application initializes its tables automatically on startup. The schema is defined in `src/db/schema.ts`.

### Database tables

-   `users`
-   `products`
-   `product_images`
-   `sales`
-   `category_settings`
-   `saved_carts`

### Drizzle Kit

The project includes `drizzle.config.ts` for pushing schema changes to Turso.

Set the Turso variables in your shell or `.env`, then run:

```bash
npx drizzle-kit push
```

`drizzle-kit push` updates the database schema. It does not copy existing local rows.

To export local SQLite data:

```bash
sqlite3 local.db ".dump" > local-db.sql
```

To import the dump into a Turso database using the Turso CLI:

```bash
cat local-db.sql | turso db shell your-database-name
```

Use a fresh Turso database for a complete dump import.

## Environment Variables

See `.env.example`.

```env
# Optional locally; local.db is used when this is absent.
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_token

# Required in production for stable admin sessions.
JWT_SECRET=your_long_random_secret

# Required only when the online users table is empty for first initialization.
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your_secure_super_admin_password

# Optional first staff account.
SALES_STAFF_EMAIL=sales@example.com
SALES_STAFF_PASSWORD=your_secure_staff_password

```

Never commit `.env`, database tokens, JWT secrets, or other credentials.

## Authentication

The application has two protected roles:

-   `ADMIN`: POS register and restricted sales history.
-   `SUPER_ADMIN`: inventory, staff, categories, database manager, and POS access.

Authentication tokens are stored in the browser's local storage and expire after 14 days. Changing `JWT_SECRET` invalidates existing tokens after the server restarts.

### Production security checklist

Before deployment:

1. Set a strong random `JWT_SECRET` in the hosting provider.
2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the hosting provider.
3. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` before the first production startup.
4. Never expose Turso credentials in frontend code.
5. Do not commit `.env` or `local.db`.
6. Use HTTPS in production.

Generate a secret with:

```bash
openssl rand -base64 48
```

### First online Super Admin

Before starting the hosted application for the first time, add these values to
the host environment:

```env
SUPER_ADMIN_EMAIL=your-admin-email@example.com
SUPER_ADMIN_PASSWORD=your-long-random-password
```

When the online `users` table is empty, the server creates this account with
the `SUPER_ADMIN` role. Open `/private` on the hosted website and log in with
those credentials. After the first account is created, changing these variables
does not change the existing password. Use the Staff & Access Management screen
to create additional accounts or reset credentials.

If the online database already contains users, do not delete them just to seed
an account. Log in with an existing Super Admin or create one through the
database/admin tooling using a controlled migration.

## Hosting

The application can run on any Node.js host that supports a long-running
Express process. Configure the host to run:

```bash
npm ci
npm run build
npm start
```

Set `NODE_ENV=production`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and
`JWT_SECRET` in the host's environment settings. The host should provide its
HTTP port through `PORT`.

Turso should be used for production persistence. A hosted service's local
filesystem should not be treated as permanent storage for `local.db`.

## Order Code Workflow

1. A visitor adds products to the cart.
2. The visitor optionally enters contact details and notes.
3. The visitor clicks **Generate Order Code for Seller**.
4. The server saves a `PENDING` record in `saved_carts`.
5. The visitor shares the generated code with the seller.
6. Staff enters the code in the POS terminal.
7. The saved items load into the register after stock validation.
8. Staff processes the sale.
9. Inventory is decremented, sales records are created, and the saved order becomes `PROCESSED`.

## Image Uploads

Product images can be uploaded from the Super Admin product form.

-   Maximum: 10 images per product.
-   Maximum file size: 3 MB per image.
-   Accepted browser image types: JPG, PNG, WEBP, and other `image/*` types supported by the browser.
-   Image data is sent to the server and stored in the product image records.

For a large production catalog, object storage such as S3-compatible storage is recommended instead of storing large data URLs directly in the database.

## Project Structure

```text
src/
  components/       React screens and UI components
  db/               Drizzle schema and database initialization
  lib/              API helpers, cart context, and theme logic
  server/           Authentication helpers
  App.tsx           Application routing and global layout
  index.css         Tailwind imports and global styles
server.ts           Express API and production server
render.yaml         Render deployment Blueprint
drizzle.config.ts  Drizzle Kit Turso configuration
```

## Troubleshooting

### Drizzle says the config file is missing

Make sure `drizzle.config.ts` exists and run:

```bash
npx drizzle-kit push --config=drizzle.config.ts
```

### Drizzle says Turso variables are missing

Check that both variables are set using `=` rather than `:`:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_token
```

### The browser shows an old API response after code changes

Restart the development server. An older process may still be holding port 3000.

### TypeScript or Tailwind diagnostics appear in VS Code

Run:

```bash
npm run lint
```

Tailwind IntelliSense may also show class simplification suggestions. Those suggestions do not prevent the application from building.
