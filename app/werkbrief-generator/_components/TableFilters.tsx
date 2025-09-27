"use client";

import React from "react";

interface TableFiltersProps {
  showFilters: boolean;
  itemsPerPage: number;
  totalItems: number;
  sortConfig: {
    key: string | null;
    direction: "asc" | "desc";
  };
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onSortClear: () => void;
}

export const TableFilters = React.memo(
  ({
    showFilters,
    itemsPerPage,
    totalItems,
    sortConfig,
    onItemsPerPageChange,
    onSortClear,
  }: TableFiltersProps) => {
    if (!showFilters) return null;

    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Items per page:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={totalItems}>All</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Sort:{" "}
                {sortConfig.key
                  ? `${sortConfig.key} (${sortConfig.direction})`
                  : "None"}
              </span>
              {sortConfig.key && (
                <button
                  onClick={onSortClear}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="hidden lg:inline">
              Shortcuts: Ctrl+F (Search) | Ctrl+A (Select All) | Ctrl+E (Expand)
              | Ctrl+← → (Navigate)
            </span>
          </div>
        </div>
      </div>
    );
  }
);

TableFilters.displayName = "TableFilters";
