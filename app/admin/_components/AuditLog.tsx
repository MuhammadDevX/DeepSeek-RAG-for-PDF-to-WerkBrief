"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Package,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw,
  Filter,
  Calendar,
  User,
  AlertCircle,
  Clock,
  HardDrive,
} from "lucide-react";

interface AuditUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface AuditItem {
  type: "werkbrief" | "aruba" | "admin";
  key: string;
  timestamp: string;
  size: number;
  user: AuditUser;
}

interface AuditResponse {
  success: boolean;
  items: AuditItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  set_role: "Role Changed",
  remove_role: "Role Removed",
  ban_user: "User Banned",
  unban_user: "User Unbanned",
};

function getActionFromKey(key: string): string {
  const filename = key.split("/").pop() || "";
  for (const [k, v] of Object.entries(ACTION_LABELS)) {
    if (filename.includes(k)) return v;
  }
  return "Admin Action";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TypeBadge({ type }: { type: AuditItem["type"] }) {
  if (type === "werkbrief") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <FileText className="h-3 w-3" />
        Werkbrief
      </span>
    );
  }
  if (type === "aruba") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <Package className="h-3 w-3" />
        Aruba
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Shield className="h-3 w-3" />
      Admin
    </span>
  );
}

function UserAvatar({ user }: { user: AuditUser }) {
  const initials =
    (user.firstName?.charAt(0) || "") + (user.lastName?.charAt(0) || "") || "?";
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
      {initials.toUpperCase()}
    </div>
  );
}

export function AuditLog() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [filterAction, setFilterAction] = useState("all");
  const [filterUserId, setFilterUserId] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");

  const fetchAudit = useCallback(
    async (isRefresh = false, overridePage?: number) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const currentPage = overridePage ?? page;
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        action: filterAction,
      });
      if (filterUserId) params.set("userId", filterUserId);

      try {
        const res = await fetch(`/api/admin/audit?${params}`);
        if (!res.ok) throw new Error("Failed to fetch audit log");
        const json: AuditResponse = await res.json();
        setData(json);
      } catch {
        setError("Failed to load audit log. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, filterAction, filterUserId]
  );

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleFilterChange = (action: string) => {
    setFilterAction(action);
    setPage(1);
  };

  const handleUserFilter = () => {
    setFilterUserId(userSearchInput.trim());
    setPage(1);
  };

  const clearUserFilter = () => {
    setFilterUserId("");
    setUserSearchInput("");
    setPage(1);
  };

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), data?.totalPages || 1);
    setPage(clamped);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Action type filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {["all", "werkbrief", "aruba", "admin"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterAction === type
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* User ID filter */}
          <div className="flex items-center gap-2 flex-1">
            <User className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUserFilter()}
                placeholder="Filter by User ID..."
                className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {filterUserId ? (
                <button
                  onClick={clearUserFilter}
                  className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              ) : (
                <button
                  onClick={handleUserFilter}
                  className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchAudit(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        {filterUserId && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-blue-700 dark:text-blue-400">
              Filtering by user: <code className="font-mono">{filterUserId}</code>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading activity log...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => fetchAudit()}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-12 text-center">
          <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity found</p>
          {(filterUserId || filterAction !== "all") && (
            <button
              onClick={() => { clearUserFilter(); handleFilterChange("all"); }}
              className="mt-3 text-sm text-blue-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results summary */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {data.total}
              </span>{" "}
              events
            </p>
            {refreshing && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </div>
            )}
          </div>

          {/* Activity list */}
          <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {data.items.map((item, idx) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors ${
                    idx === 0 ? "" : ""
                  }`}
                >
                  {/* User avatar */}
                  <UserAvatar user={item.user} />

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.user.firstName} {item.user.lastName}
                      </span>
                      <TypeBadge type={item.type} />
                      {item.type === "admin" && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          {getActionFromKey(item.key)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {item.user.email && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                          {item.user.email}
                        </span>
                      )}
                      <span className="text-xs text-zinc-300 dark:text-zinc-600 hidden sm:inline">•</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono hidden sm:inline truncate">
                        {item.user.id}
                      </span>
                    </div>
                  </div>

                  {/* Meta: size */}
                  <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                      <HardDrive className="h-3 w-3" />
                      {formatBytes(item.size)}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 justify-end">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {formatRelativeTime(item.timestamp)}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Page{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.page}</span>{" "}
                  of{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.totalPages}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      let p: number;
                      if (data.totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= data.totalPages - 2) p = data.totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-all ${
                            page === p
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm"
                              : "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goToPage(data.totalPages)}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
