"use client";
import React, { memo } from "react";
import DebouncedInput from "@/components/ui/debounced-input";

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
  globalIndex: number;
  displayNumber: number;
  isChecked: boolean;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof ArubaField,
    value: string | number
  ) => void;
}

const ArubaTableRow = memo(
  ({
    field,
    globalIndex,
    displayNumber,
    isChecked,
    onCheckboxChange,
    onFieldChange,
  }: ArubaTableRowProps) => {
    const handleInputChange = (
      fieldName: keyof ArubaField,
      value: string | number
    ) => {
      onFieldChange(globalIndex, fieldName, value);
    };

    return (
      <tr className="border-b hover:bg-gray-50 transition-colors">
        {/* Checkbox */}
        <td className="p-2 text-center border-r w-12">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onCheckboxChange(globalIndex, e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
        </td>

        {/* Number */}
        <td className="p-2 text-center border-r w-16 font-medium">
          {displayNumber}
        </td>

        {/* Item Description */}
        <td className="p-2 border-r w-64">
          <div className="text-sm text-gray-700 line-clamp-2">
            {field["Item Description"]}
          </div>
        </td>

        {/* GOEDEREN OMSCHRIJVING */}
        <td className="p-2 border-r w-64">
          <DebouncedInput
            value={field["GOEDEREN OMSCHRIJVING"]}
            onChange={(value) =>
              handleInputChange("GOEDEREN OMSCHRIJVING", value)
            }
            className="w-full p-1 border rounded text-sm"
            delay={500}
          />
        </td>

        {/* GOEDEREN CODE */}
        <td className="p-2 border-r w-32">
          <DebouncedInput
            value={field["GOEDEREN CODE"]}
            onChange={(value) => handleInputChange("GOEDEREN CODE", value)}
            className="w-full p-1 border rounded text-sm"
            delay={500}
          />
        </td>

        {/* CTNS */}
        <td className="p-2 border-r w-24">
          <DebouncedInput
            type="number"
            value={field.CTNS}
            onChange={(value) => handleInputChange("CTNS", Number(value))}
            className="w-full p-1 border rounded text-sm text-right"
            delay={500}
          />
        </td>

        {/* STKS */}
        <td className="p-2 border-r w-24">
          <DebouncedInput
            type="number"
            value={field.STKS}
            onChange={(value) => handleInputChange("STKS", Number(value))}
            className="w-full p-1 border rounded text-sm text-right"
            delay={500}
          />
        </td>

        {/* BRUTO */}
        <td className="p-2 border-r w-24">
          <DebouncedInput
            type="number"
            value={field.BRUTO}
            onChange={(value) => handleInputChange("BRUTO", Number(value))}
            className="w-full p-1 border rounded text-sm text-right"
            delay={500}
            step="0.1"
          />
        </td>

        {/* FOB */}
        <td className="p-2 border-r w-24">
          <DebouncedInput
            type="number"
            value={field.FOB}
            onChange={(value) => handleInputChange("FOB", Number(value))}
            className="w-full p-1 border rounded text-sm text-right"
            delay={500}
            step="0.01"
          />
        </td>

        {/* Confidence */}
        <td className="p-2 border-r w-20 text-center">
          <span
            className={`text-xs px-2 py-1 rounded ${
              parseInt(field.Confidence) >= 80
                ? "bg-green-100 text-green-800"
                : parseInt(field.Confidence) >= 50
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {field.Confidence}
          </span>
        </td>

        {/* Page Number */}
        <td className="p-2 text-center w-20 text-sm text-gray-600">
          {field["Page Number"]}
        </td>
      </tr>
    );
  }
);

ArubaTableRow.displayName = "ArubaTableRow";

export default ArubaTableRow;
