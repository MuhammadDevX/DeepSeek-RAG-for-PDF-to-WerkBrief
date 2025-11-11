"use client";
import React, { useCallback, useMemo, useState } from "react";
import { Description } from "./_components/Description";
import { WerkbriefProgress } from "./_components/WerkbriefProgress";
import { FileUploadSection } from "./_components/FileUploadSection";
import { UploadProgressBar } from "./_components/UploadProgressBar";
import { TableHeader } from "./_components/TableHeader";
import { TableFilters } from "./_components/TableFilters";
import { TotalBrutoSection } from "./_components/TotalBrutoSection";
import { UndoNotification } from "./_components/UndoNotification";
import { DataTable } from "./_components/DataTable";
import { TableFooter } from "./_components/TableFooter";
import { WerkbriefHistoryPanel } from "@/components/WerkbriefHistoryPanel";
import { useTableData } from "./_components/hooks/useTableData";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useBrutoManagement } from "./_components/hooks/useBrutoManagement";
import { useWerkbrief } from "@/contexts/WerkbriefContext";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { uploadFileToSpacesWithProgress } from "@/lib/upload-utils";
import {
  formatSelectedFieldsForExcel,
  copyToClipboard,
  downloadExcelFile,
} from "@/lib/excel-formatter";
import { useUser } from "@clerk/nextjs";
import { ToastContainer } from "@/components/ui/toast";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface ProgressData {
  type: "progress" | "complete" | "error";
  totalDocuments?: number;
  processedDocuments?: number;
  totalProducts?: number;
  processedProducts?: number;
  currentStep?: string;
  data?: Werkbrief;
  error?: string;
}

interface DeletedRow {
  data: Werkbrief["fields"][0];
  checked: boolean;
  index: number;
}

interface DeletedBatch {
  rows: DeletedRow[];
  timestamp: number;
}

const WerkBriefHome = () => {
  // Check if user is admin
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [isExpandingToKB, setIsExpandingToKB] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUndoingKBUpload, setIsUndoingKBUpload] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type?: "success" | "info" | "warning" | "error";
    }>
  >([]);

  const addToast = useCallback(
    (
      message: string,
      type: "success" | "info" | "warning" | "error" = "info"
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Get state from context
  const {
    // Ref to track if we've already auto-collapsed the upload section
    hasAutoCollapsed,

    // Core state
    pdfFile,
    setPdfFile,
    loading,
    setLoading,
    result,
    setResult,
    error,
    setError,
    copied,
    setCopied,
    progress,
    setProgress,
    useStreaming,
    setUseStreaming,
    lastFileKey,
    setLastFileKey,

    // Upload progress state
    uploadProgress,
    setUploadProgress,
    isUploading,
    setIsUploading,

    // Knowledge base upload state
    lastUploadedToKBIds,
    setLastUploadedToKBIds,

    // UI state
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    sortConfig,
    setSortConfig,
    isTableExpanded,
    setIsTableExpanded,
    showFilters,
    setShowFilters,
    isTableLoading,
    setIsTableLoading,
    bulkSelectAll,
    setBulkSelectAll,
    isUploadSectionCollapsed,
    setIsUploadSectionCollapsed,

    // Deleted rows state
    deletedRows,
    setDeletedRows,
    showUndoNotification,
    setShowUndoNotification,

    // Edited data
    editedFields,
    setEditedFields,
    checkedFields,
    setCheckedFields,

    // Delete mode state
    isDeleteMode,
    setIsDeleteMode,
    selectedForDeletion,
    setSelectedForDeletion,
    deleteSelectAll,
    setDeleteSelectAll,

    // Merge mode state
    isMergeMode,
    setIsMergeMode,
    selectedForMerge,
    setSelectedForMerge,
    mergeSelectAll,
    setMergeSelectAll,
  } = useWerkbrief();

  // Custom hooks
  const {
    filteredAndSortedFields,
    paginatedFields,
    totalPages,
    handleFieldChange,
    handleCheckboxChange,
  } = useTableData({
    result,
    editedFields,
    checkedFields,
    setEditedFields,
    setCheckedFields,
    searchTerm,
    sortConfig,
    currentPage,
    itemsPerPage,
  });

  const { totalBruto, handleTotalBrutoChange } = useBrutoManagement({
    editedFields,
    setEditedFields,
  });

  // Memoize expensive calculations
  const totalFilteredItems = useMemo(
    () => filteredAndSortedFields.length,
    [filteredAndSortedFields.length]
  );
  const selectedCount = useMemo(
    () => checkedFields.filter(Boolean).length,
    [checkedFields]
  );
  const selectedForDeletionCount = useMemo(
    () => selectedForDeletion.filter(Boolean).length,
    [selectedForDeletion]
  );
  const hasTableData = useMemo(
    () =>
      (result && result.fields && result.fields.length > 0) ||
      editedFields.length > 0,
    [result, editedFields.length]
  );

  // Auto-collapse upload section when table data is available (only once)
  React.useEffect(() => {
    if (hasTableData && !hasAutoCollapsed.current) {
      setIsUploadSectionCollapsed(true);
      hasAutoCollapsed.current = true;
    }
  }, [hasTableData, hasAutoCollapsed, setIsUploadSectionCollapsed]);

  // Memoize table expansion classes to prevent recalculation
  const tableContainerClasses = useMemo(
    () =>
      `w-full transition-all duration-300 ${
        isTableExpanded ? "max-w-none" : "max-w-full"
      } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden`,
    [isTableExpanded]
  );

  // Pagination logic - memoized
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages, setCurrentPage]
  );

  const handleItemsPerPageChange = useCallback(
    (newItemsPerPage: number) => {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    },
    [setItemsPerPage, setCurrentPage]
  );

  // Sorting handlers - optimized
  const handleSort = useCallback(
    (key: keyof Werkbrief["fields"][0]) => {
      setSortConfig((prev) => ({
        key,
        direction:
          prev.key === key && prev.direction === "asc" ? "desc" : "asc",
      }));
    },
    [setSortConfig]
  );

  const handleSortClear = useCallback(() => {
    setSortConfig({ key: null, direction: "asc" });
  }, [setSortConfig]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm]
  );

  const handleFiltersToggle = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, [setShowFilters]);

  const handleTableExpandToggle = useCallback(() => {
    setIsTableExpanded((prev) => !prev);
  }, [setIsTableExpanded]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  // Bulk selection handlers - optimized
  const handleBulkSelectAll = useCallback(() => {
    const newBulkSelectAll = !bulkSelectAll;
    setBulkSelectAll(newBulkSelectAll);

    setCheckedFields((prevChecked) => {
      const newCheckedFields = [...prevChecked];

      // Create a Set for faster lookups
      const paginatedFieldsSet = new Set(paginatedFields);

      editedFields.forEach((field, index) => {
        if (paginatedFieldsSet.has(field)) {
          newCheckedFields[index] = newBulkSelectAll;
        }
      });

      return newCheckedFields;
    });
  }, [
    bulkSelectAll,
    paginatedFields,
    editedFields,
    setCheckedFields,
    setBulkSelectAll,
  ]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isTableExpanded,
    currentPage,
    totalPages,
    totalItems: editedFields.length,
    onTableExpandToggle: () => setIsTableExpanded(!isTableExpanded),
    onBulkSelectAll: handleBulkSelectAll,
    onGoToPage: goToPage,
  });

  // Row management functions - optimized
  const createDummyRow = useCallback(
    (): Werkbrief["fields"][0] => ({
      "Item Description": "New Product Description",
      "GOEDEREN OMSCHRIJVING": "",
      "GOEDEREN CODE": "00000000",
      CTNS: 1.0,
      STKS: 1.0,
      BRUTO: 1.0,
      FOB: 0.0,
      Confidence: "100%",
      "Page Number": undefined,
    }),
    []
  );

  const insertRowAt = useCallback(
    (index: number) => {
      const newRow = createDummyRow();
      setEditedFields((prev) => {
        const newEditedFields = [...prev];
        newEditedFields.splice(index, 0, newRow);
        return newEditedFields;
      });
      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        newCheckedFields.splice(index, 0, true);
        return newCheckedFields;
      });
    },
    [createDummyRow, setEditedFields, setCheckedFields]
  );

  const moveRow = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        toIndex < 0 ||
        toIndex >= editedFields.length
      ) {
        return;
      }

      setEditedFields((prev) => {
        const newEditedFields = [...prev];
        const [movedRow] = newEditedFields.splice(fromIndex, 1);
        newEditedFields.splice(toIndex, 0, movedRow);
        return newEditedFields;
      });

      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        const [movedCheck] = newCheckedFields.splice(fromIndex, 1);
        newCheckedFields.splice(toIndex, 0, movedCheck);
        return newCheckedFields;
      });
    },
    [editedFields.length, setEditedFields, setCheckedFields]
  );

  const deleteRow = useCallback(
    (index: number) => {
      const deletedBatch: DeletedBatch = {
        rows: [
          {
            data: editedFields[index],
            checked: checkedFields[index],
            index,
          },
        ],
        timestamp: Date.now(),
      };

      setDeletedRows((prev) => [...prev, deletedBatch]);

      setEditedFields((prev) => {
        const newEditedFields = [...prev];
        newEditedFields.splice(index, 1);
        return newEditedFields;
      });
      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        newCheckedFields.splice(index, 1);
        return newCheckedFields;
      });

      setShowUndoNotification(true);
    },
    [
      editedFields,
      checkedFields,
      setEditedFields,
      setCheckedFields,
      setDeletedRows,
      setShowUndoNotification,
    ]
  );

  const undoLastDeletion = useCallback(() => {
    if (deletedRows.length === 0) return;

    const lastDeletedBatch = deletedRows[deletedRows.length - 1];

    // Restore all rows from the batch in reverse order to maintain original indices
    const sortedRows = [...lastDeletedBatch.rows].sort(
      (a, b) => a.index - b.index
    );

    setEditedFields((prevFields) => {
      const newEditedFields = [...prevFields];
      sortedRows.forEach((row) => {
        const insertIndex = Math.min(row.index, newEditedFields.length);
        newEditedFields.splice(insertIndex, 0, row.data);
      });
      return newEditedFields;
    });

    setCheckedFields((prevChecked) => {
      const newCheckedFields = [...prevChecked];
      sortedRows.forEach((row) => {
        const insertIndex = Math.min(row.index, newCheckedFields.length);
        newCheckedFields.splice(insertIndex, 0, row.checked);
      });
      return newCheckedFields;
    });

    setDeletedRows((prev) => prev.slice(0, -1));
    setShowUndoNotification(false);
  }, [
    deletedRows,
    setEditedFields,
    setCheckedFields,
    setDeletedRows,
    setShowUndoNotification,
  ]);

  const handleUndoDismiss = useCallback(() => {
    setShowUndoNotification(false);
  }, [setShowUndoNotification]);

  // Delete mode handlers
  const handleToggleDeleteMode = useCallback(() => {
    setIsDeleteMode((prev) => !prev);
    // Clear selection when toggling mode
    if (!isDeleteMode) {
      setSelectedForDeletion([]);
      setDeleteSelectAll(false);
    }
  }, [
    isDeleteMode,
    setIsDeleteMode,
    setSelectedForDeletion,
    setDeleteSelectAll,
  ]);

  const handleDeleteSelectAll = useCallback(() => {
    const newDeleteSelectAll = !deleteSelectAll;
    setDeleteSelectAll(newDeleteSelectAll);

    setSelectedForDeletion((prevSelected) => {
      const newSelectedForDeletion = [...prevSelected];

      // Create a Set for faster lookups
      const paginatedFieldsSet = new Set(paginatedFields);

      editedFields.forEach((field, index) => {
        if (paginatedFieldsSet.has(field)) {
          newSelectedForDeletion[index] = newDeleteSelectAll;
        }
      });

      return newSelectedForDeletion;
    });
  }, [
    deleteSelectAll,
    paginatedFields,
    editedFields,
    setSelectedForDeletion,
    setDeleteSelectAll,
  ]);

  const handleToggleDeleteSelection = useCallback(
    (index: number) => {
      setSelectedForDeletion((prev) => {
        const newSelected = [...prev];
        newSelected[index] = !newSelected[index];
        return newSelected;
      });
    },
    [setSelectedForDeletion]
  );

  const handleBatchDelete = useCallback(() => {
    const indicesToDelete = selectedForDeletion
      .map((selected, index) => (selected ? index : -1))
      .filter((index) => index !== -1)
      .reverse(); // Delete from end to maintain indices

    if (indicesToDelete.length === 0) {
      return;
    }

    // Store all deleted rows as a single batch
    const deletedBatch: DeletedBatch = {
      rows: indicesToDelete.reverse().map((index) => ({
        // Reverse back to original order for restoration
        data: editedFields[index],
        checked: checkedFields[index],
        index,
      })),
      timestamp: Date.now(),
    };

    setDeletedRows((prev) => [...prev, deletedBatch]);

    // Remove all selected rows (still using reverse indices for deletion)
    const reversedIndices = [...indicesToDelete].reverse();
    setEditedFields((prev) => {
      const newEditedFields = [...prev];
      reversedIndices.forEach((index) => {
        newEditedFields.splice(index, 1);
      });
      return newEditedFields;
    });

    setCheckedFields((prev) => {
      const newCheckedFields = [...prev];
      reversedIndices.forEach((index) => {
        newCheckedFields.splice(index, 1);
      });
      return newCheckedFields;
    });

    // Clear delete selection
    setSelectedForDeletion([]);
    setDeleteSelectAll(false);
    setShowUndoNotification(true);
  }, [
    selectedForDeletion,
    editedFields,
    checkedFields,
    setEditedFields,
    setCheckedFields,
    setDeletedRows,
    setSelectedForDeletion,
    setDeleteSelectAll,
    setShowUndoNotification,
  ]);

  // Merge mode handlers
  const handleToggleMergeMode = useCallback(() => {
    setIsMergeMode((prev) => !prev);
    // Clear selection when toggling mode
    if (!isMergeMode) {
      setSelectedForMerge([]);
      setMergeSelectAll(false);
    }
  }, [isMergeMode, setIsMergeMode, setSelectedForMerge, setMergeSelectAll]);

  const handleMergeSelectAll = useCallback(() => {
    const newMergeSelectAll = !mergeSelectAll;
    setMergeSelectAll(newMergeSelectAll);

    setSelectedForMerge((prevSelected) => {
      const newSelectedForMerge = [...prevSelected];

      // Create a Set for faster lookups
      const paginatedFieldsSet = new Set(paginatedFields);

      editedFields.forEach((field, index) => {
        if (paginatedFieldsSet.has(field)) {
          newSelectedForMerge[index] = newMergeSelectAll;
        }
      });

      return newSelectedForMerge;
    });
  }, [
    mergeSelectAll,
    paginatedFields,
    editedFields,
    setSelectedForMerge,
    setMergeSelectAll,
  ]);

  const handleToggleMergeSelection = useCallback(
    (index: number) => {
      setSelectedForMerge((prev) => {
        const newSelected = [...prev];
        newSelected[index] = !newSelected[index];
        return newSelected;
      });
    },
    [setSelectedForMerge]
  );

  const handleBatchMerge = useCallback(() => {
    const indicesToMerge = selectedForMerge
      .map((selected, index) => (selected ? index : -1))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b); // Sort ascending to keep first item

    if (indicesToMerge.length < 2) {
      alert("Please select at least 2 items to merge.");
      return;
    }

    // Take the first item as the base
    const firstIndex = indicesToMerge[0];
    const mergedItem = { ...editedFields[firstIndex] };

    // Sum up CTNS, STKS, BRUTO, FOB from all selected items
    indicesToMerge.forEach((index) => {
      if (index !== firstIndex) {
        const item = editedFields[index];
        mergedItem.CTNS += item.CTNS;
        mergedItem.STKS += item.STKS;
        mergedItem.BRUTO += item.BRUTO;
        mergedItem.FOB += item.FOB;
      }
    });

    // Remove all selected items except the first one
    const indicesToRemove = indicesToMerge.slice(1).reverse();

    // Perform all state updates together
    setEditedFields((prev) => {
      const newEditedFields = [...prev];
      // Update the first item with merged values
      newEditedFields[firstIndex] = mergedItem;
      // Remove other items
      indicesToRemove.forEach((index) => {
        newEditedFields.splice(index, 1);
      });
      return newEditedFields;
    });

    setCheckedFields((prev) => {
      const newCheckedFields = [...prev];
      // Remove other items' checkboxes
      indicesToRemove.forEach((index) => {
        newCheckedFields.splice(index, 1);
      });
      return newCheckedFields;
    });

    // Show toast notification with merge details
    const mergedRowsList = indicesToMerge.map((idx) => idx + 1).join(", ");
    const resultingIndex = firstIndex + 1;
    addToast(
      `Successfully merged rows [${mergedRowsList}] into row ${resultingIndex}`,
      "success"
    );

    // Clear merge selection and exit merge mode immediately
    setSelectedForMerge([]);
    setMergeSelectAll(false);
    setIsMergeMode(false);
  }, [
    selectedForMerge,
    editedFields,
    setEditedFields,
    setCheckedFields,
    setSelectedForMerge,
    setMergeSelectAll,
    setIsMergeMode,
    addToast,
  ]);

  const selectedForMergeCount = useMemo(
    () => selectedForMerge.filter(Boolean).length,
    [selectedForMerge]
  );

  // Save werkbrief to history
  const saveToHistory = useCallback(async (werkbriefData: Werkbrief) => {
    try {
      const response = await fetch("/api/werkbrief/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          werkbrief: werkbriefData,
          metadata: {
            totalItems: werkbriefData.fields?.length || 0,
            totalPages: werkbriefData.totalPages,
            missingPages: werkbriefData.missingPages,
          },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Failed to save to history:", data.error);
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  }, []);

  // Load werkbrief from history
  const handleLoadFromHistory = useCallback(
    (werkbriefData: unknown) => {
      const parsed = WerkbriefSchema.safeParse(werkbriefData);
      if (parsed.success) {
        setResult(parsed.data);
        setEditedFields([]);
        setCheckedFields([]);
        setDeletedRows([]);
        setShowUndoNotification(false);
        setIsHistoryOpen(false);
      } else {
        alert("Invalid werkbrief data");
      }
    },
    [
      setResult,
      setEditedFields,
      setCheckedFields,
      setDeletedRows,
      setShowUndoNotification,
    ]
  );

  // Expand to Knowledge Base handler (admin only)
  const handleExpandToKB = useCallback(async () => {
    if (!isAdmin) {
      alert("Admin access required");
      return;
    }

    // Get all checked items
    const selectedItems = editedFields.filter(
      (_, index) => checkedFields[index]
    );

    if (selectedItems.length === 0) {
      alert("Please select at least one item to add to the knowledge base");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to add ${selectedItems.length} selected item(s) to the knowledge base?`
    );

    if (!confirmed) return;

    setIsExpandingToKB(true);

    try {
      const response = await fetch("/api/expand-werkbrief-to-kb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedItems,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store uploaded IDs for undo functionality
        if (data.uploadedIds) {
          setLastUploadedToKBIds(data.uploadedIds);
        }

        addToast(
          `Successfully added ${
            data.successCount
          } items to the knowledge base!${
            data.failedCount > 0
              ? ` ${data.failedCount} items failed to process.`
              : ""
          }`,
          "success"
        );
      } else {
        alert(`Failed to add items: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Expand to KB error:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsExpandingToKB(false);
    }
  }, [isAdmin, editedFields, checkedFields, setLastUploadedToKBIds, addToast]);

  // Undo KB upload handler (admin only)
  const handleUndoKBUpload = useCallback(async () => {
    if (!isAdmin) {
      alert("Admin access required");
      return;
    }

    if (lastUploadedToKBIds.length === 0) {
      alert("No recent knowledge base upload to undo");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the ${lastUploadedToKBIds.length} items that were just uploaded to the knowledge base? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsUndoingKBUpload(true);

    try {
      const response = await fetch("/api/delete-from-knowledgebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: lastUploadedToKBIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addToast(
          `Successfully removed ${result.deletedCount} items from the knowledge base`,
          "success"
        );
        setLastUploadedToKBIds([]);
      } else {
        alert(`Failed to undo: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Undo KB upload error:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsUndoingKBUpload(false);
    }
  }, [
    isAdmin,
    lastUploadedToKBIds,
    setLastUploadedToKBIds,
    setIsUndoingKBUpload,
    addToast,
  ]);

  // Generation function
  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setCopied(false);
    setIsTableLoading(true);
    setUploadProgress(null);

    setEditedFields([]);
    setCheckedFields([]);
    setDeletedRows([]);
    setShowUndoNotification(false);

    try {
      let fileKey: string | undefined;

      if (pdfFile) {
        setIsUploading(true);
        console.log("Uploading file to Spaces...");

        // Add file size check for user feedback
        const fileSizeMB = pdfFile.size / (1024 * 1024);
        console.log(`File size: ${fileSizeMB.toFixed(2)}MB`);

        // Simple upload for all file sizes
        const estimatedTime =
          fileSizeMB > 50
            ? "Large file - this may take several minutes..."
            : fileSizeMB > 10
            ? "Medium file - this may take a few moments..."
            : "Uploading...";

        setProgress({
          type: "progress",
          currentStep: estimatedTime,
        });

        const uploadResult = await uploadFileToSpacesWithProgress(
          pdfFile,
          (uploadProgressData) => {
            setUploadProgress(uploadProgressData);

            // Progress logging with speed and time estimates
            const speedMBps = uploadProgressData.speed / (1024 * 1024);
            const remainingMin = uploadProgressData.remainingTime / 60;

            console.log(
              `Upload progress: ${uploadProgressData.percentage.toFixed(1)}% ` +
                `(${speedMBps.toFixed(2)} MB/s, ${remainingMin.toFixed(
                  1
                )}min remaining)`
            );
          }
        );

        if (!uploadResult.success) {
          throw new Error(`Upload failed: ${uploadResult.error}`);
        }

        fileKey = uploadResult.fileKey;
        setLastFileKey(fileKey);
        setIsUploading(false);
        setUploadProgress(null);
        console.log("File uploaded successfully, fileKey:", fileKey);
      }

      const requestBody = {
        description: "Generate a werkbrief",
        fileKey,
        streaming: useStreaming,
      };

      console.log("Sending request to API with body:", requestBody);

      const response = await fetch("/api/werkbrief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to generate");
      }

      console.log("Response received, streaming:", useStreaming);

      if (useStreaming) {
        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;

          // Split by newline and process complete lines
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() && line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  const progressData = JSON.parse(jsonStr) as ProgressData;
                  setProgress(progressData);

                  if (progressData.type === "complete" && progressData.data) {
                    const parsed = WerkbriefSchema.safeParse(progressData.data);
                    if (parsed.success) {
                      setResult(parsed.data);
                      setIsTableLoading(false);
                      // Auto-save to history
                      saveToHistory(parsed.data);
                    } else {
                      console.error("Schema validation failed:", parsed.error);
                      throw new Error(
                        `Invalid response shape: ${parsed.error.message}`
                      );
                    }
                  } else if (progressData.type === "error") {
                    throw new Error(progressData.error || "Processing failed");
                  }
                }
              } catch (parseError) {
                console.error("Failed to parse progress data:", parseError);
                console.error("Problematic line:", line);
                // Don't throw here, continue processing other lines
              }
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim() && buffer.startsWith("data: ")) {
          try {
            const jsonStr = buffer.slice(6).trim();
            if (jsonStr) {
              const progressData = JSON.parse(jsonStr) as ProgressData;
              setProgress(progressData);

              if (progressData.type === "complete" && progressData.data) {
                const parsed = WerkbriefSchema.safeParse(progressData.data);
                if (parsed.success) {
                  setResult(parsed.data);
                  setIsTableLoading(false);
                  // Auto-save to history
                  saveToHistory(parsed.data);
                }
              }
            }
          } catch (parseError) {
            console.error("Failed to parse final buffer data:", parseError);
          }
        }
      } else {
        const data = await response.json();
        console.log("API Response:", data);

        const parsed = WerkbriefSchema.safeParse(data);
        if (!parsed.success) {
          console.error("Schema validation failed:", parsed.error);
          throw new Error(`Invalid response shape: ${parsed.error.message}`);
        }
        setResult(parsed.data);
        setIsTableLoading(false);
        // Auto-save to history
        saveToHistory(parsed.data);
      }
    } catch (e) {
      console.error("Error in onGenerate:", e);
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      setProgress({ type: "error", error: message });
      setIsTableLoading(false);

      // If streaming failed but we might have partial data, try to fallback
      if (useStreaming && !result) {
        console.log(
          "Streaming failed, attempting fallback to non-streaming..."
        );
        try {
          // Retry without streaming as a fallback
          setUseStreaming(false);
          setError(null);
          setProgress(null);

          const fallbackResponse = await fetch("/api/werkbrief", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: "Generate a werkbrief",
              fileKey: lastFileKey,
              streaming: false,
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const parsed = WerkbriefSchema.safeParse(fallbackData);
            if (parsed.success) {
              console.log("Fallback successful, setting result");
              setResult(parsed.data);
              setIsTableLoading(false);
              setError(null);
              return;
            }
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }
    } finally {
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Excel functions - optimized with useCallback
  const handleCopyToExcel = useCallback(async () => {
    if (!editedFields || editedFields.length === 0) return;

    try {
      const excelData = formatSelectedFieldsForExcel(
        editedFields,
        checkedFields
      );
      await copyToClipboard(excelData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, [editedFields, checkedFields, setCopied]);

  const handleDownloadExcel = useCallback(() => {
    if (!editedFields || editedFields.length === 0) return;

    try {
      downloadExcelFile(editedFields, checkedFields);
    } catch (error) {
      console.error("Failed to download Excel file:", error);
    }
  }, [editedFields, checkedFields]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-full mx-auto p-4 relative">
      {/* Floating History Button - Always Accessible */}
      <button
        onClick={() => setIsHistoryOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
        title="View werkbrief history (Always accessible)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-medium hidden group-hover:inline-block animate-in fade-in slide-in-from-right-2 duration-200">
          History
        </span>
      </button>

      {/* Collapsible Upload Section */}
      {isUploadSectionCollapsed ? (
        // Collapsed State - Show small expand button
        <div className="flex items-center justify-center w-full pt-4">
          <button
            onClick={() => setIsUploadSectionCollapsed(false)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all duration-200 hover:scale-105"
            title="Expand upload section"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span className="font-medium">Expand Upload Section</span>
          </button>
        </div>
      ) : (
        // Expanded State - Show full upload section
        <>
          <div className="flex items-center justify-between w-full pt-4">
            <div className="flex-1"></div>
            <Description />
            <div className="flex-1 flex justify-end">
              {hasTableData && (
                <button
                  onClick={() => setIsUploadSectionCollapsed(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Collapse upload section"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <FileUploadSection
            pdfFile={pdfFile}
            loading={loading}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            useStreaming={useStreaming}
            onFileSelect={setPdfFile}
            onGenerate={onGenerate}
            onStreamingToggle={setUseStreaming}
          />

          <UploadProgressBar
            uploadProgress={uploadProgress}
            isVisible={isUploading && !!uploadProgress}
          />

          {useStreaming && progress && (
            <WerkbriefProgress
              progress={progress}
              isVisible={
                loading ||
                progress.type === "complete" ||
                progress.type === "error"
              }
            />
          )}

          {error && (!useStreaming || !progress) && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </>
      )}

      {hasTableData && (
        <div className={tableContainerClasses}>
          <TableHeader
            searchTerm={searchTerm}
            showFilters={showFilters}
            isTableExpanded={isTableExpanded}
            totalFilteredItems={totalFilteredItems}
            totalItems={editedFields.length}
            copied={copied}
            missingPages={result?.missingPages}
            totalPages={result?.totalPages}
            onSearchChange={handleSearchChange}
            onFiltersToggle={handleFiltersToggle}
            onTableExpandToggle={handleTableExpandToggle}
            onDownload={handleDownloadExcel}
            onCopy={handleCopyToExcel}
            isDeleteMode={isDeleteMode}
            onToggleDeleteMode={handleToggleDeleteMode}
            onBatchDelete={handleBatchDelete}
            selectedForDeletionCount={selectedForDeletionCount}
            isMergeMode={isMergeMode}
            onToggleMergeMode={handleToggleMergeMode}
            onBatchMerge={handleBatchMerge}
            selectedForMergeCount={selectedForMergeCount}
            isAdmin={isAdmin}
            onExpandToKB={handleExpandToKB}
            isExpandingToKB={isExpandingToKB}
            onOpenHistory={() => setIsHistoryOpen(true)}
            lastUploadedToKBIds={lastUploadedToKBIds}
            onUndoKBUpload={handleUndoKBUpload}
            isUndoingKBUpload={isUndoingKBUpload}
          />

          <TableFilters
            showFilters={showFilters}
            itemsPerPage={itemsPerPage}
            totalItems={editedFields.length}
            sortConfig={sortConfig}
            onItemsPerPageChange={handleItemsPerPageChange}
            onSortClear={handleSortClear}
          />

          <TotalBrutoSection
            totalBruto={totalBruto}
            onTotalBrutoChange={handleTotalBrutoChange}
          />

          <UndoNotification
            isVisible={showUndoNotification && deletedRows.length > 0}
            onUndo={undoLastDeletion}
            onDismiss={handleUndoDismiss}
          />

          <DataTable
            isTableExpanded={isTableExpanded}
            isTableLoading={isTableLoading}
            paginatedFields={paginatedFields}
            editedFields={editedFields}
            result={result}
            checkedFields={checkedFields}
            sortConfig={sortConfig}
            bulkSelectAll={bulkSelectAll}
            searchTerm={searchTerm}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onSort={handleSort}
            onBulkSelectAll={handleBulkSelectAll}
            onCheckboxChange={handleCheckboxChange}
            onFieldChange={handleFieldChange}
            onInsertRow={insertRowAt}
            onDeleteRow={deleteRow}
            onMoveRow={moveRow}
            onClearSearch={handleClearSearch}
            isDeleteMode={isDeleteMode}
            deleteSelectAll={deleteSelectAll}
            onToggleDeleteMode={handleToggleDeleteMode}
            onDeleteSelectAll={handleDeleteSelectAll}
            selectedForDeletion={selectedForDeletion}
            onToggleDeleteSelection={handleToggleDeleteSelection}
            isMergeMode={isMergeMode}
            mergeSelectAll={mergeSelectAll}
            onToggleMergeMode={handleToggleMergeMode}
            onMergeSelectAll={handleMergeSelectAll}
            selectedForMerge={selectedForMerge}
            onToggleMergeSelection={handleToggleMergeSelection}
          />

          <TableFooter
            totalItems={editedFields.length}
            filteredItems={totalFilteredItems}
            selectedCount={selectedCount}
            currentPage={currentPage}
            totalPages={totalPages}
            onGoToPage={goToPage}
          />
        </div>
      )}

      {/* History Panel */}
      <WerkbriefHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadWerkbrief={handleLoadFromHistory}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default WerkBriefHome;
