"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "../styles.module.css";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface TableHeaderRowProps {
  sortConfig: {
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  };
  bulkSelectAll: boolean;
  onSort: (key: keyof Werkbrief["fields"][0]) => void;
  onBulkSelectAll: () => void;
}

export const TableHeaderRow = React.memo(
  ({
    sortConfig,
    bulkSelectAll,
    onSort,
    onBulkSelectAll,
  }: TableHeaderRowProps) => {
    const SortableHeader: React.FC<{
      sortKey: keyof Werkbrief["fields"][0];
      children: React.ReactNode;
      className?: string;
    }> = ({ sortKey, children, className = "" }) => (
      <th
        className={`${styles.sortHeader} ${className} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        onClick={() => onSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortConfig.key === sortKey && (
            <span className={styles.sortIcon}>
              {sortConfig.direction === "asc" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </th>
    );

    return (
      <tr className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 shadow-sm">
        <th className="w-12 px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={bulkSelectAll}
              onChange={onBulkSelectAll}
              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-700 dark:border-gray-600"
              title="Select/deselect all items on this page"
            />
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="hidden lg:inline">Excel</span>
          </div>
        </th>
        <th className="w-10 px-2 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="hidden lg:inline">#</span>
          </div>
        </th>
        <th className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          Actions
        </th>
        <SortableHeader
          sortKey="Item Description"
          className="w-72 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          Item Description
        </SortableHeader>
        <SortableHeader
          sortKey="GOEDEREN OMSCHRIJVING"
          className="w-40 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          Goederen Omschrijving
        </SortableHeader>
        <SortableHeader
          sortKey="GOEDEREN CODE"
          className="w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          Code
        </SortableHeader>
        <SortableHeader
          sortKey="CTNS"
          className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          <div className="flex items-center gap-1 justify-center">CTNS</div>
        </SortableHeader>
        <SortableHeader
          sortKey="STKS"
          className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          <div className="flex items-center gap-1 justify-center">STKS</div>
        </SortableHeader>
        <SortableHeader
          sortKey="BRUTO"
          className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          <div className="flex items-center gap-1 justify-center">Bruto</div>
        </SortableHeader>
        <SortableHeader
          sortKey="FOB"
          className="w-25 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850"
        >
          <div className="flex items-center gap-1 justify-center">FOB</div>
        </SortableHeader>
        <th className="w-16 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
          Conf.
        </th>
      </tr>
    );
  }
);

TableHeaderRow.displayName = "TableHeaderRow";
