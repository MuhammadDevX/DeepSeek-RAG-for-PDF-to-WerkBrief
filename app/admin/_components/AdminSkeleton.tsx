import { Crown, UserCog } from "lucide-react";

export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-zinc-100 dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-800 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <UserCog className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Manage user roles and permissions across your platform
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
            <Crown className="h-4 w-4" />
            Admin Access Required
          </div>
        </div>

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

            {/* Search Input Skeleton */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse"></div>
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Results Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
          </div>

          {/* User Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <UserCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
      <div className="p-6 space-y-4">
        {/* User Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse w-32"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse w-40"></div>
            </div>
          </div>
          <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-700">
          <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse"></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between p-6 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <UserCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
