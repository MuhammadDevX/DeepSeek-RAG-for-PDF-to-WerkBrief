"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { EyeOff, ChevronDown } from "lucide-react";

interface ExcludePagesControlProps {
  /**
   * Page number for every row, aligned to the global index used by
   * `checkedFields` (one entry per row, in the same order).
   */
  pageNumbers: number[];
  checkedFields: boolean[];
  setCheckedFields: (
    fields: boolean[] | ((prev: boolean[]) => boolean[])
  ) => void;
  className?: string;
}

/**
 * Lets the user exclude crossed-out / cancelled invoice pages from copy &
 * export. Excluding a page simply unchecks all of its rows (reversible by
 * re-including the page). A hand-drawn X is invisible to text extraction, so
 * this manual control is the reliable way to drop those pages.
 */
export const ExcludePagesControl: React.FC<ExcludePagesControlProps> = ({
  pageNumbers,
  checkedFields,
  setCheckedFields,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Distinct pages present, sorted ascending.
  const pages = useMemo(() => {
    const set = new Set<number>();
    pageNumbers.forEach((p) => {
      if (typeof p === "number" && !isNaN(p)) set.add(p);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [pageNumbers]);

  // A page is "excluded" when every row on it is currently unchecked.
  const isPageExcluded = (page: number): boolean => {
    let hasRow = false;
    for (let i = 0; i < pageNumbers.length; i++) {
      if (pageNumbers[i] === page) {
        hasRow = true;
        if (checkedFields[i]) return false;
      }
    }
    return hasRow;
  };

  const excludedCount = pages.filter(isPageExcluded).length;

  const togglePage = (page: number) => {
    const exclude = !isPageExcluded(page);
    setCheckedFields((prev) => {
      const next = [...prev];
      for (let i = 0; i < pageNumbers.length; i++) {
        if (pageNumbers[i] === page) next[i] = !exclude; // exclude -> uncheck
      }
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (pages.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-150 ${
          excludedCount > 0
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
        title="Exclude crossed-out / cancelled pages from export"
      >
        <EyeOff className="w-4 h-4" />
        <span className="hidden sm:inline">
          Exclude pages{excludedCount > 0 ? ` (${excludedCount})` : ""}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 p-2">
          <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
            Tick a page to exclude its rows from copy & export.
          </p>
          <div className="space-y-0.5">
            {pages.map((page) => {
              const excluded = isPageExcluded(page);
              return (
                <label
                  key={page}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={excluded}
                    onChange={() => togglePage(page)}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {page}
                  </span>
                  {excluded && (
                    <span className="ml-auto text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      excluded
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcludePagesControl;
