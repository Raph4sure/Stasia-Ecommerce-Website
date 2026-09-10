"use client";

import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'stasia_theme_preference';

export function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === 'light' || val === 'dark' || val === 'system') {
    return val;
  }
  return 'system';
}

export function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';

  const isDark = mode === 'dark' || (mode === 'system' && getSystemIsDark());
  const root = document.documentElement;

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  return isDark ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Sync to document element and listen for system color scheme changes
  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);

    // If using system, attach listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const updated = applyTheme('system');
        setResolvedTheme(updated);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage error
    }
    setThemeState(newTheme);
    const resolved = applyTheme(newTheme);
    setResolvedTheme(resolved);
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
