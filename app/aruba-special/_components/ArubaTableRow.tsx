"use client";
import React, { memo, useCallback, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import DebouncedInput from "@/components/ui/debounced-input";
import { SearchGoederenModal } from "@/components/SearchGoederenModal";

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
  isChecked: boolean;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof ArubaField,
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
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
    isChecked,
    onCheckboxChange,
    onFieldChange,
    onInsertRow,
    onDeleteRow,
    isDeleteMode = false,
    isSelectedForDeletion = false,
    onToggleDeleteSelection,
    isMergeMode = false,
    isSelectedForMerge = false,
    onToggleMergeSelection,
  }: ArubaTableRowProps) => {
    const confidence = parseFloat(originalField.Confidence || "0");
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

    // Get confidence color
    const getConfidenceColor = (confidence: number) => {
      if (confidence >= 0.9)
        return "bg-green-100 text-green-800 border-green-300";
      if (confidence >= 0.7)
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      return "bg-red-100 text-red-800 border-red-300";
    };

    return (
      <>
        <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
          {/* Checkbox */}
          <td className="p-3 text-center border-r sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800 z-10">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={handleCheckboxChange}
              className="w-4 h-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
          </td>

          {/* Number */}
          <td className="p-3 text-center border-r font-medium text-gray-700 dark:text-gray-300">
            {displayNumber}
          </td>

          {/* Action Buttons */}
          <td className="p-3 text-center border-r">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={handleInsertRow}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                title="Add row below"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteRow}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                title="Delete row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>

          {/* Item Description */}
          <td className="p-3 border-r">
            <DebouncedInput
              value={field["Item Description"]}
              onChange={(value) => handleInputChange("Item Description", value)}
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* GOEDEREN OMSCHRIJVING */}
          <td className="p-3 border-r">
            <DebouncedInput
              value={field["GOEDEREN OMSCHRIJVING"]}
              onChange={(value) =>
                handleInputChange("GOEDEREN OMSCHRIJVING", value)
              }
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* GOEDEREN CODE */}
          <td className="p-3 border-r">
            <DebouncedInput
              value={field["GOEDEREN CODE"]}
              onChange={(value) => handleInputChange("GOEDEREN CODE", value)}
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* CTNS */}
          <td className="p-3 text-center border-r">
            <DebouncedInput
              type="number"
              value={field.CTNS}
              onChange={(value) => handleInputChange("CTNS", value)}
              className="w-full p-2 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* STKS */}
          <td className="p-3 text-center border-r">
            <DebouncedInput
              type="number"
              value={field.STKS}
              onChange={(value) => handleInputChange("STKS", value)}
              className="w-full p-2 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* BRUTO */}
          <td className="p-3 text-center border-r">
            <DebouncedInput
              type="number"
              step="0.1"
              value={field.BRUTO}
              onChange={(value) => handleInputChange("BRUTO", value)}
              className="w-full p-2 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* FOB */}
          <td className="p-3 text-center border-r">
            <DebouncedInput
              type="number"
              step="0.01"
              value={field.FOB}
              onChange={(value) => handleInputChange("FOB", value)}
              className="w-full p-2 border rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              delay={500}
            />
          </td>

          {/* Confidence */}
          <td className="p-3 text-center border-r">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(
                confidence
              )}`}
            >
              {confidence.toFixed(0)}%
            </span>
          </td>

          {/* Page Number */}
          <td className="p-3 text-center border-r">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {field["Page Number"]}
            </span>
          </td>

          {/* Search Button */}
          <td className="p-3 text-center border-r">
            <button
              onClick={handleSearchClick}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              title="Search Goederen"
            >
              <Search className="w-4 h-4" />
            </button>
          </td>
        </tr>

        {/* Search Modal */}
        {isSearchModalOpen && (
          <SearchGoederenModal
            isOpen={isSearchModalOpen}
            onClose={handleSearchClose}
            onSelect={handleSearchSelect}
          />
        )}
      </>
    );
  }
);

ArubaTableRow.displayName = "ArubaTableRow";

export default ArubaTableRow;
