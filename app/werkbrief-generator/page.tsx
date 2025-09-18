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
    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-3xl mx-auto">
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
        <div className="w-full border rounded-md p-4 text-sm space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              Generated Werkbrief{" "}
              <span className="text-gray-500">
                {result.fields.length} items
              </span>
            </div>
            <Button
              onClick={handleCopyToExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Excel
                </>
              )}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Item Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    GOEDEREN CODE
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    GOEDEREN OMSCHRIJVING
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    CTNS
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    STKS
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    BRUTO (kg)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    FOB
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    AWB
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200">
                {result.fields.map((field, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : ""
                    }
                  >
                    <td className="px-4 py-3 text-sm">
                      {field["Item Description"]}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field["GOEDEREN CODE"]}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {field["GOEDEREN OMSCHRIJVING"]}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field.CTNS}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field.STKS}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field.BRUTO}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field.FOB}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {field["AWB - 392754819969-1"] || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WerkBriefHome;
