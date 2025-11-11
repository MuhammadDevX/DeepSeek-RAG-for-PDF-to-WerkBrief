"use client";
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  onMoveRow: (fromIndex: number, toIndex: number) => void;
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
  isTableExpanded?: boolean;
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
  onMoveRow,
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
  isTableExpanded = false,
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

  // Sortable header component
  const SortableHeader: React.FC<{
    sortKey: keyof ArubaField;
    children: React.ReactNode;
    className?: string;
  }> = ({ sortKey, children, className = "" }) => {
    const isSorted = sortConfig?.key === sortKey;
    const isAsc = sortConfig?.direction === "asc";

    return (
      <th
        className={`${className} ${
          onSort
            ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            : ""
        }`}
        onClick={() => onSort?.(sortKey)}
      >
        <div className="flex items-center gap-1 justify-center">
          {children}
          {onSort && isSorted && (
            <span className="ml-1">
              {isAsc ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  };

  // Sortable columns - removed getSortIcon and handleHeaderClick as they're replaced by SortableHeader

  return (
    <div
      className={`relative ${
        isTableExpanded ? "h-[70vh]" : "max-h-screen"
      } overflow-auto border rounded-lg shadow-sm`}
    >
      <div className="min-w-full">
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
              <SortableHeader
                sortKey="Item Description"
                className="p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                Item Description
              </SortableHeader>

              {/* GOEDEREN OMSCHRIJVING Header */}
              <SortableHeader
                sortKey="GOEDEREN OMSCHRIJVING"
                className="p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                Goederen Omschrijving
              </SortableHeader>

              {/* GOEDEREN CODE Header */}
              <SortableHeader
                sortKey="GOEDEREN CODE"
                className="p-3 text-left border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                Code
              </SortableHeader>

              {/* CTNS Header */}
              <SortableHeader
                sortKey="CTNS"
                className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                CTNS
              </SortableHeader>

              {/* STKS Header */}
              <SortableHeader
                sortKey="STKS"
                className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                STKS
              </SortableHeader>

              {/* BRUTO Header */}
              <SortableHeader
                sortKey="BRUTO"
                className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                Bruto
              </SortableHeader>

              {/* FOB Header */}
              <SortableHeader
                sortKey="FOB"
                className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                FOB
              </SortableHeader>

              {/* Confidence Header */}
              <th className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300">
                Conf.
              </th>

              {/* Page Header */}
              <SortableHeader
                sortKey="Page Number"
                className="p-3 text-center border-r font-semibold text-gray-700 dark:text-gray-300"
              >
                Page
              </SortableHeader>

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
                        totalRows={flatFields.length}
                        isChecked={checkedFields[item.globalIndex] || false}
                        onCheckboxChange={onCheckboxChange}
                        onFieldChange={onFieldChange}
                        onInsertRow={onInsertRow}
                        onDeleteRow={onDeleteRow}
                        onMoveRow={onMoveRow}
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
