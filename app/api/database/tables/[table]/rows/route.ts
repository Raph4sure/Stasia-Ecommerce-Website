import { NextRequest, NextResponse } from "next/server";
import { client, initializeDatabase } from "@/src/db";
import { getAuthUser } from "@/src/server/auth";

const TABLE_KEYS: Record<string, string> = {
    users: "id",
    products: "id",
    product_images: "id",
    sales: "id",
    category_settings: "category",
    saved_carts: "id",
};

const PRESERVED_CHILDREN: Record<
    string,
    Array<{ table: string; column: string }>
> = {
    products: [{ table: "sales", column: "product_id" }],
    users: [{ table: "sales", column: "sold_by_user_id" }],
};

function authorize(req: NextRequest) {
    const user = getAuthUser(req);
    if (!user)
        return NextResponse.json(
            { error: "Unauthorized. Please sign in." },
            { status: 401 }
        );
    if (user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
            { error: "Forbidden. Super Admin privileges required." },
            { status: 403 }
        );
    }
    return null;
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ table: string }> }
) {
    const denied = authorize(req);
    if (denied) return denied;

    const { table } = await params;
    const key = TABLE_KEYS[table];
    if (!key)
        return NextResponse.json(
            { error: "Unknown database table." },
            { status: 404 }
        );

    try {
        await initializeDatabase();
        const body = await req.json();
        const rowKeys = Array.isArray(body.rowKeys)
            ? body.rowKeys.map(String)
            : [];
        if (rowKeys.length === 0)
            return NextResponse.json(
                { error: "At least one row is required." },
                { status: 400 }
            );

        const placeholders = rowKeys.map(() => "?").join(", ");
        for (const child of PRESERVED_CHILDREN[table] || []) {
            const result = await client.execute({
                sql: `SELECT COUNT(*) AS count FROM ${child.table} WHERE ${child.column} IN (${placeholders})`,
                args: rowKeys,
            });
            if (Number(result.rows[0]?.count || 0) > 0) {
                return NextResponse.json(
                    {
                        error: `Cannot delete these rows while connected ${child.table} records exist.`,
                    },
                    { status: 409 }
                );
            }
        }

        await client.execute({
            sql: `DELETE FROM ${table} WHERE ${key} IN (${placeholders})`,
            args: rowKeys,
        });
        return NextResponse.json({ success: true, deleted: rowKeys.length });
    } catch (err) {
        console.error(`Error deleting rows from ${table}:`, err);
        return NextResponse.json(
            { error: "Failed to delete database rows." },
            { status: 500 }
        );
    }
}
