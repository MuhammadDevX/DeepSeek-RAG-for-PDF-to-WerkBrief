"use client";
import React from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";

interface GroupHeaderProps {
  clientName: string;
  itemCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  clientName,
  itemCount,
  isCollapsed,
  onToggle,
}) => {
  return (
    <div
      className="group flex cursor-pointer items-center justify-between border-y border-blue-200/70 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-4 py-3 transition-colors hover:from-blue-100 hover:to-indigo-100 dark:border-blue-900/50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/30"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/70 text-blue-600 shadow-sm ring-1 ring-blue-200 transition-transform group-hover:scale-105 dark:bg-gray-900/60 dark:text-blue-300 dark:ring-blue-800">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
        <Building2 className="h-4 w-4 text-blue-500/80 dark:text-blue-300/80" />
        <h3 className="text-base font-semibold tracking-tight text-gray-800 dark:text-gray-100">
          {clientName}
        </h3>
      </div>
      <span className="inline-flex items-center rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </div>
  );
};
