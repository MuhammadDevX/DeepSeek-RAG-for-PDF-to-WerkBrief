"use client";

import { useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface UseTableDataOptions {
  result: Werkbrief | null;
  editedFields: Werkbrief["fields"];
  checkedFields: boolean[];
  setEditedFields: (
    fields:
      | Werkbrief["fields"]
      | ((prev: Werkbrief["fields"]) => Werkbrief["fields"])
  ) => void;
  setCheckedFields: (
    fields: boolean[] | ((prev: boolean[]) => boolean[])
  ) => void;
  searchTerm: string;
  sortConfig: {
    key: keyof Werkbrief["fields"][0] | null;
    direction: "asc" | "desc";
  };
  currentPage: number;
  itemsPerPage: number;
}

export const useTableData = ({
  result,
  editedFields,
  checkedFields,
  setEditedFields,
  setCheckedFields,
  searchTerm,
  sortConfig,
  currentPage,
  itemsPerPage,
}: UseTableDataOptions) => {
  // Initialize data when result changes
  useEffect(() => {
    if (result?.fields) {
      setEditedFields(result.fields);
      setCheckedFields(result.fields.map(() => true));
    }
  }, [result, setEditedFields, setCheckedFields]);

  // Memoized filtered and sorted data
  const filteredAndSortedFields = useMemo(() => {
    let filtered = editedFields;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = editedFields.filter(
        (field) =>
          field["Item Description"].toLowerCase().includes(searchLower) ||
          field["GOEDEREN OMSCHRIJVING"].toLowerCase().includes(searchLower) ||
          field["GOEDEREN CODE"].toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle numeric values
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        // Handle string values
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [editedFields, searchTerm, sortConfig]);

  // Memoized paginated data
  const paginatedFields = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedFields.slice(startIndex, endIndex);
  }, [filteredAndSortedFields, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedFields.length / itemsPerPage);

  // Memoized field change handler
  const handleFieldChange = useCallback(
    (
      index: number,
      fieldName: keyof Werkbrief["fields"][0],
      value: string | number
    ) => {
      let processedValue = value;
      if (
        fieldName === "BRUTO" ||
        fieldName === "FOB" ||
        fieldName === "CTNS" ||
        fieldName === "STKS"
      ) {
        const numValue =
          typeof value === "number" ? value : parseFloat(String(value)) || 0;
        processedValue = Number(numValue.toFixed(1));
      }

      setEditedFields((prev) => {
        const newEditedFields = [...prev];
        newEditedFields[index] = {
          ...newEditedFields[index],
          [fieldName]: processedValue,
        };
        return newEditedFields;
      });
    },
    [setEditedFields]
  );

  // Memoized checkbox change handler
  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      setCheckedFields((prev) => {
        const newCheckedFields = [...prev];
        newCheckedFields[index] = checked;
        return newCheckedFields;
      });
    },
    [setCheckedFields]
  );

  return {
    filteredAndSortedFields,
    paginatedFields,
    totalPages,
    handleFieldChange,
    handleCheckboxChange,
  };
};
