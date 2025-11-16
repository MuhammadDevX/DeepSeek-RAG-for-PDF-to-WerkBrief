"use client";
import React from "react";
import { useWerkbrief } from "@/contexts/WerkbriefContext";
import { Button } from "@/components/ui/button";

export const ResetDataButton: React.FC = () => {
  const { resetAllState: resetWerkbriefState } = useWerkbrief();

  const handleResetAll = () => {
    // Reset werkbrief state
    resetWerkbriefState();

    // Dispatch a custom event for Aruba Special to listen to
    // This will only be caught if the ArubaSpecialContext is mounted (i.e., admin is on that page)
    window.dispatchEvent(new CustomEvent("resetArubaSpecial"));
  };

  return (
    <Button
      variant="outline"
      onClick={handleResetAll}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
    >
      Reset All Data
    </Button>
  );
};
