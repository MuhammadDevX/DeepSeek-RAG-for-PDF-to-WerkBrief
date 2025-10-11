"use client";
import React, { memo, useCallback, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { z } from "zod";
import DebouncedInput from "@/components/ui/debounced-input";
import { SearchGoederenModal } from "@/components/SearchGoederenModal";
import styles from "../styles.module.css";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface TableRowProps {
  field: Werkbrief["fields"][0];
  originalField: Werkbrief["fields"][0];
  index: number;
  totalRows: number;
  isChecked: boolean;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof Werkbrief["fields"][0],
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  isDeleteMode?: boolean;
  isSelectedForDeletion?: boolean;
  onToggleDeleteSelection?: (index: number) => void;
}

const TableRow = memo(
  ({
    field,
    originalField,
    index,
    totalRows,
    isChecked,
    onCheckboxChange,
    onFieldChange,
    onInsertRow,
    onDeleteRow,
    onMoveRow,
    isDeleteMode = false,
    isSelectedForDeletion = false,
    onToggleDeleteSelection,
  }: TableRowProps) => {
    const confidence = parseFloat(originalField.Confidence || "0");
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    // Memoized event handlers to prevent unnecessary re-renders
    const handleCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isDeleteMode && onToggleDeleteSelection) {
          onToggleDeleteSelection(index);
        } else {
          onCheckboxChange(index, e.target.checked);
        }
      },
      [index, isDeleteMode, onToggleDeleteSelection, onCheckboxChange]
    );

    const handleItemDescriptionChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "Item Description", value);
      },
      [index, onFieldChange]
    );

    const handleGoederenOmschrijvingChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "GOEDEREN OMSCHRIJVING", value);
      },
      [index, onFieldChange]
    );

    const handleGoederenCodeChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "GOEDEREN CODE", value);
      },
      [index, onFieldChange]
    );

    const handleCTNSChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "CTNS", value);
      },
      [index, onFieldChange]
    );

    const handleSTKSChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "STKS", value);
      },
      [index, onFieldChange]
    );

    const handleBRUTOChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "BRUTO", value);
      },
      [index, onFieldChange]
    );

    const handleFOBChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "FOB", value);
      },
      [index, onFieldChange]
    );

    const handlePageNumberChange = useCallback(
      (value: string | number) => {
        onFieldChange(index, "Page Number", value);
      },
      [index, onFieldChange]
    );

    const handleSearchClick = useCallback(() => {
      setIsSearchModalOpen(true);
    }, []);

    const handleSearchClose = useCallback(() => {
      setIsSearchModalOpen(false);
    }, []);

    const handleSearchSelect = useCallback(
      (goederenCode: string, goederenOmschrijving: string) => {
        onFieldChange(index, "GOEDEREN CODE", goederenCode);
        onFieldChange(index, "GOEDEREN OMSCHRIJVING", goederenOmschrijving);
        setIsSearchModalOpen(false);
      },
      [index, onFieldChange]
    );

    const handleInsertRow = useCallback(() => {
      onInsertRow(index + 1);
    }, [index, onInsertRow]);

    const handleDeleteRow = useCallback(() => {
      onDeleteRow(index);
    }, [index, onDeleteRow]);

    const [isEditingRowNumber, setIsEditingRowNumber] = React.useState(false);
    const [tempRowNumber, setTempRowNumber] = React.useState("");

    const handleRowNumberClick = useCallback(() => {
      setIsEditingRowNumber(true);
      setTempRowNumber(String(index + 1));
    }, [index]);

    const handleRowNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "" || /^\d+$/.test(value)) {
          setTempRowNumber(value);
        }
      },
      []
    );

    const handleRowNumberBlur = useCallback(() => {
      const newPosition = parseInt(tempRowNumber, 10);
      if (!isNaN(newPosition) && newPosition >= 1 && newPosition <= totalRows) {
        const targetIndex = newPosition - 1;
        if (targetIndex !== index) {
          onMoveRow(index, targetIndex);
        }
      }
      setIsEditingRowNumber(false);
      setTempRowNumber("");
    }, [tempRowNumber, index, totalRows, onMoveRow]);

    const handleRowNumberKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          handleRowNumberBlur();
        } else if (e.key === "Escape") {
          setIsEditingRowNumber(false);
          setTempRowNumber("");
        }
      },
      [handleRowNumberBlur]
    );

    return (
      <>
        <tr
          className={`${
            styles.tableRow
          } group transition-colors duration-150 hover:bg-blue-50/30 dark:hover:bg-gray-800/30 ${
            index % 2 === 0
              ? "bg-white dark:bg-gray-900"
              : "bg-gray-50/50 dark:bg-gray-800/20"
          } ${
            isDeleteMode && isSelectedForDeletion
              ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
              : ""
          } relative`}
        >
          <td className="px-2 py-3 text-center sticky left-0 bg-inherit z-20">
            <input
              type="checkbox"
              checked={isDeleteMode ? isSelectedForDeletion : isChecked}
              onChange={handleCheckboxChange}
              className={`w-4 h-4 ${
                isDeleteMode
                  ? "text-red-600 focus:ring-red-500 dark:focus:ring-red-600"
                  : "text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600"
              } bg-gray-100 border-gray-300 rounded focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors duration-150`}
              title={
                isDeleteMode
                  ? "Select for deletion"
                  : "Select for export to Excel"
              }
            />
          </td>
          <td className="px-2 py-3 text-sm sticky left-12 bg-inherit z-20">
            <div className="flex items-center justify-center">
              {isEditingRowNumber ? (
                <input
                  type="text"
                  value={tempRowNumber}
                  onChange={handleRowNumberChange}
                  onBlur={handleRowNumberBlur}
                  onKeyDown={handleRowNumberKeyDown}
                  autoFocus
                  className="w-12 h-6 bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-lg text-center font-semibold text-xs border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <button
                  onClick={handleRowNumberClick}
                  className="w-8 h-6 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold text-xs shadow-sm hover:shadow-md hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800/50 dark:hover:to-blue-700/50 transition-all duration-150 cursor-pointer group/number"
                  title="Click to change row position"
                >
                  <span className="group-hover/number:scale-110 transition-transform">
                    {index + 1}
                  </span>
                </button>
              )}
            </div>
          </td>
          <td className="px-2 py-3 text-center sticky left-22 bg-inherit z-20">
            <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={handleInsertRow}
                className={`${styles.actionButton} inline-flex items-center justify-center w-7 h-7 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors duration-150 opacity-70 hover:opacity-100 shadow-sm hover:shadow-md`}
                title="Add row below"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteRow}
                className={`${styles.actionButton} inline-flex items-center justify-center w-7 h-7 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors duration-150 opacity-70 hover:opacity-100 shadow-sm hover:shadow-md`}
                title="Delete row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>
          <td className="px-3 py-3 relative">
            <div className="relative group">
              <DebouncedInput
                type="textarea"
                value={field["Item Description"]}
                onChange={handleItemDescriptionChange}
                className={`${styles.focusInput} w-full h-16 text-sm font-medium text-gray-900 dark:text-white leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2 resize-none transition-colors duration-150`}
                title={field["Item Description"]}
              />
            </div>
          </td>
          <td className="px-3 py-3">
            <DebouncedInput
              type="text"
              value={field["GOEDEREN OMSCHRIJVING"]}
              onChange={handleGoederenOmschrijvingChange}
              className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2 transition-colors duration-150"
              title={field["GOEDEREN OMSCHRIJVING"]}
            />
          </td>
          <td className="px-3 py-3">
            <DebouncedInput
              type="text"
              value={field["GOEDEREN CODE"]}
              onChange={handleGoederenCodeChange}
              className="w-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              title={field["GOEDEREN CODE"]}
            />
          </td>
          <td className="px-2 py-3 text-center">
            <DebouncedInput
              type="number"
              step="1"
              value={Number(field.CTNS).toFixed(0)}
              onChange={handleCTNSChange}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-900/20 px-2 py-2 rounded-lg border border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>
          <td className="px-2 py-3 text-center">
            <DebouncedInput
              type="number"
              step="1"
              value={Number(field.STKS).toFixed(0)}
              onChange={handleSTKSChange}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 px-2 py-2 rounded-lg border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>
          <td className="px-2 py-3 text-center">
            <DebouncedInput
              type="number"
              step="0.1"
              value={Number(field.BRUTO).toFixed(1)}
              onChange={handleBRUTOChange}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded-lg border border-green-200 dark:border-green-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>
          <td className="px-2 py-3 text-center">
            <div className="relative">
              <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-bold text-green-700 dark:text-green-400 z-10">
                $
              </span>
              <DebouncedInput
                type="number"
                step="0.01"
                value={Number(field.FOB).toFixed(2)}
                onChange={handleFOBChange}
                className={`w-full pl-4 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded-lg border border-green-200 dark:border-green-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150 ${
                  field.FOB === 0
                    ? "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                    : ""
                }`}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-center">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                confidence > 80
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                  : confidence > 60
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700"
                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700"
              }`}
              title={`Confidence: ${confidence.toFixed(0)}%`}
            >
              {originalField["Confidence"] ? `${confidence.toFixed(0)}%` : "-"}
            </div>
          </td>
          <td className="px-2 py-3 text-center">
            <DebouncedInput
              type="number"
              step="1"
              value={
                field["Page Number"] !== undefined
                  ? Number(field["Page Number"])
                  : ""
              }
              onChange={handlePageNumberChange}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-indigo-50 dark:bg-indigo-900/20 px-2 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
              placeholder="Page"
            />
          </td>
          <td className="px-2 py-3 text-center">
            <button
              onClick={handleSearchClick}
              className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors duration-150 shadow-sm hover:shadow-md"
              title="Search for Goederen Code"
            >
              <Search className="w-4 h-4" />
            </button>
          </td>
        </tr>
        <SearchGoederenModal
          isOpen={isSearchModalOpen}
          onClose={handleSearchClose}
          onSelect={handleSearchSelect}
        />
      </>
    );
  }
);

TableRow.displayName = "TableRow";

export default TableRow;
