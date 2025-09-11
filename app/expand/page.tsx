"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import UploadExcel from "./_components/UploadExcel";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload, Database } from "lucide-react";

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
  totalRows?: number;
  columns?: string[];
  error?: string;
}

export default function ExpandPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setValidationResult(null);
    setUploadResult(null);

    if (file) {
      validateFile(file);
    }
  };

  const validateFile = async (file: File) => {
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/expand-knowledgebase', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setValidationResult({
          isValid: true,
          message: 'File validation successful! Ready to upload.',
          columns: result.columns,
          requiredColumns: [
            'Item Name',
            'Goederen Omschrijving',
            'Goederen Code (HS Code)'
          ]
        });
      } else {
        setValidationResult({
          isValid: false,
          message: result.validation?.message || result.error || 'Validation failed',
          columns: result.validation?.columns,
          requiredColumns: result.validation?.requiredColumns,
          missingColumns: result.validation?.missingColumns
        });
      }
    } catch {
      setValidationResult({
        isValid: false,
        message: 'Failed to validate file. Please try again.',
        requiredColumns: [
          'Item Name',
          'Goederen Omschrijving',
          'Goederen Code (HS Code)'
        ]
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !validationResult?.isValid) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/expand-knowledgebase', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setUploadResult(result);

      if (result.success) {
        // Reset form after successful upload
        setTimeout(() => {
          setSelectedFile(null);
          setValidationResult(null);
          setUploadResult(null);
          if (document.querySelector('input[type="file"]')) {
            (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
          }
        }, 3000);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Failed to upload. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
            Upload an Excel file to add new items to your Pinecone knowledge base.
            The file must contain the required columns for proper processing.
          </p>
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
              isValidating={isValidating}
              validationResult={validationResult}
            />
          </div>

          {/* Upload Button */}
          {selectedFile && validationResult?.isValid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <Button
                onClick={handleUpload}
                disabled={isUploading || !validationResult.isValid}
                className="px-8 py-3 text-lg font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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

          {/* Upload Result */}
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`p-6 rounded-2xl shadow-lg ${uploadResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
            >
              <div className="flex items-start gap-4">
                {uploadResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${uploadResult.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                    }`}>
                    {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                  </h3>
                  <p className={`text-sm ${uploadResult.success
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                    }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.success && uploadResult.uploadedCount && (
                    <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                      <p>• Uploaded {uploadResult.uploadedCount} documents to Pinecone</p>
                      <p>• Processed {uploadResult.totalRows} rows from Excel file</p>
                      <p>• Found {uploadResult.columns?.length} columns in the file</p>
                    </div>
                  )}
                  {uploadResult.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Error: {uploadResult.error}
                    </p>
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
                <li><strong>Item Name</strong> - Name of the product/item</li>
                <li><strong>Goederen Omschrijving</strong> - Description of the goods in Dutch</li>
                <li><strong>Goederen Code (HS Code)</strong> - HS code for the product</li>
              </ul>
              <p className="mt-3 text-xs">
                Additional columns are allowed and will be preserved in the metadata.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}