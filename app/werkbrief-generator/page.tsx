"use client";
import React, { useState, useEffect, useCallback } from "react";
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
import { Copy, Check, Undo2, Download } from "lucide-react";

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

  // Initialize edited fields and checkboxes when result changes
  useEffect(() => {
    if (result?.fields) {
      setEditedFields(result.fields);
      // Set all checkboxes to true by default
      setCheckedFields(result.fields.map(() => true));
    }
  }, [result]);

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
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      setProgress({ type: "error", error: message });
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
        <div className="w-full max-w-7xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Generated Werkbrief
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result?.fields?.length || editedFields.length} items
                  processed successfully
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownloadExcel}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </Button>
                <Button
                  onClick={handleCopyToExcel}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to Excel
                    </>
                  )}
                </Button>
              </div>
            </div>
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

          {/* Table Section */}
          <div className="overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                  <th className="w-12 px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    <div className="flex items-center gap-1">
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
                  <th className="w-72 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Item Description
                  </th>
                  <th className="w-40 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Goederen Omschrijving
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Code
                  </th>
                  <th className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    CTNS
                  </th>
                  <th className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    STKS
                  </th>
                  <th className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Bruto
                  </th>
                  <th className="w-25 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    FOB
                  </th>
                  <th className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Conf.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {editedFields.map((field, index) => {
                  const originalField = result?.fields?.[index] || field;
                  const isChecked = checkedFields[index] || false;

                  return (
                    <TableRow
                      key={index}
                      field={field}
                      originalField={originalField}
                      index={index}
                      isChecked={isChecked}
                      onCheckboxChange={handleCheckboxChange}
                      onFieldChange={handleFieldChange}
                      onInsertRow={insertRowAt}
                      onDeleteRow={deleteRow}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Total Items: {editedFields.length} | Selected for Export:{" "}
                {checkedFields.filter(Boolean).length}
              </span>
              <span>Generated at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WerkBriefHome;
