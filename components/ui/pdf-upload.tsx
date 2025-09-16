"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  FileText,
  Trash2,
} from "lucide-react";

interface PDFUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export default function PDFUpload({ onFileSelect, selectedFile }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type === 'application/pdf') {
      onFileSelect(file);
    } else {
      alert('Please select a PDF file only.');
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
            <FileText
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
                ? "Drop PDF here"
                : selectedFile
                  ? "Upload another PDF"
                  : "Upload PDF Invoice"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm">
              {isDragging ? (
                <span className="font-medium text-blue-500">
                  Release to upload
                </span>
              ) : (
                <>
                  Drag & drop PDF here, or{" "}
                  <span className="text-blue-500 font-medium">browse</span>
                </>
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              PDF files only. <span className="bg-yellow-100">Try with short pdfs for more accuracy.</span>
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={onSelect}
            accept="application/pdf"
          />
        </div>
      </motion.div>

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
            <FileText className="w-8 h-8 text-red-500" />
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
