"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Download,
  Calendar,
  FileText,
  AlertCircle,
  Package,
  Weight,
  DollarSign,
  Hash,
  FileStack,
  AlertTriangle,
  List,
} from "lucide-react";

interface HistoryItemMetadata {
  itemCount: number;
  totalBruto: number;
  totalFOB: number;
  totalCTNS: number;
  totalSTKS: number;
  totalPages: number;
  missingPages: number[];
  previewDescriptions: string[];
  createdAt: string;
}

interface HistoryItem {
  key: string;
  lastModified: string;
  size: number;
  timestamp: string;
  metadata: HistoryItemMetadata | null;
}

interface WerkbriefHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWerkbrief?: (werkbrief: unknown) => void;
}

export function WerkbriefHistoryPanel({
  isOpen,
  onClose,
  onLoadWerkbrief,
}: WerkbriefHistoryPanelProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/werkbrief/history", {
        method: "GET",
      });

      const data = await response.json();

      if (data.success) {
        setHistoryItems(data.history);
      } else {
        setError(data.error || "Failed to fetch history");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadWerkbrief = async (historyKey: string) => {
    setLoadingKey(historyKey);

    try {
      const response = await fetch("/api/werkbrief/history", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ historyKey }),
      });

      const data = await response.json();

      if (data.success && onLoadWerkbrief) {
        onLoadWerkbrief(data.data.werkbrief);
        onClose();
      } else {
        alert(data.error || "Failed to load werkbrief");
      }
    } catch (error) {
      console.error("Error loading werkbrief:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoadingKey(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const renderSkeletons = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Werkbrief History"
      className="max-w-4xl max-h-[90vh]"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your previously generated werkbriefs
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={isLoading}
          >
            <History className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* History List */}
        {isLoading ? (
          renderSkeletons()
        ) : historyItems.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {historyItems.map((item) => (
              <div
                key={item.key}
                className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">
                      Werkbrief
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">
                      {formatSize(item.size)}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {formatDate(item.lastModified)}
                  </span>
                </div>

                {/* Metadata Section */}
                {item.metadata ? (
                  <div className="space-y-4 mb-4">
                    {/* Product Preview */}
                    {item.metadata.previewDescriptions.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <List className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            Sample Products
                          </span>
                        </div>
                        <div className="space-y-1">
                          {item.metadata.previewDescriptions.map(
                            (desc, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-gray-700 dark:text-gray-300 truncate pl-6"
                                title={desc}
                              >
                                • {desc}
                              </div>
                            )
                          )}
                          {item.metadata.itemCount > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 pl-6 italic">
                              +{item.metadata.itemCount - 3} more items...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Total Items */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            Items
                          </span>
                        </div>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {item.metadata.itemCount}
                        </p>
                      </div>

                      {/* Total Pages */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center gap-2 mb-1">
                          <FileStack className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            Pages
                          </span>
                        </div>
                        <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                          {item.metadata.totalPages}
                        </p>
                      </div>

                      {/* Total CTNS */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            Cartons
                          </span>
                        </div>
                        <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                          {formatNumber(item.metadata.totalCTNS)}
                        </p>
                      </div>

                      {/* Total STKS */}
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg p-3 border border-cyan-200 dark:border-cyan-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                            Pieces
                          </span>
                        </div>
                        <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
                          {formatNumber(item.metadata.totalSTKS)}
                        </p>
                      </div>

                      {/* Total Weight */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Weight className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            Weight (kg)
                          </span>
                        </div>
                        <p className="text-lg font-bold text-green-900 dark:text-green-100">
                          {formatNumber(item.metadata.totalBruto)}
                        </p>
                      </div>

                      {/* Total FOB */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Total FOB
                          </span>
                        </div>
                        <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                          {formatCurrency(item.metadata.totalFOB)}
                        </p>
                      </div>
                    </div>

                    {/* Missing Pages Warning */}
                    {item.metadata.missingPages.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                              Missing Pages
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                              Pages {item.metadata.missingPages.join(", ")}{" "}
                              could not be processed
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-900/50 rounded text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Metadata not available
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => loadWerkbrief(item.key)}
                    disabled={loadingKey === item.key}
                    className="flex-1"
                    size="sm"
                  >
                    {loadingKey === item.key ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Load Werkbrief
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No History Found</p>
            <p className="text-sm">
              Your generated werkbriefs will appear here
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
