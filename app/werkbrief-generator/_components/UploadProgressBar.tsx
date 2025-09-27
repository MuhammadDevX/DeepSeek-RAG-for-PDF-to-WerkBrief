"use client";

import React from "react";
import { UploadProgress } from "@/lib/upload-utils";

interface UploadProgressBarProps {
  uploadProgress: UploadProgress | null;
  isVisible: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600)
    return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

export const UploadProgressBar = React.memo(
  ({ uploadProgress, isVisible }: UploadProgressBarProps) => {
    if (!isVisible || !uploadProgress) return null;

    const isChunkedUpload = uploadProgress.totalBytes > 10 * 1024 * 1024; // 10MB threshold

    return (
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>
            {isChunkedUpload
              ? "Uploading (chunked)..."
              : "Uploading to cloud storage..."}
          </span>
          <span>{Math.round(uploadProgress.percentage)}%</span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress.percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {formatBytes(uploadProgress.uploadedBytes)} /{" "}
            {formatBytes(uploadProgress.totalBytes)}
          </span>
          {uploadProgress.speed > 0 && (
            <span>{formatSpeed(uploadProgress.speed)}</span>
          )}
        </div>

        {uploadProgress.remainingTime > 0 &&
          uploadProgress.remainingTime < 3600 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              ~{formatTime(uploadProgress.remainingTime)} remaining
            </div>
          )}

        {isChunkedUpload && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-center">
            Using optimized chunked upload for faster speeds
          </div>
        )}
      </div>
    );
  }
);

UploadProgressBar.displayName = "UploadProgressBar";
