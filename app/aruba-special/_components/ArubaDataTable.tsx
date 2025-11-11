"use client";
import React from "react";
import { GroupHeader } from "./GroupHeader";
import ArubaTableRow from "./ArubaTableRow";

type ArubaField = {
  "Item Description": string;
  "GOEDEREN OMSCHRIJVING": string;
  "GOEDEREN CODE": string;
  CTNS: number;
  STKS: number;
  BRUTO: number;
  FOB: number;
  Confidence: string;
  "Page Number": number;
};

type ArubaGroup = {
  clientName: string;
  fields: ArubaField[];
};

interface ArubaDataTableProps {
  groups: ArubaGroup[];
  checkedFields: boolean[];
  collapsedGroups: Set<string>;
  onToggleGroupCollapse: (clientName: string) => void;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof ArubaField,
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  bulkSelectAll: boolean;
  onBulkSelectAll: () => void;
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
  sortConfig?: {
    key: keyof ArubaField | null;
    direction: "asc" | "desc";
  };
  onSort?: (key: keyof ArubaField) => void;
}

export const ArubaDataTable: React.FC<ArubaDataTableProps> = ({
  groups,
  checkedFields,
  collapsedGroups,
  onToggleGroupCollapse,
  onCheckboxChange,
  onFieldChange,
  onInsertRow,
  onDeleteRow,
  bulkSelectAll,
  onBulkSelectAll,
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
  sortConfig,
  onSort,
}) => {
  // Calculate flat list with global indices and original fields
  const flatFields: Array<{
    field: ArubaField;
    originalField: ArubaField;
    globalIndex: number;
    displayNumber: number;
    clientName: string;
    isGroupStart: boolean;
  }> = [];

  let globalIndex = 0;
  let displayNumber = 1;

  groups.forEach((group) => {
    group.fields.forEach((field, fieldIndex) => {
      flatFields.push({
        field,
        originalField: field, // In aruba, we don't have separate original fields yet
        globalIndex: globalIndex++,
        displayNumber: displayNumber++,
        clientName: group.clientName,
        isGroupStart: fieldIndex === 0,
      });
    });
  });

  // Sortable columns
  const getSortIcon = (key: keyof ArubaField) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const handleHeaderClick = (key: keyof ArubaField) => {
    if (onSort) {
      onSort(key);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr className="border-b-2 border-gray-300 dark:border-gray-600">
              {/* Checkbox Header */}
              <th className="p-3 text-center border-r sticky left-0 bg-gray-50 dark:bg-gray-800 z-20 w-12">
                <input
                  type="checkbox"
                  checked={
                    isMergeMode
                      ? mergeSelectAll
                      : isDeleteMode
                      ? deleteSelectAll
                      : bulkSelectAll
                  }
                  onChange={
                    isMergeMode
                      ? onMergeSelectAll
                      : isDeleteMode
                      ? onDeleteSelectAll
                      : onBulkSelectAll
                  }
                  className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  title={
                    isMergeMode
                      ? "Select all for merge"
                      : isDeleteMode
                      ? "Select all for deletion"
                      : "Select all"
                  }
                />
              </th>

              {/* Number Header */}
              <th className="p-3 text-center border-r w-16 font-semibold text-gray-700 dark:text-gray-300">
                #
              </th>

              {/* Actions Header */}
              <th className="p-3 text-center border-r w-20 font-semibold text-gray-700 dark:text-gray-300">
                Actions
              </th>

              {/* Item Description Header */}
              <th
                className={`p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("Item Description")}
              >
                Item Description
                {getSortIcon("Item Description")}
              </th>

              {/* GOEDEREN OMSCHRIJVING Header */}
              <th
                className={`p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() =>
                  onSort && handleHeaderClick("GOEDEREN OMSCHRIJVING")
                }
              >
                GOEDEREN OMSCHRIJVING
                {getSortIcon("GOEDEREN OMSCHRIJVING")}
              </th>

              {/* GOEDEREN CODE Header */}
              <th
                className={`p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("GOEDEREN CODE")}
              >
                GOEDEREN CODE
                {getSortIcon("GOEDEREN CODE")}
              </th>

              {/* CTNS Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("CTNS")}
              >
                CTNS
                {getSortIcon("CTNS")}
              </th>

              {/* STKS Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("STKS")}
              >
                STKS
                {getSortIcon("STKS")}
              </th>

              {/* BRUTO Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("BRUTO")}
              >
                BRUTO
                {getSortIcon("BRUTO")}
              </th>

              {/* FOB Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("FOB")}
              >
                FOB
                {getSortIcon("FOB")}
              </th>

              {/* Confidence Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("Confidence")}
              >
                Confidence
                {getSortIcon("Confidence")}
              </th>

              {/* Page Header */}
              <th
                className={`p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300 ${
                  onSort
                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                }`}
                onClick={() => onSort && handleHeaderClick("Page Number")}
              >
                Page
                {getSortIcon("Page Number")}
              </th>

              {/* Search Header */}
              <th className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300">
                Search
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {groups.map((group, groupIndex) => {
              const isCollapsed = collapsedGroups.has(group.clientName);
              const groupFields = flatFields.filter(
                (f) => f.clientName === group.clientName
              );

              return (
                <React.Fragment key={groupIndex}>
                  {/* Group Header Row */}
                  <tr>
                    <td colSpan={13} className="p-0">
                      <GroupHeader
                        clientName={group.clientName}
                        itemCount={group.fields.length}
                        isCollapsed={isCollapsed}
                        onToggle={() => onToggleGroupCollapse(group.clientName)}
                      />
                    </td>
                  </tr>

                  {/* Group Rows - Only show if not collapsed */}
                  {!isCollapsed &&
                    groupFields.map((item) => (
                      <ArubaTableRow
                        key={item.globalIndex}
                        field={item.field}
                        originalField={item.originalField}
                        globalIndex={item.globalIndex}
                        displayNumber={item.displayNumber}
                        isChecked={checkedFields[item.globalIndex] || false}
                        onCheckboxChange={onCheckboxChange}
                        onFieldChange={onFieldChange}
                        onInsertRow={onInsertRow}
                        onDeleteRow={onDeleteRow}
                        isDeleteMode={isDeleteMode}
                        isSelectedForDeletion={
                          selectedForDeletion[item.globalIndex] || false
                        }
                        onToggleDeleteSelection={onToggleDeleteSelection}
                        isMergeMode={isMergeMode}
                        isSelectedForMerge={
                          selectedForMerge[item.globalIndex] || false
                        }
                        onToggleMergeSelection={onToggleMergeSelection}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {groups.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No data available. Upload PDF files to get started.</p>
        </div>
      )}
    </div>
  );
};
