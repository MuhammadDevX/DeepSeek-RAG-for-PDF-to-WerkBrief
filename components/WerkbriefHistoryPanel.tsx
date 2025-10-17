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
} from "lucide-react";

interface HistoryItem {
  key: string;
  lastModified: string;
  size: number;
  timestamp: string;
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
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Werkbrief
                    </span>
                  </div>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    {formatSize(item.size)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(item.lastModified)}</span>
                </div>

                <div className="flex gap-2">
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
                        Load
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
