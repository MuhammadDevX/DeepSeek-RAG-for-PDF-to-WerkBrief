"use client";

import React from "react";
import { motion } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ProgressData {
  totalVectors: number;
  processedVectors: number;
  successfulVectors: number;
  failedVectors: number;
  currentBatch: number;
  totalBatches: number;
  status:
    | "processing"
    | "embedding"
    | "upserting"
    | "retrying"
    | "complete"
    | "error";
  message?: string;
}

interface PineconeProgressProps {
  progress: ProgressData;
  isUploading: boolean;
}

export default function PineconeProgress({
  progress,
  isUploading,
}: PineconeProgressProps) {
  const getProgressPercentage = () => {
    if (progress.totalVectors === 0) return 0;
    return Math.round(
      (progress.processedVectors / progress.totalVectors) * 100
    );
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-5 h-5 text-blue-500" />
          </motion.div>
        );
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case "complete":
        return "text-green-700 dark:text-green-300";
      case "error":
        return "text-red-700 dark:text-red-300";
      case "retrying":
        return "text-yellow-700 dark:text-yellow-300";
      default:
        return "text-blue-700 dark:text-blue-300";
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case "processing":
        return "Processing documents...";
      case "embedding":
        return `Generating embeddings (Batch ${progress.currentBatch}/${progress.totalBatches})...`;
      case "upserting":
        return `Uploading to Pinecone (Batch ${progress.currentBatch}/${progress.totalBatches})...`;
      case "retrying":
        return `Retrying failed operation (Batch ${progress.currentBatch}/${progress.totalBatches})...`;
      case "complete":
        return "Upload completed successfully!";
      case "error":
        return "Upload encountered errors";
      default:
        return "Processing...";
    }
  };

  if (!isUploading && !progress) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Pinecone Upload Progress
          </h3>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {getProgressPercentage()}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress
          value={getProgressPercentage()}
          className="h-2 bg-gray-200 dark:bg-gray-700"
        />
        <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            {progress.processedVectors} / {progress.totalVectors} vectors
            processed
          </span>
          <span>
            Batch {progress.currentBatch} / {progress.totalBatches}
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className={`text-sm font-medium ${getStatusColor()}`}>
        {progress.message || getStatusText()}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {progress.successfulVectors}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Successful
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {progress.failedVectors}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Failed</div>
        </div>
      </div>

      {/* Current Activity Indicator */}
      {progress.status !== "complete" && progress.status !== "error" && (
        <div className="flex items-center justify-center space-x-2 pt-2">
          <motion.div
            className="w-2 h-2 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="w-2 h-2 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-2 h-2 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
