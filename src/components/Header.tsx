"use client";

import React from 'react';
import { ShieldCheck, LogOut, PhoneCall, Store, ShoppingBag } from 'lucide-react';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { ThemeMode } from '../lib/theme';
import { BrandLogo } from './BrandLogo';
import { useCart } from '../lib/CartContext';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenInquiryGuide: () => void;
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  currentUser,
  onLogout,
  onOpenInquiryGuide,
  theme,
  resolvedTheme,
  onThemeChange,
}) => {
  const isPrivate = currentPath.startsWith('/private');
  const { totalCount, setIsCartOpen } = useCart();

  return (
    <header
      id="boutique-header"
      className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 text-stone-900 dark:text-stone-100 border-b border-stone-200/80 dark:border-stone-800/80 shadow-xs backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-2 min-w-0">
          {/* Brand Logo & Name */}
          <button
            id="header-brand-button"
            onClick={() => onNavigate('/')}
            className="text-left group focus:outline-none cursor-pointer shrink-0 min-w-0"
            title="Go to Home"
          >
            <BrandLogo size="md" showSubtitle={true} />
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Theme Switcher Toggle */}
            <ThemeToggle
              theme={theme}
              resolvedTheme={resolvedTheme}
              onThemeChange={onThemeChange}
            />

            {/* Shopping Cart Button */}
            <button
              id="btn-header-cart"
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
              title="View Cart & Generate Order Code"
            >
              <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {totalCount > 0 ? (
                <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight shadow-xs">
                  {totalCount}
                </span>
              ) : null}
            </button>

            {/* Customer Reference Info button */}
            {!isPrivate && (
              <button
                id="btn-inquiry-guide"
                onClick={onOpenInquiryGuide}
                className="hidden md:flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-300 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700/80 bg-stone-50 dark:bg-stone-900/60 hover:border-amber-400/60 transition-colors shadow-2xs cursor-pointer"
                title="How to order using item code number"
              >
                <PhoneCall className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium whitespace-nowrap">How to Order</span>
              </button>
            )}

            {/* Switch between Public Store & Private Portal */}
            {isPrivate ? (
              <button
                id="btn-nav-public"
                onClick={() => onNavigate('/')}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer whitespace-nowrap"
              >
                <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Browse Store</span>
                <span className="sm:hidden text-xs">Store</span>
              </button>
            ) : (
              <button
                id="btn-nav-private"
                onClick={() => onNavigate('/private')}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-stone-950" />
                <span className="hidden sm:inline">Staff Portal</span>
                <span className="sm:hidden text-xs">Staff</span>
              </button>
            )}

            {/* User session status if in private or logged in */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-stone-200 dark:border-stone-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate max-w-[130px]">
                    {currentUser.email}
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
                    {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales Staff'}
                  </div>
                </div>
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Sign out of staff portal"
                  className="p-1.5 sm:p-2 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
