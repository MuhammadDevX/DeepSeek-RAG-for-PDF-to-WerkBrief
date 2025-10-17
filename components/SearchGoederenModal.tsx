"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  Tag,
  FileText,
  Copy,
  CheckCircle,
} from "lucide-react";

interface SearchResult {
  id: string;
  score: number;
  item: string;
  goederen_omschrijving: string;
  goederen_code: string;
  category: string;
  text: string;
  metadata: Record<string, unknown>;
}

interface SearchGoederenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (goederenCode: string, goederenOmschrijving: string) => void;
}

export function SearchGoederenModal({
  isOpen,
  onClose,
  onSelect,
}: SearchGoederenModalProps) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("10");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const response = await fetch("/api/search-goederen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          topK: topK,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setError(null);
      } else {
        console.error("Search error:", data.error);
        setResults([]);
        setError(data.error || "Search failed. Please try again.");
      }
    } catch (error) {
      console.error("Search request failed:", error);
      setResults([]);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const resetSearch = () => {
    setQuery("");
    setTopK("10");
    setResults([]);
    setHasSearched(false);
    setError(null);
    setCopiedCode(null);
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleClose = () => {
    resetSearch();
    onClose();
  };

  const renderSkeletons = () => (
    <div className="space-y-4">
      {Array.from({ length: parseInt(topK) || 5 }).map((_, index) => (
        <div
          key={index}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Search Goederen Code"
      className="max-w-6xl max-h-[95vh]"
    >
      <div className="space-y-4">
        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="search-query">Search Query</Label>
            <Input
              id="search-query"
              type="text"
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="top-k">Number of Results</Label>
            <Input
              id="top-k"
              type="number"
              min="1"
              max="50"
              placeholder="10"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? "Searching..." : "Search"}
          </Button>

          {hasSearched && (
            <Button
              variant="outline"
              onClick={resetSearch}
              disabled={isLoading}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
              Search Results{" "}
              {!isLoading && results.length > 0 && `(${results.length})`}
            </h3>
            {hasSearched && !isLoading && (
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Query: &ldquo;<em>{query}</em>&rdquo; • Top {topK} results
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-red-500 rounded-full flex-shrink-0"></div>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {isLoading ? (
              renderSkeletons()
            ) : results.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    {/* Header with Score */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Result #{index + 1}
                      </span>
                      <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Main Content - Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Item Description */}
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 mt-1 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            Item:
                          </span>
                          <p
                            className="font-medium text-sm text-gray-900 dark:text-white truncate"
                            title={result.item}
                          >
                            {result.item}
                          </p>
                        </div>
                      </div>

                      {/* Goederen Omschrijving */}
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            Goederen Omschrijving:
                          </span>
                          <p
                            className="text-sm text-gray-800 dark:text-gray-200 truncate"
                            title={result.goederen_omschrijving}
                          >
                            {result.goederen_omschrijving}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Code and Category Row */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Code:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                            {result.goederen_code}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(result.goederen_code)
                            }
                            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === result.goederen_code ? (
                              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {result.category !== "N/A" && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Category:
                          </span>
                          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded">
                            {result.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Additional text - Collapsible */}
                    {result.text && result.text !== "" && (
                      <details className="mb-3">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Additional info
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                          {result.text}
                        </div>
                      </details>
                    )}

                    {/* Display other metadata fields - Collapsible */}
                    {Object.keys(result.metadata).length > 0 && (
                      <details className="mb-3">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          View metadata ({Object.keys(result.metadata).length}{" "}
                          fields)
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs max-h-32 overflow-y-auto">
                          {Object.entries(result.metadata).map(
                            ([key, value]) => (
                              <div key={key} className="flex gap-2 mb-1">
                                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                                  {key}:
                                </span>
                                <span className="text-gray-800 dark:text-gray-200 break-all">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </details>
                    )}

                    {/* Use button if onSelect callback is provided */}
                    {onSelect && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                        <Button
                          onClick={() =>
                            onSelect(
                              result.goederen_code,
                              result.goederen_omschrijving
                            )
                          }
                          className="w-full"
                          size="sm"
                        >
                          Use this Goederen
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for your search query.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
