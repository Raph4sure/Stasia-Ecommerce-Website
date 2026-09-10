import React, { useState, useMemo } from "react";
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Receipt,
    FileSpreadsheet,
    Clock,
    Printer,
    Sparkles,
    Tag,
    Store,
    ArrowRight,
    KeyRound,
} from "lucide-react";
import { Product, CartItem, Sale, User } from "../types";
import { formatPrice, formatDateTime, fetchWithAuth } from "../lib/api";

interface AdminPosDashboardProps {
    currentUser: User;
    products: Product[];
    onRefreshData: () => Promise<void>;
    onSwitchToSuperAdmin?: () => void;
}

export const AdminPosDashboard: React.FC<AdminPosDashboardProps> = ({
    currentUser,
    products,
    onRefreshData,
    onSwitchToSuperAdmin,
}) => {
    const [activeTab, setActiveTab] = useState<"register" | "history">(
        "register"
    );

    // Search & Category filters in register
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Sales Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loadedOrderCode, setLoadedOrderCode] = useState<string | null>(null);
    const [orderCodeInput, setOrderCodeInput] = useState("");
    const [isLoadingSavedOrder, setIsLoadingSavedOrder] = useState(false);
    const [customerNote, setCustomerNote] = useState("");
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [saleError, setSaleError] = useState<string | null>(null);

    // Completed Receipt Modal State
    const [completedSaleData, setCompletedSaleData] = useState<{
        sales: Sale[];
        total: number;
        timestamp: string;
    } | null>(null);

    // Restricted Sales History State
    const [historyTimeframe, setHistoryTimeframe] = useState<
        "daily" | "weekly"
    >("daily");
    const [staffSales, setStaffSales] = useState<Sale[]>([]);
    const [historySummary, setHistorySummary] = useState({
        totalRevenue: 0,
        totalUnitsSold: 0,
        transactionsCount: 0,
    });
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Categories list
    const categories = useMemo(() => {
        const set = new Set(products.map((p) => p.category));
        return ["All", ...Array.from(set)];
    }, [products]);

    // Filtered available products for POS
    const posProducts = useMemo(() => {
        return products.filter((p) => {
            if (
                selectedCategory !== "All" &&
                p.category.toLowerCase() !== selectedCategory.toLowerCase()
            ) {
                return false;
            }
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim();
                const matchTitle = p.title.toLowerCase().includes(q);
                const matchCode = p.codeNo.toLowerCase().includes(q);
                if (!matchTitle && !matchCode) return false;
            }
            return true;
        });
    }, [products, selectedCategory, searchTerm]);

    // Cart operations
    const addToCart = (product: Product) => {
        if (product.quantityInStock <= 0) return;

        setCart((prev) => {
            const existing = prev.find(
                (item) => item.product.id === product.id
            );
            if (existing) {
                // Check if exceeded stock
                if (existing.quantity >= product.quantityInStock) {
                    setSaleError(
                        `Cannot add more. Current available stock limit is ${product.quantityInStock}.`
                    );
                    return prev;
                }
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: number, newQty: number) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;

        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQty > product.quantityInStock) {
            setSaleError(
                `Maximum stock available for "${product.title}" is ${product.quantityInStock}`
            );
            return;
        }

        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: newQty }
                    : item
            )
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setLoadedOrderCode(null);
        setSaleError(null);
    };

    const handleLoadSavedOrder = async () => {
        const code = orderCodeInput.trim().toUpperCase();
        if (!code) {
            setSaleError("Enter the customer order code first.");
            return;
        }

        setIsLoadingSavedOrder(true);
        setSaleError(null);
        try {
            const savedOrder = (
                await fetchWithAuth(
                    `/api/saved-carts/${encodeURIComponent(code)}`
                )
            ).cart;
            if (savedOrder.status !== "PENDING") {
                throw new Error(
                    `Order ${
                        savedOrder.code
                    } is already ${savedOrder.status.toLowerCase()}.`
                );
            }

            const productMap = new Map(
                products.map((product) => [product.id, product])
            );
            const loadedItems: CartItem[] = [];
            for (const item of savedOrder.items) {
                const product = productMap.get(Number(item.productId));
                if (!product) {
                    throw new Error(
                        `${item.title} is no longer in the product catalog.`
                    );
                }
                if (item.quantity > product.quantityInStock) {
                    throw new Error(
                        `Insufficient stock for ${product.title}: ${product.quantityInStock} available.`
                    );
                }
                loadedItems.push({ product, quantity: item.quantity });
            }

            setCart(loadedItems);
            setLoadedOrderCode(savedOrder.code);
            setOrderCodeInput(savedOrder.code);
        } catch (err: any) {
            setSaleError(err.message || "Unable to load that saved order.");
        } finally {
            setIsLoadingSavedOrder(false);
        }
    };

    // Cart Totals
    const cartTotal = useMemo(() => {
        return cart.reduce(
            (sum, item) => sum + item.product.pricePerUnit * item.quantity,
            0
        );
    }, [cart]);

    const cartUnits = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    // Process Sale Database Transaction
    const handleProcessSale = async () => {
        if (cart.length === 0) return;

        setIsProcessingSale(true);
        setSaleError(null);

        try {
            const cartItemsPayload = cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
            }));

            const res = await fetchWithAuth("/api/sales/process", {
                method: "POST",
                body: JSON.stringify({
                    cartItems: cartItemsPayload,
                    orderCode: loadedOrderCode,
                }),
            });

            const total = cartTotal;
            const salesRes = res.sales;

            // Update parent data (refresh stock levels and logs)
            await onRefreshData();

            // Show receipt modal
            setCompletedSaleData({
                sales: salesRes,
                total,
                timestamp: new Date().toISOString(),
            });

            // Clear register cart
            setCart([]);
            setLoadedOrderCode(null);
            setOrderCodeInput("");
        } catch (err: any) {
            setSaleError(
                err.message ||
                    "Transaction failed. Please check available stock levels."
            );
        } finally {
            setIsProcessingSale(false);
        }
    };

    // Fetch restricted sales history (Today / This Week only)
    const fetchStaffHistory = async (
        timeframe: "daily" | "weekly" = historyTimeframe
    ) => {
        setIsLoadingHistory(true);
        try {
            const data = await fetchWithAuth(
                `/api/sales?timeframe=${timeframe}`
            );
            setStaffSales(data.sales || []);
            setHistorySummary(
                data.summary || {
                    totalRevenue: 0,
                    totalUnitsSold: 0,
                    transactionsCount: 0,
                }
            );
        } catch (err) {
            console.error("Failed to load restricted staff history", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    return (
        <div
            id="admin-pos-dashboard"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        >
            {/* Top Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-stone-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-semibold uppercase">
                            Sales Terminal Active
                        </span>
                        <span className="text-xs text-stone-500 font-mono">
                            Staff: {currentUser.email} ({currentUser.role})
                        </span>
                    </div>
                    <h1 className="font-serif text-2xl font-bold text-stone-900">
                        Point-of-Sale Checkout & Register
                    </h1>
                </div>

                {/* Tab Controls + Super Admin shortcut if applicable */}
                <div className="flex items-center gap-2">
                    {currentUser.role === "SUPER_ADMIN" &&
                        onSwitchToSuperAdmin && (
                            <button
                                onClick={onSwitchToSuperAdmin}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition"
                            >
                                ← Back to Super Admin Console
                            </button>
                        )}

                    <div className="flex bg-stone-100 p-1 rounded-xl">
                        <button
                            id="pos-tab-register"
                            onClick={() => setActiveTab("register")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                                activeTab === "register"
                                    ? "bg-stone-900 text-amber-300 shadow-xs font-semibold"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Sales Register
                        </button>

                        <button
                            id="pos-tab-history"
                            onClick={() => {
                                setActiveTab("history");
                                fetchStaffHistory();
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                                activeTab === "history"
                                    ? "bg-stone-900 text-amber-300 shadow-xs font-semibold"
                                    : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Sales History (Restricted)
                        </button>
                    </div>
                </div>
            </div>

            {/* Saved customer order lookup */}
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-900">
                            <KeyRound className="h-4 w-4" />
                            <h2 className="text-sm font-bold">
                                Load Customer Order Code
                            </h2>
                        </div>
                        <p className="mt-1 text-xs text-amber-800/80">
                            Enter the code generated by the customer to load
                            their saved items into this register.
                        </p>
                    </div>
                    <div className="flex w-full gap-2 md:max-w-md">
                        <input
                            id="saved-order-code-input"
                            type="text"
                            value={orderCodeInput}
                            onChange={(e) =>
                                setOrderCodeInput(e.target.value.toUpperCase())
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleLoadSavedOrder();
                            }}
                            placeholder="e.g. ST-4892"
                              className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white dark:bg-stone-800 px-3 py-2.5 text-sm font-mono uppercase tracking-wider text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <button
                            id="btn-load-saved-order"
                            type="button"
                            onClick={handleLoadSavedOrder}
                            disabled={isLoadingSavedOrder}
                            className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-stone-800 disabled:opacity-50"
                        >
                            {isLoadingSavedOrder ? "Loading..." : "Load Order"}
                        </button>
                    </div>
                </div>

                {loadedOrderCode && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-amber-200 pt-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Loaded order{" "}
                            <strong className="font-mono">
                                {loadedOrderCode}
                            </strong>
                            . Review the items below, then process the sale.
                        </span>
                        <button
                            type="button"
                            onClick={clearCart}
                            className="self-start font-semibold text-rose-700 hover:text-rose-900 sm:self-auto"
                        >
                            Clear loaded order
                        </button>
                    </div>
                )}
            </div>

            {/* ================= REGISTER VIEW ================= */}
            {activeTab === "register" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Product Search & Grid (8 cols) */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                        {/* Search Bar & Category Filters */}
                        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Quick lookup by title or Code No. (e.g. CLT-101, BAG-202)..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            {/* Category selector pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                                            selectedCategory.toLowerCase() ===
                                            cat.toLowerCase()
                                                ? "bg-stone-900 text-amber-300"
                                                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Products POS Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {posProducts.length === 0 ? (
                                <div className="col-span-full bg-white p-8 rounded-xl border border-stone-200 text-center text-stone-400 text-xs">
                                    No products match your search.
                                </div>
                            ) : (
                                posProducts.map((p) => {
                                    const isOutOfStock = p.quantityInStock <= 0;
                                    const isLowStock =
                                        p.quantityInStock > 0 &&
                                        p.quantityInStock < 5;
                                    const thumb =
                                        p.images.length > 0
                                            ? p.images[0]
                                            : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80";

                                    return (
                                        <div
                                            key={p.id}
                                            id={`pos-item-${p.id}`}
                                            onClick={() =>
                                                !isOutOfStock && addToCart(p)
                                            }
                                            className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition-all select-none ${
                                                isOutOfStock
                                                    ? "border-stone-200 opacity-50 cursor-not-allowed bg-stone-50"
                                                    : "border-stone-200 hover:border-amber-500/60 hover:shadow-md cursor-pointer group active:scale-[0.98]"
                                            }`}
                                        >
                                            <div>
                                                {/* Thumbnail */}
                                                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 mb-2 relative">
                                                    <img
                                                        src={thumb}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-1 right-1">
                                                        <span
                                                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-medium ${
                                                                isOutOfStock
                                                                    ? "bg-stone-900 text-white"
                                                                    : isLowStock
                                                                    ? "bg-rose-600 text-white font-bold"
                                                                    : "bg-stone-900/80 text-white"
                                                            }`}
                                                        >
                                                            {isOutOfStock
                                                                ? "0 Left"
                                                                : `${p.quantityInStock} in Stock`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title & Code No. */}
                                                <h4 className="font-medium text-stone-900 text-xs group-hover:text-amber-800 line-clamp-1">
                                                    {p.title}
                                                </h4>
                                                <div className="text-[11px] font-mono text-stone-500 font-normal mt-0.5">
                                                    Code: {p.codeNo}
                                                </div>
                                            </div>

                                            {/* Price and Add Button */}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
                                                <span className="font-bold text-xs sm:text-sm text-stone-900 font-mono">
                                                    {formatPrice(
                                                        p.pricePerUnit
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={isOutOfStock}
                                                    className="w-7 h-7 rounded-lg bg-stone-100 group-hover:bg-amber-500 group-hover:text-stone-950 text-stone-700 flex items-center justify-center transition"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Register Terminal Cart (5 cols) */}
                    <div className="lg:col-span-5 xl:col-span-4">
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-5 sticky top-22 flex flex-col justify-between min-h-[500px]">
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-amber-600" />
                                        <h3 className="font-serif font-bold text-base text-stone-900">
                                            Active Sales Register
                                        </h3>
                                    </div>
                                    {cart.length > 0 && (
                                        <button
                                            onClick={clearCart}
                                            className="text-xs text-stone-400 hover:text-rose-600 transition"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {saleError && (
                                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                        <span>{saleError}</span>
                                    </div>
                                )}

                                {/* Cart Items List */}
                                {cart.length === 0 ? (
                                    <div className="py-16 text-center text-stone-400">
                                        <Store className="w-10 h-10 mx-auto text-stone-300 mb-2 stroke-1" />
                                        <p className="text-xs font-medium text-stone-600">
                                            Cart is currently empty
                                        </p>
                                        <p className="text-[11px] text-stone-400 mt-1">
                                            Click any item on the left to add it
                                            to the transaction register.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                                        {cart.map((item) => (
                                            <div
                                                key={item.product.id}
                                                className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-stone-900 truncate">
                                                        {item.product.title}
                                                    </div>
                                                    <div className="text-[11px] text-stone-500 font-mono font-normal">
                                                        Code:{" "}
                                                        {item.product.codeNo} •{" "}
                                                        {formatPrice(
                                                            item.product
                                                                .pricePerUnit
                                                        )}{" "}
                                                        ea.
                                                    </div>
                                                    <div className="text-[11px] font-mono font-semibold text-stone-900 mt-0.5">
                                                        Subtotal:{" "}
                                                        {formatPrice(
                                                            item.product
                                                                .pricePerUnit *
                                                                item.quantity
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quantity Stepper */}
                                                <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-1 shrink-0">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.product.id,
                                                                item.quantity -
                                                                    1
                                                            )
                                                        }
                                                        className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-6 text-center font-mono font-bold text-stone-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.product.id,
                                                                item.quantity +
                                                                    1
                                                            )
                                                        }
                                                        className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Remove */}
                                                <button
                                                    onClick={() =>
                                                        removeFromCart(
                                                            item.product.id
                                                        )
                                                    }
                                                    className="p-1 text-stone-400 hover:text-rose-600"
                                                    title="Remove item"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cart Footer Summary & Process Sale Button */}
                            <div className="pt-4 border-t border-stone-200 mt-4 space-y-3">
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-stone-500">
                                        <span>Total Item Units</span>
                                        <span className="font-mono font-semibold text-stone-800">
                                            {cartUnits} Units
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-stone-500">
                                        <span>Tax / Handling</span>
                                        <span className="font-mono">
                                            {formatPrice(0)} (Included)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-sm pt-2 border-t border-stone-100">
                                        <span className="font-serif font-bold text-stone-900 text-base">
                                            Grand Total Amount
                                        </span>
                                        <span className="font-mono font-bold text-xl text-stone-950">
                                            {formatPrice(cartTotal)}
                                        </span>
                                    </div>
                                </div>

                                {/* Requirement: Process Sale Button
                    "Upon clicking 'Process Sale', automatically deduct the sold quantity from the main Inventory table and create a record in the Sold Items table." */}
                                <button
                                    id="btn-process-sale"
                                    onClick={handleProcessSale}
                                    disabled={
                                        cart.length === 0 || isProcessingSale
                                    }
                                    className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-amber-300 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition disabled:opacity-40"
                                >
                                    {isProcessingSale ? (
                                        <span>
                                            Executing Database Transaction...
                                        </span>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            <span>
                                                Process Sale (
                                                {formatPrice(cartTotal)})
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= RESTRICTED HISTORY VIEW ================= */}
            {activeTab === "history" && (
                <div className="space-y-6">
                    {/* Requirement: Restricted View: Admins can only view the sales table for a time window (e.g., Today's sales or This Week's sales) dictated by their permissions. */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">
                                Permission Restricted View:
                            </span>{" "}
                            Sales staff access is restricted to immediate sales
                            operations and time-bound transaction logs (
                            {historyTimeframe === "daily"
                                ? "Today's"
                                : "This Week's"}{" "}
                            records only).
                        </div>
                    </div>

                    {/* Timeframe Selector (Daily vs Weekly only for staff) */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">
                                Permitted Time Window:
                            </span>
                            <button
                                onClick={() => {
                                    setHistoryTimeframe("daily");
                                    fetchStaffHistory("daily");
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                    historyTimeframe === "daily"
                                        ? "bg-stone-900 text-amber-300"
                                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                }`}
                            >
                                Today&apos;s Sales
                            </button>
                            <button
                                onClick={() => {
                                    setHistoryTimeframe("weekly");
                                    fetchStaffHistory("weekly");
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                    historyTimeframe === "weekly"
                                        ? "bg-stone-900 text-amber-300"
                                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                }`}
                            >
                                This Week&apos;s Sales
                            </button>
                        </div>

                        <div className="text-xs font-mono font-semibold text-stone-900">
                            Total Recorded:{" "}
                            <span className="text-emerald-700">
                                {formatPrice(historySummary.totalRevenue)}
                            </span>{" "}
                            ({historySummary.totalUnitsSold} units)
                        </div>
                    </div>

                    {/* Restricted Sales Table */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-stone-100 text-stone-700 uppercase font-semibold border-b border-stone-200">
                                    <tr>
                                        <th className="py-2.5 px-4">Tx ID</th>
                                        <th className="py-2.5 px-4">Time</th>
                                        <th className="py-2.5 px-4">
                                            Code No.
                                        </th>
                                        <th className="py-2.5 px-4">Product</th>
                                        <th className="py-2.5 px-4 text-center">
                                            Qty
                                        </th>
                                        <th className="py-2.5 px-4 text-right">
                                            Unit Price
                                        </th>
                                        <th className="py-2.5 px-4 text-right">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {isLoadingHistory ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="py-8 text-center text-stone-400"
                                            >
                                                Loading authorized sales
                                                records...
                                            </td>
                                        </tr>
                                    ) : staffSales.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="py-8 text-center text-stone-400"
                                            >
                                                No transactions found for this
                                                window.
                                            </td>
                                        </tr>
                                    ) : (
                                        staffSales.map((s) => (
                                            <tr
                                                key={s.id}
                                                className="hover:bg-stone-50"
                                            >
                                                <td className="py-2.5 px-4 font-mono text-stone-400">
                                                    #
                                                    {String(s.id).padStart(
                                                        5,
                                                        "0"
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 font-mono text-[11px] text-stone-600">
                                                    {formatDateTime(
                                                        s.createdAt
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 font-mono text-stone-700">
                                                    <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                                        {s.productCode}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 font-medium text-stone-900">
                                                    {s.productTitle}
                                                </td>
                                                <td className="py-2.5 px-4 text-center font-mono font-bold text-stone-800">
                                                    {s.quantitySold}
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono text-stone-600">
                                                    {formatPrice(s.unitPrice)}
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-800">
                                                    {formatPrice(s.totalAmount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= SALE COMPLETED RECEIPT MODAL ================= */}
            {completedSaleData && (
                <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
                        <div className="text-center pb-4 border-b border-stone-200 dark:border-stone-800">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-300 dark:border-emerald-800/60">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-semibold mb-0.5">
                                Stasia Elegant Fabrique
                            </div>
                            <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                                Official Sales Receipt
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                                Stock automatically decremented in showroom
                                inventory
                            </p>
                        </div>

                        {/* Receipt Summary */}
                        <div className="py-4 space-y-3 font-mono text-xs border-b border-stone-200 dark:border-stone-800">
                            <div className="flex justify-between text-stone-500 dark:text-stone-400">
                                <span>Date & Time</span>
                                <span>
                                    {formatDateTime(
                                        completedSaleData.timestamp
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-stone-500 dark:text-stone-400">
                                <span>Staff Associate</span>
                                <span>{currentUser.email}</span>
                            </div>

                            <div className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-700 space-y-2">
                                {completedSaleData.sales.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between"
                                    >
                                        <div>
                                            <div className="font-sans font-medium text-stone-800 dark:text-stone-200">
                                                {item.productTitle}
                                            </div>
                                            <div className="text-[10px] text-stone-400 dark:text-stone-500">
                                                {item.productCode} ×{" "}
                                                {item.quantitySold}
                                            </div>
                                        </div>
                                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                                            {formatPrice(item.totalAmount)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-between text-sm font-bold text-stone-950 dark:text-stone-50">
                                <span>Total Tendered</span>
                                <span className="text-emerald-700 dark:text-emerald-400">
                                    {formatPrice(completedSaleData.total)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex items-center gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Receipt</span>
                            </button>
                            <button
                                onClick={() => setCompletedSaleData(null)}
                                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition"
                            >
                                Start Next Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
