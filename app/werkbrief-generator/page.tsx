"use client";
import React, { useState, useEffect } from "react";
import { Description } from "./_components/Description";
import { WerkbriefProgress } from "./_components/WerkbriefProgress";
import PDFUpload from "@/components/ui/pdf-upload";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import {
  formatSelectedFieldsForExcel,
  copyToClipboard,
} from "@/lib/excel-formatter";
import { Copy, Check, Plus, Trash2, Undo2 } from "lucide-react";

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
  const [description, setDescription] = useState("");
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
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  // State for deleted rows and undo functionality
  interface DeletedRow {
    data: Werkbrief["fields"][0];
    checked: boolean;
    index: number;
    timestamp: number;
  }
  const [deletedRows, setDeletedRows] = useState<DeletedRow[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Initialize edited fields and checkboxes when result changes
  useEffect(() => {
    if (result?.fields) {
      setEditedFields(result.fields);
      setCheckedFields(
        result.fields.map((field) => {
          const confidence = parseFloat(field.Confidence || "0");
          return confidence > 80;
        })
      );
    }
  }, [result]);

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append("description", description);
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

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const newCheckedFields = [...checkedFields];
    newCheckedFields[index] = checked;
    setCheckedFields(newCheckedFields);
  };

  const handleFieldChange = (
    index: number,
    fieldName: keyof Werkbrief["fields"][0],
    value: string | number
  ) => {
    const newEditedFields = [...editedFields];
    newEditedFields[index] = {
      ...newEditedFields[index],
      [fieldName]: value,
    };
    setEditedFields(newEditedFields);
  };

  // Function to create a dummy row with placeholder values
  const createDummyRow = (): Werkbrief["fields"][0] => ({
    "Item Description": "New Product Description",
    "GOEDEREN OMSCHRIJVING": "NIEUWE GOEDEREN",
    "GOEDEREN CODE": "00000000",
    CTNS: 1,
    STKS: 1,
    BRUTO: 1.0,
    FOB: 100.0,
    Confidence: "100%",
  });

  // Function to insert a row at a specific index
  const insertRowAt = (index: number) => {
    const newRow = createDummyRow();
    const newEditedFields = [...editedFields];
    const newCheckedFields = [...checkedFields];

    // Insert the new row at the specified index
    newEditedFields.splice(index, 0, newRow);
    newCheckedFields.splice(index, 0, true);

    setEditedFields(newEditedFields);
    setCheckedFields(newCheckedFields);
  };

  // Function to delete a row
  const deleteRow = (index: number) => {
    const deletedRow: DeletedRow = {
      data: editedFields[index],
      checked: checkedFields[index],
      index,
      timestamp: Date.now(),
    };

    // Add to deleted rows for undo functionality
    setDeletedRows((prev) => [...prev, deletedRow]);

    // Remove from current arrays
    const newEditedFields = [...editedFields];
    const newCheckedFields = [...checkedFields];
    newEditedFields.splice(index, 1);
    newCheckedFields.splice(index, 1);

    setEditedFields(newEditedFields);
    setCheckedFields(newCheckedFields);

    // Show undo notification
    setShowUndoNotification(true);

  };

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
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-5xl mx-auto">
      <Description />
      <textarea
        className="w-full min-h-32 p-3 border rounded-md bg-transparent"
        placeholder="Beschrijf de rol, verantwoordelijkheden, sector, senioriteit, etc."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex flex-col items-center align-middle justify-center gap-4 w-full">
        <PDFUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button
            onClick={onGenerate}
            disabled={loading || !description.trim()}
          >
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
        <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Generated Werkbrief
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.fields.length} items processed successfully
                </p>
              </div>
              <Button
                onClick={handleCopyToExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Copied!</span>
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
                  <th className="w-12 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="hidden sm:inline">Excel</span>
                    </div>
                  </th>
                  <th className="w-12 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="hidden sm:inline">#</span>
                    </div>
                  </th>
                  <th className="w-16 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Actions
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Item Description
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Goederen Omschrijving
                  </th>
                  <th className="w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Code
                  </th>
                  <th className="w-16 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    CTNS
                  </th>
                  <th className="w-16 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    STKS
                  </th>
                  <th className="w-20 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Bruto
                  </th>
                  <th className="w-20 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    FOB
                  </th>
                  <th className="w-20 px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Conf.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {/* Add button at the top to insert first row */}
                <tr
                  className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors"
                  onMouseEnter={() => setHoveredRowIndex(-1)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                >
                  <td colSpan={11} className="px-3 py-1 text-center">
                    {hoveredRowIndex === -1 && (
                      <button
                        onClick={() => insertRowAt(0)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add row here
                      </button>
                    )}
                  </td>
                </tr>

                {editedFields.map((field, index) => {
                  const originalField = result?.fields?.[index] || field;
                  const confidence = parseFloat(
                    originalField.Confidence || "0"
                  );
                  const isHighConfidence = confidence > 80;
                  const isChecked = checkedFields[index] || false;

                  return (
                    <React.Fragment key={index}>
                      <tr
                        className={`group transition-all duration-150 hover:bg-blue-50 dark:hover:bg-gray-800/50 ${
                          index % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50/50 dark:bg-gray-800/20"
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              handleCheckboxChange(index, e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            title={
                              isHighConfidence
                                ? "Automatically selected (confidence > 80%)"
                                : "Low confidence - manually select if needed"
                            }
                          />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center justify-center">
                            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold text-xs">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => deleteRow(index)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 opacity-70 hover:opacity-100 hover:scale-110"
                            title="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={field["Item Description"]}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "Item Description",
                                e.target.value
                              )
                            }
                            className="w-full text-sm font-medium text-gray-900 dark:text-white leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded px-2 py-1"
                            title={field["Item Description"]}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={field["GOEDEREN OMSCHRIJVING"]}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "GOEDEREN OMSCHRIJVING",
                                e.target.value
                              )
                            }
                            className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded px-2 py-1"
                            title={field["GOEDEREN OMSCHRIJVING"]}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={field["GOEDEREN CODE"]}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "GOEDEREN CODE",
                                e.target.value
                              )
                            }
                            className="w-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            title={field["GOEDEREN CODE"]}
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            value={field.CTNS}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "CTNS",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            value={field.STKS}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "STKS",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={field.BRUTO}
                            onChange={(e) =>
                              handleFieldChange(
                                index,
                                "BRUTO",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="relative">
                            <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-bold text-green-700 dark:text-green-400">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={field.FOB}
                              onChange={(e) =>
                                handleFieldChange(
                                  index,
                                  "FOB",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full pl-4 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              confidence > 80
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                                : confidence > 60
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700"
                                : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700"
                            }`}
                            title={`Confidence: ${confidence.toFixed(0)}%`}
                          >
                            {originalField["Confidence"]
                              ? `${confidence.toFixed(0)}%`
                              : "-"}
                          </div>
                        </td>
                      </tr>

                      {/* Add row insertion button between rows */}
                      <tr
                        className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors"
                        onMouseEnter={() => setHoveredRowIndex(index)}
                        onMouseLeave={() => setHoveredRowIndex(null)}
                      >
                        <td colSpan={11} className="px-3 py-1 text-center">
                          {hoveredRowIndex === index && (
                            <button
                              onClick={() => insertRowAt(index + 1)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add row here
                            </button>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
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
