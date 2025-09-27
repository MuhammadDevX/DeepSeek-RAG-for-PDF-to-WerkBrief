"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { WerkbriefSchema } from "@/lib/ai/schema";

type Werkbrief = z.infer<typeof WerkbriefSchema>;

interface UseBrutoManagementOptions {
  editedFields: Werkbrief["fields"];
  setEditedFields: React.Dispatch<React.SetStateAction<Werkbrief["fields"]>>;
}

export const useBrutoManagement = ({
  editedFields,
  setEditedFields,
}: UseBrutoManagementOptions) => {
  const [totalBruto, setTotalBruto] = useState<number>(0);
  const [isRedistributing, setIsRedistributing] = useState<boolean>(false);

  // Calculate total bruto whenever editedFields changes
  useEffect(() => {
    if (editedFields.length > 0) {
      const total = editedFields.reduce((sum, field) => {
        const bruto =
          typeof field.BRUTO === "number"
            ? field.BRUTO
            : parseFloat(String(field.BRUTO)) || 0;
        return sum + bruto;
      }, 0);
      setTotalBruto(Number(total.toFixed(1)));
    } else {
      setTotalBruto(0);
    }
  }, [editedFields]);

  // Function to redistribute bruto values based on FOB proportions
  const redistributeBrutoValues = useCallback(
    (newTotalBruto: number) => {
      if (editedFields.length === 0) return;

      setIsRedistributing(true);

      // Calculate total FOB
      const totalFOB = editedFields.reduce((sum, field) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        return sum + fob;
      }, 0);

      if (totalFOB === 0) {
        setIsRedistributing(false);
        return;
      }

      // Calculate redistributed values with minimum weight constraint
      const redistributedValues = editedFields.map((field) => {
        const fob =
          typeof field.FOB === "number"
            ? field.FOB
            : parseFloat(String(field.FOB)) || 1;
        const newBruto = (newTotalBruto * fob) / totalFOB;
        // Apply minimum weight constraint: ensure weight is at least 0.1 kg
        const constrainedBruto = Math.max(newBruto, 0.1);
        return Number(constrainedBruto.toFixed(1));
      });

      // Handle excess due to minimum constraints
      let currentSum = redistributedValues.reduce(
        (sum, value) => sum + value,
        0
      );

      if (currentSum > newTotalBruto) {
        const excess = Number((currentSum - newTotalBruto).toFixed(1));

        // Find items that can be reduced
        const adjustableIndices = redistributedValues
          .map((value, index) => ({ value, index }))
          .filter((item) => item.value > 0.1)
          .sort((a, b) => b.value - a.value);

        // Distribute the excess reduction
        let remainingExcess = excess;
        for (const item of adjustableIndices) {
          if (remainingExcess <= 0) break;

          const maxReduction = Math.min(
            remainingExcess,
            Number((item.value - 0.1).toFixed(1))
          );

          if (maxReduction > 0) {
            redistributedValues[item.index] = Number(
              (redistributedValues[item.index] - maxReduction).toFixed(1)
            );
            remainingExcess = Number(
              (remainingExcess - maxReduction).toFixed(1)
            );
          }
        }
      }

      // Handle any remaining rounding difference
      currentSum = redistributedValues.reduce((sum, value) => sum + value, 0);
      const difference = Number((newTotalBruto - currentSum).toFixed(1));

      if (difference !== 0 && redistributedValues.length > 0) {
        let adjustmentIndex = 0;
        if (difference < 0) {
          adjustmentIndex = redistributedValues.findIndex(
            (value) => value + difference >= 0.1
          );
          if (adjustmentIndex === -1) adjustmentIndex = 0;
        }

        redistributedValues[adjustmentIndex] = Number(
          (redistributedValues[adjustmentIndex] + difference).toFixed(1)
        );

        if (redistributedValues[adjustmentIndex] < 0.1) {
          redistributedValues[adjustmentIndex] = 0.1;
        }
      }

      // Update the fields with redistributed values
      setEditedFields((prev) => {
        return prev.map((field, index) => ({
          ...field,
          BRUTO: redistributedValues[index],
        }));
      });

      // Reset redistribution flag
      setTimeout(() => {
        setIsRedistributing(false);
      }, 50);
    },
    [editedFields, setEditedFields]
  );

  // Handle total bruto change
  const handleTotalBrutoChange = useCallback(
    (value: string | number) => {
      const newTotal =
        typeof value === "number" ? value : parseFloat(String(value)) || 0;
      const roundedTotal = Number(newTotal.toFixed(1));
      setTotalBruto(roundedTotal);
      redistributeBrutoValues(roundedTotal);
    },
    [redistributeBrutoValues]
  );

  return {
    totalBruto,
    isRedistributing,
    handleTotalBrutoChange,
  };
};
