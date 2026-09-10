"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "../lib/CartContext";
import { formatPrice } from "../lib/api";

export const FloatingCartButton: React.FC = () => {
    const { totalCount, totalAmount, setIsCartOpen } = useCart();

    return (
        <button
            id="btn-floating-cart"
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Open cart with ${totalCount} ${totalCount === 1 ? "item" : "items"}`}
            className="fixed bottom-5 right-4 sm:bottom-7 sm:right-7 z-30 flex items-center gap-2.5 rounded-2xl border border-amber-400/70 bg-stone-950 px-3.5 py-3 text-white shadow-xl shadow-stone-950/20 transition-all hover:-translate-y-0.5 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#faf8f5] dark:border-amber-500/60 dark:bg-amber-500 dark:text-stone-950 dark:shadow-amber-950/30 dark:hover:bg-amber-400 dark:focus:ring-offset-[#0c0c0e]"
        >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/15 dark:bg-stone-950/15">
                <ShoppingBag className="h-5 w-5 text-amber-300 dark:text-stone-950" />
                <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-950 bg-amber-400 px-1 text-[10px] font-bold leading-none text-stone-950 dark:border-amber-500 dark:bg-stone-950 dark:text-amber-300">
                    {totalCount}
                </span>
            </span>
            <span className="pr-0.5 text-left leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                    Cart
                </span>
                <span className="block text-xs font-bold">
                    {formatPrice(totalAmount)}
                </span>
            </span>
        </button>
    );
};