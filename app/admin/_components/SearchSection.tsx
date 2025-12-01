"use client";

import { useState, useEffect } from "react";
import { SearchUsers } from "./SearchUsers";
import { UserCard } from "./UserCard";
import { SearchResultsSkeleton } from "./AdminSkeleton";
import {
  AlertCircle,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
  primaryEmailAddressId: string | null;
  publicMetadata: {
    role?: string;
  };
  banned: boolean;
}

interface SearchResponse {
  users: User[];
  totalCount: number;
}

export function SearchSection() {
  const searchParams = useSearchParams();
  const query = searchParams.get("search");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    async function searchUsers() {
      if (!query) {
        setAllUsers([]);
        setLoading(false);
        setCurrentPage(1);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/users/search?query=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          throw new Error("Failed to search users");
        }

        const data: SearchResponse = await response.json();
        setAllUsers(data.users || []);
        setCurrentPage(1); // Reset to first page on new search
      } catch {
        setError("Failed to search users. Please try again.");
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    }

    // Add a small delay to prevent too many requests while typing
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Calculate pagination
  const totalPages = Math.ceil(allUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = allUsers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <>
      {/* Search Section */}
      <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-3xl shadow-xl border border-zinc-200/50 dark:border-zinc-700/50 p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Find Users
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Search by name or email to manage user roles and permissions
            </p>
          </div>
          <SearchUsers />
        </div>
      </div>

      {/* Results Section */}
      {query && (
        <>
          {loading ? (
            <SearchResultsSkeleton />
          ) : error ? (
            <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-3xl shadow-lg border border-zinc-200/50 dark:border-zinc-700/50 p-12 text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
              </div>
              <h4 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                Search Error
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-4">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Search Results
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Found {allUsers.length} user
                    {allUsers.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {allUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="itemsPerPage"
                      className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
                    >
                      Show per page:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) =>
                        handleItemsPerPageChange(Number(e.target.value))
                      }
                      className="px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={allUsers.length}>
                        All ({allUsers.length})
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {allUsers.length === 0 ? (
                <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-3xl shadow-lg border border-zinc-200/50 dark:border-zinc-700/50 p-12 text-center">
                  <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h4 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                    No users found
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                    We couldn&apos;t find any users matching &ldquo;{query}
                    &rdquo;. Try searching with a different name or email
                    address.
                  </p>
                </div>
              ) : (
                <>
                  {/* Users Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {currentUsers.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Page Info */}
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          Showing{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {startIndex + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {Math.min(endIndex, allUsers.length)}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {allUsers.length}
                          </span>{" "}
                          users
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2">
                          {/* First Page */}
                          <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="First page"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </button>

                          {/* Previous Page */}
                          <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => goToPage(pageNum)}
                                    className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all ${
                                      currentPage === pageNum
                                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                                        : "bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          {/* Next Page */}
                          <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          {/* Last Page */}
                          <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Last page"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Current Page Display */}
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Page {currentPage} of {totalPages}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* No Search State */}
      {!query && (
        <div className="bg-gradient-to-br from-white/80 to-zinc-50/80 dark:from-zinc-800/80 dark:to-zinc-900/80 backdrop-blur-sm rounded-3xl shadow-lg border border-zinc-200/50 dark:border-zinc-700/50 p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCog className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Ready to manage users
          </h4>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Use the search bar above to find users and manage their roles. You
            can assign admin or moderator permissions to help manage your
            platform.
          </p>
        </div>
      )}
    </>
  );
}
