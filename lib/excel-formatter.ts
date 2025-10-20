import { Werkbrief } from "@/lib/ai/schema";
import * as XLSX from "xlsx";

export function formatForExcel(werkbrief: Werkbrief): string {
  // Create Excel-compatible format with tab-separated values
  const headers = [
    "Number",
    "Item Description",
    "GOEDEREN OMSCHRIJVING",
    "GOEDEREN CODE",
    "CTNS",
    "STKS",
    "BRUTO",
    "FOB",
    "AWB",
  ];

  // Add headers
  const excelData = [headers.join("\t")];

  // Add data rows
  werkbrief.fields.forEach((field, index) => {
    const row = [
      (index + 1).toString(),
      field["GOEDEREN OMSCHRIJVING"],
      field["GOEDEREN CODE"],
      field.CTNS.toString(),
      field.STKS.toString(),
      field.BRUTO.toString(),
      field.FOB.toString(),
      field["AWB - 392754819969-1"]?.toString() || "-",
    ];
    excelData.push(row.join("\t"));
  });

  return excelData.join("\n");
}

export function formatSelectedFieldsForExcel(
  fields: Werkbrief["fields"],
  checkedFields: boolean[]
): string {
  // Helper function to safely convert to number
  const toNumber = (value: string | number | undefined): number => {
    if (value === undefined || value === null || value === "") {
      return 0;
    }
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  };

  // Create Excel-compatible format with tab-separated values
  const headers = [
    "Number",
    "GOEDEREN OMSCHRIJVING",
    "GOEDEREN CODE",
    "CTNS",
    "STKS",
    "BRUTO",
    "FOB",
  ];

  // Add headers
  const excelData = [headers.join("\t")];

  // Filter fields based on checked status and add data rows
  let rowNumber = 1;
  fields.forEach((field, index) => {
    if (checkedFields[index]) {
      const row = [
        rowNumber.toString(),
        String(field["GOEDEREN OMSCHRIJVING"] || "").trim(),
        String(field["GOEDEREN CODE"] || "").trim(),
        Math.round(toNumber(field.CTNS)).toString(), // Integer values
        Math.round(toNumber(field.STKS)).toString(), // Integer values
        parseFloat(toNumber(field.BRUTO).toFixed(1)).toString(), // 1 decimal place
        parseFloat(toNumber(field.FOB).toFixed(2)).toString(), // 2 decimal places
      ];
      excelData.push(row.join("\t"));
      rowNumber++;
    }
  });

  return excelData.join("\n");
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    return new Promise((resolve, reject) => {
      try {
        document.execCommand("copy");
        textArea.remove();
        resolve();
      } catch (err) {
        textArea.remove();
        reject(err);
      }
    });
  }
}

export function downloadExcelFile(
  fields: Werkbrief["fields"],
  checkedFields: boolean[],
  filename: string = "werkbrief-data.xlsx"
): void {
  // Define type for export data
  type ExportDataRow = {
    Number: number;
    "GOEDEREN OMSCHRIJVING": string;
    "GOEDEREN CODE": string;
    CTNS: number;
    STKS: number;
    BRUTO: number;
    FOB: number;
  };

  // Helper function to safely convert to number
  const toNumber = (value: string | number | undefined): number => {
    if (value === undefined || value === null || value === "") {
      return 0;
    }
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  };

  // Prepare data for Excel export
  const exportData: ExportDataRow[] = [];

  // Filter fields based on checked status
  let rowNumber = 1;
  fields.forEach((field, index) => {
    if (checkedFields[index]) {
      exportData.push({
        Number: rowNumber,
        "GOEDEREN OMSCHRIJVING": String(
          field["GOEDEREN OMSCHRIJVING"] || ""
        ).trim(),
        "GOEDEREN CODE": String(field["GOEDEREN CODE"] || "").trim(),
        CTNS: Math.round(toNumber(field.CTNS)), // Integer values
        STKS: Math.round(toNumber(field.STKS)), // Integer values
        BRUTO: parseFloat(toNumber(field.BRUTO).toFixed(1)), // 1 decimal place
        FOB: parseFloat(toNumber(field.FOB).toFixed(2)), // 2 decimal places
      });
      rowNumber++;
    }
  });

  // Create a new workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Auto-size columns for better readability
  const columnWidths = [
    { wch: 8 }, // Number
    { wch: 25 }, // GOEDEREN OMSCHRIJVING
    { wch: 15 }, // GOEDEREN CODE
    { wch: 8 }, // CTNS
    { wch: 8 }, // STKS
    { wch: 10 }, // BRUTO
    { wch: 10 }, // FOB
  ];
  ws["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Werkbrief Data");

  // Write and download the file
  XLSX.writeFile(wb, filename);
}
