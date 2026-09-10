import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stasia Elegant Fabrique - Luxury Fabrics & Fashion Wears",
  description: "Luxury fabrics, clothing, wrappers, and accessories boutique store.",
  icons: {
    icon: "/stasia_logo.png",
    shortcut: "/stasia_logo.png",
    apple: "/stasia_logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e] text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
