"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import {
  Search,
  Package,
  Tag,
  FileText,
  Copy,
  CheckCircle,
  MoreVertical,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
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
  const { isAdmin } = useIsAdmin();
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("10");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "error" | "info" | "warning";
    }>
  >([]);

  // Dropdown and editing state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    itemName: "",
    goederenOmschrijving: "",
    goederenCode: "",
    category: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addToast = (
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key handling
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
        } else if (showSaveConfirm) {
          setShowSaveConfirm(false);
        } else if (editingId) {
          handleCancelEdit();
        } else if (openDropdown) {
          setOpenDropdown(null);
        }
      }

      // Ctrl/Cmd + Enter to save when editing
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && editingId) {
        e.preventDefault();
        setShowSaveConfirm(true);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, showDeleteConfirm, showSaveConfirm, editingId, openDropdown]);

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

  const handleEdit = (result: SearchResult) => {
    setEditingId(result.id);
    setEditForm({
      itemName: result.item,
      goederenOmschrijving: result.goederen_omschrijving,
      goederenCode: result.goederen_code,
      category: result.category,
    });
    setOpenDropdown(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      itemName: "",
      goederenOmschrijving: "",
      goederenCode: "",
      category: "",
    });
  };

  const clearCache = async () => {
    try {
      await fetch("/api/search-goederen", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setShowSaveConfirm(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/update-knowledgebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          itemName: editForm.itemName,
          goederenOmschrijving: editForm.goederenOmschrijving,
          goederenCode: editForm.goederenCode,
          category: editForm.category,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addToast("Item updated successfully!", "success");
        handleCancelEdit();
        // Clear cache and refresh search results
        await clearCache();
        await handleSearch();
      } else {
        addToast(data.error || "Failed to update item", "error");
      }
    } catch (error) {
      console.error("Update error:", error);
      addToast("Network error. Failed to update item.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm(id);
    setOpenDropdown(null);
  };

  const handleDelete = async (id: string) => {
    setShowDeleteConfirm(null);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/delete-from-knowledgebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: [id],
        }),
      });

      const data = await response.json();

      if (data.success && data.deletedCount > 0) {
        addToast("Item deleted successfully!", "success");
        // Clear cache and refresh search results
        await clearCache();
        await handleSearch();
      } else {
        addToast(data.error || "Failed to delete item", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      addToast("Network error. Failed to delete item.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetSearch = () => {
    setQuery("");
    setTopK("10");
    setResults([]);
    setHasSearched(false);
    setError(null);
    setCopiedCode(null);
    setEditingId(null);
    setOpenDropdown(null);
    setShowDeleteConfirm(null);
    setShowSaveConfirm(false);
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      addToast(`Copied: ${code}`, "success");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      addToast("Failed to copy to clipboard", "error");
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
            <Label htmlFor="search-query" className="text-sm font-medium">
              Search Query
            </Label>
            <div className="relative">
              <Input
                id="search-query"
                type="text"
                placeholder="Enter your search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pr-10"
                disabled={isLoading || isSaving || isDeleting}
                autoFocus
              />
              {query && !isLoading && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="top-k" className="text-sm font-medium">
              Number of Results
            </Label>
            <Input
              id="top-k"
              type="number"
              min="1"
              max="50"
              placeholder="10"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              className="w-full"
              disabled={isLoading || isSaving || isDeleting}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={isLoading || !query.trim() || isSaving || isDeleting}
            className="flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>

          {hasSearched && (
            <Button
              variant="outline"
              onClick={resetSearch}
              disabled={isLoading || isSaving || isDeleting}
              className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search Results{" "}
                {!isLoading && results.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({results.length})
                  </span>
                )}
              </h3>
              {(isSaving || isDeleting) && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSaving ? "Saving..." : "Deleting..."}
                </div>
              )}
            </div>
            {hasSearched && !isLoading && (
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Query: &ldquo;
                <span className="font-medium italic">{query}</span>&rdquo; • Top{" "}
                {topK} results
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
                {results.map((result, index) => {
                  const isEditing = editingId === result.id;

                  return (
                    <div
                      key={result.id}
                      className={`p-4 border rounded-lg transition-all duration-300 relative ${
                        isEditing
                          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-[1.02]"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                      } ${
                        (isSaving || isDeleting) && !isEditing
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }`}
                      style={{
                        animation: `fadeIn 0.3s ease-out ${
                          index * 0.05
                        }s backwards`,
                      }}
                    >
                      {/* Header with Score and Dropdown */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Result #{index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {(result.score * 100).toFixed(1)}%
                          </span>

                          {/* Admin Dropdown Menu */}
                          {isAdmin && !isEditing && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(
                                    openDropdown === result.id
                                      ? null
                                      : result.id
                                  );
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                title="More options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </button>

                              {openDropdown === result.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                    }}
                                  />
                                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(result);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                                    >
                                      <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(result.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Main Content - Editing Mode or Display Mode */}
                      {isEditing ? (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md p-3 mb-3">
                            <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                              <Edit className="h-3 w-3" />
                              Editing mode • Press{" "}
                              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] border">
                                Ctrl+Enter
                              </kbd>{" "}
                              to save or{" "}
                              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-[10px] border">
                                Esc
                              </kbd>{" "}
                              to cancel
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Item Name *
                            </Label>
                            <Input
                              value={editForm.itemName}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  itemName: e.target.value,
                                })
                              }
                              className="mt-1 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter item name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Goederen Omschrijving *
                            </Label>
                            <Input
                              value={editForm.goederenOmschrijving}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  goederenOmschrijving: e.target.value,
                                })
                              }
                              className="mt-1 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter goederen omschrijving"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Goederen Code *
                            </Label>
                            <Input
                              value={editForm.goederenCode}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  goederenCode: e.target.value,
                                })
                              }
                              className="mt-1 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter goederen code"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Category
                            </Label>
                            <Input
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  category: e.target.value,
                                })
                              }
                              className="mt-1 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter category (optional)"
                            />
                          </div>

                          {/* Edit Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => setShowSaveConfirm(true)}
                              disabled={
                                isSaving ||
                                !editForm.itemName ||
                                !editForm.goederenOmschrijving ||
                                !editForm.goederenCode
                              }
                              className="flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              size="sm"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              variant="outline"
                              size="sm"
                              className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                                View metadata (
                                {Object.keys(result.metadata).length} fields)
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
                          {onSelect && !isEditing && (
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
                        </>
                      )}
                    </div>
                  );
                })}
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

      {/* Save Confirmation Dialog */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-scaleIn border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Save className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Changes
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 ml-13">
              Are you sure you want to save these changes? This will update the
              item in the knowledge base and invalidate the search cache.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowSaveConfirm(false)}
                variant="outline"
                size="sm"
                disabled={isSaving}
                className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                size="sm"
                disabled={isSaving}
                className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-scaleIn border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Confirm Delete
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 ml-13">
              Are you sure you want to delete this item? This action cannot be
              undone and will permanently remove it from the knowledge base.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                size="sm"
                disabled={isDeleting}
                className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                size="sm"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </Modal>
  );
}
