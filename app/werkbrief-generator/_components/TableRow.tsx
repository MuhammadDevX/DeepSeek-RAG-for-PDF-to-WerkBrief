"use client";
import React, { memo, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { WerkbriefSchema } from "@/lib/ai/schema";
import { z } from "zod";
import DebouncedInput from "@/components/ui/debounced-input";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface TableRowProps {
  field: Werkbrief["fields"][0];
  originalField: Werkbrief["fields"][0];
  index: number;
  isChecked: boolean;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof Werkbrief["fields"][0],
    value: string | number
  ) => void;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
}

const TableRow = memo(
  ({
    field,
    originalField,
    index,
    isChecked,
    onCheckboxChange,
    onFieldChange,
    onInsertRow,
    onDeleteRow,
  }: TableRowProps) => {
    const confidence = parseFloat(originalField.Confidence || "0");

    // Memoized event handlers to prevent unnecessary re-renders
    const handleCheckboxChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckboxChange(index, e.target.checked);
      },
      [index, onCheckboxChange]
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

    const handleInsertRow = useCallback(() => {
      onInsertRow(index + 1);
    }, [index, onInsertRow]);

    const handleDeleteRow = useCallback(() => {
      onDeleteRow(index);
    }, [index, onDeleteRow]);

    return (
      <tr
        className={`group transition-all duration-150 hover:bg-blue-50 dark:hover:bg-gray-800/50 ${
          index % 2 === 0
            ? "bg-white dark:bg-gray-900"
            : "bg-gray-50/50 dark:bg-gray-800/20"
        }`}
      >
        <td className="px-2 py-3 text-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            title="Select for export to Excel"
          />
        </td>
        <td className="px-2 py-3 text-sm">
          <div className="flex items-center justify-center">
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center font-semibold text-xs">
              {index + 1}
            </span>
          </div>
        </td>
        <td className="px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={handleInsertRow}
              className="inline-flex items-center justify-center w-7 h-7 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 opacity-70 hover:opacity-100 hover:scale-110"
              title="Add row below"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={handleDeleteRow}
              className="inline-flex items-center justify-center w-7 h-7 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 opacity-70 hover:opacity-100 hover:scale-110"
              title="Delete row"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
        <td className="px-3 py-3">
          <DebouncedInput
            type="textarea"
            value={field["Item Description"]}
            onChange={handleItemDescriptionChange}
            className="w-full h-20 text-sm font-medium text-gray-900 dark:text-white leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded px-3 py-2 resize-none"
            title={field["Item Description"]}
          />
        </td>
        <td className="px-3 py-3">
          <DebouncedInput
            type="text"
            value={field["GOEDEREN OMSCHRIJVING"]}
            onChange={handleGoederenOmschrijvingChange}
            className="w-full text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-transparent border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded px-3 py-2"
            title={field["GOEDEREN OMSCHRIJVING"]}
          />
        </td>
        <td className="px-3 py-3">
          <DebouncedInput
            type="text"
            value={field["GOEDEREN CODE"]}
            onChange={handleGoederenCodeChange}
            className="w-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            title={field["GOEDEREN CODE"]}
          />
        </td>
        <td className="px-2 py-3 text-center">
          <DebouncedInput
            type="number"
            value={field.CTNS}
            onChange={handleCTNSChange}
            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-orange-50 dark:bg-orange-900/20 px-2 py-2 rounded border border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </td>
        <td className="px-2 py-3 text-center">
          <DebouncedInput
            type="number"
            value={field.STKS}
            onChange={handleSTKSChange}
            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 px-2 py-2 rounded border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </td>
        <td className="px-2 py-3 text-center">
          <DebouncedInput
            type="number"
            step="0.01"
            value={field.BRUTO}
            onChange={handleBRUTOChange}
            className="w-full text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded border border-green-200 dark:border-green-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
          />
        </td>
        <td className="px-2 py-3 text-center">
          <div className="relative">
            <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-bold text-green-700 dark:text-green-400">
              $
            </span>
            <DebouncedInput
              type="number"
              step="0.01"
              value={field.FOB}
              onChange={handleFOBChange}
              className={`w-full pl-4 text-sm font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-2 rounded border border-green-200 dark:border-green-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center ${
                field.FOB === 0 ? "bg-red-100 dark:bg-red-900/20" : ""
              }`}
            />
          </div>
        </td>
        <td className="px-2 py-3 text-center">
          <div
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
      </tr>
    );
  }
);

TableRow.displayName = "TableRow";

export default TableRow;
