"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PublicCatalog } from './components/PublicCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { LoginView } from './components/LoginView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AdminPosDashboard } from './components/AdminPosDashboard';
import { InquiryGuideModal } from './components/InquiryGuideModal';
import { CartDrawer } from './components/CartDrawer';
import { CartProvider } from './lib/CartContext';
import { Product, Sale, User } from './types';
import { useTheme } from './lib/theme';
import {
  getStoredToken,
  getStoredUser,
  clearStoredSession,
  fetchWithAuth,
} from './lib/api';

export default function App() {
  // Theme state (system by default, with manual override)
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Navigation path state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  });

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ category: string; isAvailable: boolean }[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    totalRevenue: 0,
    totalUnitsSold: 0,
    transactionsCount: 0,
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isInquiryGuideOpen, setIsInquiryGuideOpen] = useState<boolean>(false);

  // View toggle for Super Admin (between inventory console and POS terminal)
  const [superAdminShowPos, setSuperAdminShowPos] = useState<boolean>(false);

  // Listen to popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Safe navigation function
  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Verify auth session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await fetchWithAuth('/api/auth/me');
        if (res.user) {
          setCurrentUser(res.user);
        } else {
          clearStoredSession();
          setCurrentUser(null);
        }
      } catch {
        clearStoredSession();
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifyAuth();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('boutique:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('boutique:unauthorized', handleUnauthorized);
  }, []);

  // Fetch products & categories data
  const loadData = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      // Determine if we should query public or full inventory
      const token = getStoredToken();
      const isPrivateLoggedIn = currentPath.startsWith('/private') && currentUser && Boolean(token);
      const productEndpoint = isPrivateLoggedIn ? '/api/products' : '/api/products?public=true';

      const [prodsData, catsData] = await Promise.all([
        fetch(productEndpoint).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/categories').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);

      setProducts(prodsData || []);
      setCategories(catsData || []);

      // If logged into private, also fetch sales summary
      if (isPrivateLoggedIn) {
        try {
          const salesData = await fetchWithAuth('/api/sales');
          setSales(salesData.sales || []);
          setSalesSummary(
            salesData.summary || { totalRevenue: 0, totalUnitsSold: 0, transactionsCount: 0 }
          );
        } catch (err: any) {
          console.warn('Sales data sync:', err.message);
        }
      }
    } catch (err) {
      console.error('Failed to load catalog data:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [currentPath, currentUser]);

  useEffect(() => {
    // Only load after auth verification completes to avoid unauthorized race conditions
    if (!isAuthChecking) {
      loadData();
    }
  }, [loadData, isAuthChecking]);

  // Handle Login success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    navigate('/private');
    loadData();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearStoredSession();
    setCurrentUser(null);
    setSuperAdminShowPos(false);
    navigate('/');
    loadData();
  };

  const isPrivate = currentPath.startsWith('/private');

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-[#faf8f5] dark:bg-[#0c0c0e] text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
        {/* Global Header */}
        <Header
          currentPath={currentPath}
          onNavigate={navigate}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenInquiryGuide={() => setIsInquiryGuideOpen(true)}
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
        />

      {/* Main Content Body */}
      <main className="flex-1">
        {isPrivate ? (
          // ================= /private PROTECTED ROUTE =================
          isAuthChecking ? (
            <div className="min-h-[60vh] flex items-center justify-center text-xs text-stone-400">
              Verifying credentials...
            </div>
          ) : !currentUser ? (
            // User not authenticated -> Show Login View
            <LoginView
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => navigate('/')}
            />
          ) : currentUser.role === 'SUPER_ADMIN' ? (
            // Super Admin Logged In
            superAdminShowPos ? (
              <AdminPosDashboard
                currentUser={currentUser}
                products={products}
                onRefreshData={loadData}
                onSwitchToSuperAdmin={() => setSuperAdminShowPos(false)}
              />
            ) : (
              <SuperAdminDashboard
                currentUser={currentUser}
                products={products}
                categories={categories}
                sales={sales}
                salesSummary={salesSummary}
                onRefreshData={loadData}
                onSwitchToPos={() => setSuperAdminShowPos(true)}
              />
            )
          ) : (
            // Admin (Sales Staff) Logged In -> Dedicated POS & Restricted Sales
            <AdminPosDashboard
              currentUser={currentUser}
              products={products}
              onRefreshData={loadData}
            />
          )
        ) : (
          // ================= PUBLIC E-COMMERCE FRONTEND =================
          <PublicCatalog
            products={products}
            categories={categories}
            isLoading={isLoadingProducts}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onOpenInquiryGuide={() => setIsInquiryGuideOpen(true)}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Inquiry Guide Modal */}
      <InquiryGuideModal
        isOpen={isInquiryGuideOpen}
        onClose={() => setIsInquiryGuideOpen(false)}
      />

      {/* Shopping Cart Drawer / Modal */}
      <CartDrawer />

      {/* Global Minimalist Boutique Footer */}
      <footer className="bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 text-xs border-t border-stone-200 dark:border-stone-800 py-8 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 dark:text-stone-200 tracking-wider">
              STASIA ELEGANT FABRIQUE
            </span>
            <span>•</span>
            <span>Luxury Fabrics, Quality Clothing & Accessories</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500 text-[11px]">
            <span>Store & Inventory Management</span>
            <span>•</span>
            <button
              onClick={() => navigate(isPrivate ? '/' : '/private')}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition underline underline-offset-4 cursor-pointer"
            >
              {isPrivate ? 'Store Catalog' : 'Staff Portal (/private)'}
            </button>
          </div>
        </div>
      </footer>
    </div>
    </CartProvider>
  );
}
