import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/src/server/auth";

const TABLES = [
    { name: "users", key: "id" },
    { name: "products", key: "id" },
    { name: "product_images", key: "id" },
    { name: "sales", key: "id" },
    { name: "category_settings", key: "category" },
    { name: "saved_carts", key: "id" },
];

export async function GET(req: NextRequest) {
    const user = getAuthUser(req);
    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized. Please sign in." },
            { status: 401 }
        );
    }
    if (user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
            { error: "Forbidden. Super Admin privileges required." },
            { status: 403 }
        );
    }

    return NextResponse.json(TABLES);
}
