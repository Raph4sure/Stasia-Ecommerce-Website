"use client";

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-9 h-9 sm:w-12 sm:h-12',
    lg: 'w-12 h-12 sm:w-16 sm:h-16',
  }[size];

  const titleSize = {
    sm: 'text-xs sm:text-base',
    md: 'text-xs sm:text-xl',
    lg: 'text-xl sm:text-3xl',
  }[size];

  const subtitleSize = {
    sm: 'text-[9px]',
    md: 'text-[9px] sm:text-[11px]',
    lg: 'text-[11px] sm:text-sm',
  }[size];

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* Luxury Brand Crest / Emblem */}
      <div className={`relative ${iconDimensions} shrink-0`}>
        {/* Glow backdrop in dark mode */}
        <div className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-400/25 blur-sm" />

        {/* SVG Luxury Crest Seal */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Rich Gold Gradient */}
            <linearGradient id="stasiaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="30%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            {/* Dark Shield Base Gradient */}
            <linearGradient id="stasiaShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C1917" />
              <stop offset="100%" stopColor="#0C0A09" />
            </linearGradient>

            {/* Metallic Gold Accent Ring */}
            <linearGradient id="stasiaAccentRing" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Elegant Octagonal / Scalloped Crest Shield */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="22"
            fill="url(#stasiaShieldBg)"
            stroke="url(#stasiaGoldGrad)"
            strokeWidth="2.5"
          />

          {/* Inner Golden Border Line */}
          <rect
            x="11"
            y="11"
            width="78"
            height="78"
            rx="18"
            fill="none"
            stroke="url(#stasiaAccentRing)"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.8"
          />

          {/* Top Crown / Tiara Accent */}
          <path
            d="M38 27 L42 33 L50 24 L58 33 L62 27 L60 36 L40 36 Z"
            fill="url(#stasiaGoldGrad)"
          />
          {/* Crown Jewels */}
          <circle cx="38" cy="25" r="1.5" fill="#FEF3C7" />
          <circle cx="50" cy="22" r="2" fill="#FEF3C7" />
          <circle cx="62" cy="25" r="1.5" fill="#FEF3C7" />

          {/* Golden Tailor's Needle angled behind monogram */}
          <path
            d="M26 74 L74 26"
            stroke="url(#stasiaGoldGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Eye of the needle */}
          <ellipse
            cx="71"
            cy="29"
            rx="1.2"
            ry="3.5"
            transform="rotate(45 71 29)"
            fill="#0C0A09"
            stroke="url(#stasiaGoldGrad)"
            strokeWidth="0.8"
          />

          {/* Flowing Golden Ribbon Thread */}
          <path
            d="M72 28 C78 22, 82 32, 75 39 C68 46, 62 40, 68 34"
            fill="none"
            stroke="url(#stasiaAccentRing)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Master Monogram 'S' with High-End Serif Flourish */}
          <path
            d="M62 43 C60 40, 56 38, 50 38 C42 38, 37 42, 37 47 C37 53, 42 55, 48 57 C56 59, 63 62, 63 69 C63 76, 56 81, 47 81 C39 81, 34 76, 33 71 L40 69 C41 73, 44 75, 48 75 C53 75, 56 73, 56 68 C56 64, 52 62, 46 60 C38 58, 30 55, 30 47 C30 40, 37 33, 49 33 C57 33, 63 37, 65 42 Z"
            fill="url(#stasiaGoldGrad)"
          />

          {/* Bottom Star Accent */}
          <polygon
            points="50,86 52,90 56,90 53,92 54,96 50,93 46,96 47,92 44,90 48,90"
            fill="url(#stasiaGoldGrad)"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-serif tracking-wider font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors whitespace-nowrap ${titleSize}`}
          >
            <span className="hidden sm:inline">Stasia </span>Elegant Fabrique
          </span>
        </div>

        {showSubtitle && (
          <div className="hidden md:flex items-center gap-1.5 mt-0.5">
            <span
              className={`font-mono uppercase tracking-[0.2em] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap ${subtitleSize}`}
            >
              Luxury Fabrics & Fashion Wears
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
