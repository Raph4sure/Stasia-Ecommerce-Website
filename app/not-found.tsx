import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e] text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="font-serif text-3xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
        The requested page could not be found in our store.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-sm"
      >
        Return to Catalog
      </Link>
    </div>
  );
}
