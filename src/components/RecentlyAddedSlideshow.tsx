import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Clock,
    Copy,
    Check,
    Eye,
    Pause,
    Play,
    Layers,
} from "lucide-react";
import { Product } from "../types";
import { formatPrice } from "../lib/api";

interface RecentlyAddedSlideshowProps {
    products: Product[];
    onSelectProduct: (product: Product) => void;
}

function formatAddedDate(dateString?: string): string {
    if (!dateString) return "Recently added";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Recently added";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Added just now";
    if (diffHours < 24) return `Added ${diffHours}h ago`;
    if (diffDays === 1) return "Added yesterday";
    if (diffDays < 7) return `Added ${diffDays} days ago`;

    return `Added ${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })}`;
}

const AUTO_SLIDE_DURATION = 2000; // 2 seconds per slide

export const RecentlyAddedSlideshow: React.FC<RecentlyAddedSlideshowProps> = ({
    products,
    onSelectProduct,
}) => {
    // Sort items strictly by newest added date first (createdAt descending, fallback to id descending)
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
                return timeB - timeA;
            }
            return b.id - a.id;
        });
    }, [products]);

    const total = sortedProducts.length;
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    // Bounds safety
    useEffect(() => {
        if (currentIndex >= total && total > 0) {
            setCurrentIndex(0);
        }
    }, [total, currentIndex]);

    const goToNext = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev + 1) % total);
    }, [total]);

    const goToPrev = useCallback(() => {
        if (total <= 1) return;
        setCurrentIndex((prev) => (prev - 1 + total) % total);
    }, [total]);

    const goToIndex = (index: number) => {
        setCurrentIndex(index);
    };

    // Auto-slide effect based on newest added
    useEffect(() => {
        if (!isPlaying || isHovered || total <= 1) return;

        const timer = setInterval(() => {
            goToNext();
        }, AUTO_SLIDE_DURATION);

        return () => clearInterval(timer);
    }, [isPlaying, isHovered, total, goToNext]);

    // Touch gesture support
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 45) {
            if (diff > 0) {
                goToNext();
            } else {
                goToPrev();
            }
        }
        setTouchStartX(null);
    };

    const handleCopyCode = (e: React.MouseEvent, codeNo: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(codeNo);
        setCopiedCode(codeNo);
        setTimeout(() => setCopiedCode(null), 2500);
    };

    if (total === 0) return null;

    const currentItem = sortedProducts[currentIndex] || sortedProducts[0];
    const isLowStock =
        currentItem.quantityInStock > 0 && currentItem.quantityInStock < 5;
    const isOutOfStock = currentItem.quantityInStock <= 0;

    return (
        <section
            id="coverflow-slideshow"
            aria-label="New Arrivals Showcase"
            className="relative w-full mb-12 select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top Header Row with Badge and Controls */}
            <div className="flex items-center justify-between px-2 sm:px-4 mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium tracking-wide bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold">
                            New Arrivals Showcase
                        </span>
                    </div>

                    <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-sans">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Latest designs first</span>
                    </span>
                </div>

                {/* Counter & Play/Pause controls (No total inventory number exposed) */}
                <div className="flex items-center gap-2">
                    <div className="text-xs text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800/70 border border-stone-200/70 dark:border-stone-700/60 font-sans font-medium">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                            Item {currentIndex + 1}
                        </span>
                    </div>

                    <button
                        type="button"
                        id="coverflow-toggle-play"
                        onClick={() => setIsPlaying(!isPlaying)}
                        aria-label={
                            isPlaying ? "Pause auto-slide" : "Play auto-slide"
                        }
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition cursor-pointer border border-stone-200/70 dark:border-stone-700/60"
                        title={
                            isPlaying ? "Pause slideshow" : "Resume slideshow"
                        }
                    >
                        {isPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                        ) : (
                            <Play className="w-3.5 h-3.5 text-amber-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* 3D Cover Flow Stage Area (Center, Left Previous, Right Next) */}
            <div className="relative w-full h-[280px] sm:h-[380px] md:h-[460px] lg:h-[500px] flex items-center justify-center overflow-hidden py-4">
                {/* Left Arrow Nav Button */}
                <button
                    type="button"
                    id="coverflow-prev-btn"
                    onClick={goToPrev}
                    aria-label="Previous item"
                    className="absolute left-2 sm:left-4 md:left-8 z-40 p-2.5 sm:p-3.5 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-stone-100 shadow-xl border border-stone-200/80 dark:border-stone-700/80 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-500 dark:hover:text-stone-950 transition-all hover:scale-110 cursor-pointer backdrop-blur-md"
                    title="Previous newest piece"
                >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Right Arrow Nav Button */}
                <button
                    type="button"
                    id="coverflow-next-btn"
                    onClick={goToNext}
                    aria-label="Next item"
                    className="absolute right-2 sm:right-4 md:right-8 z-40 p-2.5 sm:p-3.5 rounded-full bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-stone-100 shadow-xl border border-stone-200/80 dark:border-stone-700/80 hover:bg-amber-500 hover:text-stone-950 dark:hover:bg-amber-500 dark:hover:text-stone-950 transition-all hover:scale-110 cursor-pointer backdrop-blur-md"
                    title="Next piece"
                >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Product Cards Stack (Cover Flow layout) */}
                <div className="relative w-full h-full flex items-center justify-center perspective-[1200px]">
                    {sortedProducts.map((product, index) => {
                        // Calculate wrapped offset relative to currentIndex
                        let offset = index - currentIndex;
                        while (offset > total / 2) offset -= total;
                        while (offset < -total / 2) offset += total;

                        const isCenter = offset === 0;
                        const isLeft = offset === -1;
                        const isRight = offset === 1;
                        const isFarLeft = offset === -2;
                        const isFarRight = offset === 2;
                        const isVisible = Math.abs(offset) <= 2;

                        if (!isVisible) return null;

                        const primaryImage =
                            product.images && product.images.length > 0
                                ? product.images[0]
                                : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80";

                        // Positioning styles matching the Cover Flow in the uploaded reference photo
                        let transformClass = "";
                        let zIndexClass = "";
                        let opacityClass = "";
                        let shadowClass = "";

                        if (isCenter) {
                            // Main centered card: biggest, elevated, clear focus
                            transformClass = "translate-x-0 scale-100";
                            zIndexClass = "z-30";
                            opacityClass = "opacity-100";
                            shadowClass =
                                "shadow-2xl ring-1 ring-black/5 dark:ring-white/10";
                        } else if (isLeft) {
                            // Previous card on the left side: scaled down, tucked behind
                            transformClass =
                                "-translate-x-[52%] sm:-translate-x-[58%] md:-translate-x-[62%] lg:-translate-x-[66%] scale-[0.84] sm:scale-[0.86]";
                            zIndexClass = "z-20";
                            opacityClass = "opacity-70 hover:opacity-90";
                            shadowClass = "shadow-xl";
                        } else if (isRight) {
                            // Upcoming new card on the right side: scaled down, tucked behind
                            transformClass =
                                "translate-x-[52%] sm:translate-x-[58%] md:translate-x-[62%] lg:translate-x-[66%] scale-[0.84] sm:scale-[0.86]";
                            zIndexClass = "z-20";
                            opacityClass = "opacity-70 hover:opacity-90";
                            shadowClass = "shadow-xl";
                        } else if (isFarLeft) {
                            // Far left preview (if total items >= 5)
                            transformClass =
                                "-translate-x-[92%] sm:-translate-x-[102%] md:-translate-x-[112%] scale-[0.70]";
                            zIndexClass = "z-10";
                            opacityClass =
                                "opacity-35 hover:opacity-60 hidden sm:block";
                            shadowClass = "shadow-md";
                        } else if (isFarRight) {
                            // Far right preview (if total items >= 5)
                            transformClass =
                                "translate-x-[92%] sm:translate-x-[102%] md:translate-x-[112%] scale-[0.70]";
                            zIndexClass = "z-10";
                            opacityClass =
                                "opacity-35 hover:opacity-60 hidden sm:block";
                            shadowClass = "shadow-md";
                        }

                        return (
                            <div
                                key={product.id}
                                id={`coverflow-card-${product.id}`}
                                onClick={() => onSelectProduct(product)}
                                className={`absolute w-[82vw] sm:w-[520px] md:w-[620px] lg:w-[700px] h-[240px] sm:h-[340px] md:h-[420px] lg:h-[460px] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ease-out origin-center bg-stone-100 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 ${transformClass} ${zIndexClass} ${opacityClass} ${shadowClass} group`}
                                title={`Click to view details for ${product.title}`}
                            >
                                {/* Product Image showcasing creation */}
                                <img
                                    src={primaryImage}
                                    alt={product.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                                    loading="lazy"
                                />

                                {/* Subtle dark gradient overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/25 pointer-events-none" />

                                {/* Top Badges: Category & Date Added */}
                                <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10 pointer-events-none">
                                    <span className="bg-stone-900/80 dark:bg-black/80 backdrop-blur-md text-amber-300 text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/30 shadow-xs">
                                        {product.category}
                                    </span>

                                    <span className="bg-stone-900/80 dark:bg-black/80 backdrop-blur-md text-stone-200 text-[10px] sm:text-[11px] font-mono px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>
                                            {formatAddedDate(product.createdAt)}
                                        </span>
                                    </span>
                                </div>

                                {/* Center Item Special Overlay */}
                                {isCenter ? (
                                    <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-lg transition-all transform group-hover:scale-105">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Click Picture for Details</span>
                                    </div>
                                ) : (
                                    <div className="absolute bottom-3.5 right-3.5 z-10 hidden sm:flex items-center gap-1 bg-stone-900/80 text-stone-200 text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                                        <Eye className="w-3 h-3 text-amber-400" />
                                        <span>View item</span>
                                    </div>
                                )}

                                {/* Multi-photo indicator if present */}
                                {product.images &&
                                    product.images.length > 1 && (
                                        <div className="absolute bottom-3.5 left-3.5 z-10 flex items-center gap-1 bg-stone-900/80 text-white text-[10px] sm:text-[11px] font-mono px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
                                            <Layers className="w-3 h-3 text-amber-300" />
                                            <span>
                                                {product.images.length} photos
                                            </span>
                                        </div>
                                    )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Center Item Title & Details Caption (Underneath Center Card, matching reference image) */}
            <div className="mt-3 sm:mt-5 text-center px-4 max-w-2xl mx-auto flex flex-col items-center">
                {/* Main Title of the center item */}
                <button
                    type="button"
                    onClick={() => onSelectProduct(currentItem)}
                    className="group inline-block cursor-pointer focus:outline-hidden"
                    title="Click to view item details"
                >
                    <h2 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl text-stone-900 dark:text-stone-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                        {currentItem.title}
                    </h2>
                </button>

                {/* Subtitle / Attributes Row */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-2.5 text-xs font-sans">
                    {/* Atelier Price */}
                    <span className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-400 font-sans">
                        {formatPrice(currentItem.pricePerUnit)}
                    </span>

                    <span className="text-stone-300 dark:text-stone-700">
                        •
                    </span>

                    {/* Reference Code with Copy button */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-mono text-xs">
                        <span className="text-stone-400 text-[10px] uppercase">
                            Ref:
                        </span>
                        <span className="font-bold">{currentItem.codeNo}</span>
                        <button
                            type="button"
                            onClick={(e) =>
                                handleCopyCode(e, currentItem.codeNo)
                            }
                            className="ml-0.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
                            title="Copy Code No."
                        >
                            {copiedCode === currentItem.codeNo ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )}
                        </button>
                    </div>

                    <span className="text-stone-300 dark:text-stone-700">
                        •
                    </span>

                    {/* Stock status (no quantity numbers shown) */}
                    {isOutOfStock ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                            Out of Stock
                        </span>
                    ) : isLowStock ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            Limited Stock Available
                        </span>
                    ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            In Stock
                        </span>
                    )}
                </div>

                {/* Direct Call to Action button */}
                <div className="mt-3.5 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        id="coverflow-inquire-btn"
                        onClick={() => onSelectProduct(currentItem)}
                        className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-stone-100 dark:text-stone-950 text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                        <Eye className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                        <span>View Item Details & How to Order</span>
                    </button>
                </div>

                {/* Carousel Dot Indicators */}
                {total > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-5 flex-wrap max-w-md">
                        {sortedProducts.map((p, idx) => {
                            const isCurrent = idx === currentIndex;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => goToIndex(idx)}
                                    aria-label={`Slide to piece ${idx + 1}: ${
                                        p.title
                                    }`}
                                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                                        isCurrent
                                            ? "w-6 h-2 bg-amber-500 dark:bg-amber-400"
                                            : "w-2 h-2 bg-stone-300 hover:bg-stone-400 dark:bg-stone-700 dark:hover:bg-stone-600"
                                    }`}
                                    title={`${p.title} (${p.codeNo})`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};
