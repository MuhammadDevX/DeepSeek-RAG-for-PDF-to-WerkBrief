"use client";
import React from "react";
import { GroupHeader } from "./GroupHeader";
import ArubaTableRow from "./ArubaTableRow";

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

type ArubaGroup = {
  clientName: string;
  fields: ArubaField[];
};

interface ArubaDataTableProps {
  groups: ArubaGroup[];
  checkedFields: boolean[];
  collapsedGroups: Set<string>;
  onToggleGroupCollapse: (clientName: string) => void;
  onCheckboxChange: (index: number, checked: boolean) => void;
  onFieldChange: (
    index: number,
    fieldName: keyof ArubaField,
    value: string | number
  ) => void;
  bulkSelectAll: boolean;
  onBulkSelectAll: () => void;
}

export const ArubaDataTable: React.FC<ArubaDataTableProps> = ({
  groups,
  checkedFields,
  collapsedGroups,
  onToggleGroupCollapse,
  onCheckboxChange,
  onFieldChange,
  bulkSelectAll,
  onBulkSelectAll,
}) => {
  // Calculate flat list with global indices
  const flatFields: Array<{
    field: ArubaField;
    globalIndex: number;
    displayNumber: number;
    clientName: string;
    isGroupStart: boolean;
  }> = [];

  let globalIndex = 0;
  let displayNumber = 1;

  groups.forEach((group) => {
    group.fields.forEach((field, fieldIndex) => {
      flatFields.push({
        field,
        globalIndex: globalIndex++,
        displayNumber: displayNumber++,
        clientName: group.clientName,
        isGroupStart: fieldIndex === 0,
      });
    });
  });

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b-2 border-gray-300">
              <th className="p-3 text-left border-r w-12">
                <input
                  type="checkbox"
                  checked={bulkSelectAll}
                  onChange={onBulkSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-3 text-center border-r w-16 font-semibold">#</th>
              <th className="p-3 text-left border-r w-64 font-semibold">
                Item Description
              </th>
              <th className="p-3 text-left border-r w-64 font-semibold">
                GOEDEREN OMSCHRIJVING
              </th>
              <th className="p-3 text-left border-r w-32 font-semibold">
                GOEDEREN CODE
              </th>
              <th className="p-3 text-center border-r w-24 font-semibold">
                CTNS
              </th>
              <th className="p-3 text-center border-r w-24 font-semibold">
                STKS
              </th>
              <th className="p-3 text-center border-r w-24 font-semibold">
                BRUTO
              </th>
              <th className="p-3 text-center border-r w-24 font-semibold">
                FOB
              </th>
              <th className="p-3 text-center border-r w-20 font-semibold">
                Confidence
              </th>
              <th className="p-3 text-center w-20 font-semibold">Page</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => {
              const isCollapsed = collapsedGroups.has(group.clientName);
              const groupFields = flatFields.filter(
                (f) => f.clientName === group.clientName
              );

              return (
                <React.Fragment key={groupIndex}>
                  {/* Group Header Row */}
                  <tr>
                    <td colSpan={11} className="p-0">
                      <GroupHeader
                        clientName={group.clientName}
                        itemCount={group.fields.length}
                        isCollapsed={isCollapsed}
                        onToggle={() => onToggleGroupCollapse(group.clientName)}
                      />
                    </td>
                  </tr>

                  {/* Group Rows - Only show if not collapsed */}
                  {!isCollapsed &&
                    groupFields.map((item) => (
                      <ArubaTableRow
                        key={item.globalIndex}
                        field={item.field}
                        globalIndex={item.globalIndex}
                        displayNumber={item.displayNumber}
                        isChecked={checkedFields[item.globalIndex] || false}
                        onCheckboxChange={onCheckboxChange}
                        onFieldChange={onFieldChange}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {groups.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available. Upload PDF files to get started.</p>
        </div>
      )}
    </div>
  );
};
