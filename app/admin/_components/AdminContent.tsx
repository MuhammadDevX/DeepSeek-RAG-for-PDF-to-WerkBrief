"use client";

import { useState } from "react";
import { Users, Activity } from "lucide-react";
import { StatsOverview } from "./StatsOverview";
import { SearchSection } from "./SearchSection";
import { AuditLog } from "./AuditLog";

type Tab = "users" | "audit";

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const tabs: Array<{ id: Tab; label: string; icon: typeof Users; description: string }> = [
    {
      id: "users",
      label: "User Management",
      icon: Users,
      description: "Search, assign roles, and manage access",
    },
    {
      id: "audit",
      label: "Activity Audit",
      icon: Activity,
      description: "Monitor what users are doing and when",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview — always visible */}
      <StatsOverview />

      {/* Tab navigation */}
      <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-2">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-xl text-left transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${isActive ? "text-white" : ""}`}>
                    {tab.label}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      isActive ? "text-blue-100" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-in fade-in duration-300">
        {activeTab === "users" && <SearchSection />}
        {activeTab === "audit" && <AuditLog />}
      </div>
    </div>
  );
}
