"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  isTableExpanded: boolean;
  currentPage: number;
  totalPages: number;
  editedFieldsLength: number;
  onTableExpandToggle: () => void;
  onBulkSelectAll: () => void;
  onGoToPage: (page: number) => void;
}

export const useKeyboardShortcuts = ({
  isTableExpanded,
  currentPage,
  totalPages,
  editedFieldsLength,
  onTableExpandToggle,
  onBulkSelectAll,
  onGoToPage,
}: UseKeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "f":
            event.preventDefault();
            const searchInput = document.querySelector(
              'input[placeholder="Search items..."]'
            ) as HTMLInputElement;
            searchInput?.focus();
            break;
          case "a":
            if (editedFieldsLength > 0) {
              event.preventDefault();
              onBulkSelectAll();
            }
            break;
          case "e":
            event.preventDefault();
            onTableExpandToggle();
            break;
        }
      }

      // Arrow keys for pagination
      if (totalPages > 1) {
        switch (event.key) {
          case "ArrowLeft":
            if (event.ctrlKey && currentPage > 1) {
              event.preventDefault();
              onGoToPage(currentPage - 1);
            }
            break;
          case "ArrowRight":
            if (event.ctrlKey && currentPage < totalPages) {
              event.preventDefault();
              onGoToPage(currentPage + 1);
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isTableExpanded,
    currentPage,
    totalPages,
    onGoToPage,
    onBulkSelectAll,
    editedFieldsLength,
    onTableExpandToggle,
  ]);
};
