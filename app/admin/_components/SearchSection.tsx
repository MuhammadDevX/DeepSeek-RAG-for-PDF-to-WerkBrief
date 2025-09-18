"use client";

import { useState, useEffect } from "react";
import { SearchUsers } from "./SearchUsers";
import { UserCard } from "./UserCard";
import { SearchResultsSkeleton } from "./AdminSkeleton";
import { AlertCircle, UserCog } from "lucide-react";
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
}

export function SearchSection() {
  const searchParams = useSearchParams();
  const query = searchParams.get("search");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function searchUsers() {
      if (!query) {
        setUsers([]);
        setLoading(false);
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

        const data = await response.json();
        setUsers(data.users || []);
      } catch {
        setError("Failed to search users. Please try again.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    // Add a small delay to prevent too many requests while typing
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

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
              <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Search Results
                </h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 px-3 py-1 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                  {users.length} user{users.length !== 1 ? "s" : ""} found
                </div>
              </div>

              {users.length === 0 ? (
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
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
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
