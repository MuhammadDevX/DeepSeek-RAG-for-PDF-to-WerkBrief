"use client";
import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface GroupHeaderProps {
  clientName: string;
  itemCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  clientName,
  itemCount,
  isCollapsed,
  onToggle,
}) => {
  return (
    <div
      className="bg-gray-100 hover:bg-gray-200 p-4 cursor-pointer flex items-center justify-between border-b-2 border-gray-300 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <button className="p-1 hover:bg-gray-300 rounded transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        <h3 className="text-lg font-semibold text-gray-800">{clientName}</h3>
        <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  );
};
