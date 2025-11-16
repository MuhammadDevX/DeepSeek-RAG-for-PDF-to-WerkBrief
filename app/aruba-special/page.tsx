"use client";
import React, { useCallback, useMemo, useState } from "react";
import { ArubaDescription } from "./_components/ArubaDescription";
import { ArubaProgress } from "./_components/ArubaProgress";
import { ArubaFileUploadSection } from "./_components/ArubaFileUploadSection";
import { UploadProgressBar } from "../werkbrief-generator/_components/UploadProgressBar";
import { TableHeader } from "../werkbrief-generator/_components/TableHeader";
import { TableFooter } from "../werkbrief-generator/_components/TableFooter";
import { TableFilters } from "../werkbrief-generator/_components/TableFilters";
import { TotalBrutoSection } from "../werkbrief-generator/_components/TotalBrutoSection";
import { UndoNotification } from "../werkbrief-generator/_components/UndoNotification";
import { useArubaSpecial } from "@/contexts/ArubaSpecialContext";
import { uploadFileToSpacesWithProgress } from "@/lib/upload-utils";
import {
  downloadArubaExcelFile,
  formatArubaForClipboard,
  copyToClipboard,
} from "@/lib/excel-formatter";
import { ToastContainer } from "@/components/ui/toast";
import { TrackingNumberModal } from "@/components/TrackingNumberModal";
import { z } from "zod";
import { ArubaSpecialSchema } from "@/lib/ai/schema";
import { ArubaDataTable } from "./_components/ArubaDataTable";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useUser } from "@clerk/nextjs";

type ArubaSpecial = z.infer<typeof ArubaSpecialSchema>;
type ArubaField = ArubaSpecial["groups"][0]["fields"][0];

const ArubaSpecialPage = () => {
  // Check if user is admin
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  // Toast state
  const {
    pdfFiles,
    setPdfFiles,
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
    setLastFileKeys,
    uploadProgress,
    setUploadProgress,
    isUploading,
    setIsUploading,
    editedGroups,
    setEditedGroups,
    checkedFields,
    setCheckedFields,
    collapsedGroups,
    toggleGroupCollapse,
    bulkSelectAll,
    setBulkSelectAll,
    isUploadSectionCollapsed,
    setIsUploadSectionCollapsed,
    hasAutoCollapsed,
    isDeleteMode,
    setIsDeleteMode,
    selectedForDeletion,
    setSelectedForDeletion,
    deleteSelectAll,
    setDeleteSelectAll,
    isMergeMode,
    setIsMergeMode,
    selectedForMerge,
    setSelectedForMerge,
    mergeSelectAll,
    setMergeSelectAll,
    deletedRows,
    setDeletedRows,
    showUndoNotification,
    setShowUndoNotification,
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    isTableExpanded,
    setIsTableExpanded,
    lastUploadedToKBIds,
    setLastUploadedToKBIds,
  } = useArubaSpecial();

  // KB expansion state
  const [isExpandingToKB, setIsExpandingToKB] = useState(false);
  const [isUndoingKBUpload, setIsUndoingKBUpload] = useState(false);

  // Memoize expensive calculations
  const totalItems = useMemo(() => {
    return editedGroups.reduce((sum, group) => sum + group.fields.length, 0);
  }, [editedGroups]);

  // Filter and sort groups based on search term and sort config
  const filteredAndSortedGroups = useMemo(() => {
    let processedGroups = editedGroups.map((group) => ({ ...group }));

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      processedGroups = processedGroups
        .map((group) => ({
          ...group,
          fields: group.fields.filter((field) =>
            Object.values(field).some((value) =>
              String(value).toLowerCase().includes(lowerSearch)
            )
          ),
        }))
        .filter((group) => group.fields.length > 0);
    }

    // Apply sorting
    if (sortConfig.key) {
      processedGroups = processedGroups.map((group) => ({
        ...group,
        fields: [...group.fields].sort((a, b) => {
          const aVal = a[sortConfig.key!];
          const bVal = b[sortConfig.key!];

          // Handle numeric sorting
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
          }

          // Handle string sorting
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
          if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }),
      }));
    }

    return processedGroups;
  }, [editedGroups, searchTerm, sortConfig]);

  const totalFilteredItems = useMemo(() => {
    return filteredAndSortedGroups.reduce(
      (sum, group) => sum + group.fields.length,
      0
    );
  }, [filteredAndSortedGroups]);

  const selectedCount = useMemo(
    () => checkedFields.filter(Boolean).length,
    [checkedFields]
  );

  const hasTableData = useMemo(
    () =>
      (result && result.groups && result.groups.length > 0) ||
      editedGroups.length > 0,
    [result, editedGroups.length]
  );

  // Filters visibility state
  const [showFilters, setShowFilters] = useState(false);

  // Auto-collapse upload section when table data is available (only once)
  React.useEffect(() => {
    if (hasTableData && !hasAutoCollapsed.current) {
      setIsUploadSectionCollapsed(true);
      hasAutoCollapsed.current = true;
    }
  }, [hasTableData, hasAutoCollapsed, setIsUploadSectionCollapsed]);

  // Memoize table container classes
  const tableContainerClasses = useMemo(
    () =>
      `w-full transition-all duration-300 max-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden`,
    []
  );

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type?: "success" | "info" | "warning" | "error";
    }>
  >([]);

  // State for tracking number modal
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

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

  // Total Bruto Management (same logic as werkbrief)
  const [totalBruto, setTotalBruto] = React.useState<number>(0);

  // Calculate total bruto whenever editedGroups changes
  React.useEffect(() => {
    if (editedGroups.length > 0) {
      const total = editedGroups.reduce((sum, group) => {
        return (
          sum +
          group.fields.reduce((fieldSum, field) => {
            const bruto =
              typeof field.BRUTO === "number"
                ? field.BRUTO
                : parseFloat(String(field.BRUTO)) || 0;
            return fieldSum + bruto;
          }, 0)
        );
      }, 0);
      setTotalBruto(Number(total.toFixed(2)));
    } else {
      setTotalBruto(0);
    }
  }, [editedGroups]);

  // Redistribute bruto values based on FOB proportions (same logic as werkbrief)
  const redistributeBrutoValues = React.useCallback(
    (newTotalBruto: number) => {
      if (editedGroups.length === 0) return;

      // Flatten all fields from all groups
      const allFields: Array<{
        field: ArubaField;
        groupIndex: number;
        fieldIndex: number;
      }> = [];

      editedGroups.forEach((group, groupIndex) => {
        group.fields.forEach((field, fieldIndex) => {
          allFields.push({ field, groupIndex, fieldIndex });
        });
      });

      // Calculate total FOB
      const totalFOB = allFields.reduce((sum, { field }) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        return sum + fob;
      }, 0);

      if (totalFOB === 0) {
        return;
      }

      // Calculate redistributed values with minimum weight constraint
      const redistributedValues = allFields.map(({ field }) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        const newBruto = (newTotalBruto * fob) / totalFOB;
        // Apply minimum weight constraint: ensure weight is at least 0.01 kg
        const constrainedBruto = Math.max(newBruto, 0.01);
        return Number(constrainedBruto.toFixed(2));
      });

      // Handle excess due to minimum constraints
      let currentSum = redistributedValues.reduce(
        (sum, value) => sum + value,
        0
      );

      if (currentSum > newTotalBruto) {
        const excess = Number((currentSum - newTotalBruto).toFixed(2));

        // Find items that can be reduced
        const adjustableIndices = redistributedValues
          .map((value, index) => ({ value, index }))
          .filter((item) => item.value > 0.01)
          .sort((a, b) => b.value - a.value);

        // Distribute the excess reduction
        let remainingExcess = excess;
        for (const item of adjustableIndices) {
          if (remainingExcess <= 0) break;

          const maxReduction = Math.min(
            remainingExcess,
            Number((item.value - 0.01).toFixed(2))
          );

          if (maxReduction > 0) {
            redistributedValues[item.index] = Number(
              (redistributedValues[item.index] - maxReduction).toFixed(2)
            );
            remainingExcess = Number(
              (remainingExcess - maxReduction).toFixed(2)
            );
          }
        }
      }

      // Handle any remaining rounding difference
      currentSum = redistributedValues.reduce((sum, value) => sum + value, 0);
      const difference = Number((newTotalBruto - currentSum).toFixed(2));

      if (difference !== 0 && redistributedValues.length > 0) {
        let adjustmentIndex = 0;
        if (difference < 0) {
          adjustmentIndex = redistributedValues.findIndex(
            (value) => value + difference >= 0.01
          );
          if (adjustmentIndex === -1) adjustmentIndex = 0;
        }

        redistributedValues[adjustmentIndex] = Number(
          (redistributedValues[adjustmentIndex] + difference).toFixed(2)
        );

        if (redistributedValues[adjustmentIndex] < 0.01) {
          redistributedValues[adjustmentIndex] = 0.01;
        }
      }

      // Update the groups with redistributed values
      setEditedGroups((prev) => {
        const newGroups = JSON.parse(JSON.stringify(prev));
        let flatIndex = 0;

        newGroups.forEach((group: { fields: ArubaField[] }) => {
          group.fields.forEach((field: ArubaField) => {
            field.BRUTO = redistributedValues[flatIndex];
            flatIndex++;
          });
        });

        return newGroups;
      });
    },
    [editedGroups, setEditedGroups]
  );

  // Handle total bruto change (same as werkbrief)
  const handleTotalBrutoChange = React.useCallback(
    (value: string | number) => {
      const newTotal =
        typeof value === "number" ? value : parseFloat(String(value)) || 0;
      const roundedTotal = Number(newTotal.toFixed(2));
      setTotalBruto(roundedTotal);
      redistributeBrutoValues(roundedTotal);
    },
    [redistributeBrutoValues]
  );

  // Handle file selection (not upload yet)
  const handleFilesSelect = useCallback(
    (files: File[]) => {
      setPdfFiles(files);
    },
    [setPdfFiles]
  );

  // Handle generate button click
  const handleGenerate = useCallback(async () => {
    if (pdfFiles.length === 0) {
      addToast("Please select at least one PDF file", "warning");
      return;
    }

    console.log("🚀 Starting PDF processing...");
    console.log(`📄 Files to process: ${pdfFiles.length}`);

    setLoading(true);
    setError("");
    setProgress(null);
    setUploadProgress(null);
    setIsUploading(true);

    try {
      // Upload all files to Spaces
      console.log("📤 Starting file uploads...");
      const uploadedFiles: Array<{ fileKey: string; fileName: string }> = [];

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        console.log(
          `⬆️ Uploading file ${i + 1}/${pdfFiles.length}: ${file.name}`
        );

        const uploadResult = await uploadFileToSpacesWithProgress(
          file,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        if (uploadResult.success && uploadResult.fileKey) {
          uploadedFiles.push({
            fileKey: uploadResult.fileKey,
            fileName: file.name,
          });
          console.log(
            `✅ Upload successful: ${file.name} -> ${uploadResult.fileKey}`
          );
        } else {
          const errorMsg = uploadResult.error || "Upload failed";
          console.error(`❌ Upload failed for ${file.name}:`, errorMsg);
          throw new Error(`Upload failed for ${file.name}: ${errorMsg}`);
        }
      }

      console.log(`✅ All ${uploadedFiles.length} files uploaded successfully`);
      setLastFileKeys(uploadedFiles.map((f) => f.fileKey));
      setIsUploading(false);
      setUploadProgress(null);

      // Process PDFs via API
      console.log("🔄 Sending processing request to API...");
      const requestBody = {
        description:
          "Generate GOEDEREN CODE and OMSCHRIJVING for Aruba invoices",
        files: uploadedFiles,
        streaming: useStreaming,
      };
      console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch("/api/aruba-special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(
        `📡 API Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        let errorMessage = "Failed to process PDFs";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("❌ API Error Response:", errorData);
        } catch (e) {
          console.error("❌ Failed to parse error response:", e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        console.error("❌ No response body received");
        throw new Error("No response body");
      }

      console.log("📥 Processing response stream...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let messageCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("✅ Stream processing complete");
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              messageCount++;

              console.log(`📨 Stream message #${messageCount}:`, {
                type: data.type,
                step: data.currentStep,
                pdf: data.currentPDF,
                progress: data.processedPDFs
                  ? `${data.processedPDFs}/${data.totalPDFs}`
                  : undefined,
              });

              if (data.type === "progress") {
                setProgress(data);
              } else if (data.type === "complete" && data.data) {
                console.log("✅ Processing complete! Data received:", {
                  groups: data.data.groups?.length,
                  totalFields: data.data.groups?.reduce(
                    (sum: number, g: { fields: unknown[] }) =>
                      sum + g.fields.length,
                    0
                  ),
                });
                setResult(data.data);
                setEditedGroups(data.data.groups);
                setCheckedFields(
                  new Array(
                    data.data.groups.reduce(
                      (sum: number, group: { fields: unknown[] }) =>
                        sum + group.fields.length,
                      0
                    )
                  ).fill(false)
                );
                setProgress(data);
                addToast("PDFs processed successfully!", "success");
              } else if (data.type === "error") {
                console.error("❌ Processing error from API:", data.error);
                setError(data.error || "An error occurred");
                addToast(data.error || "An error occurred", "error");
              }
            } catch (parseError) {
              console.error("❌ Failed to parse stream message:", parseError);
              console.error("Raw line:", line);
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in handleGenerate:", err);
      console.error(
        "Error stack:",
        err instanceof Error ? err.stack : "No stack trace"
      );

      const errorMessage =
        err instanceof Error ? err.message : "Failed to process PDFs";

      // More detailed error message for users
      let userMessage = errorMessage;
      if (errorMessage.includes("Upload failed")) {
        userMessage = `Upload Error: ${errorMessage}`;
      } else if (errorMessage.includes("description is required")) {
        userMessage =
          "Configuration Error: Missing description parameter. Please contact support.";
      } else if (errorMessage.includes("HTTP")) {
        userMessage = `Server Error: ${errorMessage}`;
      }

      setError(userMessage);
      addToast(userMessage, "error");
    } finally {
      console.log("🏁 handleGenerate finished");
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [
    pdfFiles,
    setLoading,
    setError,
    setProgress,
    setUploadProgress,
    setIsUploading,
    setLastFileKeys,
    setResult,
    setEditedGroups,
    setCheckedFields,
    addToast,
    useStreaming,
  ]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!editedGroups || editedGroups.length === 0) return;

    const formattedData = formatArubaForClipboard(
      editedGroups as Array<{
        clientName: string;
        consigneeName?: string;
        freightCharge?: number;
        fields: Array<{
          "Item Description": string;
          "GOEDEREN OMSCHRIJVING": string;
          "GOEDEREN CODE": string;
          CTNS: number;
          STKS: number;
          BRUTO: number;
          FOB: number;
          Confidence: string;
          "Page Number": number;
        }>;
      }>,
      checkedFields
    );

    try {
      await copyToClipboard(formattedData);
      setCopied(true);
      addToast("Data copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      addToast("Failed to copy data", "error");
    }
  }, [editedGroups, checkedFields, setCopied, addToast]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!editedGroups || editedGroups.length === 0) return;
    // Open modal to get tracking information
    setIsTrackingModalOpen(true);
  }, [editedGroups]);

  // Handle download with tracking info
  const handleDownloadWithTracking = useCallback(
    (trackingNumber: string, split: number) => {
      if (!editedGroups || editedGroups.length === 0) return;

      try {
        downloadArubaExcelFile(
          editedGroups as Array<{
            clientName: string;
            consigneeName?: string;
            freightCharge?: number;
            fields: Array<{
              "Item Description": string;
              "GOEDEREN OMSCHRIJVING": string;
              "GOEDEREN CODE": string;
              CTNS: number;
              STKS: number;
              BRUTO: number;
              FOB: number;
              Confidence: string;
              "Page Number": number;
            }>;
          }>,
          checkedFields,
          "Client Data.xlsx",
          trackingNumber,
          split
        );
        addToast("Excel file downloaded!", "success");
        setIsTrackingModalOpen(false);
      } catch (error) {
        console.error("Download error:", error);
        addToast("Failed to download file", "error");
      }
    },
    [editedGroups, checkedFields, addToast]
  );

  // Expand to Knowledge Base handler (admin only)
  const handleExpandToKB = useCallback(async () => {
    if (!isAdmin) {
      alert("Admin access required");
      return;
    }

    // Flatten all fields from all groups
    const allFields: ArubaField[] = [];
    let globalIndex = 0;

    editedGroups.forEach((group) => {
      group.fields.forEach((field) => {
        if (checkedFields[globalIndex]) {
          allFields.push(field);
        }
        globalIndex++;
      });
    });

    if (allFields.length === 0) {
      alert("Please select at least one item to add to the knowledge base");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to add ${allFields.length} selected item(s) to the knowledge base?`
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
          items: allFields,
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
  }, [isAdmin, editedGroups, checkedFields, setLastUploadedToKBIds, addToast]);

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
  }, [isAdmin, lastUploadedToKBIds, setLastUploadedToKBIds, addToast]);

  // Handle checkbox change
  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      setCheckedFields((prev) => {
        const newChecked = [...prev];
        newChecked[index] = checked;
        return newChecked;
      });
    },
    [setCheckedFields]
  );

  // Handle bulk select all
  const handleBulkSelectAll = useCallback(() => {
    setBulkSelectAll((prev) => {
      const newValue = !prev;
      setCheckedFields((fields) => fields.map(() => newValue));
      return newValue;
    });
  }, [setBulkSelectAll, setCheckedFields]);

  // Handle field change
  const handleFieldChange = useCallback(
    (index: number, fieldName: keyof ArubaField, value: string | number) => {
      setEditedGroups((prevGroups) => {
        const newGroups = JSON.parse(JSON.stringify(prevGroups));
        let currentIndex = 0;

        for (const group of newGroups) {
          for (const field of group.fields) {
            if (currentIndex === index) {
              field[fieldName] = value;
              return newGroups;
            }
            currentIndex++;
          }
        }

        return newGroups;
      });
    },
    [setEditedGroups]
  );

  // Handle move row (renumbering)
  const handleMoveRow = useCallback(
    (fromGlobalIndex: number, toGlobalIndex: number) => {
      if (
        fromGlobalIndex === toGlobalIndex ||
        toGlobalIndex < 0 ||
        toGlobalIndex >= totalItems
      ) {
        return;
      }

      setEditedGroups((prevGroups) => {
        const newGroups = JSON.parse(JSON.stringify(prevGroups));

        // Flatten all fields with their group info
        const flattenedFields: Array<{
          field: ArubaField;
          groupIndex: number;
          clientName: string;
        }> = [];

        newGroups.forEach(
          (
            group: { fields: ArubaField[]; clientName: string },
            groupIdx: number
          ) => {
            group.fields.forEach((field: ArubaField) => {
              flattenedFields.push({
                field,
                groupIndex: groupIdx,
                clientName: group.clientName,
              });
            });
          }
        );

        // Move the field in the flattened array
        const [movedItem] = flattenedFields.splice(fromGlobalIndex, 1);
        flattenedFields.splice(toGlobalIndex, 0, movedItem);

        // Reconstruct groups from flattened array
        const reconstructedGroups: Array<{
          clientName: string;
          fields: ArubaField[];
        }> = [];

        flattenedFields.forEach((item) => {
          let targetGroup = reconstructedGroups.find(
            (g) => g.clientName === item.clientName
          );

          if (!targetGroup) {
            targetGroup = {
              clientName: item.clientName,
              fields: [],
            };
            reconstructedGroups.push(targetGroup);
          }

          targetGroup.fields.push(item.field);
        });

        return reconstructedGroups;
      });

      // Move the checkbox state as well
      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        const [movedCheck] = newCheckedFields.splice(fromGlobalIndex, 1);
        newCheckedFields.splice(toGlobalIndex, 0, movedCheck);
        return newCheckedFields;
      });
    },
    [totalItems, setEditedGroups, setCheckedFields]
  );

  // Handle delete single row
  const handleDeleteRow = useCallback(
    (index: number) => {
      setEditedGroups((prevGroups) => {
        const newGroups = JSON.parse(JSON.stringify(prevGroups));
        let currentIndex = 0;
        let deletedRow: ArubaField | null = null;
        let deletedGroupName = "";

        for (const group of newGroups) {
          for (let i = 0; i < group.fields.length; i++) {
            if (currentIndex === index) {
              deletedRow = group.fields[i];
              deletedGroupName = group.clientName;
              group.fields.splice(i, 1);

              // Remove group if empty
              if (group.fields.length === 0) {
                const groupIdx = newGroups.findIndex(
                  (g) => g.clientName === group.clientName
                );
                if (groupIdx !== -1) {
                  newGroups.splice(groupIdx, 1);
                }
              }

              // Store for undo
              if (deletedRow) {
                const batch: {
                  rows: Array<{
                    data: ArubaField;
                    checked: boolean;
                    globalIndex: number;
                    groupIndex: number;
                    clientName: string;
                  }>;
                  timestamp: number;
                } = {
                  rows: [
                    {
                      data: deletedRow,
                      checked: checkedFields[index] || false,
                      globalIndex: index,
                      groupIndex: 0,
                      clientName: deletedGroupName,
                    },
                  ],
                  timestamp: Date.now(),
                };
                setDeletedRows((prev) => [...prev, batch]);
                setShowUndoNotification(true);
              }

              return newGroups;
            }
            currentIndex++;
          }
        }

        return newGroups;
      });

      // Clear checkbox states
      setCheckedFields((prev) => {
        const newChecked = [...prev];
        newChecked.splice(index, 1);
        return newChecked;
      });
    },
    [
      setEditedGroups,
      setDeletedRows,
      setShowUndoNotification,
      setCheckedFields,
      checkedFields,
    ]
  );

  // Handle insert row
  const handleAddItem = useCallback(
    (index: number) => {
      setEditedGroups((prevGroups) => {
        const newGroups = JSON.parse(JSON.stringify(prevGroups));
        let currentIndex = 0;

        for (const group of newGroups) {
          for (let i = 0; i < group.fields.length; i++) {
            if (currentIndex === index) {
              // Create new blank field
              const newField: ArubaField = {
                "Item Description": "",
                "GOEDEREN OMSCHRIJVING": "",
                "GOEDEREN CODE": "",
                CTNS: 0,
                STKS: 0,
                BRUTO: 0,
                FOB: 0,
                Confidence: "0",
                "Page Number": 0,
              };

              // Insert after current index
              group.fields.splice(i + 1, 0, newField);
              return newGroups;
            }
            currentIndex++;
          }
        }

        return newGroups;
      });

      // Insert checkbox state
      setCheckedFields((prev) => {
        const newChecked = [...prev];
        newChecked.splice(index + 1, 0, false);
        return newChecked;
      });
    },
    [setEditedGroups, setCheckedFields]
  );

  // Handle batch delete
  const handleBatchDelete = useCallback(() => {
    const indicesToDelete: number[] = [];
    selectedForDeletion.forEach((isSelected, index) => {
      if (isSelected) indicesToDelete.push(index);
    });

    if (indicesToDelete.length === 0) return;

    const deletedBatch: Array<{
      data: ArubaField;
      checked: boolean;
      globalIndex: number;
      groupIndex: number;
      clientName: string;
    }> = [];

    setEditedGroups((prevGroups) => {
      const newGroups = JSON.parse(JSON.stringify(prevGroups));
      let currentIndex = 0;
      const toRemove: Array<{ groupIdx: number; fieldIdx: number }> = [];

      for (let groupIdx = 0; groupIdx < newGroups.length; groupIdx++) {
        const group = newGroups[groupIdx];
        for (let fieldIdx = 0; fieldIdx < group.fields.length; fieldIdx++) {
          if (indicesToDelete.includes(currentIndex)) {
            deletedBatch.push({
              data: group.fields[fieldIdx],
              checked: checkedFields[currentIndex] || false,
              globalIndex: currentIndex,
              groupIndex: fieldIdx,
              clientName: group.clientName,
            });
            toRemove.push({ groupIdx, fieldIdx });
          }
          currentIndex++;
        }
      }

      // Remove in reverse order to maintain indices
      toRemove.reverse().forEach(({ groupIdx, fieldIdx }) => {
        newGroups[groupIdx].fields.splice(fieldIdx, 1);
      });

      // Remove empty groups
      return newGroups.filter((group) => group.fields.length > 0);
    });

    // Store for undo
    setDeletedRows((prev) => [
      ...prev,
      { rows: deletedBatch, timestamp: Date.now() },
    ]);
    setShowUndoNotification(true);

    // Clear selections
    setSelectedForDeletion([]);
    setDeleteSelectAll(false);
    setIsDeleteMode(false);
  }, [
    selectedForDeletion,
    checkedFields,
    setEditedGroups,
    setDeletedRows,
    setShowUndoNotification,
    setSelectedForDeletion,
    setDeleteSelectAll,
    setIsDeleteMode,
  ]);

  // Handle merge rows
  const handleMergeRows = useCallback(() => {
    const indicesToMerge: number[] = [];
    selectedForMerge.forEach((isSelected, index) => {
      if (isSelected) indicesToMerge.push(index);
    });

    if (indicesToMerge.length < 2) {
      alert("Please select at least 2 rows to merge");
      return;
    }

    setEditedGroups((prevGroups) => {
      const newGroups = JSON.parse(JSON.stringify(prevGroups));
      let currentIndex = 0;
      const rowsToMerge: Array<{
        groupIdx: number;
        fieldIdx: number;
        field: ArubaField;
      }> = [];

      for (let groupIdx = 0; groupIdx < newGroups.length; groupIdx++) {
        const group = newGroups[groupIdx];
        for (let fieldIdx = 0; fieldIdx < group.fields.length; fieldIdx++) {
          if (indicesToMerge.includes(currentIndex)) {
            rowsToMerge.push({
              groupIdx,
              fieldIdx,
              field: group.fields[fieldIdx],
            });
          }
          currentIndex++;
        }
      }

      if (rowsToMerge.length < 2) return newGroups;

      // Merge into first row
      const firstRow = rowsToMerge[0];
      const mergedField = { ...firstRow.field };

      // Sum numeric fields
      mergedField.CTNS = rowsToMerge.reduce((sum, r) => sum + r.field.CTNS, 0);
      mergedField.STKS = rowsToMerge.reduce((sum, r) => sum + r.field.STKS, 0);
      mergedField.BRUTO = rowsToMerge.reduce(
        (sum, r) => sum + r.field.BRUTO,
        0
      );
      mergedField.FOB = rowsToMerge.reduce((sum, r) => sum + r.field.FOB, 0);

      // Combine text fields (take first non-empty)
      mergedField["Item Description"] = rowsToMerge
        .map((r) => r.field["Item Description"])
        .filter((d) => d.trim())
        .join(" | ");
      mergedField["GOEDEREN OMSCHRIJVING"] =
        rowsToMerge
          .map((r) => r.field["GOEDEREN OMSCHRIJVING"])
          .filter((d) => d.trim())[0] || "";
      mergedField["GOEDEREN CODE"] =
        rowsToMerge
          .map((r) => r.field["GOEDEREN CODE"])
          .filter((c) => c.trim())[0] || "";

      // Update first row
      newGroups[firstRow.groupIdx].fields[firstRow.fieldIdx] = mergedField;

      // Remove other rows (in reverse order)
      rowsToMerge
        .slice(1)
        .reverse()
        .forEach(({ groupIdx, fieldIdx }) => {
          newGroups[groupIdx].fields.splice(fieldIdx, 1);
        });

      // Remove empty groups
      return newGroups.filter((group) => group.fields.length > 0);
    });

    // Clear selections
    setSelectedForMerge([]);
    setMergeSelectAll(false);
    setIsMergeMode(false);
  }, [
    selectedForMerge,
    setEditedGroups,
    setSelectedForMerge,
    setMergeSelectAll,
    setIsMergeMode,
  ]);

  // Undo last deletion
  const undoLastDeletion = useCallback(() => {
    if (deletedRows.length === 0) return;

    const lastBatch = deletedRows[deletedRows.length - 1];

    setEditedGroups((prevGroups) => {
      const newGroups = JSON.parse(JSON.stringify(prevGroups));

      // Sort by original index to restore in correct order
      const sortedRows = [...lastBatch.rows].sort(
        (a, b) => a.globalIndex - b.globalIndex
      );

      sortedRows.forEach((deletedRow) => {
        // Find or create group
        let group = newGroups.find(
          (g) => g.clientName === deletedRow.clientName
        );
        if (!group) {
          group = { clientName: deletedRow.clientName, fields: [] };
          newGroups.push(group);
        }

        // Add row back to group
        group.fields.push(deletedRow.data);
      });

      return newGroups;
    });

    // Remove from deleted rows
    setDeletedRows((prev) => prev.slice(0, -1));
    setShowUndoNotification(false);
  }, [deletedRows, setEditedGroups, setDeletedRows, setShowUndoNotification]);

  // Toggle filters visibility
  const handleFiltersToggle = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // Sorting handlers
  const handleSort = useCallback(
    (key: keyof ArubaField) => {
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

  // Search handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm]
  );

  const handleTableExpandToggle = useCallback(() => {
    setIsTableExpanded((prev) => !prev);
  }, [setIsTableExpanded]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isTableExpanded,
    totalItems,
    onTableExpandToggle: handleTableExpandToggle,
    onBulkSelectAll: handleBulkSelectAll,
  });

  // Toggle delete mode
  const handleToggleDeleteMode = useCallback(() => {
    setIsDeleteMode((prev) => {
      if (!prev) {
        // Entering delete mode, clear merge selections
        setIsMergeMode(false);
        setSelectedForMerge([]);
        setMergeSelectAll(false);
      } else {
        // Exiting delete mode, clear delete selections
        setSelectedForDeletion([]);
        setDeleteSelectAll(false);
      }
      return !prev;
    });
  }, [
    setIsDeleteMode,
    setIsMergeMode,
    setSelectedForMerge,
    setMergeSelectAll,
    setSelectedForDeletion,
    setDeleteSelectAll,
  ]);

  // Toggle merge mode
  const handleToggleMergeMode = useCallback(() => {
    setIsMergeMode((prev) => {
      if (!prev) {
        // Entering merge mode, clear delete selections
        setIsDeleteMode(false);
        setSelectedForDeletion([]);
        setDeleteSelectAll(false);
      } else {
        // Exiting merge mode, clear merge selections
        setSelectedForMerge([]);
        setMergeSelectAll(false);
      }
      return !prev;
    });
  }, [
    setIsMergeMode,
    setIsDeleteMode,
    setSelectedForDeletion,
    setDeleteSelectAll,
    setSelectedForMerge,
    setMergeSelectAll,
  ]);

  // Toggle delete selection for single row
  const handleToggleDeleteSelection = useCallback(
    (index: number) => {
      setSelectedForDeletion((prev) => {
        const newSelection = [...prev];
        newSelection[index] = !newSelection[index];
        return newSelection;
      });
    },
    [setSelectedForDeletion]
  );

  // Toggle merge selection for single row
  const handleToggleMergeSelection = useCallback(
    (index: number) => {
      setSelectedForMerge((prev) => {
        const newSelection = [...prev];
        newSelection[index] = !newSelection[index];
        return newSelection;
      });
    },
    [setSelectedForMerge]
  );

  // Select all for deletion
  const handleDeleteSelectAll = useCallback(() => {
    setDeleteSelectAll((prev) => {
      const newValue = !prev;
      setSelectedForDeletion((fields) => fields.map(() => newValue));
      return newValue;
    });
  }, [setDeleteSelectAll, setSelectedForDeletion]);

  // Select all for merge
  const handleMergeSelectAll = useCallback(() => {
    setMergeSelectAll((prev) => {
      const newValue = !prev;
      setSelectedForMerge((fields) => fields.map(() => newValue));
      return newValue;
    });
  }, [setMergeSelectAll, setSelectedForMerge]);

  // Dismiss undo notification
  const handleUndoDismiss = useCallback(() => {
    setShowUndoNotification(false);
  }, [setShowUndoNotification]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-full mx-auto p-4 relative">
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
            <ArubaDescription />
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

          <ArubaFileUploadSection
            pdfFiles={pdfFiles}
            loading={loading}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            useStreaming={useStreaming}
            onFilesSelect={handleFilesSelect}
            onGenerate={handleGenerate}
            onStreamingToggle={setUseStreaming}
          />

          <UploadProgressBar
            uploadProgress={uploadProgress}
            isVisible={isUploading && !!uploadProgress}
          />

          {useStreaming && progress && (
            <ArubaProgress
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
            totalItems={totalItems}
            copied={copied}
            onSearchChange={handleSearchChange}
            onFiltersToggle={handleFiltersToggle}
            onTableExpandToggle={handleTableExpandToggle}
            onDownload={handleDownload}
            onCopy={handleCopy}
            isDeleteMode={isDeleteMode}
            onToggleDeleteMode={handleToggleDeleteMode}
            onBatchDelete={handleBatchDelete}
            selectedForDeletionCount={
              selectedForDeletion.filter(Boolean).length
            }
            isMergeMode={isMergeMode}
            onToggleMergeMode={handleToggleMergeMode}
            onBatchMerge={handleMergeRows}
            selectedForMergeCount={selectedForMerge.filter(Boolean).length}
            isAdmin={isAdmin}
            onExpandToKB={handleExpandToKB}
            isExpandingToKB={isExpandingToKB}
            lastUploadedToKBIds={lastUploadedToKBIds}
            onUndoKBUpload={handleUndoKBUpload}
            isUndoingKBUpload={isUndoingKBUpload}
          />

          <TableFilters
            showFilters={showFilters}
            itemsPerPage={totalItems}
            totalItems={totalItems}
            sortConfig={sortConfig}
            onItemsPerPageChange={() => {}}
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

          {/* Data Table */}
          <ArubaDataTable
            groups={
              filteredAndSortedGroups as Array<{
                clientName: string;
                fields: Array<{
                  "Item Description": string;
                  "GOEDEREN OMSCHRIJVING": string;
                  "GOEDEREN CODE": string;
                  CTNS: number;
                  STKS: number;
                  BRUTO: number;
                  FOB: number;
                  Confidence: string;
                  "Page Number": number;
                }>;
              }>
            }
            checkedFields={checkedFields}
            collapsedGroups={collapsedGroups}
            onToggleGroupCollapse={toggleGroupCollapse}
            onCheckboxChange={handleCheckboxChange}
            onFieldChange={handleFieldChange}
            onInsertRow={handleAddItem}
            onDeleteRow={handleDeleteRow}
            onMoveRow={handleMoveRow}
            bulkSelectAll={bulkSelectAll}
            onBulkSelectAll={handleBulkSelectAll}
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
            sortConfig={sortConfig}
            onSort={handleSort}
            isTableExpanded={isTableExpanded}
          />

          <TableFooter
            totalItems={totalItems}
            filteredItems={totalItems}
            selectedCount={selectedCount}
            currentPage={1}
            totalPages={1}
            onGoToPage={() => {}}
          />
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Tracking Number Modal */}
      <TrackingNumberModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        onConfirm={handleDownloadWithTracking}
      />
    </div>
  );
};

export default ArubaSpecialPage;
