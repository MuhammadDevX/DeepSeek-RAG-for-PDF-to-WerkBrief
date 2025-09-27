"use client";

import React from "react";
import DebouncedInput from "@/components/ui/debounced-input";

interface TotalBrutoSectionProps {
  totalBruto: number;
  onTotalBrutoChange: (value: string | number) => void;
}

export const TotalBrutoSection = React.memo(({
  totalBruto,
  onTotalBrutoChange
}: TotalBrutoSectionProps) => {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Total Bruto Weight:
          </span>
          <div className="flex items-center gap-2">
            <DebouncedInput
              type="number"
              step="0.1"
              value={totalBruto}
              onChange={onTotalBrutoChange}
              className="w-32 text-lg font-bold text-green-700 dark:text-green-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              kg
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Edit to redistribute across all items based on FOB ratios
        </div>
      </div>
    </div>
  );
});

TotalBrutoSection.displayName = "TotalBrutoSection";