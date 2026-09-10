"use client";

import React, { useState } from "react";
import {
    X,
    ShoppingBag,
    Plus,
    Minus,
    Trash2,
    Sparkles,
    Copy,
    Check,
    Phone,
    MessageCircle,
    ArrowRight,
    ShieldCheck,
    Tag,
    AlertCircle,
} from "lucide-react";
import { useCart } from "../lib/CartContext";
import { formatPrice } from "../lib/api";

export const CartDrawer: React.FC = () => {
    const {
        cart,
        totalCount,
        totalAmount,
        isCartOpen,
        setIsCartOpen,
        removeFromCart,
        updateQuantity,
        clearCart,
        generatedOrder,
        setGeneratedOrder,
        generateOrderCode,
        isGenerating,
    } = useCart();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerNote, setCustomerNote] = useState("");
    const [copiedCode, setCopiedCode] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isCartOpen) return null;

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
    };

    const handleGenerate = async () => {
        setErrorMessage(null);
        try {
            await generateOrderCode({
                name: customerName,
                phone: customerPhone,
                note: customerNote,
            });
        } catch (err: any) {
            setErrorMessage(
                err.message ||
                    "Failed to generate order code. Please try again."
            );
        }
    };

    const handleClose = () => {
        setIsCartOpen(false);
        // keep generatedOrder or clear if dismissed
    };

    // WhatsApp share link
    const getWhatsAppShareUrl = (
        code: string,
        total: number,
        count: number
    ) => {
        // Replace with the seller's actual WhatsApp phone number in international format (e.g., 2348012345678)
        const SELLER_PHONE_NUMBER = "2348131115714";

        const text = encodeURIComponent(
            `Hello Stasia Elegant Fabrique! I generated an Order Code: *${code}* for ${count} item(s) totaling ${formatPrice(
                total
            )}.\n\nPlease load my order in your store register to confirm availability. Thank you!`
        );

        return `https://wa.me/${SELLER_PHONE_NUMBER}?text=${text}`;
    };

    return (
        <div
            id="cart-drawer-overlay"
            className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex justify-end transition-opacity duration-300"
            onClick={handleClose}
        >
            <div
                id="cart-drawer-panel"
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-stone-900 w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-300 text-stone-900 dark:text-stone-100"
            >
                {/* Header */}
                <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-950/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                                Your Shopping Cart
                            </h3>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                                {totalCount}{" "}
                                {totalCount === 1
                                    ? "item selected"
                                    : "items selected"}
                            </p>
                        </div>
                    </div>

                    <button
                        id="btn-close-cart-drawer"
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-stone-200/60 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center transition cursor-pointer"
                        title="Close cart"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* VIEW A: Generated Order Code Celebratory Screen */}
                    {generatedOrder ? (
                        <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-400/60 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                                <Sparkles className="w-8 h-8" />
                            </div>

                            <div>
                                <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold mb-2">
                                    Order Code Generated Successfully!
                                </span>
                                <h4 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                                    Ready for Seller Processing
                                </h4>
                                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed font-sans">
                                    This code is securely stored in our store
                                    database. Quote or show this code to our
                                    seller to load all your items automatically.
                                </p>
                            </div>

                            {/* Big Order Code Display Card */}
                            <div className="bg-stone-50 dark:bg-stone-950/80 p-5 rounded-3xl border-2 border-amber-300 dark:border-amber-700/80 shadow-md">
                                <span className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-sans block mb-1">
                                    Your Unique Store Order Code
                                </span>
                                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-amber-700 dark:text-amber-300 my-1">
                                    {generatedOrder.code}
                                </div>
                                <div className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-2 flex items-center justify-center gap-2">
                                    <span>
                                        Total:{" "}
                                        <strong>
                                            {formatPrice(
                                                generatedOrder.totalAmount
                                            )}
                                        </strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {generatedOrder.items.length} item types
                                    </span>
                                </div>

                                {/* Copy Button */}
                                <button
                                    id="btn-copy-order-code"
                                    type="button"
                                    onClick={() =>
                                        handleCopyCode(generatedOrder.code)
                                    }
                                    className="mt-4 w-full py-2.5 px-4 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
                                >
                                    {copiedCode ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                                Code Copied to Clipboard!
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <span>Copy Order Code</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Order Items Breakdown */}
                            <div className="text-left bg-stone-50 dark:bg-stone-950/40 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800 space-y-2.5">
                                <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 pb-1 border-b border-stone-200 dark:border-stone-800 flex justify-between">
                                    <span>Saved Items</span>
                                    <span>Qty × Price</span>
                                </div>
                                {generatedOrder.items.map((it, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-xs items-center"
                                    >
                                        <div className="truncate max-w-[210px]">
                                            <span className="font-medium text-stone-800 dark:text-stone-200 block truncate">
                                                {it.title}
                                            </span>
                                            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                                                Code: {it.codeNo}
                                            </span>
                                        </div>
                                        <div className="font-mono text-right text-stone-900 dark:text-stone-100 font-semibold shrink-0">
                                            {it.quantity} ×{" "}
                                            {formatPrice(it.pricePerUnit)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* WhatsApp Share Button */}
                            <a
                                href={getWhatsAppShareUrl(
                                    generatedOrder.code,
                                    generatedOrder.totalAmount,
                                    generatedOrder.items.reduce(
                                        (s, i) => s + i.quantity,
                                        0
                                    )
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span>Share Order via WhatsApp</span>
                            </a>

                            {/* Dismiss / Create New */}
                            <button
                                type="button"
                                onClick={() => {
                                    setGeneratedOrder(null);
                                    setIsCartOpen(false);
                                }}
                                className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-2xl text-xs font-semibold transition cursor-pointer"
                            >
                                Back to Store Catalog
                            </button>
                        </div>
                    ) : cart.length === 0 ? (
                        /* VIEW B: Empty Cart */
                        <div className="text-center py-16 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800/80 text-stone-400 flex items-center justify-center mx-auto">
                                <ShoppingBag className="w-8 h-8 stroke-1" />
                            </div>
                            <h4 className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">
                                Your cart is currently empty
                            </h4>
                            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
                                Explore our luxury fabrics, bespoke clothing,
                                and authentic wrappers in the catalog and click
                                "Add to Cart".
                            </p>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mt-2 px-5 py-2.5 bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-400 text-white dark:text-stone-950 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Explore Collection
                            </button>
                        </div>
                    ) : (
                        /* VIEW C: Active Cart Items & Generation Form */
                        <>
                            {/* Item Cards */}
                            <div className="space-y-3">
                                {cart.map((item) => {
                                    const img =
                                        item.product.images &&
                                        item.product.images.length > 0
                                            ? item.product.images[0]
                                            : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80";

                                    return (
                                        <div
                                            key={item.product.id}
                                            className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3 transition-colors"
                                        >
                                            {/* Image */}
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-700">
                                                <img
                                                    src={img}
                                                    alt={item.product.title}
                                                    referrerPolicy="no-referrer"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                                                    {item.product.title}
                                                </h5>
                                                <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                                                    Code:{" "}
                                                    <strong className="text-stone-700 dark:text-stone-300">
                                                        {item.product.codeNo}
                                                    </strong>
                                                </div>
                                                <div className="text-xs font-bold text-stone-950 dark:text-stone-50 mt-1">
                                                    {formatPrice(
                                                        item.product
                                                            .pricePerUnit
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantity Stepper */}
                                            <div className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.product.id,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-mono font-bold text-stone-900 dark:text-stone-100">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.product.id,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Remove */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeFromCart(
                                                        item.product.id
                                                    )
                                                }
                                                className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Clear Cart link */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="text-[11px] text-stone-400 hover:text-rose-600 transition underline cursor-pointer"
                                >
                                    Clear all items
                                </button>
                            </div>

                            {/* Customer Contact & Notes Box (Optional) */}
                            <div className="bg-stone-50 dark:bg-stone-950/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                                    <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Customer Details (Optional)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Your Name"
                                        value={customerName}
                                        onChange={(e) =>
                                            setCustomerName(e.target.value)
                                        }
                                        className="w-full text-xs px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                    <input
                                        type="tel"
                                        placeholder="WhatsApp / Phone"
                                        value={customerPhone}
                                        onChange={(e) =>
                                            setCustomerPhone(e.target.value)
                                        }
                                        className="w-full text-xs px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Special instructions or notes for the seller..."
                                    value={customerNote}
                                    onChange={(e) =>
                                        setCustomerNote(e.target.value)
                                    }
                                    className="w-full text-xs px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {/* Error Message */}
                            {errorMessage && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer (Total & Generate Button) */}
                {!generatedOrder && cart.length > 0 && (
                    <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3">
                        <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                            <span>Selected Items:</span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                                {totalCount} items
                            </span>
                        </div>

                        <div className="flex justify-between items-baseline pt-1 border-t border-stone-200/60 dark:border-stone-800">
                            <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-200">
                                Total Estimated Price:
                            </span>
                            <span className="font-sans text-xl font-bold text-stone-950 dark:text-stone-50">
                                {formatPrice(totalAmount)}
                            </span>
                        </div>

                        <button
                            id="btn-generate-order-code"
                            type="button"
                            disabled={isGenerating}
                            onClick={handleGenerate}
                            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md transition disabled:opacity-60 cursor-pointer"
                        >
                            {isGenerating ? (
                                <span>Generating Order Code...</span>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-stone-950" />
                                    <span>Generate Order Code for Seller</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <p className="text-[11px] text-center text-stone-500 dark:text-stone-400 leading-tight">
                            Saves your cart and creates a code to give the
                            seller in-store or on WhatsApp.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
