"use client";

import React from "react";
import PDFUpload from "@/components/ui/pdf-upload";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/lib/upload-utils";

interface FileUploadSectionProps {
  pdfFile: File | null;
  loading: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  useStreaming: boolean;
  onFileSelect: (file: File | null) => void;
  onGenerate: () => void;
  onStreamingToggle: (useStreaming: boolean) => void;
}

export const FileUploadSection = React.memo(
  ({
    pdfFile,
    loading,
    isUploading,
    uploadProgress,
    useStreaming,
    onFileSelect,
    onGenerate,
    onStreamingToggle,
  }: FileUploadSectionProps) => {
    return (
      <div className="flex flex-col items-center align-middle justify-center gap-4 w-full">
        <PDFUpload onFileSelect={onFileSelect} selectedFile={pdfFile} />
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button
            onClick={onGenerate}
            disabled={loading || isUploading || !pdfFile}
          >
            {isUploading
              ? `Uploading... ${
                  uploadProgress ? Math.round(uploadProgress.percentage) : 0
                }%`
              : loading
              ? "Generating..."
              : "Generate Werkbrief"}
          </Button>

          {/* Progress Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => onStreamingToggle(e.target.checked)}
              className="rounded"
              disabled={loading}
            />
            Show real-time progress
          </label>
        </div>
      </div>
    );
  }
);

FileUploadSection.displayName = "FileUploadSection";
