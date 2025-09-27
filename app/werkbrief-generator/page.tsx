"use client";
import React, { useState, useCallback, useMemo } from "react";
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
import { useTableData } from "./_components/hooks/useTableData";
import { useKeyboardShortcuts } from "./_components/hooks/useKeyboardShortcuts";
import { useBrutoManagement } from "./_components/hooks/useBrutoManagement";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import {
  uploadFileToSpacesWithProgress,
  UploadProgress,
} from "@/lib/upload-utils";
import {
  formatSelectedFieldsForExcel,
  copyToClipboard,
  downloadExcelFile,
} from "@/lib/excel-formatter";

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
  timestamp: number;
}

const WerkBriefHome = () => {
  // Core state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Werkbrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [lastFileKey, setLastFileKey] = useState<string | undefined>(undefined);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(100);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [bulkSelectAll, setBulkSelectAll] = useState<boolean>(false);

  // Deleted rows state
  const [deletedRows, setDeletedRows] = useState<DeletedRow[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Custom hooks
  const {
    editedFields,
    checkedFields,
    filteredAndSortedFields,
    paginatedFields,
    totalPages,
    setEditedFields,
    setCheckedFields,
    handleFieldChange,
    handleCheckboxChange,
  } = useTableData({
    result,
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
  const hasTableData = useMemo(
    () =>
      (result && result.fields && result.fields.length > 0) ||
      editedFields.length > 0,
    [result, editedFields.length]
  );

  // Memoize table expansion classes to prevent recalculation
  const tableContainerClasses = useMemo(
    () =>
      `w-full transition-all duration-300 ${
        isTableExpanded ? "max-w-none" : "max-w-7xl"
      } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden`,
    [isTableExpanded]
  );

  // Pagination logic - memoized
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // Sorting handlers - optimized
  const handleSort = useCallback((key: keyof Werkbrief["fields"][0]) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleSortClear = useCallback(() => {
    setSortConfig({ key: null, direction: "asc" });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFiltersToggle = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const handleTableExpandToggle = useCallback(() => {
    setIsTableExpanded((prev) => !prev);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

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
  }, [bulkSelectAll, paginatedFields, editedFields, setCheckedFields]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isTableExpanded,
    currentPage,
    totalPages,
    editedFieldsLength: editedFields.length,
    onTableExpandToggle: () => setIsTableExpanded(!isTableExpanded),
    onBulkSelectAll: handleBulkSelectAll,
    onGoToPage: goToPage,
  });

  // Row management functions - optimized
  const createDummyRow = useCallback(
    (): Werkbrief["fields"][0] => ({
      "Item Description": "New Product Description",
      "GOEDEREN OMSCHRIJVING": "NIEUWE GOEDEREN",
      "GOEDEREN CODE": "00000000",
      CTNS: 1.0,
      STKS: 1.0,
      BRUTO: 1.0,
      FOB: 100.0,
      Confidence: "100%",
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

  const deleteRow = useCallback(
    (index: number) => {
      const deletedRow: DeletedRow = {
        data: editedFields[index],
        checked: checkedFields[index],
        index,
        timestamp: Date.now(),
      };

      setDeletedRows((prev) => [...prev, deletedRow]);

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
    [editedFields, checkedFields, setEditedFields, setCheckedFields]
  );

  const undoLastDeletion = useCallback(() => {
    if (deletedRows.length === 0) return;

    const lastDeleted = deletedRows[deletedRows.length - 1];

    setEditedFields((prevFields) => {
      const newEditedFields = [...prevFields];
      const insertIndex = Math.min(lastDeleted.index, newEditedFields.length);
      newEditedFields.splice(insertIndex, 0, lastDeleted.data);
      return newEditedFields;
    });

    setCheckedFields((prevChecked) => {
      const newCheckedFields = [...prevChecked];
      const insertIndex = Math.min(lastDeleted.index, newCheckedFields.length);
      newCheckedFields.splice(insertIndex, 0, lastDeleted.checked);
      return newCheckedFields;
    });

    setDeletedRows((prev) => prev.slice(0, -1));
    setShowUndoNotification(false);
  }, [deletedRows, setEditedFields, setCheckedFields]);

  const handleUndoDismiss = useCallback(() => {
    setShowUndoNotification(false);
  }, []);

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
  }, [editedFields, checkedFields]);

  const handleDownloadExcel = useCallback(() => {
    if (!editedFields || editedFields.length === 0) return;

    try {
      downloadExcelFile(editedFields, checkedFields);
    } catch (error) {
      console.error("Failed to download Excel file:", error);
    }
  }, [editedFields, checkedFields]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-7xl mx-auto">
      <Description />

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
            loading || progress.type === "complete" || progress.type === "error"
          }
        />
      )}

      {error && (!useStreaming || !progress) && (
        <div className="text-red-500 text-sm">{error}</div>
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
            onSearchChange={handleSearchChange}
            onFiltersToggle={handleFiltersToggle}
            onTableExpandToggle={handleTableExpandToggle}
            onDownload={handleDownloadExcel}
            onCopy={handleCopyToExcel}
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
            onClearSearch={handleClearSearch}
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
    </div>
  );
};

export default WerkBriefHome;
