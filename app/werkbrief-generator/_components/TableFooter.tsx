"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "../styles.module.css";

interface TableFooterProps {
  totalItems: number;
  filteredItems: number;
  selectedCount: number;
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
}

export const TableFooter = React.memo(
  ({
    totalItems,
    filteredItems,
    selectedCount,
    currentPage,
    totalPages,
    onGoToPage,
  }: TableFooterProps) => {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Total Items: {totalItems} | Filtered: {filteredItems} | Selected
              for Export: {selectedCount}
            </span>
            <span className="hidden sm:inline">
              Generated at {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => onGoToPage(1)}
                disabled={currentPage === 1}
                className={`${styles.paginationButton} px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                First
              </button>

              <button
                onClick={() => onGoToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${styles.paginationButton} p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onGoToPage(pageNum)}
                      className={`${
                        styles.paginationButton
                      } px-2 py-1 text-xs border rounded transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white border-blue-500"
                          : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onGoToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`${styles.paginationButton} p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onGoToPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`${styles.paginationButton} px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                Last
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

TableFooter.displayName = "TableFooter";
