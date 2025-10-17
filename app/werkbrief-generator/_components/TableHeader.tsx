"use client";

import React from "react";
import DebouncedInput from "@/components/ui/debounced-input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
  AlertTriangle,
  Merge,
  Database,
  History,
} from "lucide-react";

interface TableHeaderProps {
  searchTerm: string;
  showFilters: boolean;
  isTableExpanded: boolean;
  totalFilteredItems: number;
  totalItems: number;
  copied: boolean;
  missingPages?: number[]; // Optional for backwards compatibility when result is null
  totalPages?: number; // Total pages in PDF
  onSearchChange: (value: string) => void;
  onFiltersToggle: () => void;
  onTableExpandToggle: () => void;
  onDownload: () => void;
  onCopy: () => void;
  isDeleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  onBatchDelete?: () => void;
  selectedForDeletionCount?: number;
  isMergeMode?: boolean;
  onToggleMergeMode?: () => void;
  onBatchMerge?: () => void;
  selectedForMergeCount?: number;
  isAdmin?: boolean;
  onExpandToKB?: () => void;
  isExpandingToKB?: boolean;
  onOpenHistory?: () => void;
}

export const TableHeader = React.memo(
  ({
    searchTerm,
    showFilters,
    isTableExpanded,
    totalFilteredItems,
    totalItems,
    copied,
    missingPages,
    totalPages,
    onSearchChange,
    onFiltersToggle,
    onTableExpandToggle,
    onDownload,
    onCopy,
    isDeleteMode = false,
    onToggleDeleteMode,
    onBatchDelete,
    selectedForDeletionCount = 0,
    isMergeMode = false,
    onToggleMergeMode,
    onBatchMerge,
    selectedForMergeCount = 0,
    isAdmin = false,
    onExpandToKB,
    isExpandingToKB = false,
    onOpenHistory,
  }: TableHeaderProps) => {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Generated Werkbrief
              </h2>
              <button
                onClick={onTableExpandToggle}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                title={isTableExpanded ? "Minimize table" : "Expand table"}
              >
                {isTableExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalFilteredItems} of {totalItems} items
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
              {missingPages !== undefined && (
                <>
                  {missingPages.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>Missing Pages:</strong>{" "}
                        {missingPages.sort((a, b) => a - b).join(", ")}
                        {totalPages !== undefined &&
                          ` (${missingPages.length} of ${
                            totalPages + missingPages.length
                          } pages could not be processed)`}
                        {totalPages === undefined &&
                          ` (${missingPages.length} page${
                            missingPages.length !== 1 ? "s" : ""
                          } could not be processed)`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>All pages processed successfully</strong>
                        {totalPages !== undefined &&
                          ` - ${totalPages} page${
                            totalPages !== 1 ? "s" : ""
                          } processed`}
                        {totalPages === undefined && " - No missing pages"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <DebouncedInput
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(value) => onSearchChange(String(value))}
                className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
              />
            </div>

            <button
              onClick={onFiltersToggle}
              className={`px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200 ${
                showFilters
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              Filters
            </button>

            <div className="flex items-center gap-2">
              {isMergeMode ? (
                <>
                  <Button
                    onClick={onBatchMerge}
                    variant="default"
                    size="sm"
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    disabled={selectedForMergeCount < 2}
                  >
                    <Merge className="w-4 h-4" />
                    <span>Merge Selected ({selectedForMergeCount})</span>
                  </Button>
                  <Button
                    onClick={onToggleMergeMode}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </>
              ) : isDeleteMode ? (
                <>
                  <Button
                    onClick={onBatchDelete}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={selectedForDeletionCount === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected ({selectedForDeletionCount})</span>
                  </Button>
                  <Button
                    onClick={onToggleDeleteMode}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {onOpenHistory && (
                    <Button
                      onClick={onOpenHistory}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/20"
                      title="View werkbrief history"
                    >
                      <History className="w-4 h-4" />
                      <span className="hidden sm:inline">History</span>
                    </Button>
                  )}
                  {isAdmin && onExpandToKB && (
                    <Button
                      onClick={onExpandToKB}
                      variant="outline"
                      size="sm"
                      disabled={isExpandingToKB}
                      className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                      title="Add selected items to knowledge base"
                    >
                      <Database className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isExpandingToKB ? "Adding..." : "Expand to KB"}
                      </span>
                    </Button>
                  )}
                  <Button
                    onClick={onToggleMergeMode}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                  >
                    <Merge className="w-4 h-4" />
                    <span className="hidden sm:inline">Batch Merge</span>
                  </Button>
                  <Button
                    onClick={onToggleDeleteMode}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Batch Delete</span>
                  </Button>
                  <Button
                    onClick={onDownload}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button
                    onClick={onCopy}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TableHeader.displayName = "TableHeader";
