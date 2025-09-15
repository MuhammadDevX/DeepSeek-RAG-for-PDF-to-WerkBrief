"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

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

interface UploadExcelProps {
  onFileSelect: (file: File | null, excelData?: ExcelData, validation?: ValidationResult) => void;
  selectedFile: File | null;
  validationResult?: ValidationResult;
}

// Required columns based on the Python notebook
const REQUIRED_COLUMNS = [
  'Item Name',
  'Goederen Omschrijving',
  'Goederen Code (HS Code)'
];

export default function UploadExcel({
  onFileSelect,
  selectedFile,
  validationResult
}: UploadExcelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Failed to read file'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // First row contains headers
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map((row: (string | number | boolean | null)[]) => {
            const rowObj: ExcelRow = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index] || '';
            });
            return rowObj;
          });

          resolve({
            rows,
            columns: headers,
            sheetName
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const validateExcelColumns = (columns: string[]): ValidationResult => {
    const missingColumns = REQUIRED_COLUMNS.filter(
      required => !columns.some(col =>
        col.toLowerCase().trim() === required.toLowerCase().trim()
      )
    );

    if (missingColumns.length === 0) {
      return {
        isValid: true,
        message: 'All required columns found!',
        columns,
        requiredColumns: REQUIRED_COLUMNS
      };
    }

    return {
      isValid: false,
      message: `Missing required columns: ${missingColumns.join(', ')}`,
      columns,
      requiredColumns: REQUIRED_COLUMNS,
      missingColumns
    };
  };

  const handleFile = async (file: File) => {
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')) {

      try {
        // Parse Excel file
        const excelData = await parseExcelFile(file);

        // Validate columns
        const validation = validateExcelColumns(excelData.columns);

        // Pass file, parsed data, and validation result to parent
        onFileSelect(file, excelData, validation);
      } catch (error) {
        const errorValidation: ValidationResult = {
          isValid: false,
          message: error instanceof Error ? error.message : 'Failed to parse Excel file',
          requiredColumns: REQUIRED_COLUMNS
        };
        onFileSelect(file, undefined, errorValidation);
      }
    } else {
      alert('Please select an Excel file (.xlsx or .xls) only.');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const removeFile = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Drop zone */}
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        initial={false}
        animate={{
          borderColor: isDragging ? "#3b82f6" : "#ffffff10",
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-xl p-6 text-center cursor-pointer bg-secondary/50 border border-primary/10 shadow-sm hover:shadow-md backdrop-blur group",
          isDragging && "ring-4 ring-blue-400/30 border-blue-500",
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: isDragging ? [0.5, 1, 0.5] : 1,
                scale: isDragging ? [0.95, 1.05, 0.95] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 bg-blue-400/10 rounded-full blur-md"
              style={{ display: isDragging ? "block" : "none" }}
            />
            <FileSpreadsheet
              className={clsx(
                "w-12 h-12 drop-shadow-sm",
                isDragging
                  ? "text-blue-500"
                  : "text-zinc-700 dark:text-zinc-300 group-hover:text-blue-500 transition-colors duration-300",
              )}
            />
          </motion.div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {isDragging
                ? "Drop Excel file here"
                : selectedFile
                  ? "Upload another Excel file"
                  : "Upload Excel Knowledge Base"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm">
              {isDragging ? (
                <span className="font-medium text-blue-500">
                  Release to upload
                </span>
              ) : (
                <>
                  Drag & drop Excel file here, or{" "}
                  <span className="text-blue-500 font-medium">browse</span>
                </>
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Excel files (.xlsx, .xls) only
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={onSelect}
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          />
        </div>
      </motion.div>

      {/* Validation Status */}
      <AnimatePresence>
        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className={clsx(
              "mt-4 px-4 py-3 flex items-center gap-3 rounded-xl shadow transition-all duration-200",
              validationResult.isValid
                ? "bg-green-50 dark:bg-green-800/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-800/20 border border-red-200 dark:border-red-800"
            )}
          >
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <div className="flex-1">
              <p className={clsx(
                "text-sm font-medium",
                validationResult.isValid
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              )}>
                {validationResult.message}
              </p>
              {validationResult.columns && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Found columns: {validationResult.columns.join(", ")}
                </p>
              )}
              {validationResult.requiredColumns && !validationResult.isValid && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Required columns: {validationResult.requiredColumns.join(", ")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected file */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="mt-4 px-4 py-3 flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 shadow hover:shadow-md transition-all duration-200"
          >
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate text-zinc-800 dark:text-zinc-200">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="p-1 text-zinc-400 hover:text-red-500 transition-colors duration-200"
              aria-label="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}