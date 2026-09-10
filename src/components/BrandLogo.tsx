"use client";

import React from "react";

interface BrandLogoProps {
    size?: "sm" | "md" | "lg";
    showSubtitle?: boolean;
    className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
    size = "md",
    showSubtitle = true,
    className = "",
}) => {
    const iconDimensions = {
        sm: "w-8 h-8 sm:w-9 sm:h-9",
        md: "w-9 h-9 sm:w-12 sm:h-12",
        lg: "w-12 h-12 sm:w-16 sm:h-16",
    }[size];

    const titleSize = {
        sm: "text-xs sm:text-base",
        md: "text-xs sm:text-xl",
        lg: "text-xl sm:text-3xl",
    }[size];

    const subtitleSize = {
        sm: "text-[9px]",
        md: "text-[9px] sm:text-[11px]",
        lg: "text-[11px] sm:text-sm",
    }[size];

    return (
        <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
            {/* Luxury Brand Crest / Emblem */}
            <div className={`relative ${iconDimensions} shrink-0`}>
                {/* Glow backdrop in dark mode */}
                <div className="" />
                {/* <div className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-400/25 blur-sm" /> */}

                {/* SVG Luxury Crest Seal */}
                <img
                    src="stasia_logo2.png"
                    alt="Product Logo"
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Brand Typography */}
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                    <span
                        className={`font-serif tracking-wider font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors whitespace-nowrap ${titleSize}`}
                    >
                        <span className="hidden sm:inline">
                            Stasia Elegant Fabric
                        </span>
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
