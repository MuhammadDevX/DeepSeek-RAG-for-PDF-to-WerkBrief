"use client";
import React from "react";
import { useWerkbrief } from "@/contexts/WerkbriefContext";

export const WerkbriefStateIndicator: React.FC = () => {
  const { editedFields, result, isTableLoading } = useWerkbrief();

  const hasData =
    (result && result.fields && result.fields.length > 0) ||
    editedFields.length > 0;

  if (!hasData && !isTableLoading) {
    return null;
  }

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
      {isTableLoading ? (
        <>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Processing data...</span>
        </>
      ) : hasData ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>{editedFields.length} items loaded</span>
        </>
      ) : null}
    </div>
  );
};
