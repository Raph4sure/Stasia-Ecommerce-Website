"use client";

import React, {
    useState,
    useMemo,
    useEffect,
    useRef,
    useCallback,
} from "react";
import {
    Search,
    Tag,
    Check,
    Copy,
    Sparkles,
    Eye,
    ArrowUpDown,
    X,
    Loader2,
    HelpCircle,
    ShoppingBag,
} from "lucide-react";
import { Product } from "../types";
import { formatPrice } from "../lib/api";
import { RecentlyAddedSlideshow } from "./RecentlyAddedSlideshow";
import { BrandLogo } from "./BrandLogo";
import { useCart } from "../lib/CartContext";

const ITEMS_PER_ROW = 4;

interface PublicCatalogProps {
    products: Product[];
    categories: { category: string; isAvailable: boolean }[];
    isLoading: boolean;
    onSelectProduct: (product: Product) => void;
    onOpenInquiryGuide?: () => void;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
    products,
    categories,
    isLoading,
    onSelectProduct,
    onOpenInquiryGuide,
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<
        "featured" | "price-asc" | "price-desc" | "name"
    >("featured");
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [addedProductId, setAddedProductId] = useState<number | null>(null);
    const { addToCart } = useCart();

    // Pop-up modal state (shown on top of the list of items; easily closed)
    const [isNoticePopupOpen, setIsNoticePopupOpen] = useState<boolean>(() => {
        // Check if user already dismissed it this session
        try {
            return (
                sessionStorage.getItem("stasia_hide_notice_popup") !== "true"
            );
        } catch {
            return true;
        }
    });

    // Row-by-row lazy loading state (starts with 1 row = 4 items)
    const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_ROW);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Available categories for public
    const availableCategoryList = useMemo(() => {
        const activeCats = categories
            .filter((c) => c.isAvailable)
            .map((c) => c.category);
        return ["All", ...activeCats];
    }, [categories]);

    // Filtered & Sorted products
    const filteredProducts = useMemo(() => {
        const list = products.filter((item) => {
            // Category check
            if (
                selectedCategory !== "All" &&
                item.category.toLowerCase() !== selectedCategory.toLowerCase()
            ) {
                return false;
            }
            // Search check (title or codeNo)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = item.title.toLowerCase().includes(q);
                const matchesCode = item.codeNo.toLowerCase().includes(q);
                const matchesCat = item.category.toLowerCase().includes(q);
                if (!matchesTitle && !matchesCode && !matchesCat) return false;
            }
            return true;
        });

        return list.sort((a, b) => {
            if (sortBy === "price-asc") return a.pricePerUnit - b.pricePerUnit;
            if (sortBy === "price-desc") return b.pricePerUnit - a.pricePerUnit;
            if (sortBy === "name") return a.title.localeCompare(b.title);
            return b.id - a.id; // default featured / newest
        });
    }, [products, selectedCategory, searchQuery, sortBy]);

    // Reset row-by-row pagination to 1 row whenever filters or search change
    useEffect(() => {
        setVisibleCount(ITEMS_PER_ROW);
    }, [selectedCategory, searchQuery, sortBy]);

    // Sliced products for row-by-row display
    const displayedProducts = useMemo(() => {
        return filteredProducts.slice(0, visibleCount);
    }, [filteredProducts, visibleCount]);

    const hasMore = visibleCount < filteredProducts.length;

    // Load next row function
    const loadNextRow = useCallback(() => {
        if (visibleCount >= filteredProducts.length || isLoadingMore) return;
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleCount((prev) =>
                Math.min(prev + ITEMS_PER_ROW, filteredProducts.length)
            );
            setIsLoadingMore(false);
        }, 320);
    }, [visibleCount, filteredProducts.length, isLoadingMore]);

    // Infinite scroll observer targeting bottom sentinel
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadNextRow();
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [loadNextRow]);

    const handleCopyCode = (e: React.MouseEvent, codeNo: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(codeNo);
        setCopiedCode(codeNo);
        setTimeout(() => setCopiedCode(null), 2500);
    };

    const handleClosePopup = (rememberInSession = true) => {
        setIsNoticePopupOpen(false);
        if (rememberInSession) {
            try {
                sessionStorage.setItem("stasia_hide_notice_popup", "true");
            } catch {
                // ignore
            }
        }
    };

    const handleAddToCart = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        if (product.quantityInStock <= 0) return;
        addToCart(product);
        setAddedProductId(product.id);
        window.setTimeout(() => setAddedProductId(null), 1800);
    };

    return (
        <div
            id="public-catalog-container"
            className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 overflow-x-hidden"
        >
            {/* ================= EASILY DISMISSIBLE POP-UP ON TOP OF ITEMS ================= */}
            {isNoticePopupOpen && (
                <div
                    id="atelier-guide-popup-backdrop"
                    className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => handleClosePopup()}
                >
                    <div
                        id="atelier-guide-popup-card"
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-200/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 my-auto animate-in zoom-in-95 duration-200"
                    >
                        {/* Easily closed close button */}
                        <button
                            id="close-guide-popup-btn"
                            type="button"
                            onClick={() => handleClosePopup()}
                            aria-label="Close Notice"
                            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Brand Logo Presentation */}
                        <div className="mb-4">
                            <BrandLogo size="sm" showSubtitle={true} />
                        </div>

                        {/* Clear Headline */}
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mb-3">
                            Quality Fabrics & Wears,{" "}
                            <span className="italic font-normal text-amber-700 dark:text-amber-400">
                                Made for Elegance.
                            </span>
                        </h2>

                        {/* Brand Notice */}
                        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                            Welcome to our store. We have original fabrics,
                            George and lace wrappers, premium Ankara silks,
                            stylish readymade clothes, and matching leather
                            bags. Every item has a registered{" "}
                            <strong className="text-amber-800 dark:text-amber-300 font-semibold font-mono">
                                Code No.
                            </strong>{" "}
                            so you can easily order or buy directly from our
                            store.
                        </p>

                        {/* 3-Step Simple Ordering Guide */}
                        <div className="rounded-2xl p-4 sm:p-5 bg-stone-50 dark:bg-stone-950/70 border border-stone-200/80 dark:border-stone-800 mb-6">
                            <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                                <span>✦ Easy 3-Step Ordering Guide</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600 dark:text-stone-400">
                                <div className="p-3 rounded-xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800 flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                                        1
                                    </span>
                                    <div>
                                        <span className="font-semibold text-stone-900 dark:text-stone-200 block mb-0.5">
                                            Copy Code No.
                                        </span>
                                        Find the item you like and copy or write
                                        down the code (e.g.{" "}
                                        <code className="font-mono text-amber-700 dark:text-amber-400 font-semibold">
                                            CLT-101
                                        </code>
                                        ).
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800 flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                                        2
                                    </span>
                                    <div>
                                        <span className="font-semibold text-stone-900 dark:text-stone-200 block mb-0.5">
                                            Message or Call Us
                                        </span>
                                        Tell our store staff the Code No. to
                                        confirm availability, color, or your
                                        exact size.
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800 flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                                        3
                                    </span>
                                    <div>
                                        <span className="font-semibold text-stone-900 dark:text-stone-200 block mb-0.5">
                                            Direct Purchase
                                        </span>
                                        Staff will quickly prepare your item,
                                        complete the sale, and provide your
                                        receipt.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 text-center sm:text-left">
                                You can reopen this guide anytime by clicking{" "}
                                <strong className="font-semibold text-amber-700 dark:text-amber-400">
                                    &quot;How to Order&quot;
                                </strong>{" "}
                                at the top.
                            </span>
                            <button
                                id="btn-dismiss-popup-browse"
                                type="button"
                                onClick={() => handleClosePopup()}
                                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Start Browsing Store</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= COMPACT STORE HEADER BAR (Items immediately visible) ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/70 dark:border-stone-800">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                            Stasia Elegant Fabrique
                        </h1>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/50 dark:border-amber-700/50 font-medium">
                            Store Catalog
                        </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Luxury Fabrics, Ready-to-Wear Fashion & High-Quality
                        Accessories
                    </p>
                </div>

                {/* Reopen How-to-Order Pop-up Trigger */}
                <button
                    id="btn-reopen-ordering-guide"
                    type="button"
                    onClick={() => setIsNoticePopupOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>How to Order with Code No.</span>
                </button>
            </div>

            {/* ================= NEW ARRIVALS SLIDESHOW ================= */}
            {!isLoading && products.length > 0 && (
                <RecentlyAddedSlideshow
                    products={products}
                    onSelectProduct={onSelectProduct}
                />
            )}

            {/* ================= FILTER & SEARCH CONTROLS ================= */}
            <div
                id="catalog-controls"
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6"
            >
                {/* Category Filter Pills (clean labels, no quantity numbers) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                    {availableCategoryList.map((cat) => {
                        const isSelected =
                            selectedCategory.toLowerCase() ===
                            cat.toLowerCase();
                        return (
                            <button
                                key={cat}
                                id={`cat-pill-${cat.toLowerCase()}`}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                                    isSelected
                                        ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-950 shadow-sm font-semibold"
                                        : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800"
                                }`}
                            >
                                <span>{cat}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Sort selector */}
                    <div className="relative shrink-0">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none w-full sm:w-auto pl-8 pr-8 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer shadow-2xs"
                        >
                            <option value="featured">Featured / Newest</option>
                            <option value="price-asc">
                                Price: Low to High
                            </option>
                            <option value="price-desc">
                                Price: High to Low
                            </option>
                            <option value="name">Alphabetical (A-Z)</option>
                        </select>
                        <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Search by Name, Category or Code */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            id="public-catalog-search-input"
                            type="text"
                            placeholder="Search title or Code No. (e.g. CLT-101)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Status (No total store quantity exposed) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400 mb-5">
                <div className="flex items-center gap-2">
                    <span>
                        {searchQuery ? (
                            <>
                                Search results for &quot;
                                <strong className="text-stone-900 dark:text-stone-100">
                                    {searchQuery}
                                </strong>
                                &quot;
                            </>
                        ) : selectedCategory !== "All" ? (
                            <>
                                Showing{" "}
                                <strong className="text-stone-900 dark:text-stone-100">
                                    {selectedCategory}
                                </strong>{" "}
                                collection
                            </>
                        ) : (
                            <>Showing available store collection</>
                        )}
                    </span>
                </div>

                {copiedCode && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-mono text-xs shadow-xs animate-in fade-in">
                        <Check className="w-3.5 h-3.5" />
                        Code <strong className="underline">
                            {copiedCode}
                        </strong>{" "}
                        copied to clipboard!
                    </span>
                )}
            </div>

            {/* ================= PRODUCT GRID (ROW-BY-ROW ON SCROLL) ================= */}
            {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm animate-pulse"
                        >
                            <div className="w-full aspect-[4/5] bg-stone-200 dark:bg-stone-800 rounded-2xl mb-4"></div>
                            <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/3 mb-4"></div>
                            <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div
                    id="no-products-empty-state"
                    className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-12 text-center max-w-md mx-auto my-12 shadow-sm"
                >
                    <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
                        <Tag className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                        No items found
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
                        No pieces match &quot;{searchQuery || selectedCategory}
                        &quot;. Try selecting another category or clearing your
                        search.
                    </p>
                    <button
                        onClick={() => {
                            setSelectedCategory("All");
                            setSearchQuery("");
                        }}
                        className="px-5 py-2.5 bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 rounded-xl text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-400 transition cursor-pointer"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <>
                    <div
                        id="products-grid"
                        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-7"
                    >
                        {displayedProducts.map((product) => {
                            const isLowStock =
                                product.quantityInStock > 0 &&
                                product.quantityInStock < 5;
                            const isOutOfStock = product.quantityInStock <= 0;
                            const primaryImage =
                                product.images.length > 0
                                    ? product.images[0]
                                    : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80";

                            return (
                                <article
                                    key={product.id}
                                    id={`product-card-${product.id}`}
                                    onClick={() => onSelectProduct(product)}
                                    className="group min-w-0 bg-white dark:bg-stone-900/90 rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-stone-800/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-400/80 dark:hover:border-amber-500/60 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                                >
                                    {/* Image Container with Stock & Category Badge */}
                                    <div className="relative w-full aspect-[4/5] bg-stone-100 dark:bg-stone-800 overflow-hidden">
                                        <img
                                            src={primaryImage}
                                            alt={product.title}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                                            loading="lazy"
                                        />

                                        {/* Stock Availability Badge (NO QUANTITY NUMBERS EXPOSED) */}
                                        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                                            {isOutOfStock ? (
                                                <span className="bg-stone-900/90 dark:bg-black/90 backdrop-blur-md text-stone-300 text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wider border border-stone-700">
                                                    Out of Stock
                                                </span>
                                            ) : isLowStock ? (
                                                <span className="bg-amber-600/95 dark:bg-amber-500/95 backdrop-blur-md text-white dark:text-stone-950 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                                                    Limited Stock
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-950/80 dark:bg-emerald-900/80 backdrop-blur-md text-emerald-200 text-[11px] font-medium px-3 py-1 rounded-full border border-emerald-700/50">
                                                    In Stock
                                                </span>
                                            )}
                                        </div>

                                        {/* Category Pill */}
                                        <div className="absolute top-3.5 right-3.5 z-10">
                                            <span className="bg-stone-900/75 dark:bg-black/80 backdrop-blur-md text-stone-100 text-[11px] font-medium px-3 py-1 rounded-full border border-white/10">
                                                {product.category}
                                            </span>
                                        </div>

                                        {/* Quick View overlay on hover */}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white text-xs">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <Eye className="w-4 h-4 text-amber-300" />{" "}
                                                View Details
                                            </span>
                                            <span className="text-amber-300 font-mono text-[11px]">
                                                {product.images.length}{" "}
                                                {product.images.length === 1
                                                    ? "photo"
                                                    : "photos"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-2.5 sm:p-5 flex flex-col flex-1 justify-between">
                                        <div>
                                            {/* Item Title */}
                                            <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-lg group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors line-clamp-2 sm:line-clamp-1 mb-1.5">
                                                {product.title}
                                            </h3>

                                            {/* Unique Reference Code No. */}
                                            <div className="flex min-w-0 items-center justify-between gap-1 py-1.5 px-2 sm:px-2.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/70 dark:border-stone-800/80 mb-3 sm:mb-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 dark:text-stone-500">
                                                        Ref:
                                                    </span>
                                                    <span
                                                        id={`product-codeno-${product.id}`}
                                                        className="text-[10px] sm:text-xs font-mono font-medium text-stone-800 dark:text-stone-200 truncate"
                                                    >
                                                        {product.codeNo}
                                                    </span>
                                                </div>

                                                {/* Quick copy code button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) =>
                                                        handleCopyCode(
                                                            e,
                                                            product.codeNo
                                                        )
                                                    }
                                                    className="inline-flex shrink-0 items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition py-0.5 px-1 rounded cursor-pointer"
                                                    title="Copy Code No. to quote when ordering"
                                                >
                                                    {copiedCode ===
                                                    product.codeNo ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                            <Check className="w-3 h-3" />{" "}
                                                            Copied
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <Copy className="w-3 h-3" />{" "}
                                                            Copy
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price & Action */}
                                        <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                                            <div className="flex items-baseline justify-center gap-2 mb-3">
                                                <span className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest font-sans">
                                                    Price
                                                </span>
                                                <span className="text-base sm:text-lg font-bold text-stone-950 dark:text-stone-50 font-sans tracking-tight">
                                                    {formatPrice(
                                                        product.pricePerUnit
                                                    )}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectProduct(
                                                            product
                                                        );
                                                    }}
                                                    className="min-w-0 px-1.5 sm:px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-[10px] sm:text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                                                >
                                                    <span className="block truncate">
                                                        View & Order
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isOutOfStock}
                                                    onClick={(e) =>
                                                        handleAddToCart(
                                                            e,
                                                            product
                                                        )
                                                    }
                                                    className="min-w-0 px-1.5 sm:px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500 text-stone-950 text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">
                                                        {addedProductId ===
                                                        product.id
                                                            ? "Added"
                                                            : "Add to Cart"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* Sentinel element for infinite scroll */}
                    <div
                        ref={sentinelRef}
                        className="h-6 w-full pointer-events-none"
                    />

                    {/* Row-by-Row Loading State & Manual Load Next Row Button */}
                    {isLoadingMore && (
                        <div className="mt-8">
                            <div className="flex items-center justify-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 mb-6 font-mono">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                                <span>Loading more items...</span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 animate-pulse">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-white dark:bg-stone-900/60 rounded-3xl p-4 border border-stone-200/70 dark:border-stone-800 shadow-xs"
                                    >
                                        <div className="w-full aspect-[4/5] bg-stone-200/70 dark:bg-stone-800 rounded-2xl mb-4"></div>
                                        <div className="h-4 bg-stone-200/70 dark:bg-stone-800 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-stone-200/70 dark:bg-stone-800 rounded w-1/3 mb-4"></div>
                                        <div className="h-5 bg-stone-200/70 dark:bg-stone-800 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Load Next Row Bar (no total quantity exposed) */}
                    {hasMore && !isLoadingMore && (
                        <div className="mt-10 pt-6 border-t border-stone-200/60 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                                Scroll down to see more collection items
                            </span>
                            <button
                                id="btn-load-next-row"
                                type="button"
                                onClick={loadNextRow}
                                className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-400 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-all border border-stone-200 dark:border-stone-700 shadow-xs cursor-pointer flex items-center gap-2"
                            >
                                <span>Load More Items</span>
                            </button>
                        </div>
                    )}

                    {/* All items loaded footer badge (no total count exposed) */}
                    {!hasMore && filteredProducts.length > 0 && (
                        <div className="mt-12 py-8 text-center border-t border-stone-200/60 dark:border-stone-800">
                            <span className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-100/80 dark:bg-stone-900 px-4 py-2 rounded-full border border-stone-200/60 dark:border-stone-800">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>
                                    You have viewed all items in this collection
                                    • Stasia Elegant Fabrique
                                </span>
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
