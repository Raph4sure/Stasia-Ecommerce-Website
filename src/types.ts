export type UserRole = "SUPER_ADMIN" | "ADMIN";

export interface User {
    id: number;
    email: string;
    role: UserRole;
    createdAt: string;
    salesCount?: number;
    totalSalesVolume?: number;
}

export interface ProductImage {
    id: number;
    productId: number;
    imageUrl: string;
}

export interface Product {
    id: number;
    title: string;
    codeNo: string;
    category: string;
    pricePerUnit: number; // in minor currency units (e.g. 4500 = ₦45.00)
    quantityInStock: number;
    weightPerUnit: number; // weight per unit in kg (e.g. 0.85)
    isAvailable: boolean;
    createdAt: string;
    images: string[];
}

export interface Sale {
    id: number;
    productId: number;
    productTitle: string;
    productCode: string;
    quantitySold: number;
    unitPrice: number;
    totalAmount: number;
    soldByUserId: number;
    soldByEmail?: string;
    createdAt: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface SavedCartItem {
    productId: number;
    codeNo: string;
    title: string;
    pricePerUnit: number;
    quantity: number;
    imageUrl?: string;
    category?: string;
}

export interface SavedCart {
    id: number;
    code: string;
    items: SavedCartItem[];
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    customerNote?: string;
    status: "PENDING" | "PROCESSED" | "CANCELLED";
    createdAt: string;
    processedAt?: string;
    processedByUserId?: number;
}

export interface SalesReportFilter {
    timeframe: "daily" | "weekly" | "monthly" | "annually" | "custom";
    startDate?: string;
    endDate?: string;
}
