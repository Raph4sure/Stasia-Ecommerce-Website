import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { client, db, initializeDatabase } from "./src/db";
import {
    users,
    products,
    productImages,
    sales,
    categorySettings,
    savedCarts,
} from "./src/db/schema";
import { eq, and, sql, desc, asc, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
    generateToken,
    getUserFromToken,
    requireAuth,
    requireSuperAdmin,
    revokeToken,
    AuthenticatedRequest,
} from "./src/server/auth";

const PORT = Number(process.env.PORT) || 3000;

export async function startServer() {
    await initializeDatabase();

    const app = express();
    app.use(express.json({ limit: "40mb" }));

    // --- HEALTH CHECK ---
    app.get("/api/health", (req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // --- AUTH ROUTES ---
    app.post("/api/auth/login", async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res
                    .status(400)
                    .json({ error: "Email and password are required" });
            }

            const foundUsers = await db
                .select()
                .from(users)
                .where(eq(users.email, email.trim().toLowerCase()))
                .limit(1);
            if (foundUsers.length === 0) {
                return res
                    .status(401)
                    .json({ error: "Invalid email or password" });
            }

            const user = foundUsers[0];
            const match = await bcrypt.compare(password, user.passwordHash);
            if (!match) {
                return res
                    .status(401)
                    .json({ error: "Invalid email or password" });
            }

            const sanitizedUser = {
                id: user.id,
                email: user.email,
                role: user.role as "SUPER_ADMIN" | "ADMIN",
                createdAt: user.createdAt,
            };

            const token = generateToken(sanitizedUser);
            res.json({ token, user: sanitizedUser });
        } catch (err: any) {
            console.error("Login error:", err);
            res.status(500).json({
                error: "Internal server error during login",
            });
        }
    });

    app.get("/api/auth/me", (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.substring(7)
            : undefined;
        const user = getUserFromToken(token);
        if (!user) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        res.json({ user });
    });

    app.post("/api/auth/logout", (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.substring(7)
            : undefined;
        revokeToken(token);
        res.json({ success: true });
    });

    app.get(
        "/api/auth/admins",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const allUsers = await db
                    .select({
                        id: users.id,
                        email: users.email,
                        role: users.role,
                        createdAt: users.createdAt,
                    })
                    .from(users)
                    .orderBy(desc(users.createdAt));

                // Calculate staff transaction performance
                const allSales = await db.select().from(sales);
                const salesMap = new Map<
                    number,
                    { count: number; volume: number }
                >();
                for (const s of allSales) {
                    const current = salesMap.get(s.soldByUserId) || {
                        count: 0,
                        volume: 0,
                    };
                    current.count += 1;
                    current.volume += s.totalAmount;
                    salesMap.set(s.soldByUserId, current);
                }

                const enrichedUsers = allUsers.map((u) => ({
                    ...u,
                    salesCount: salesMap.get(u.id)?.count || 0,
                    totalSalesVolume: salesMap.get(u.id)?.volume || 0,
                }));

                res.json(enrichedUsers);
            } catch (err: any) {
                console.error("Error fetching admin users:", err);
                res.status(500).json({
                    error: "Failed to retrieve admin list",
                });
            }
        }
    );

    app.post(
        "/api/auth/create-admin",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const { email, password, role } = req.body;
                if (!email || !password) {
                    return res
                        .status(400)
                        .json({ error: "Email and password are required" });
                }

                const normalizedEmail = email.trim().toLowerCase();
                const existing = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, normalizedEmail))
                    .limit(1);
                if (existing.length > 0) {
                    return res
                        .status(400)
                        .json({ error: "User with this email already exists" });
                }

                const passwordHash = await bcrypt.hash(password, 10);
                const userRole =
                    role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

                const insertResult = await db
                    .insert(users)
                    .values({
                        email: normalizedEmail,
                        passwordHash,
                        role: userRole,
                        createdAt: new Date().toISOString(),
                    })
                    .returning({
                        id: users.id,
                        email: users.email,
                        role: users.role,
                        createdAt: users.createdAt,
                    });

                res.status(201).json({ success: true, user: insertResult[0] });
            } catch (err: any) {
                console.error("Error creating admin user:", err);
                res.status(500).json({ error: "Failed to create user" });
            }
        }
    );

    app.patch(
        "/api/auth/admins/:id",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const targetId = Number(req.params.id);
                const { password, role, email } = req.body;

                const targetUsers = await db
                    .select()
                    .from(users)
                    .where(eq(users.id, targetId))
                    .limit(1);
                if (targetUsers.length === 0) {
                    return res
                        .status(404)
                        .json({ error: "Staff account not found." });
                }
                const targetUser = targetUsers[0];

                const updates: any = {};
                if (
                    password &&
                    typeof password === "string" &&
                    password.trim().length >= 6
                ) {
                    updates.passwordHash = await bcrypt.hash(
                        password.trim(),
                        10
                    );
                }
                if (role && (role === "ADMIN" || role === "SUPER_ADMIN")) {
                    if (
                        targetUser.email === "raph4sure007@gmail.com" &&
                        role !== "SUPER_ADMIN"
                    ) {
                        return res.status(400).json({
                            error: "Cannot demote the primary Super Admin account.",
                        });
                    }
                    updates.role = role;
                }
                if (email && typeof email === "string" && email.trim()) {
                    const cleanEmail = email.trim().toLowerCase();
                    if (cleanEmail !== targetUser.email) {
                        const existing = await db
                            .select()
                            .from(users)
                            .where(eq(users.email, cleanEmail))
                            .limit(1);
                        if (existing.length > 0) {
                            return res.status(400).json({
                                error: "Another user already exists with this email address.",
                            });
                        }
                        updates.email = cleanEmail;
                    }
                }

                if (Object.keys(updates).length > 0) {
                    await db
                        .update(users)
                        .set(updates)
                        .where(eq(users.id, targetId));
                }

                const updated = await db
                    .select({
                        id: users.id,
                        email: users.email,
                        role: users.role,
                        createdAt: users.createdAt,
                    })
                    .from(users)
                    .where(eq(users.id, targetId))
                    .limit(1);

                res.json({ success: true, user: updated[0] });
            } catch (err: any) {
                console.error("Error updating staff account:", err);
                res.status(500).json({
                    error: "Failed to update staff account",
                });
            }
        }
    );

    app.delete(
        "/api/auth/admins/:id",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const targetId = Number(req.params.id);
                const currentUser = req.user!;

                if (currentUser.id === targetId) {
                    return res.status(400).json({
                        error: "You cannot delete your own account while logged in.",
                    });
                }

                const targetUsers = await db
                    .select()
                    .from(users)
                    .where(eq(users.id, targetId))
                    .limit(1);
                if (targetUsers.length === 0) {
                    return res
                        .status(404)
                        .json({ error: "Staff account not found." });
                }

                if (targetUsers[0].email === "raph4sure007@gmail.com") {
                    return res.status(400).json({
                        error: "The primary Super Admin account cannot be deleted.",
                    });
                }

                await db.delete(users).where(eq(users.id, targetId));
                res.json({ success: true, deletedId: targetId });
            } catch (err: any) {
                console.error("Error deleting staff user:", err);
                res.status(500).json({
                    error: "Failed to delete staff account",
                });
            }
        }
    );

    // --- PRODUCTS ROUTES ---
    app.get("/api/products", async (req: Request, res: Response) => {
        try {
            const isPublic = req.query.public === "true";
            const categoryFilter = req.query.category as string | undefined;
            const searchQuery = req.query.search as string | undefined;

            // Check category availability settings for public view
            const unavailableCategoriesList = await db
                .select()
                .from(categorySettings)
                .where(eq(categorySettings.isAvailable, false));
            const unavailableCategoryNames = new Set(
                unavailableCategoriesList.map((c) => c.category)
            );

            const allProducts = await db
                .select()
                .from(products)
                .orderBy(asc(products.title));
            const allImages = await db.select().from(productImages);

            // Group images by product ID
            const imagesMap = new Map<number, string[]>();
            for (const img of allImages) {
                if (!imagesMap.has(img.productId)) {
                    imagesMap.set(img.productId, []);
                }
                imagesMap.get(img.productId)!.push(img.imageUrl);
            }

            let filtered = allProducts.map((p) => ({
                id: p.id,
                title: p.title,
                codeNo: p.codeNo,
                category: p.category,
                pricePerUnit: p.pricePerUnit,
                quantityInStock: p.quantityInStock,
                weightPerUnit: Number(p.weightPerUnit || 0),
                isAvailable: Boolean(p.isAvailable),
                createdAt: p.createdAt,
                images: imagesMap.get(p.id) || [],
            }));

            // Filter for public catalog
            if (isPublic) {
                filtered = filtered.filter(
                    (p) =>
                        p.isAvailable &&
                        !unavailableCategoryNames.has(p.category)
                );
            }

            // Filter by category
            if (categoryFilter && categoryFilter !== "All") {
                filtered = filtered.filter(
                    (p) =>
                        p.category.toLowerCase() ===
                        categoryFilter.toLowerCase()
                );
            }

            // Search query (title or codeNo)
            if (searchQuery && searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                filtered = filtered.filter(
                    (p) =>
                        p.title.toLowerCase().includes(q) ||
                        p.codeNo.toLowerCase().includes(q)
                );
            }

            res.json(filtered);
        } catch (err: any) {
            console.error("Error fetching products:", err);
            res.status(500).json({ error: "Failed to fetch products" });
        }
    });

    app.post(
        "/api/products",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const {
                    title,
                    codeNo,
                    category,
                    pricePerUnit,
                    quantityInStock,
                    weightPerUnit,
                    isAvailable,
                    images,
                } = req.body;

                if (
                    !title ||
                    !codeNo ||
                    !category ||
                    pricePerUnit === undefined
                ) {
                    return res.status(400).json({
                        error: "Title, Code No, Category, and Price per unit are required",
                    });
                }

                if (
                    images !== undefined &&
                    (!Array.isArray(images) || images.length > 10)
                ) {
                    return res.status(400).json({
                        error: "A product can have at most 10 images.",
                    });
                }

                const cleanCodeNo = String(codeNo).trim().toUpperCase();

                // Check unique code_no
                const existingCode = await db
                    .select()
                    .from(products)
                    .where(eq(products.codeNo, cleanCodeNo))
                    .limit(1);
                if (existingCode.length > 0) {
                    return res.status(400).json({
                        error: `Product with Code No "${cleanCodeNo}" already exists.`,
                    });
                }

                const parsedWeight = Math.max(
                    0,
                    parseFloat(
                        String(
                            weightPerUnit !== undefined ? weightPerUnit : "0"
                        )
                    ) || 0
                );

                const newProduct = await db
                    .insert(products)
                    .values({
                        title: String(title).trim(),
                        codeNo: cleanCodeNo,
                        category: String(category).trim(),
                        pricePerUnit: Math.max(
                            0,
                            Math.round(Number(pricePerUnit))
                        ),
                        quantityInStock: Math.max(
                            0,
                            Math.round(Number(quantityInStock || 0))
                        ),
                        weightPerUnit: parsedWeight,
                        isAvailable: isAvailable !== false,
                        createdAt: new Date().toISOString(),
                    })
                    .returning();

                const created = newProduct[0];
                const imageList: string[] = Array.isArray(images) ? images : [];

                for (const img of imageList) {
                    if (img && typeof img === "string" && img.trim()) {
                        await db.insert(productImages).values({
                            productId: created.id,
                            imageUrl: img.trim(),
                        });
                    }
                }

                // Ensure category exists in category_settings
                await db
                    .insert(categorySettings)
                    .values({
                        category: created.category,
                        isAvailable: true,
                    })
                    .onConflictDoNothing();

                res.status(201).json({
                    ...created,
                    weightPerUnit: parsedWeight,
                    images: imageList,
                });
            } catch (err: any) {
                console.error("Error creating product:", err);
                res.status(500).json({ error: "Failed to create product" });
            }
        }
    );

    app.patch(
        "/api/products/:id",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const productId = Number(req.params.id);
                const {
                    title,
                    codeNo,
                    category,
                    pricePerUnit,
                    quantityInStock,
                    weightPerUnit,
                    isAvailable,
                    images,
                } = req.body;

                const updates: any = {};
                if (title !== undefined) updates.title = String(title).trim();
                if (codeNo !== undefined) {
                    const cleanCode = String(codeNo).trim().toUpperCase();
                    // Check uniqueness if changing
                    const existingCode = await db
                        .select()
                        .from(products)
                        .where(eq(products.codeNo, cleanCode))
                        .limit(1);
                    if (
                        existingCode.length > 0 &&
                        existingCode[0].id !== productId
                    ) {
                        return res.status(400).json({
                            error: `Code No "${cleanCode}" is already in use by another product.`,
                        });
                    }
                    updates.codeNo = cleanCode;
                }
                if (category !== undefined)
                    updates.category = String(category).trim();
                if (pricePerUnit !== undefined)
                    updates.pricePerUnit = Math.max(
                        0,
                        Math.round(Number(pricePerUnit))
                    );
                if (quantityInStock !== undefined)
                    updates.quantityInStock = Math.max(
                        0,
                        Math.round(Number(quantityInStock))
                    );
                if (weightPerUnit !== undefined)
                    updates.weightPerUnit = Math.max(
                        0,
                        parseFloat(String(weightPerUnit)) || 0
                    );
                if (isAvailable !== undefined)
                    updates.isAvailable = Boolean(isAvailable);

                if (
                    images !== undefined &&
                    (!Array.isArray(images) || images.length > 10)
                ) {
                    return res.status(400).json({
                        error: "A product can have at most 10 images.",
                    });
                }

                if (Object.keys(updates).length > 0) {
                    await db
                        .update(products)
                        .set(updates)
                        .where(eq(products.id, productId));
                }

                // If images are provided, update them
                if (Array.isArray(images)) {
                    await db
                        .delete(productImages)
                        .where(eq(productImages.productId, productId));
                    for (const img of images) {
                        if (img && typeof img === "string" && img.trim()) {
                            await db.insert(productImages).values({
                                productId,
                                imageUrl: img.trim(),
                            });
                        }
                    }
                }

                const updated = await db
                    .select()
                    .from(products)
                    .where(eq(products.id, productId))
                    .limit(1);
                const currentImages = await db
                    .select()
                    .from(productImages)
                    .where(eq(productImages.productId, productId));

                res.json({
                    ...updated[0],
                    images: currentImages.map((img) => img.imageUrl),
                });
            } catch (err: any) {
                console.error("Error updating product:", err);
                res.status(500).json({ error: "Failed to update product" });
            }
        }
    );

    app.delete(
        "/api/products/:id",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const productId = Number(req.params.id);
                await db
                    .delete(productImages)
                    .where(eq(productImages.productId, productId));
                await db.delete(products).where(eq(products.id, productId));
                res.json({ success: true, deletedId: productId });
            } catch (err: any) {
                console.error("Error deleting product:", err);
                res.status(500).json({ error: "Failed to delete product" });
            }
        }
    );

    // --- SUPER ADMIN DATABASE MANAGER ---
    const databaseTables = [
        "users",
        "products",
        "product_images",
        "sales",
        "category_settings",
        "saved_carts",
    ] as const;
    const databaseTableKeys: Record<string, string> = {
        users: "id",
        products: "id",
        product_images: "id",
        sales: "id",
        category_settings: "category",
        saved_carts: "id",
    };

    const quoteIdentifier = (identifier: string) =>
        `"${identifier.replaceAll('"', '""')}"`;
    const isDatabaseTable = (
        table: string
    ): table is (typeof databaseTables)[number] =>
        databaseTables.includes(table as (typeof databaseTables)[number]);

    app.get(
        "/api/database/tables",
        requireSuperAdmin,
        async (_req: AuthenticatedRequest, res: Response) => {
            res.json(
                databaseTables.map((name) => ({
                    name,
                    key: databaseTableKeys[name],
                }))
            );
        }
    );

    app.get(
        "/api/database/tables/:table",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            const table = req.params.table;
            if (!isDatabaseTable(table)) {
                return res
                    .status(404)
                    .json({ error: "Database table is not available." });
            }

            try {
                const result = await client.execute(
                    `SELECT * FROM ${quoteIdentifier(
                        table
                    )} ORDER BY rowid DESC LIMIT 500`
                );
                const columns = result.columns || [];
                const rows = result.rows.map((row) =>
                    Object.fromEntries(
                        columns.map((column, index) => [column, row[index]])
                    )
                );
                res.json({
                    table,
                    key: databaseTableKeys[table],
                    columns,
                    rows,
                });
            } catch (err: any) {
                console.error(`Error reading database table ${table}:`, err);
                res.status(500).json({
                    error: "Failed to read database table.",
                });
            }
        }
    );

    app.post(
        "/api/database/tables/:table/dependencies",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            const table = req.params.table;
            if (!isDatabaseTable(table)) {
                return res
                    .status(404)
                    .json({ error: "Database table is not available." });
            }

            const rowKeys = Array.isArray(req.body?.rowKeys)
                ? req.body.rowKeys
                : [];
            if (rowKeys.length === 0 || rowKeys.length > 500) {
                return res
                    .status(400)
                    .json({ error: "Select between 1 and 500 rows." });
            }

            try {
                const dependencies: Array<{
                    table: string;
                    count: number;
                    action: "DELETE" | "KEEP";
                    reason: string;
                }> = [];
                if (table === "products") {
                    const productIds = rowKeys
                        .map((value: unknown) => Number(value))
                        .filter(Number.isInteger);
                    if (productIds.length === 0) {
                        return res.status(400).json({
                            error: "Selected product rows are invalid.",
                        });
                    }
                    const placeholders = productIds.map(() => "?").join(", ");
                    const imageRows = await client.execute({
                        sql: `SELECT COUNT(*) AS count FROM product_images WHERE product_id IN (${placeholders})`,
                        args: productIds,
                    });
                    const salesRows = await client.execute({
                        sql: `SELECT COUNT(*) AS count FROM sales WHERE product_id IN (${placeholders})`,
                        args: productIds,
                    });
                    const savedCartRows = await client.execute(
                        `SELECT items FROM saved_carts`
                    );
                    const selectedIds = new Set(productIds);
                    const savedCartCount = savedCartRows.rows.filter((row) => {
                        try {
                            return (
                                JSON.parse(String(row[0])) as Array<{
                                    productId?: number;
                                }>
                            ).some((item) =>
                                selectedIds.has(Number(item.productId))
                            );
                        } catch {
                            return false;
                        }
                    }).length;

                    const imageCount = Number(imageRows.rows[0]?.[0] || 0);
                    const salesCount = Number(salesRows.rows[0]?.[0] || 0);
                    if (imageCount > 0)
                        dependencies.push({
                            table: "product_images",
                            count: imageCount,
                            action: "DELETE",
                            reason: "Images belong to the product and will be deleted with it.",
                        });
                    if (salesCount > 0)
                        dependencies.push({
                            table: "sales",
                            count: salesCount,
                            action: "KEEP",
                            reason: "Sales history is preserved for reporting.",
                        });
                    if (savedCartCount > 0)
                        dependencies.push({
                            table: "saved_carts",
                            count: savedCartCount,
                            action: "KEEP",
                            reason: "Saved order snapshots are preserved.",
                        });
                }

                res.json({ table, rowCount: rowKeys.length, dependencies });
            } catch (err: any) {
                console.error(`Error checking dependencies for ${table}:`, err);
                res.status(500).json({
                    error: "Failed to inspect connected records.",
                });
            }
        }
    );

    app.delete(
        "/api/database/tables/:table/rows",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            const table = req.params.table;
            if (!isDatabaseTable(table)) {
                return res
                    .status(404)
                    .json({ error: "Database table is not available." });
            }

            const rowKeys = Array.isArray(req.body?.rowKeys)
                ? req.body.rowKeys
                : [];
            if (rowKeys.length === 0 || rowKeys.length > 500) {
                return res.status(400).json({
                    error: "Select between 1 and 500 rows to delete.",
                });
            }

            const key = databaseTableKeys[table];
            const values = rowKeys.map((value: unknown) => String(value));
            const placeholders = values.map(() => "?").join(", ");

            try {
                if (table === "products") {
                    const productIds = rowKeys
                        .map((value: unknown) => Number(value))
                        .filter(Number.isInteger);
                    const placeholders = productIds.map(() => "?").join(", ");
                    await client.execute({
                        sql: `DELETE FROM product_images WHERE product_id IN (${placeholders})`,
                        args: productIds,
                    });
                }
                const result = await client.execute({
                    sql: `DELETE FROM ${quoteIdentifier(
                        table
                    )} WHERE ${quoteIdentifier(key)} IN (${placeholders})`,
                    args: values,
                });
                res.json({ success: true, deletedCount: result.rowsAffected });
            } catch (err: any) {
                console.error(
                    `Error deleting rows from database table ${table}:`,
                    err
                );
                res.status(500).json({
                    error: err.message || "Failed to delete selected rows.",
                });
            }
        }
    );

    // --- CATEGORIES ROUTES ---
    app.get("/api/categories", async (req: Request, res: Response) => {
        try {
            const allCategories = await db
                .select({ category: products.category })
                .from(products);
            const uniqueCats = Array.from(
                new Set(allCategories.map((c) => c.category))
            );

            const settings = await db.select().from(categorySettings);
            const settingsMap = new Map(
                settings.map((s) => [s.category, s.isAvailable])
            );

            const result = uniqueCats.map((cat) => ({
                category: cat,
                isAvailable: settingsMap.has(cat)
                    ? settingsMap.get(cat)!
                    : true,
            }));

            res.json(result);
        } catch (err: any) {
            console.error("Error fetching categories:", err);
            res.status(500).json({ error: "Failed to fetch categories" });
        }
    });

    app.patch(
        "/api/categories/:name/availability",
        requireSuperAdmin,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const categoryName = req.params.name;
                const { isAvailable } = req.body;

                await db
                    .insert(categorySettings)
                    .values({
                        category: categoryName,
                        isAvailable: Boolean(isAvailable),
                    })
                    .onConflictDoUpdate({
                        target: categorySettings.category,
                        set: { isAvailable: Boolean(isAvailable) },
                    });

                res.json({
                    success: true,
                    category: categoryName,
                    isAvailable: Boolean(isAvailable),
                });
            } catch (err: any) {
                console.error("Error toggling category availability:", err);
                res.status(500).json({
                    error: "Failed to update category visibility",
                });
            }
        }
    );

    // --- SALES & POS TERMINAL TRANSACTION ---
    app.post(
        "/api/sales/process",
        requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const user = req.user!;
                const { cartItems, orderCode } = req.body; // Array<{ productId: number, quantity: number }>, optional orderCode: string

                if (!Array.isArray(cartItems) || cartItems.length === 0) {
                    return res
                        .status(400)
                        .json({ error: "Sale must contain at least one item" });
                }

                let cleanOrderCode: string | null = null;
                if (orderCode && typeof orderCode === "string") {
                    cleanOrderCode = orderCode.trim().toUpperCase();
                    const savedOrderRows = await db
                        .select()
                        .from(savedCarts)
                        .where(eq(savedCarts.code, cleanOrderCode))
                        .limit(1);

                    if (savedOrderRows.length === 0) {
                        return res.status(404).json({
                            error: `Order code "${cleanOrderCode}" not found.`,
                        });
                    }
                    if (savedOrderRows[0].status !== "PENDING") {
                        return res.status(400).json({
                            error: `Order ${cleanOrderCode} is already ${savedOrderRows[0].status.toLowerCase()}.`,
                        });
                    }

                    let savedItems: any[];
                    try {
                        savedItems = JSON.parse(savedOrderRows[0].items);
                    } catch {
                        return res.status(500).json({
                            error: "The saved order contains invalid item data.",
                        });
                    }

                    const requestedItems = new Map(
                        cartItems.map((item: any) => [
                            Number(item.productId),
                            Number(item.quantity),
                        ])
                    );
                    const savedItemsMatch =
                        savedItems.length === requestedItems.size &&
                        savedItems.every(
                            (item) =>
                                requestedItems.get(Number(item.productId)) ===
                                Number(item.quantity)
                        );
                    if (!savedItemsMatch) {
                        return res.status(400).json({
                            error: "The register cart does not match the saved order code.",
                        });
                    }
                }

                // 1. Validate all items and stock levels upfront
                const productIds = cartItems.map((item) =>
                    Number(item.productId)
                );
                const fetchedProducts = await db
                    .select()
                    .from(products)
                    .where(
                        sql`${products.id} IN (${sql.join(
                            productIds,
                            sql`, `
                        )})`
                    );

                const productMap = new Map(
                    fetchedProducts.map((p) => [p.id, p])
                );

                for (const item of cartItems) {
                    const prod = productMap.get(Number(item.productId));
                    if (!prod) {
                        return res.status(400).json({
                            error: `Product ID ${item.productId} not found`,
                        });
                    }
                    if (item.quantity <= 0) {
                        return res.status(400).json({
                            error: `Invalid quantity for ${prod.title}`,
                        });
                    }
                    if (prod.quantityInStock < item.quantity) {
                        return res.status(400).json({
                            error: `Insufficient stock for "${prod.title}" (${prod.codeNo}). Requested: ${item.quantity}, Available: ${prod.quantityInStock}`,
                        });
                    }
                }

                // 2. Perform atomic database transaction:
                // a) Insert into sales table
                // b) Atomically decrement quantity_in_stock in products table
                // c) If orderCode provided, mark saved cart as PROCESSED
                const createdSales: any[] = [];
                const now = new Date().toISOString();

                await db.transaction(async (tx) => {
                    for (const item of cartItems) {
                        const prod = productMap.get(Number(item.productId))!;
                        const qty = Number(item.quantity);
                        const totalAmount = prod.pricePerUnit * qty;

                        // a) Insert sales record
                        const insertedSale = await tx
                            .insert(sales)
                            .values({
                                productId: prod.id,
                                productTitle: prod.title,
                                productCode: prod.codeNo,
                                quantitySold: qty,
                                unitPrice: prod.pricePerUnit,
                                totalAmount,
                                soldByUserId: user.id,
                                createdAt: now,
                            })
                            .returning();

                        createdSales.push(insertedSale[0]);

                        // b) Atomically decrement quantity_in_stock
                        await tx
                            .update(products)
                            .set({
                                quantityInStock: sql`${products.quantityInStock} - ${qty}`,
                            })
                            .where(eq(products.id, prod.id));
                    }

                    // c) Mark order code as processed if provided
                    if (cleanOrderCode) {
                        await tx
                            .update(savedCarts)
                            .set({
                                status: "PROCESSED",
                                processedAt: now,
                                processedByUserId: user.id,
                            })
                            .where(
                                and(
                                    eq(savedCarts.code, cleanOrderCode),
                                    eq(savedCarts.status, "PENDING")
                                )
                            );
                    }
                });

                res.status(201).json({
                    success: true,
                    message: "Sale processed successfully",
                    sales: createdSales,
                });
            } catch (err: any) {
                console.error("Error processing sale:", err);
                res.status(500).json({
                    error:
                        err.message ||
                        "Transaction failed while processing sale",
                });
            }
        }
    );

    // --- SAVED CARTS / ORDER CODES GENERATION & RETRIEVAL ---
    // Helper to generate unique order code like ST-4892
    async function generateUniqueOrderCode(): Promise<string> {
        for (let attempts = 0; attempts < 15; attempts++) {
            const num = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
            const code = `ST-${num}`;
            const existing = await db
                .select()
                .from(savedCarts)
                .where(eq(savedCarts.code, code))
                .limit(1);
            if (existing.length === 0) {
                return code;
            }
        }
        // Fallback if 4-digit space has collision
        return `ST-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    // 1. Create a Saved Cart and Generate an Order Code
    app.post("/api/saved-carts", async (req: Request, res: Response) => {
        try {
            const { items, customerName, customerPhone, customerNote } =
                req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res
                    .status(400)
                    .json({ error: "Cart must contain at least one item" });
            }

            const productIds = items.map((i: any) => Number(i.productId));
            const fetchedProducts = await db
                .select()
                .from(products)
                .where(
                    sql`${products.id} IN (${sql.join(productIds, sql`, `)})`
                );

            const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));

            // Fetch primary images for items
            const fetchedImages = await db
                .select()
                .from(productImages)
                .where(
                    sql`${productImages.productId} IN (${sql.join(
                        productIds,
                        sql`, `
                    )})`
                );

            const imagesMap = new Map<number, string>();
            for (const img of fetchedImages) {
                if (!imagesMap.has(img.productId)) {
                    imagesMap.set(img.productId, img.imageUrl);
                }
            }

            let totalAmount = 0;
            const formattedItems: any[] = [];

            for (const item of items) {
                const prod = productMap.get(Number(item.productId));
                if (!prod) {
                    return res.status(400).json({
                        error: `Item with ID ${item.productId} not found in store`,
                    });
                }
                const qty = Math.max(1, Number(item.quantity) || 1);
                const itemTotal = prod.pricePerUnit * qty;
                totalAmount += itemTotal;

                formattedItems.push({
                    productId: prod.id,
                    codeNo: prod.codeNo,
                    title: prod.title,
                    pricePerUnit: prod.pricePerUnit,
                    quantity: qty,
                    imageUrl: imagesMap.get(prod.id) || "",
                    category: prod.category,
                });
            }

            const code = await generateUniqueOrderCode();
            const now = new Date().toISOString();

            const inserted = await db
                .insert(savedCarts)
                .values({
                    code,
                    items: JSON.stringify(formattedItems),
                    totalAmount,
                    customerName: customerName
                        ? String(customerName).trim()
                        : null,
                    customerPhone: customerPhone
                        ? String(customerPhone).trim()
                        : null,
                    customerNote: customerNote
                        ? String(customerNote).trim()
                        : null,
                    status: "PENDING",
                    createdAt: now,
                })
                .returning();

            const saved = inserted[0];

            res.status(201).json({
                success: true,
                code: saved.code,
                cart: {
                    id: saved.id,
                    code: saved.code,
                    items: formattedItems,
                    totalAmount: saved.totalAmount,
                    customerName: saved.customerName,
                    customerPhone: saved.customerPhone,
                    customerNote: saved.customerNote,
                    status: saved.status,
                    createdAt: saved.createdAt,
                },
            });
        } catch (err: any) {
            console.error("Error creating saved cart:", err);
            res.status(500).json({
                error: err.message || "Failed to save cart and generate code",
            });
        }
    });

    // 2. Fetch Saved Cart by Code (for seller to load order or customer to view)
    app.get(
        "/api/saved-carts/:code",
        requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const code = req.params.code.trim().toUpperCase();
                const found = await db
                    .select()
                    .from(savedCarts)
                    .where(eq(savedCarts.code, code))
                    .limit(1);

                if (found.length === 0) {
                    return res.status(404).json({
                        error: `Order code "${code}" not found. Please check and try again.`,
                    });
                }

                const cart = found[0];
                let parsedItems: any[] = [];
                try {
                    parsedItems = JSON.parse(cart.items);
                } catch {
                    parsedItems = [];
                }

                // Re-fetch latest live product info for each item (current stock, live price, availability)
                const productIds = parsedItems.map((i: any) =>
                    Number(i.productId)
                );
                let currentProducts: any[] = [];
                if (productIds.length > 0) {
                    currentProducts = await db
                        .select()
                        .from(products)
                        .where(
                            sql`${products.id} IN (${sql.join(
                                productIds,
                                sql`, `
                            )})`
                        );
                }
                const currentProductMap = new Map(
                    currentProducts.map((p) => [p.id, p])
                );

                const itemsWithLiveData = parsedItems.map((item) => {
                    const liveProd = currentProductMap.get(item.productId);
                    return {
                        ...item,
                        liveProduct: liveProd || null,
                        currentStock: liveProd ? liveProd.quantityInStock : 0,
                        isAvailable: liveProd ? liveProd.isAvailable : false,
                        currentPrice: liveProd
                            ? liveProd.pricePerUnit
                            : item.pricePerUnit,
                    };
                });

                res.json({
                    success: true,
                    cart: {
                        id: cart.id,
                        code: cart.code,
                        items: itemsWithLiveData,
                        totalAmount: cart.totalAmount,
                        customerName: cart.customerName,
                        customerPhone: cart.customerPhone,
                        customerNote: cart.customerNote,
                        status: cart.status,
                        createdAt: cart.createdAt,
                        processedAt: cart.processedAt,
                    },
                });
            } catch (err: any) {
                console.error("Error fetching saved cart:", err);
                res.status(500).json({
                    error: "Failed to retrieve saved cart",
                });
            }
        }
    );

    // 3. List recent Pending Saved Carts (for Sellers in POS/Admin)
    app.get(
        "/api/saved-carts",
        requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const statusFilter = (req.query.status as string) || "PENDING";
                const limit = Number(req.query.limit) || 30;

                const query = db
                    .select()
                    .from(savedCarts)
                    .where(eq(savedCarts.status, statusFilter as any))
                    .orderBy(desc(savedCarts.createdAt))
                    .limit(limit);

                const rows = await query;
                const parsedRows = rows.map((r) => {
                    let items: any[] = [];
                    try {
                        items = JSON.parse(r.items);
                    } catch {
                        items = [];
                    }
                    return {
                        ...r,
                        items,
                    };
                });

                res.json(parsedRows);
            } catch (err: any) {
                console.error("Error listing saved carts:", err);
                res.status(500).json({ error: "Failed to list saved carts" });
            }
        }
    );

    // 4. Update Saved Cart Status
    app.patch(
        "/api/saved-carts/:code/status",
        requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const code = req.params.code.trim().toUpperCase();
                const { status } = req.body;
                const user = req.user!;

                if (!["PENDING", "PROCESSED", "CANCELLED"].includes(status)) {
                    return res.status(400).json({ error: "Invalid status" });
                }

                await db
                    .update(savedCarts)
                    .set({
                        status,
                        processedAt:
                            status === "PROCESSED"
                                ? new Date().toISOString()
                                : null,
                        processedByUserId:
                            status === "PROCESSED" ? user.id : null,
                    })
                    .where(eq(savedCarts.code, code));

                res.json({ success: true, code, status });
            } catch (err: any) {
                console.error("Error updating saved cart status:", err);
                res.status(500).json({
                    error: "Failed to update order status",
                });
            }
        }
    );

    // --- SALES REPORTING ---
    app.get(
        "/api/sales",
        requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
            try {
                const user = req.user!;
                const timeframe = (req.query.timeframe as string) || "daily";
                const startDateQuery = req.query.startDate as
                    | string
                    | undefined;
                const endDateQuery = req.query.endDate as string | undefined;
                const sortBy = (req.query.sortBy as string) || "timestamp"; // 'timestamp', 'quantity', 'price'
                const sortOrder = (req.query.sortOrder as string) || "desc";

                // Enforce Role Restriction:
                // "Restricted View: Admins can only view the sales table for a time window (e.g., Today's sales or This Week's sales) dictated by their permissions."
                let effectiveTimeframe = timeframe;
                if (user.role === "ADMIN") {
                    if (
                        effectiveTimeframe !== "daily" &&
                        effectiveTimeframe !== "weekly"
                    ) {
                        effectiveTimeframe = "daily"; // default to today's sales for sales staff
                    }
                }

                // Calculate time boundaries
                const now = new Date();
                let startBoundary: Date;
                let endBoundary: Date = new Date();

                if (effectiveTimeframe === "daily") {
                    // Today from midnight
                    startBoundary = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        0,
                        0,
                        0,
                        0
                    );
                } else if (effectiveTimeframe === "weekly") {
                    // Past 7 days
                    startBoundary = new Date(
                        now.getTime() - 7 * 24 * 60 * 60 * 1000
                    );
                } else if (effectiveTimeframe === "monthly") {
                    // Past 30 days
                    startBoundary = new Date(
                        now.getTime() - 30 * 24 * 60 * 60 * 1000
                    );
                } else if (effectiveTimeframe === "annually") {
                    // Past 365 days
                    startBoundary = new Date(
                        now.getTime() - 365 * 24 * 60 * 60 * 1000
                    );
                } else if (
                    effectiveTimeframe === "custom" &&
                    startDateQuery &&
                    user.role === "SUPER_ADMIN"
                ) {
                    startBoundary = new Date(startDateQuery);
                    if (endDateQuery) {
                        endBoundary = new Date(endDateQuery);
                        endBoundary.setHours(23, 59, 59, 999);
                    }
                } else {
                    startBoundary = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        0,
                        0,
                        0,
                        0
                    );
                }

                const allSales = await db
                    .select({
                        id: sales.id,
                        productId: sales.productId,
                        productTitle: sales.productTitle,
                        productCode: sales.productCode,
                        quantitySold: sales.quantitySold,
                        unitPrice: sales.unitPrice,
                        totalAmount: sales.totalAmount,
                        soldByUserId: sales.soldByUserId,
                        soldByEmail: users.email,
                        createdAt: sales.createdAt,
                    })
                    .from(sales)
                    .leftJoin(users, eq(sales.soldByUserId, users.id))
                    .where(
                        and(
                            gte(sales.createdAt, startBoundary.toISOString()),
                            lte(sales.createdAt, endBoundary.toISOString())
                        )
                    );

                // Sorting
                allSales.sort((a, b) => {
                    if (sortBy === "quantity") {
                        return sortOrder === "asc"
                            ? a.quantitySold - b.quantitySold
                            : b.quantitySold - a.quantitySold;
                    } else if (sortBy === "price") {
                        return sortOrder === "asc"
                            ? a.totalAmount - b.totalAmount
                            : b.totalAmount - a.totalAmount;
                    } else {
                        // timestamp
                        const timeA = new Date(a.createdAt).getTime();
                        const timeB = new Date(b.createdAt).getTime();
                        return sortOrder === "asc"
                            ? timeA - timeB
                            : timeB - timeA;
                    }
                });

                // Calculate summary totals
                const totalRevenue = allSales.reduce(
                    (acc, s) => acc + s.totalAmount,
                    0
                );
                const totalUnitsSold = allSales.reduce(
                    (acc, s) => acc + s.quantitySold,
                    0
                );
                const transactionsCount = allSales.length;

                res.json({
                    timeframe: effectiveTimeframe,
                    sales: allSales,
                    summary: {
                        totalRevenue,
                        totalUnitsSold,
                        transactionsCount,
                    },
                });
            } catch (err: any) {
                console.error("Error fetching sales:", err);
                res.status(500).json({
                    error: "Failed to retrieve sales logs",
                });
            }
        }
    );

    // --- VITE MIDDLEWARE / STATIC ASSETS ---
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    return app;
}

if (!process.env.VERCEL) {
    startServer().then((app) => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running at http://0.0.0.0:${PORT}`);
        });
    });
}
