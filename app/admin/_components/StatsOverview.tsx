"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  FileText,
  Package,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getAdminStats } from "../_audit-actions";
import type { AdminStats } from "../_audit-actions";

type Stats = AdminStats;

export function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getAdminStats();
      if (!result.success || !result.stats) throw new Error(result.error);
      setStats(result.stats);
    } catch {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-6 animate-pulse"
          >
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3 mb-3" />
            <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 text-sm">{error || "Failed to load stats"}</p>
        <button
          onClick={() => fetchStats()}
          className="mt-3 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      sub: `${stats.activeThisWeek} active this week`,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bg: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Activity",
      value: stats.totalActivity,
      sub: `${stats.werkbriefsThisMonth + stats.arubaThisMonth} this month`,
      icon: Activity,
      color: "from-purple-500 to-pink-500",
      bg: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Werkbriefs",
      value: stats.totalWerkbriefs,
      sub: `${stats.werkbriefsThisMonth} this month`,
      icon: FileText,
      color: "from-emerald-500 to-teal-500",
      bg: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Aruba Docs",
      value: stats.totalAruba,
      sub: `${stats.arubaThisMonth} this month`,
      icon: Package,
      color: "from-orange-500 to-amber-500",
      bg: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  const maxTotal = Math.max(...stats.dailyActivity.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Platform Overview
          </h2>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white/60 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg transition-colors"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.bg} backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div
                className={`text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent mb-1`}
              >
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {card.label}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Activity Bar Chart */}
      <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-6">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
          Activity — Last 7 Days
        </h3>
        <div className="flex items-end gap-2 h-28">
          {stats.dailyActivity.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "80px" }}>
                {/* Aruba bar (top) */}
                {day.aruba > 0 && (
                  <div
                    className="w-full bg-orange-400 dark:bg-orange-500 rounded-t"
                    style={{ height: `${(day.aruba / maxTotal) * 80}px`, minHeight: "4px" }}
                    title={`Aruba: ${day.aruba}`}
                  />
                )}
                {/* Werkbrief bar (bottom) */}
                {day.werkbrief > 0 && (
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-400 rounded-b"
                    style={{ height: `${(day.werkbrief / maxTotal) * 80}px`, minHeight: "4px" }}
                    title={`Werkbrief: ${day.werkbrief}`}
                  />
                )}
                {day.total === 0 && (
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded" style={{ height: "4px" }} />
                )}
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {day.date}
              </span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-400" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Werkbrief</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-500" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Aruba</span>
          </div>
        </div>
      </div>
    </div>
  );
}
