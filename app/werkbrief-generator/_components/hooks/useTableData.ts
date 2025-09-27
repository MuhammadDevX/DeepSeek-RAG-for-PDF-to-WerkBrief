"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface UseTableDataOptions {
  result: Werkbrief | null;
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
  searchTerm,
  sortConfig,
  currentPage,
  itemsPerPage,
}: UseTableDataOptions) => {
  const [editedFields, setEditedFields] = useState<Werkbrief["fields"]>([]);
  const [checkedFields, setCheckedFields] = useState<boolean[]>([]);

  // Initialize data when result changes
  useEffect(() => {
    if (result?.fields) {
      setEditedFields(result.fields);
      setCheckedFields(result.fields.map(() => true));
    }
  }, [result]);

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
    []
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
    []
  );

  return {
    editedFields,
    checkedFields,
    filteredAndSortedFields,
    paginatedFields,
    totalPages,
    setEditedFields,
    setCheckedFields,
    handleFieldChange,
    handleCheckboxChange,
  };
};
