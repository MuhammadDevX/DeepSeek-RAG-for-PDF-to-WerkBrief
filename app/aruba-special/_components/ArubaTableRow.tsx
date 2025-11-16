"use client";
import React, { memo, useCallback, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import DebouncedInput from "@/components/ui/debounced-input";
import { SearchGoederenModal } from "@/components/SearchGoederenModal";
import styles from "../../werkbrief-generator/styles.module.css";

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

interface ArubaTableRowProps {
  field: ArubaField;
  originalField: ArubaField;
  globalIndex: number;
  displayNumber: number;
  totalRows: number;
  isChecked: boolean;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof ArubaField,
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  isDeleteMode?: boolean;
  isSelectedForDeletion?: boolean;
  onToggleDeleteSelection?: (index: number) => void;
  isMergeMode?: boolean;
  isSelectedForMerge?: boolean;
  onToggleMergeSelection?: (index: number) => void;
}

const ArubaTableRow = memo(
  ({
    field,
    originalField,
    globalIndex,
    displayNumber,
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
    isMergeMode = false,
    isSelectedForMerge = false,
    onToggleMergeSelection,
  }: ArubaTableRowProps) => {
    const confidence = parseFloat(originalField.Confidence || "0");
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isEditingRowNumber, setIsEditingRowNumber] = useState(false);
    const [tempRowNumber, setTempRowNumber] = useState("");

    // Memoized event handlers
    const handleCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isMergeMode && onToggleMergeSelection) {
          onToggleMergeSelection(globalIndex);
        } else if (isDeleteMode && onToggleDeleteSelection) {
          onToggleDeleteSelection(globalIndex);
        } else {
          onCheckboxChange(globalIndex, e.target.checked);
        }
      },
      [
        globalIndex,
        isMergeMode,
        onToggleMergeSelection,
        isDeleteMode,
        onToggleDeleteSelection,
        onCheckboxChange,
      ]
    );

    const handleInputChange = useCallback(
      (fieldName: keyof ArubaField, value: string | number) => {
        onFieldChange(globalIndex, fieldName, value);
      },
      [globalIndex, onFieldChange]
    );

    const handleItemDescriptionChange = useCallback(
      (value: string | number) => {
        handleInputChange("Item Description", value);
      },
      [handleInputChange]
    );

    const handleGoederenOmschrijvingChange = useCallback(
      (value: string | number) => {
        handleInputChange("GOEDEREN OMSCHRIJVING", value);
      },
      [handleInputChange]
    );

    const handleGoederenCodeChange = useCallback(
      (value: string | number) => {
        handleInputChange("GOEDEREN CODE", value);
      },
      [handleInputChange]
    );

    const handleCTNSChange = useCallback(
      (value: string | number) => {
        handleInputChange("CTNS", value);
      },
      [handleInputChange]
    );

    const handleSTKSChange = useCallback(
      (value: string | number) => {
        handleInputChange("STKS", value);
      },
      [handleInputChange]
    );

    const handleBRUTOChange = useCallback(
      (value: string | number) => {
        handleInputChange("BRUTO", value);
      },
      [handleInputChange]
    );

    const handleFOBChange = useCallback(
      (value: string | number) => {
        handleInputChange("FOB", value);
      },
      [handleInputChange]
    );

    const handlePageNumberChange = useCallback(
      (value: string | number) => {
        handleInputChange("Page Number", value);
      },
      [handleInputChange]
    );

    const handleRowNumberClick = useCallback(() => {
      setIsEditingRowNumber(true);
      setTempRowNumber(String(displayNumber));
    }, [displayNumber]);

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
        if (targetIndex !== globalIndex) {
          onMoveRow(globalIndex, targetIndex);
        }
      }
      setIsEditingRowNumber(false);
      setTempRowNumber("");
    }, [tempRowNumber, globalIndex, totalRows, onMoveRow]);

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

    const handleSearchClick = useCallback(() => {
      setIsSearchModalOpen(true);
    }, []);

    const handleSearchClose = useCallback(() => {
      setIsSearchModalOpen(false);
    }, []);

    const handleSearchSelect = useCallback(
      (goederenCode: string, goederenOmschrijving: string) => {
        onFieldChange(globalIndex, "GOEDEREN CODE", goederenCode);
        onFieldChange(
          globalIndex,
          "GOEDEREN OMSCHRIJVING",
          goederenOmschrijving
        );
        setIsSearchModalOpen(false);
      },
      [globalIndex, onFieldChange]
    );

    const handleInsertRow = useCallback(() => {
      onInsertRow(globalIndex);
    }, [globalIndex, onInsertRow]);

    const handleDeleteRow = useCallback(() => {
      onDeleteRow(globalIndex);
    }, [globalIndex, onDeleteRow]);

    // Determine checkbox state based on mode
    const checkboxChecked = isMergeMode
      ? isSelectedForMerge
      : isDeleteMode
      ? isSelectedForDeletion
      : isChecked;

    return (
      <>
        <tr
          className={`${
            styles.tableRow
          } group transition-colors duration-150 hover:bg-blue-50/30 dark:hover:bg-gray-800/30 ${
            displayNumber % 2 === 0
              ? "bg-white dark:bg-gray-900"
              : "bg-gray-50/50 dark:bg-gray-800/20"
          } ${
            isMergeMode && isSelectedForMerge
              ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500"
              : isDeleteMode && isSelectedForDeletion
              ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
              : ""
          } relative border-b border-gray-200 dark:border-gray-700`}
        >
          {/* Checkbox */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-inherit z-20">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={handleCheckboxChange}
              className={`w-4 h-4 ${
                isMergeMode
                  ? "text-purple-600 focus:ring-purple-500 dark:focus:ring-purple-600"
                  : isDeleteMode
                  ? "text-red-600 focus:ring-red-500 dark:focus:ring-red-600"
                  : "text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600"
              } bg-gray-100 border-gray-300 rounded focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-colors duration-150`}
              title={
                isMergeMode
                  ? "Select for merging"
                  : isDeleteMode
                  ? "Select for deletion"
                  : "Select for export to Excel"
              }
            />
          </td>

          {/* Number */}
          <td className="px-2 py-3 text-sm border-r border-gray-200 dark:border-gray-700 sticky left-12 bg-inherit z-20">
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
                    {displayNumber}
                  </span>
                </button>
              )}
            </div>
          </td>

          {/* Action Buttons */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700 sticky left-22 bg-inherit z-20">
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

          {/* Item Description */}
          <td className="px-3 py-3 relative border-r border-gray-200 dark:border-gray-700">
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

          {/* GOEDEREN OMSCHRIJVING */}
          <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700">
            <DebouncedInput
              type="text"
              value={field["GOEDEREN OMSCHRIJVING"]}
              onChange={handleGoederenOmschrijvingChange}
              className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg px-3 py-2 transition-colors duration-150"
              title={field["GOEDEREN OMSCHRIJVING"]}
            />
          </td>

          {/* GOEDEREN CODE */}
          <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700">
            <DebouncedInput
              type="text"
              value={field["GOEDEREN CODE"]}
              onChange={handleGoederenCodeChange}
              className="w-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              title={field["GOEDEREN CODE"]}
            />
          </td>

          {/* CTNS */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
            <DebouncedInput
              type="number"
              step="1"
              value={Number(field.CTNS)}
              onChange={handleCTNSChange}
              precision={0}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-900/20 px-2 py-2 rounded-lg border border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>

          {/* STKS */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
            <DebouncedInput
              type="number"
              step="1"
              value={Number(field.STKS)}
              onChange={handleSTKSChange}
              precision={0}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 px-2 py-2 rounded-lg border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>

          {/* BRUTO */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
            <DebouncedInput
              type="number"
              step="0.01"
              value={Number(field.BRUTO)}
              onChange={handleBRUTOChange}
              precision={2}
              className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded-lg border border-green-200 dark:border-green-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150"
            />
          </td>

          {/* FOB */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
            <div className="relative">
              <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-bold text-green-700 dark:text-green-400 z-10">
                $
              </span>
              <DebouncedInput
                type="number"
                step="0.01"
                value={Number(field.FOB)}
                onChange={handleFOBChange}
                precision={2}
                className={`w-full pl-4 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded-lg border border-green-200 dark:border-green-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center transition-colors duration-150 ${
                  field.FOB === 0
                    ? "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                    : ""
                }`}
              />
            </div>
          </td>

          {/* Confidence */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
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
              {confidence.toFixed(0)}%
            </div>
          </td>

          {/* Page Number */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
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

          {/* Search Button */}
          <td className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSearchClick}
              className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors duration-150 shadow-sm hover:shadow-md"
              title="Search for Goederen Code"
            >
              <Search className="w-4 h-4" />
            </button>
          </td>
        </tr>

        {/* Search Modal */}
        <SearchGoederenModal
          isOpen={isSearchModalOpen}
          onClose={handleSearchClose}
          onSelect={handleSearchSelect}
        />
      </>
    );
  }
);

ArubaTableRow.displayName = "ArubaTableRow";

export default ArubaTableRow;
