import { Product, Sale, User } from "../types";

const TOKEN_KEY = "boutique_auth_token";
const USER_KEY = "boutique_user";

export function getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export function setStoredSession(token: string, user: User) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function formatPrice(cents: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
    }).format(cents / 100);
}

export function formatDateTime(isoString: string): string {
    try {
        const d = new Date(isoString);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return isoString;
    }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getStoredToken();
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            if (res.status === 401) {
                clearStoredSession();
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("boutique:unauthorized")
                    );
                }
            }
            let errorMsg = `Request failed (${res.status})`;
            try {
                const json = await res.json();
                if (json.error) errorMsg = json.error;
            } catch {
                // fallback to status text
            }
            throw new Error(errorMsg);
        }
        return res.json();
    } catch (err: any) {
        if (
            err.name === "TypeError" &&
            typeof err.message === "string" &&
            err.message.toLowerCase().includes("fetch")
        ) {
            throw new Error(
                "Network connection error: Unable to communicate with the server. Please check your network or try again."
            );
        }
        throw err;
    }
}
