"use client";
import React, { useState } from "react";
import { Description } from "./_components/Description";
import { WerkbriefProgress } from "./_components/WerkbriefProgress";
import PDFUpload from "@/components/ui/pdf-upload";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { formatForExcel, copyToClipboard } from "@/lib/excel-formatter";
import { Copy, Check } from "lucide-react";

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
    if (!result) return;

    try {
      const excelData = formatForExcel(result);
      await copyToClipboard(excelData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-6xl mx-auto">
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
      {result && result.fields && result.fields.length > 0 && (
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

          {/* Table Section */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Number
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Item Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Goederen Omschrijving
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Goederen Code
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    CTNS
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    STKS
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Bruto (kg)
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    FOB Value
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {result.fields.map((field, index) => (
                  <tr
                    key={index}
                    className={`group transition-all duration-150 hover:bg-blue-50 dark:hover:bg-gray-800/50 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50/50 dark:bg-gray-800/20"
                    }`}
                  >
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold text-xs">
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                        {field["Item Description"]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {field["GOEDEREN OMSCHRIJVING"]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                        {field["GOEDEREN CODE"]}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-md inline-block border border-orange-200 dark:border-orange-800">
                        {field.CTNS}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-md inline-block border border-purple-200 dark:border-purple-800">
                        {field.STKS}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-md inline-block border border-green-200 dark:border-green-800">
                        {field.BRUTO}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-md inline-block border border-green-200 dark:border-green-800">
                        ${field.FOB}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          field["Confidence"] &&
                          parseFloat(field["Confidence"]) > 80
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                            : field["Confidence"] &&
                              parseFloat(field["Confidence"]) > 60
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700"
                            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700"
                        }`}
                      >
                        {field["Confidence"]
                          ? `${parseFloat(field["Confidence"]).toFixed(0)}%`
                          : "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Total Items: {result.fields.length}</span>
              <span>Generated at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WerkBriefHome;
