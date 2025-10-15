"use client";

import React from "react";
import TableRow from "./TableRow";
import { TableHeaderRow } from "./TableHeaderRow";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";
import { ScrollIndicator } from "./ScrollIndicator";
import styles from "../styles.module.css";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface DataTableProps {
  isTableExpanded: boolean;
  isTableLoading: boolean;
  paginatedFields: Werkbrief["fields"];
  editedFields: Werkbrief["fields"];
  result: Werkbrief | null;
  checkedFields: boolean[];
  sortConfig: {
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  };
  bulkSelectAll: boolean;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onSort: (key: keyof Werkbrief["fields"][0]) => void;
  onBulkSelectAll: () => void;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof Werkbrief["fields"][0],
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  onClearSearch: () => void;
  isDeleteMode?: boolean;
  deleteSelectAll?: boolean;
  onToggleDeleteMode?: () => void;
  onDeleteSelectAll?: () => void;
  selectedForDeletion?: boolean[];
  onToggleDeleteSelection?: (index: number) => void;
  isMergeMode?: boolean;
  mergeSelectAll?: boolean;
  onToggleMergeMode?: () => void;
  onMergeSelectAll?: () => void;
  selectedForMerge?: boolean[];
  onToggleMergeSelection?: (index: number) => void;
}

export const DataTable = React.memo(
  ({
    isTableExpanded,
    isTableLoading,
    paginatedFields,
    editedFields,
    result,
    checkedFields,
    sortConfig,
    bulkSelectAll,
    searchTerm,
    currentPage,
    totalPages,
    itemsPerPage,
    onSort,
    onBulkSelectAll,
    onCheckboxChange,
    onFieldChange,
    onInsertRow,
    onDeleteRow,
    onMoveRow,
    onClearSearch,
    isDeleteMode = false,
    deleteSelectAll = false,
    onToggleDeleteMode,
    onDeleteSelectAll,
    selectedForDeletion = [],
    onToggleDeleteSelection,
    isMergeMode = false,
    mergeSelectAll = false,
    onToggleMergeMode,
    onMergeSelectAll,
    selectedForMerge = [],
    onToggleMergeSelection,
  }: DataTableProps) => {
    return (
      <div
        className={`${styles.tableContainer} relative ${
          isTableExpanded ? "h-[70vh]" : "max-h-screen"
        } overflow-auto`}
      >
        <div className="min-w-full">
          <table className="w-full table-fixed">
            <thead className={`${styles.stickyHeader} sticky top-0 z-10`}>
              <TableHeaderRow
                sortConfig={sortConfig}
                bulkSelectAll={bulkSelectAll}
                onSort={onSort}
                onBulkSelectAll={onBulkSelectAll}
                isDeleteMode={isDeleteMode}
                deleteSelectAll={deleteSelectAll}
                onToggleDeleteMode={onToggleDeleteMode}
                onDeleteSelectAll={onDeleteSelectAll}
                isMergeMode={isMergeMode}
                mergeSelectAll={mergeSelectAll}
                onToggleMergeMode={onToggleMergeMode}
                onMergeSelectAll={onMergeSelectAll}
              />
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {/* Loading skeleton */}
              {isTableLoading && <LoadingSkeleton rows={3} />}

              {/* Regular table rows */}
              {!isTableLoading &&
                paginatedFields.map((field) => {
                  const originalIndex = editedFields.findIndex(
                    (f) => f === field
                  );
                  const originalField =
                    result?.fields?.[originalIndex] || field;
                  const isChecked = checkedFields[originalIndex] || false;
                  const isSelectedForDel =
                    selectedForDeletion[originalIndex] || false;
                  const isSelectedForMerge =
                    selectedForMerge[originalIndex] || false;

                  return (
                    <TableRow
                      key={originalIndex}
                      field={field}
                      originalField={originalField}
                      index={originalIndex}
                      totalRows={editedFields.length}
                      isChecked={isChecked}
                      onCheckboxChange={onCheckboxChange}
                      onFieldChange={onFieldChange}
                      onInsertRow={onInsertRow}
                      onDeleteRow={onDeleteRow}
                      onMoveRow={onMoveRow}
                      isDeleteMode={isDeleteMode}
                      isSelectedForDeletion={isSelectedForDel}
                      onToggleDeleteSelection={onToggleDeleteSelection}
                      isMergeMode={isMergeMode}
                      isSelectedForMerge={isSelectedForMerge}
                      onToggleMergeSelection={onToggleMergeSelection}
                    />
                  );
                })}

              {/* Empty state */}
              {!isTableLoading && paginatedFields.length === 0 && (
                <EmptyState
                  hasSearchTerm={!!searchTerm.trim()}
                  searchTerm={searchTerm}
                  onClearSearch={onClearSearch}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced scroll indicators */}
        <ScrollIndicator
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={editedFields.length}
          isVisible={!isTableLoading}
        />
      </div>
    );
  }
);

DataTable.displayName = "DataTable";
