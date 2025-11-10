"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/lib/upload-utils";
import { Upload, X, FileText } from "lucide-react";

interface ArubaFileUploadSectionProps {
  pdfFiles: File[];
  loading: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  useStreaming: boolean;
  onFilesSelect: (files: File[]) => void;
  onGenerate: () => void;
  onStreamingToggle: (useStreaming: boolean) => void;
}

export const ArubaFileUploadSection = React.memo(
  ({
    pdfFiles,
    loading,
    isUploading,
    uploadProgress,
    useStreaming,
    onFilesSelect,
    onGenerate,
    onStreamingToggle,
  }: ArubaFileUploadSectionProps) => {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (files.length > 0) {
        onFilesSelect(files);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        onFilesSelect(Array.from(files));
      }
    };

    const removeFile = (index: number) => {
      const newFiles = pdfFiles.filter((_, i) => i !== index);
      onFilesSelect(newFiles);
    };

    return (
      <div className="flex flex-col items-center align-middle justify-center gap-4 w-full">
        {/* File Upload Area */}
        <div
          className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-8 transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={loading || isUploading}
          />

          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag and drop PDF files here, or
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isUploading}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
              >
                click to browse
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload multiple Aruba invoice PDFs (Max 50MB each)
            </p>
          </div>
        </div>

        {/* Selected Files List */}
        {pdfFiles.length > 0 && (
          <div className="w-full max-w-2xl">
            <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Selected Files ({pdfFiles.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pdfFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={loading || isUploading}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button and Options */}
        <div className="flex flex-col items-center align-middle justify-center gap-3">
          <Button
            onClick={onGenerate}
            disabled={loading || isUploading || pdfFiles.length === 0}
            size="lg"
          >
            {isUploading
              ? `Uploading... ${
                  uploadProgress ? Math.round(uploadProgress.percentage) : 0
                }%`
              : loading
              ? "Processing..."
              : "Generate Client Data"}
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

ArubaFileUploadSection.displayName = "ArubaFileUploadSection";
