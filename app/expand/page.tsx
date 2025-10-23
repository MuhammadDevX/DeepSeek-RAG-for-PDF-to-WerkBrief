"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import UploadExcel from "./_components/UploadExcel";
import PineconeProgress from "./_components/PineconeProgress";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload, Database, Plus } from "lucide-react";
import { AddItemToKnowledgebaseModal } from "@/components/AddItemToKnowledgebaseModal";

interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

interface ExcelData {
  rows: ExcelRow[];
  columns: string[];
  sheetName: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  columns?: string[];
  requiredColumns?: string[];
  missingColumns?: string[];
}

interface UploadResult {
  success: boolean;
  message: string;
  uploadedCount?: number;
  failedCount?: number;
  totalRows?: number;
  columns?: string[];
  error?: string;
  uploadedIds?: string[]; // Add uploaded IDs for undo functionality
}

interface ProgressData {
  totalVectors: number;
  processedVectors: number;
  successfulVectors: number;
  failedVectors: number;
  currentBatch: number;
  totalBatches: number;
  status:
    | "processing"
    | "embedding"
    | "upserting"
    | "retrying"
    | "complete"
    | "error";
  message?: string;
}

export default function ExpandPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [lastUploadedIds, setLastUploadedIds] = useState<string[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const [singleItemId, setSingleItemId] = useState<string | null>(null);

  const handleFileSelect = (
    file: File | null,
    parsedExcelData?: ExcelData,
    validation?: ValidationResult
  ) => {
    setSelectedFile(file);
    setExcelData(parsedExcelData || null);
    setValidationResult(validation || null);
    setUploadResult(null);
    setLastUploadedIds([]); // Clear previous upload IDs
    setSingleItemId(null); // Clear single item ID when selecting new file
  };

  const handleUndo = async () => {
    if (lastUploadedIds.length === 0 && !singleItemId) {
      alert("No recent upload to undo");
      return;
    }

    const idsToDelete = singleItemId ? [singleItemId] : lastUploadedIds;
    const itemCount = idsToDelete.length;

    const confirmed = window.confirm(
      `Are you sure you want to delete the ${itemCount} item${
        itemCount > 1 ? "s" : ""
      } that ${
        itemCount > 1 ? "were" : "was"
      } just uploaded to the knowledge base? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsUndoing(true);

    try {
      const response = await fetch("/api/delete-from-knowledgebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: idsToDelete,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Successfully removed ${result.deletedCount} item${
            result.deletedCount > 1 ? "s" : ""
          } from the knowledge base`
        );
        setLastUploadedIds([]);
        setSingleItemId(null);
        setUploadResult(null);
      } else {
        alert(`Failed to undo: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Undo error:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setIsUndoing(false);
    }
  };

  const handleUpload = async () => {
    if (!excelData || !validationResult?.isValid) return;

    setIsUploading(true);
    setUploadResult(null);
    setProgress(null);

    try {
      if (useStreaming) {
        // Use streaming for real-time progress updates
        const response = await fetch("/api/expand-knowledgebase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            excelData: excelData,
            streaming: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === "" || !line.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

                if (data.type === "progress") {
                  setProgress(data.data);
                } else if (data.type === "complete") {
                  setUploadResult(data.data);
                  setProgress(null);
                  // Store uploaded IDs for undo functionality
                  if (data.data.uploadedIds) {
                    setLastUploadedIds(data.data.uploadedIds);
                  }
                  if (data.data.success) {
                    // Reset form after successful upload
                    setTimeout(() => {
                      setSelectedFile(null);
                      setExcelData(null);
                      setValidationResult(null);
                      // Don't reset uploadResult and lastUploadedIds yet - keep for undo
                      if (document.querySelector('input[type="file"]')) {
                        (
                          document.querySelector(
                            'input[type="file"]'
                          ) as HTMLInputElement
                        ).value = "";
                      }
                    }, 5000);
                  }
                } else if (data.type === "error") {
                  setUploadResult(data.data);
                  setProgress(null);
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // Use regular upload without progress tracking
        const response = await fetch("/api/expand-knowledgebase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            excelData: excelData,
            streaming: false,
          }),
        });

        const result = await response.json();
        setUploadResult(result);

        // Store uploaded IDs for undo functionality
        if (result.uploadedIds) {
          setLastUploadedIds(result.uploadedIds);
        }

        if (result.success) {
          // Reset form after successful upload
          setTimeout(() => {
            setSelectedFile(null);
            setExcelData(null);
            setValidationResult(null);
            // Don't reset uploadResult and lastUploadedIds yet - keep for undo
            if (document.querySelector('input[type="file"]')) {
              (
                document.querySelector('input[type="file"]') as HTMLInputElement
              ).value = "";
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResult({
        success: false,
        message: "Failed to upload. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-zinc-800 dark:text-zinc-100 mb-4">
            Expand Knowledge Base
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Upload an Excel file to add new items to your Pinecone knowledge
            base. The file must contain the required columns for proper
            processing.
          </p>

          {/* Add Single Item Button */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button
              onClick={() => setIsAddItemModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Single Item
            </Button>

            {/* Show undo button for single item addition */}
            {singleItemId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✓ Item added to KB
                </div>
                <Button
                  onClick={handleUndo}
                  variant="outline"
                  size="sm"
                  disabled={isUndoing}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  {isUndoing ? "Removing..." : "Undo"}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Upload Section */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-500" />
              Upload Excel File
            </h2>

            <UploadExcel
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              validationResult={validationResult}
            />
          </div>

          {/* Upload Button */}
          {selectedFile && validationResult?.isValid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Streaming Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span>Real-time progress tracking</span>
                </label>
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading || !validationResult.isValid}
                className="px-8 py-3 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 mr-2"
                    >
                      <Upload className="w-5 h-5" />
                    </motion.div>
                    Uploading to Pinecone...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload to Knowledge Base
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Progress Component */}
          <AnimatePresence>
            {progress && isUploading && (
              <PineconeProgress progress={progress} isUploading={isUploading} />
            )}
          </AnimatePresence>

          {/* Upload Result */}
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-6 rounded-2xl shadow-lg ${
                uploadResult.success
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-start gap-4">
                {uploadResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3
                    className={`text-lg font-semibold mb-2 ${
                      uploadResult.success
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    }`}
                  >
                    {uploadResult.success
                      ? "Upload Successful!"
                      : "Upload Failed"}
                  </h3>
                  <p
                    className={`text-sm ${
                      uploadResult.success
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {uploadResult.message}
                  </p>
                  {uploadResult.success && uploadResult.uploadedCount && (
                    <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                      <p>
                        • Successfully uploaded {uploadResult.uploadedCount}{" "}
                        documents to Pinecone
                      </p>
                      {uploadResult.failedCount &&
                        uploadResult.failedCount > 0 && (
                          <p>
                            • {uploadResult.failedCount} documents failed to
                            upload
                          </p>
                        )}
                      <p>
                        • Processed {uploadResult.totalRows} rows from Excel
                        file
                      </p>
                      <p>
                        • Found {uploadResult.columns?.length} columns in the
                        file
                      </p>
                    </div>
                  )}
                  {!uploadResult.success &&
                    uploadResult.uploadedCount &&
                    uploadResult.uploadedCount > 0 && (
                      <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
                        <p>
                          • Partially successful: {uploadResult.uploadedCount}{" "}
                          documents uploaded
                        </p>
                        {uploadResult.failedCount && (
                          <p>
                            • {uploadResult.failedCount} documents failed to
                            upload
                          </p>
                        )}
                        <p>
                          • Total processed: {uploadResult.totalRows} rows from
                          Excel file
                        </p>
                      </div>
                    )}
                  {uploadResult.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Error: {uploadResult.error}
                    </p>
                  )}

                  {/* Undo Button */}
                  {uploadResult.success &&
                    lastUploadedIds.length > 0 &&
                    !isUndoing && (
                      <div className="mt-4">
                        <Button
                          onClick={handleUndo}
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                        >
                          Undo Upload (Delete {lastUploadedIds.length} items
                          from KB)
                        </Button>
                      </div>
                    )}

                  {/* Undoing indicator */}
                  {isUndoing && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4"
                      >
                        <Upload className="w-4 h-4" />
                      </motion.div>
                      Removing items from knowledge base...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
              Required Excel Format
            </h3>
            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <p>Your Excel file must contain the following columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Item Name</strong> - Name of the product/item
                </li>
                <li>
                  <strong>Goederen Omschrijving</strong> - Description of the
                  goods in Dutch
                </li>
                <li>
                  <strong>Goederen Code (HS Code)</strong> - HS code for the
                  product
                </li>
              </ul>
              <p className="mt-3 text-xs">
                Additional columns are allowed and will be preserved in the
                metadata.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Item Modal */}
      <AddItemToKnowledgebaseModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSuccess={(itemId) => {
          console.log("Item added successfully with ID:", itemId);
          setSingleItemId(itemId);
          // Clear bulk upload IDs when adding single item
          setLastUploadedIds([]);
          setUploadResult(null);
        }}
      />
    </div>
  );
}
