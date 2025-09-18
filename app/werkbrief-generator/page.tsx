"use client";
import React, { useState } from "react";
import { Description } from "./_components/Description";
import PDFUpload from "@/components/ui/pdf-upload";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { formatForExcel, copyToClipboard } from "@/lib/excel-formatter";
import { Copy, Check } from "lucide-react";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

const WerkBriefHome = () => {
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Werkbrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("description", description);
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const res = await fetch("/api/werkbrief", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");

      console.log("API Response:", data); // Debug log

      const parsed = WerkbriefSchema.safeParse(data);
      if (!parsed.success) {
        console.error("Schema validation failed:", parsed.error);
        throw new Error(`Invalid response shape: ${parsed.error.message}`);
      }
      setResult(parsed.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
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
    <div
      className="flex flex-col items-center justify-center gap-5 w-full max-w-3xl mx-auto"
      suppressHydrationWarning
    >
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
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {result && result.fields && result.fields.length > 0 && (
        <div className="w-full border rounded-md p-4 text-sm space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              Generated Werkbrief{" "}
              <span className="text-gray-200">
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
