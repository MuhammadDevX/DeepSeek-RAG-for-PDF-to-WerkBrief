"use client";

import React from "react";
import { Search } from "lucide-react";

interface EmptyStateProps {
  hasSearchTerm: boolean;
  searchTerm: string;
  onClearSearch: () => void;
}

export const EmptyState = React.memo(
  ({ hasSearchTerm, searchTerm, onClearSearch }: EmptyStateProps) => {
    return (
      <tr>
        <td colSpan={11} className="px-6 py-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            {hasSearchTerm ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm mb-4">
                  No items match your search for &quot;{searchTerm}&quot;
                </p>
                <button
                  onClick={onClearSearch}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-4 opacity-40 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  📋
                </div>
                <p className="text-lg font-medium mb-2">No data available</p>
                <p className="text-sm">
                  Upload a PDF to generate werkbrief data
                </p>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }
);

EmptyState.displayName = "EmptyState";
