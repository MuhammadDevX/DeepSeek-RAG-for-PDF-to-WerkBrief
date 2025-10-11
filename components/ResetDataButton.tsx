"use client";
import React from "react";
import { useWerkbrief } from "@/contexts/WerkbriefContext";
import { Button } from "@/components/ui/button";

export const ResetDataButton: React.FC = () => {
  const { resetAllState } = useWerkbrief();

  return (
    <Button
      variant="outline"
      onClick={resetAllState}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
    >
      Reset All Data
    </Button>
  );
};
