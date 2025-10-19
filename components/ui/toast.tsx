"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
  type?: "success" | "info" | "warning" | "error";
}

export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 4000,
  onClose,
  type = "info",
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success:
      "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-900 dark:text-green-100",
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-100",
    warning:
      "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-900 dark:text-yellow-100",
    error:
      "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-900 dark:text-red-100",
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 p-4 rounded-lg border-l-4 shadow-lg max-w-md transition-all duration-300",
        typeStyles[type],
        isExiting ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium whitespace-pre-line">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              setIsVisible(false);
              onClose?.();
            }, 300);
          }}
          className="text-current opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: "success" | "info" | "warning" | "error";
  }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(-${index * 4}px)`,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};
