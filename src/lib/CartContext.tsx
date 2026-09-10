"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { Product, CartItem, SavedCart } from "../types";

interface CartContextType {
    cart: CartItem[];
    totalCount: number;
    totalAmount: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
    generatedOrder: SavedCart | null;
    setGeneratedOrder: (order: SavedCart | null) => void;
    generateOrderCode: (customerInfo?: {
        name?: string;
        phone?: string;
        note?: string;
    }) => Promise<SavedCart>;
    isGenerating: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "stasia_public_store_cart_v1";

export const CartProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [generatedOrder, setGeneratedOrder] = useState<SavedCart | null>(
        null
    );
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    // Sync with localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            console.error("Failed to persist cart to localStorage", e);
        }
    }, [cart]);

    const addToCart = (product: Product, quantity: number = 1) => {
        if (quantity <= 0) return;
        setCart((prev) => {
            const existingIndex = prev.findIndex(
                (item) => item.product.id === product.id
            );
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + quantity,
                };
                return updated;
            } else {
                return [...prev, { product, quantity }];
            }
        });
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
    };

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce(
        (sum, item) => sum + item.product.pricePerUnit * item.quantity,
        0
    );

    const generateOrderCode = async (customerInfo?: {
        name?: string;
        phone?: string;
        note?: string;
    }): Promise<SavedCart> => {
        if (cart.length === 0) {
            throw new Error("Your cart is empty");
        }

        setIsGenerating(true);
        try {
            const payload = {
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                })),
                totalAmount,
                customerName: customerInfo?.name || "",
                customerPhone: customerInfo?.phone || "",
                customerNote: customerInfo?.note || "",
            };

            const res = await fetch("/api/saved-carts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to generate order code");
            }

            setGeneratedOrder(data.cart);
            // Optional: keep items or clear cart; we can clear cart after code is generated
            clearCart();
            return data.cart;
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                totalCount,
                totalAmount,
                isCartOpen,
                setIsCartOpen,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                generatedOrder,
                setGeneratedOrder,
                generateOrderCode,
                isGenerating,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
