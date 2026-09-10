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

export async function GET(
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
        const result = await client.execute(`SELECT * FROM ${table} LIMIT 500`);
        const rows = result.rows as Array<Record<string, unknown>>;
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return NextResponse.json({ table, key, columns, rows });
    } catch (err) {
        console.error(`Error reading database table ${table}:`, err);
        return NextResponse.json(
            { error: "Failed to retrieve database table." },
            { status: 500 }
        );
    }
}
