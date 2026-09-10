"use client";

import React from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
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

  const activeOption = options.find((option) => option.mode === theme) ?? options[1];
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (toggleRef.current && !toggleRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      id="theme-toggle-group"
      ref={toggleRef}
      className="relative inline-flex shrink-0"
    >
      <button
        id="theme-select"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Theme: ${activeOption.label}`}
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1.5 rounded-xl border border-stone-300/70 dark:border-stone-700/80 bg-stone-100/90 dark:bg-stone-800/90 px-2.5 py-2 text-amber-700 dark:text-amber-300 shadow-sm transition-colors hover:bg-stone-200 dark:hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
      >
        {activeOption.icon}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-stone-200/90 dark:border-stone-700 bg-white dark:bg-stone-900 p-1.5 shadow-lg shadow-stone-950/15"
        >
          {options.map((option) => {
            const isActive = theme === option.mode;
            return (
              <button
                key={option.mode}
                id={`theme-btn-${option.mode}`}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onThemeChange(option.mode);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <span className={isActive ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500 dark:text-stone-400'}>
                  {option.icon}
                </span>
                <span>{option.label}</span>
                {isActive && <span className="ml-auto text-xs" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
