"use client";
import React, { useCallback, useMemo, useState } from "react";
import { ArubaDescription } from "./_components/ArubaDescription";
import { ArubaProgress } from "./_components/ArubaProgress";
import { ArubaFileUploadSection } from "./_components/ArubaFileUploadSection";
import { UploadProgressBar } from "../werkbrief-generator/_components/UploadProgressBar";
import { TableHeader } from "../werkbrief-generator/_components/TableHeader";
import { TableFooter } from "../werkbrief-generator/_components/TableFooter";
import { useArubaSpecial } from "@/contexts/ArubaSpecialContext";
import { uploadFileToSpacesWithProgress } from "@/lib/upload-utils";
import {
  downloadArubaExcelFile,
  formatArubaForClipboard,
  copyToClipboard,
} from "@/lib/excel-formatter";
import { ToastContainer } from "@/components/ui/toast";
import { z } from "zod";
import { ArubaSpecialSchema } from "@/lib/ai/schema";
import { ArubaDataTable } from "./_components/ArubaDataTable";

type ArubaSpecial = z.infer<typeof ArubaSpecialSchema>;
type ArubaField = ArubaSpecial["groups"][0]["fields"][0];

const ArubaSpecialPage = () => {
  // Get state from context
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
  } = useArubaSpecial();

  // Memoize expensive calculations
  const totalItems = useMemo(() => {
    return editedGroups.reduce((sum, group) => sum + group.fields.length, 0);
  }, [editedGroups]);

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

    try {
      downloadArubaExcelFile(
        editedGroups as Array<{
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
        }>,
        checkedFields
      );
      addToast("Excel file downloaded!", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download file", "error");
    }
  }, [editedGroups, checkedFields, addToast]);

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
            searchTerm=""
            showFilters={false}
            isTableExpanded={false}
            totalFilteredItems={totalItems}
            totalItems={totalItems}
            copied={copied}
            onSearchChange={() => {}}
            onFiltersToggle={() => {}}
            onTableExpandToggle={() => {}}
            onDownload={handleDownload}
            onCopy={handleCopy}
            isDeleteMode={false}
            onToggleDeleteMode={() => {}}
            onBatchDelete={() => {}}
            selectedForDeletionCount={0}
            isMergeMode={false}
            onToggleMergeMode={() => {}}
            onBatchMerge={() => {}}
            selectedForMergeCount={0}
            isAdmin={false}
            onExpandToKB={() => {}}
            isExpandingToKB={false}
            onOpenHistory={() => {}}
            lastUploadedToKBIds={[]}
            onUndoKBUpload={() => {}}
            isUndoingKBUpload={false}
          />

          {/* Data Table */}
          <ArubaDataTable
            groups={
              editedGroups as Array<{
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
            bulkSelectAll={bulkSelectAll}
            onBulkSelectAll={handleBulkSelectAll}
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
    </div>
  );
};

export default ArubaSpecialPage;
