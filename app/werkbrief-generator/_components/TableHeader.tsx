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
} from "lucide-react";

interface TableHeaderProps {
  searchTerm: string;
  showFilters: boolean;
  isTableExpanded: boolean;
  totalFilteredItems: number;
  totalItems: number;
  copied: boolean;
  onSearchChange: (value: string) => void;
  onFiltersToggle: () => void;
  onTableExpandToggle: () => void;
  onDownload: () => void;
  onCopy: () => void;
}

export const TableHeader = React.memo(
  ({
    searchTerm,
    showFilters,
    isTableExpanded,
    totalFilteredItems,
    totalItems,
    copied,
    onSearchChange,
    onFiltersToggle,
    onTableExpandToggle,
    onDownload,
    onCopy,
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalFilteredItems} of {totalItems} items
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
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
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TableHeader.displayName = "TableHeader";
