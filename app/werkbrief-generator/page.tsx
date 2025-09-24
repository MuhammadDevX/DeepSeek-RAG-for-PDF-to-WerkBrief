"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Description } from "./_components/Description";
import { WerkbriefProgress } from "./_components/WerkbriefProgress";
import TableRow from "./_components/TableRow";
import PDFUpload from "@/components/ui/pdf-upload";
import DebouncedInput from "@/components/ui/debounced-input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import {
  formatSelectedFieldsForExcel,
  copyToClipboard,
  downloadExcelFile,
} from "@/lib/excel-formatter";
import {
  Copy,
  Check,
  Undo2,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import styles from "./styles.module.css";

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

const WerkBriefHome = () => {
  // const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Werkbrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);

  // State for edited field values and checkbox states
  const [editedFields, setEditedFields] = useState<Werkbrief["fields"]>([]);
  const [checkedFields, setCheckedFields] = useState<boolean[]>([]);

  // State for deleted rows and undo functionality
  interface DeletedRow {
    data: Werkbrief["fields"][0];
    checked: boolean;
    index: number;
    timestamp: number;
  }
  const [deletedRows, setDeletedRows] = useState<DeletedRow[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // State for total bruto management
  const [totalBruto, setTotalBruto] = useState<number>(0);
  // Flag to prevent feedback loop during redistribution
  const [isRedistributing, setIsRedistributing] = useState<boolean>(false);

  // New UX states for better table management
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [bulkSelectAll, setBulkSelectAll] = useState<boolean>(false);

  // Initialize edited fields and checkboxes when result changes
  useEffect(() => {
    if (result?.fields) {
      setEditedFields(result.fields);
      // Set all checkboxes to true by default
      setCheckedFields(result.fields.map(() => true));
      // Reset pagination when new data arrives
      setCurrentPage(1);
      setSearchTerm("");
    }
  }, [result]);

  // Enhanced filtering and sorting logic
  const filteredAndSortedFields = useMemo(() => {
    let filtered = editedFields;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = editedFields.filter((field) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          field["Item Description"].toLowerCase().includes(searchLower) ||
          field["GOEDEREN OMSCHRIJVING"].toLowerCase().includes(searchLower) ||
          field["GOEDEREN CODE"].toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle numeric values
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        // Handle string values
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [editedFields, searchTerm, sortConfig]);

  // Pagination logic
  const paginatedFields = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedFields.slice(startIndex, endIndex);
  }, [filteredAndSortedFields, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedFields.length / itemsPerPage);
  const totalFilteredItems = filteredAndSortedFields.length;

  // Sorting handlers
  const handleSort = useCallback((key: keyof Werkbrief["fields"][0]) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Bulk selection handlers
  const handleBulkSelectAll = useCallback(() => {
    const newBulkSelectAll = !bulkSelectAll;
    setBulkSelectAll(newBulkSelectAll);

    if (newBulkSelectAll) {
      // Select all visible items on current page
      const newCheckedFields = [...checkedFields];
      paginatedFields.forEach((field) => {
        const originalIndex = editedFields.findIndex((f) => f === field);
        if (originalIndex !== -1) {
          newCheckedFields[originalIndex] = true;
        }
      });
      setCheckedFields(newCheckedFields);
    } else {
      // Deselect all visible items on current page
      const newCheckedFields = [...checkedFields];
      paginatedFields.forEach((field) => {
        const originalIndex = editedFields.findIndex((f) => f === field);
        if (originalIndex !== -1) {
          newCheckedFields[originalIndex] = false;
        }
      });
      setCheckedFields(newCheckedFields);
    }
  }, [bulkSelectAll, checkedFields, paginatedFields, editedFields]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "f":
            event.preventDefault();
            const searchInput = document.querySelector(
              'input[placeholder="Search items..."]'
            ) as HTMLInputElement;
            searchInput?.focus();
            break;
          case "a":
            if (editedFields.length > 0) {
              event.preventDefault();
              handleBulkSelectAll();
            }
            break;
          case "e":
            event.preventDefault();
            setIsTableExpanded(!isTableExpanded);
            break;
        }
      }

      // Arrow keys for pagination
      if (totalPages > 1) {
        switch (event.key) {
          case "ArrowLeft":
            if (event.ctrlKey && currentPage > 1) {
              event.preventDefault();
              goToPage(currentPage - 1);
            }
            break;
          case "ArrowRight":
            if (event.ctrlKey && currentPage < totalPages) {
              event.preventDefault();
              goToPage(currentPage + 1);
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isTableExpanded,
    currentPage,
    totalPages,
    goToPage,
    handleBulkSelectAll,
    editedFields.length,
  ]);

  // Calculate total bruto whenever editedFields changes
  useEffect(() => {
    if (editedFields.length > 0) {
      const total = editedFields.reduce((sum, field) => {
        const bruto =
          typeof field.BRUTO === "number"
            ? field.BRUTO
            : parseFloat(String(field.BRUTO)) || 0;
        return sum + bruto;
      }, 0);
      setTotalBruto(Number(total.toFixed(1)));
    } else {
      setTotalBruto(0);
    }
  }, [editedFields]);

  // Function to redistribute bruto values based on FOB proportions
  // Ensures that no item gets a weight below 0.1 kg, even with very small FOB values
  const redistributeBrutoValues = useCallback(
    (newTotalBruto: number) => {
      if (editedFields.length === 0) return;

      // Set redistribution flag to prevent feedback loop
      setIsRedistributing(true);

      // Calculate total FOB
      const totalFOB = editedFields.reduce((sum, field) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        return sum + fob;
      }, 0);

      if (totalFOB === 0) {
        setIsRedistributing(false);
        return;
      }

      // Calculate redistributed values with proper rounding and minimum weight constraint
      const redistributedValues = editedFields.map((field) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        const newBruto = (newTotalBruto * fob) / totalFOB;
        // Apply minimum weight constraint: ensure weight is at least 0.1 kg
        const constrainedBruto = Math.max(newBruto, 0.1);
        return Number(constrainedBruto.toFixed(1));
      });

      // Check if the sum exceeds the target due to minimum constraints
      let currentSum = redistributedValues.reduce(
        (sum, value) => sum + value,
        0
      );

      // If we exceeded the target due to minimum constraints, we need to redistribute the excess
      if (currentSum > newTotalBruto) {
        const excess = Number((currentSum - newTotalBruto).toFixed(1));

        // Find items that are above the minimum and can be reduced
        const adjustableIndices = redistributedValues
          .map((value, index) => ({ value, index }))
          .filter((item) => item.value > 0.1)
          .sort((a, b) => b.value - a.value); // Sort by weight descending

        // Distribute the excess reduction across adjustable items
        let remainingExcess = excess;
        for (const item of adjustableIndices) {
          if (remainingExcess <= 0) break;

          const maxReduction = Math.min(
            remainingExcess,
            Number((item.value - 0.1).toFixed(1))
          );

          if (maxReduction > 0) {
            redistributedValues[item.index] = Number(
              (redistributedValues[item.index] - maxReduction).toFixed(1)
            );
            remainingExcess = Number(
              (remainingExcess - maxReduction).toFixed(1)
            );
          }
        }

        // Recalculate the sum after adjustments
        currentSum = redistributedValues.reduce((sum, value) => sum + value, 0);
      }

      // Calculate the sum of redistributed values
      const redistributedSum = currentSum;
      const roundedSum = Number(redistributedSum.toFixed(1));

      // Calculate rounding difference and add it to the first element
      const difference = Number((newTotalBruto - roundedSum).toFixed(1));
      if (difference !== 0 && redistributedValues.length > 0) {
        // Find the first item that can accommodate the difference (above minimum if reducing)
        let adjustmentIndex = 0;
        if (difference < 0) {
          // If we need to reduce, find an item that won't go below minimum
          adjustmentIndex = redistributedValues.findIndex(
            (value) => value + difference >= 0.1
          );
          if (adjustmentIndex === -1) adjustmentIndex = 0; // Fallback to first item
        }

        redistributedValues[adjustmentIndex] = Number(
          (redistributedValues[adjustmentIndex] + difference).toFixed(1)
        );

        // Ensure the adjusted value doesn't go below minimum
        if (redistributedValues[adjustmentIndex] < 0.1) {
          redistributedValues[adjustmentIndex] = 0.1;
        }
      }

      // Update the fields with redistributed values
      setEditedFields((prev) => {
        return prev.map((field, index) => ({
          ...field,
          BRUTO: redistributedValues[index],
        }));
      });

      // Reset redistribution flag after a brief delay
      setTimeout(() => {
        setIsRedistributing(false);
      }, 50);
    },
    [editedFields]
  );

  // Handle total bruto change
  const handleTotalBrutoChange = useCallback(
    (value: string | number) => {
      const newTotal =
        typeof value === "number" ? value : parseFloat(String(value)) || 0;
      const roundedTotal = Number(newTotal.toFixed(1));
      setTotalBruto(roundedTotal);
      redistributeBrutoValues(roundedTotal);
    },
    [redistributeBrutoValues]
  );

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setCopied(false);
    setIsTableLoading(true);

    // Reset all table-related states when starting a new generation
    setEditedFields([]);
    setCheckedFields([]);
    setDeletedRows([]);
    setShowUndoNotification(false);

    try {
      const formData = new FormData();
      formData.append("description", "Generate a werkbrief");
      if (useStreaming) {
        formData.append("streaming", "true");
      }
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const response = await fetch("/api/werkbrief", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to generate");
      }

      if (useStreaming) {
        // Streaming mode
        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const progressData = JSON.parse(line.slice(6)) as ProgressData;
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
              } catch (parseError) {
                console.warn("Failed to parse progress data:", parseError);
              }
            }
          }
        }
      } else {
        // Non-streaming mode (original behavior)
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
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      setProgress({ type: "error", error: message });
      setIsTableLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToExcel = async () => {
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
  };

  const handleDownloadExcel = () => {
    if (!editedFields || editedFields.length === 0) return;

    try {
      downloadExcelFile(editedFields, checkedFields);
    } catch (error) {
      console.error("Failed to download Excel file:", error);
    }
  };

  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        newCheckedFields[index] = checked;
        return newCheckedFields;
      });
    },
    []
  );

  const handleFieldChange = useCallback(
    (
      index: number,
      fieldName: keyof Werkbrief["fields"][0],
      value: string | number
    ) => {
      // Convert value to appropriate type and apply precision
      let processedValue = value;
      if (
        fieldName === "BRUTO" ||
        fieldName === "FOB" ||
        fieldName === "CTNS" ||
        fieldName === "STKS"
      ) {
        const numValue =
          typeof value === "number" ? value : parseFloat(String(value)) || 0;
        processedValue = Number(numValue.toFixed(1));
      }

      setEditedFields((prev) => {
        const newEditedFields = [...prev];
        newEditedFields[index] = {
          ...newEditedFields[index],
          [fieldName]: processedValue,
        };
        return newEditedFields;
      });

      // If BRUTO was changed and it's not part of a redistribution, update total
      if (fieldName === "BRUTO" && !isRedistributing) {
        // Use setTimeout to ensure state is updated before calculating total
        setTimeout(() => {
          const newTotal = editedFields.reduce((sum, field, i) => {
            const bruto = i === index ? processedValue : field.BRUTO;
            const numBruto =
              typeof bruto === "number"
                ? bruto
                : parseFloat(String(bruto)) || 0;
            return sum + numBruto;
          }, 0);
          setTotalBruto(Number(newTotal.toFixed(1)));
        }, 0);
      }
    },
    [editedFields, isRedistributing]
  );

  // Function to create a dummy row with placeholder values
  const createDummyRow = (): Werkbrief["fields"][0] => ({
    "Item Description": "New Product Description",
    "GOEDEREN OMSCHRIJVING": "NIEUWE GOEDEREN",
    "GOEDEREN CODE": "00000000",
    CTNS: 1.0,
    STKS: 1.0,
    BRUTO: 1.0,
    FOB: 100.0,
    Confidence: "100%",
  });

  // Function to insert a row at a specific index
  const insertRowAt = useCallback((index: number) => {
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
  }, []);

  // Function to delete a row
  const deleteRow = useCallback(
    (index: number) => {
      const deletedRow: DeletedRow = {
        data: editedFields[index],
        checked: checkedFields[index],
        index,
        timestamp: Date.now(),
      };

      // Add to deleted rows for undo functionality
      setDeletedRows((prev) => [...prev, deletedRow]);

      // Remove from current arrays
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

      // Show undo notification
      setShowUndoNotification(true);
    },
    [editedFields, checkedFields]
  );

  // Function to undo the last deletion
  const undoLastDeletion = () => {
    if (deletedRows.length === 0) return;

    const lastDeleted = deletedRows[deletedRows.length - 1];
    const newEditedFields = [...editedFields];
    const newCheckedFields = [...checkedFields];

    // Insert the row back at its original position (or at the end if position is invalid)
    const insertIndex = Math.min(lastDeleted.index, newEditedFields.length);
    newEditedFields.splice(insertIndex, 0, lastDeleted.data);
    newCheckedFields.splice(insertIndex, 0, lastDeleted.checked);

    setEditedFields(newEditedFields);
    setCheckedFields(newCheckedFields);

    // Remove from deleted rows
    setDeletedRows((prev) => prev.slice(0, -1));
    setShowUndoNotification(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-7xl mx-auto">
      <Description />
      {/* <textarea
        className="w-full min-h-32 p-3 border rounded-md bg-transparent"
        placeholder="Beschrijf de rol, verantwoordelijkheden, sector, senioriteit, etc."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      /> */}
      <div className="flex flex-col items-center align-middle justify-center gap-4 w-full">
        <PDFUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button onClick={onGenerate} disabled={loading || !pdfFile}>
            {loading ? "Generating..." : "Generate Werkbrief"}
          </Button>

          {/* Progress Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="rounded"
              disabled={loading}
            />
            Show real-time progress
          </label>
        </div>
      </div>

      {/* Progress Display */}
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
      {(result && result.fields && result.fields.length > 0) ||
      editedFields.length > 0 ? (
        <div
          className={`w-full transition-all duration-300 ${
            isTableExpanded ? "max-w-none" : "max-w-7xl"
          } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden`}
        >
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Generated Werkbrief
                  </h2>
                  <button
                    onClick={() => setIsTableExpanded(!isTableExpanded)}
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
                  {totalFilteredItems} of {editedFields.length} items
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>

              {/* Search and Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className={`${styles.searchContainer} relative`}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <DebouncedInput
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(value) => setSearchTerm(String(value))}
                    className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
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
                    onClick={handleDownloadExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button
                    onClick={handleCopyToExcel}
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

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Items per page:
                      </label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) =>
                          handleItemsPerPageChange(Number(e.target.value))
                        }
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={editedFields.length}>All</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Sort:{" "}
                        {sortConfig.key
                          ? `${sortConfig.key} (${sortConfig.direction})`
                          : "None"}
                      </span>
                      {sortConfig.key && (
                        <button
                          onClick={() =>
                            setSortConfig({ key: null, direction: "asc" })
                          }
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Keyboard shortcuts hint */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="hidden lg:inline">
                      Shortcuts: Ctrl+F (Search) | Ctrl+A (Select All) | Ctrl+E
                      (Expand) | Ctrl+← → (Navigate)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Total Bruto Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total Bruto Weight:
                </span>
                <div className="flex items-center gap-2">
                  <DebouncedInput
                    type="number"
                    step="0.1"
                    value={totalBruto}
                    onChange={handleTotalBrutoChange}
                    className="w-32 text-lg font-bold text-green-700 dark:text-green-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    kg
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Edit to redistribute across all items based on FOB ratios
              </div>
            </div>
          </div>

          {/* Undo notification */}
          {showUndoNotification && deletedRows.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mx-6 mb-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Row deleted successfully
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={undoLastDeletion}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-600 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/60 hover:scale-105 transition-all duration-200 shadow-sm"
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo
                  </button>
                  <button
                    onClick={() => setShowUndoNotification(false)}
                    className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:scale-110 transition-all duration-200 p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    title="Dismiss notification"
                  >
                    <span className="text-xs font-medium mr-1">Dismiss</span>✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table Section with Enhanced Scrolling */}
          <div
            className={`${styles.tableContainer} relative ${
              isTableExpanded ? "h-[70vh]" : "max-h-[600px]"
            } overflow-auto`}
          >
            {/* Sticky table container */}
            <div className="min-w-full">
              <table className="w-full table-fixed">
                <thead className={`${styles.stickyHeader} sticky top-0 z-10`}>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 shadow-sm">
                    <th className="w-12 px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={bulkSelectAll}
                          onChange={handleBulkSelectAll}
                          className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-700 dark:border-gray-600"
                          title="Select/deselect all items on this page"
                        />
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="hidden lg:inline">Excel</span>
                      </div>
                    </th>
                    <th className="w-10 px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="hidden lg:inline">#</span>
                      </div>
                    </th>
                    <th className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                      Actions
                    </th>
                    <th
                      className={`${styles.sortHeader} w-72 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("Item Description")}
                    >
                      <div className="flex items-center gap-1">
                        Item Description
                        {sortConfig.key === "Item Description" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-40 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("GOEDEREN OMSCHRIJVING")}
                    >
                      <div className="flex items-center gap-1">
                        Goederen Omschrijving
                        {sortConfig.key === "GOEDEREN OMSCHRIJVING" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("GOEDEREN CODE")}
                    >
                      <div className="flex items-center gap-1">
                        Code
                        {sortConfig.key === "GOEDEREN CODE" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("CTNS")}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        CTNS
                        {sortConfig.key === "CTNS" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("STKS")}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        STKS
                        {sortConfig.key === "STKS" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-20 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("BRUTO")}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        Bruto
                        {sortConfig.key === "BRUTO" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className={`${styles.sortHeader} w-25 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                      onClick={() => handleSort("FOB")}
                    >
                      <div className="flex items-center gap-1 justify-center">
                        FOB
                        {sortConfig.key === "FOB" && (
                          <span className={styles.sortIcon}>
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                      Conf.
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                  {/* Loading skeleton */}
                  {isTableLoading &&
                    Array.from({ length: 3 }, (_, index) => (
                      <tr key={`loading-${index}`} className="animate-pulse">
                        <td className="px-2 py-3 text-center">
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto"></div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto"></div>
                        </td>
                      </tr>
                    ))}

                  {/* Regular table rows */}
                  {!isTableLoading &&
                    paginatedFields.map((field) => {
                      // Calculate the original index in the full editedFields array
                      const originalIndex = editedFields.findIndex(
                        (f) => f === field
                      );
                      const originalField =
                        result?.fields?.[originalIndex] || field;
                      const isChecked = checkedFields[originalIndex] || false;

                      return (
                        <TableRow
                          key={originalIndex}
                          field={field}
                          originalField={originalField}
                          index={originalIndex}
                          isChecked={isChecked}
                          onCheckboxChange={handleCheckboxChange}
                          onFieldChange={handleFieldChange}
                          onInsertRow={insertRowAt}
                          onDeleteRow={deleteRow}
                        />
                      );
                    })}

                  {/* Empty state */}
                  {!isTableLoading && paginatedFields.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          {searchTerm ? (
                            <>
                              <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
                              <p className="text-lg font-medium mb-2">
                                No items found
                              </p>
                              <p className="text-sm">
                                Try adjusting your search terms or clear the
                                search to see all items.
                              </p>
                              <button
                                onClick={() => setSearchTerm("")}
                                className="mt-3 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                Clear Search
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <Search className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-lg font-medium mb-2">
                                No data available
                              </p>
                              <p className="text-sm">
                                Generate a werkbrief to see results here.
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced scroll indicators */}
            {totalPages > 1 && !isTableLoading && (
              <div
                className={`${styles.scrollIndicator} absolute right-2 top-20 bottom-20 w-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden opacity-60 hover:opacity-100 transition-all duration-300 group`}
              >
                <div
                  className="w-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-full transition-all duration-300 shadow-sm"
                  style={{
                    height: `${Math.max(
                      20,
                      Math.min(100, (itemsPerPage / editedFields.length) * 100)
                    )}%`,
                    transform: `translateY(${
                      ((currentPage - 1) / Math.max(1, totalPages - 1)) *
                      (100 -
                        Math.max(
                          20,
                          Math.min(
                            100,
                            (itemsPerPage / editedFields.length) * 100
                          )
                        ))
                    }%)`,
                  }}
                />

                {/* Page indicator tooltip */}
                <div className="absolute top-1/2 -right-16 transform -translate-y-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Footer with Pagination */}
          <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Total Items: {editedFields.length} | Filtered:{" "}
                  {totalFilteredItems} | Selected for Export:{" "}
                  {checkedFields.filter(Boolean).length}
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
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className={`${styles.paginationButton} px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    First
                  </button>

                  <button
                    onClick={() => goToPage(currentPage - 1)}
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
                          onClick={() => goToPage(pageNum)}
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
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`${styles.paginationButton} p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`${styles.paginationButton} px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WerkBriefHome;
