"use client";

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { ThemeMode } from '../lib/theme';

interface ThemeToggleProps {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: ThemeMode) => void;
  variant?: 'header' | 'floating' | 'compact';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  resolvedTheme,
  onThemeChange,
  variant = 'header',
}) => {
  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'light',
      label: 'Light',
      icon: <Sun className="w-3.5 h-3.5" />,
    },
    {
      mode: 'system',
      label: 'Auto',
      icon: <Laptop className="w-3.5 h-3.5" />,
    },
    {
      mode: 'dark',
      label: 'Dark',
      icon: <Moon className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div
      id="theme-toggle-group"
      className="inline-flex items-center p-0.5 rounded-full bg-stone-200/70 dark:bg-stone-800/80 border border-stone-300/60 dark:border-stone-700/80 backdrop-blur-sm shadow-inner transition-colors"
      role="radiogroup"
      aria-label="Theme selector"
    >
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            id={`theme-btn-${opt.mode}`}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onThemeChange(opt.mode)}
            title={`Switch to ${opt.label} mode ${opt.mode === 'system' ? '(follows device settings)' : ''}`}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
