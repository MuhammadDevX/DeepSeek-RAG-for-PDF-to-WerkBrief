"use client";

import React from "react";

interface ScrollIndicatorProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  isVisible: boolean;
}

export const ScrollIndicator = React.memo(
  ({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    isVisible,
  }: ScrollIndicatorProps) => {
    if (!isVisible || totalPages <= 1) return null;

    const scrollHeight = Math.max(
      20,
      Math.min(100, (itemsPerPage / totalItems) * 100)
    );
    const scrollPosition =
      ((currentPage - 1) / Math.max(1, totalPages - 1)) * (100 - scrollHeight);

    return (
      <div className="absolute right-2 top-20 bottom-20 w-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden opacity-60 hover:opacity-100 transition-all duration-300 group">
        <div
          className="w-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full transition-all duration-300 shadow-sm"
          style={{
            height: `${scrollHeight}%`,
            transform: `translateY(${scrollPosition}%)`,
          }}
        />

        {/* Page indicator tooltip */}
        <div className="absolute top-1/2 -right-16 transform -translate-y-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    );
  }
);

ScrollIndicator.displayName = "ScrollIndicator";
