"use client";

import React, { useState } from "react";
import {
    X,
    Copy,
    Check,
    Phone,
    ShieldCheck,
    Tag,
    Info,
    AlertTriangle,
    Sparkles,
    ShoppingBag,
} from "lucide-react";
import { Product } from "../types";
import { formatPrice } from "../lib/api";
import { useCart } from "../lib/CartContext";

interface ProductDetailModalProps {
    product: Product | null;
    onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
    product,
    onClose,
}) => {
    const { addToCart, setIsCartOpen } = useCart();

    if (!product) return null;

    const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
    const [copied, setCopied] = useState<boolean>(false);

    const images =
        product.images && product.images.length > 0
            ? product.images
            : [
                  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80",
              ];

    const handleCopyCode = () => {
        navigator.clipboard.writeText(product.codeNo);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isLowStock =
        product.quantityInStock > 0 && product.quantityInStock < 5;
    const isOutOfStock = product.quantityInStock <= 0;

    return (
        <div
            id="product-detail-modal-overlay"
            className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                id="product-detail-modal-card"
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl max-w-3xl w-full min-w-0 my-2 sm:my-0 overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-200 relative text-stone-900 dark:text-stone-100"
            >
                {/* Close Button */}
                <button
                    id="btn-close-modal"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-stone-900/60 hover:bg-stone-900 text-white flex items-center justify-center backdrop-blur-sm transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Gallery Column */}
                    <div className="min-w-0 p-3 sm:p-6 bg-stone-50 dark:bg-stone-950/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800">
                        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-800 mb-4 shadow-inner">
                            <img
                                src={images[activeImageIndex] || images[0]}
                                alt={product.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3.5 left-3.5">
                                <span className="bg-stone-900/80 backdrop-blur-md text-stone-100 text-xs px-3 py-1 rounded-full font-medium">
                                    {product.category}
                                </span>
                            </div>
                        </div>

                        {/* Thumbnail selector if multiple images */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                                            activeImageIndex === idx
                                                ? "border-amber-500 scale-105 shadow-xs"
                                                : "border-transparent opacity-60 hover:opacity-100"
                                        }`}
                                    >
                                        <img
                                            src={img}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details Column */}
                    <div className="min-w-0 p-4 sm:p-8 flex flex-col justify-between">
                        <div>
                            {/* Category & Status */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <span className="max-w-full truncate text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 sm:px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 font-semibold">
                                    {product.category}
                                </span>
                                {isOutOfStock ? (
                                    <span className="text-xs font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full">
                                        Out of Stock
                                    </span>
                                ) : isLowStock ? (
                                    <span className="max-w-full text-[10px] sm:text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 sm:px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />{" "}
                                        Limited Stock Available
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                                        In Stock - Available for Order
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 mb-3 leading-snug">
                                {product.title}
                            </h2>

                            {/* Unique Code No. Box */}
                            <div className="bg-stone-100 dark:bg-stone-950/80 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800 mb-6 flex items-center justify-between gap-2 min-w-0">
                                <div className="min-w-0">
                                    <div className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest font-sans">
                                        Item Reference
                                    </div>
                                    <div className="text-xs sm:text-sm font-mono text-stone-700 dark:text-stone-300 truncate">
                                        Code No.{" "}
                                        <strong className="text-stone-950 dark:text-stone-100 font-bold">
                                            {product.codeNo}
                                        </strong>
                                    </div>
                                </div>
                                <button
                                    id="btn-copy-code-modal"
                                    onClick={handleCopyCode}
                                    className="shrink-0 flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-[10px] sm:text-xs font-medium shadow-2xs transition cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                                Copied
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                            <span>Copy Code</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Price */}
                            <div className="mb-6">
                                <span className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-sans block mb-1">
                                    Price
                                </span>
                                <span className="text-3xl font-bold font-sans text-stone-950 dark:text-stone-50">
                                    {formatPrice(product.pricePerUnit)}
                                </span>
                            </div>

                            {/* Ordering Instructions */}
                            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 text-xs text-stone-700 dark:text-stone-300 mb-6 space-y-2">
                                <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    How to Order This Item
                                </div>
                                <p className="leading-relaxed">
                                    To order or ask questions about this item,
                                    quote Code No.{" "}
                                    <strong className="font-mono text-stone-950 dark:text-stone-100 font-bold">
                                        {product.codeNo}
                                    </strong>{" "}
                                    to our store staff on WhatsApp, phone call,
                                    or when you visit our store. Staff will
                                    confirm availability and prepare your order
                                    immediately.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800">
                            <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => {
                                    addToCart(product);
                                    onClose();
                                    setIsCartOpen(true);
                                }}
                                className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-amber-300 disabled:text-stone-500 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>
                                    {isOutOfStock
                                        ? "Out of Stock"
                                        : "Add to Cart"}
                                </span>
                            </button>
                            <a
                                href={`mailto:orders@stasiafabrique.com?subject=Inquiry%20for%20Item%20${encodeURIComponent(
                                    product.codeNo
                                )}%20-%20${encodeURIComponent(
                                    product.title
                                )}&body=Hello%20Stasia%20Elegant%20Fabrique,%0A%0AI%20would%20like%20to%20order%20or%20inquire%20about%20item%20code:%20${encodeURIComponent(
                                    product.codeNo
                                )}%20(${encodeURIComponent(
                                    product.title
                                )})%20priced%20at%20${encodeURIComponent(
                                    formatPrice(product.pricePerUnit)
                                )}.`}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-2xl text-center text-sm flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                <Phone className="w-4 h-4" />
                                <span>
                                    Contact Store to Order (Code:{" "}
                                    {product.codeNo})
                                </span>
                            </a>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-2xl text-xs font-semibold transition cursor-pointer"
                            >
                                Back to Store Catalog
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
