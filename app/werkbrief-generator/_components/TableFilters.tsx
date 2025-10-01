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
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-y border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Items per page */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline mr-1.5 -mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Rows:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={totalItems}>All ({totalItems})</option>
              </select>
            </div>

            {/* Sort info */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort:
              </span>
              {sortConfig.key ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {sortConfig.key}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {sortConfig.direction === "asc" ? "↑ A-Z" : "↓ Z-A"}
                  </span>
                  <button
                    onClick={onSortClear}
                    className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
                    title="Clear sorting"
                  >
                    ✕ Clear
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                  None
                </span>
              )}
            </div>
          </div>

          {/* Right side - Keyboard shortcuts hint */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Shortcuts:</span>
              <span className="ml-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Ctrl
                </kbd>
                +
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  F
                </kbd>{" "}
                Search
              </span>
              <span className="mx-1">•</span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Ctrl
                </kbd>
                +
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  A
                </kbd>{" "}
                Select All
              </span>
              <span className="mx-1">•</span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  Ctrl
                </kbd>
                +
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  E
                </kbd>{" "}
                Expand
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TableFilters.displayName = "TableFilters";
