"use client";

import React from "react";
import { Undo2 } from "lucide-react";

interface UndoNotificationProps {
  isVisible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoNotification = React.memo(
  ({ isVisible, onUndo, onDismiss }: UndoNotificationProps) => {
    if (!isVisible) return null;

    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mx-6 mb-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Row deleted successfully
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-600 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/60 hover:scale-105 transition-all duration-200 shadow-sm"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={onDismiss}
              className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:scale-110 transition-all duration-200 p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30"
              title="Dismiss notification"
            >
              <span className="text-xs font-medium mr-1">Dismiss</span>✕
            </button>
          </div>
        </div>
      </div>
    );
  }
);

UndoNotification.displayName = "UndoNotification";
