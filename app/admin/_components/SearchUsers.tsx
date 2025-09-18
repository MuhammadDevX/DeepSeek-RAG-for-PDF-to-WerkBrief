"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

export const SearchUsers = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!searchParams.get("search"));

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      if (searchTerm.trim()) {
        router.push(
          pathname + "?search=" + encodeURIComponent(searchTerm.trim())
        );
        setHasSearched(true);
      } else {
        router.push(pathname);
        setHasSearched(false);
      }
      // Simulate search delay for better UX
      setTimeout(() => setIsSearching(false), 300);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, router, pathname]);

  const clearSearch = () => {
    setSearchTerm("");
    setHasSearched(false);
    router.push(pathname);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <input
              id="search"
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg 
                         bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                         placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching users...
              </div>
            </div>
          )}
        </div>
      </div>

      {searchTerm && !isSearching && (
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {hasSearched
            ? `Showing results for "${searchTerm}"`
            : "Type to search users"}
        </div>
      )}
    </div>
  );
};
