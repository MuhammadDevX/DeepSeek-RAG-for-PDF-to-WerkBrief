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

// Aruba Special Excel Export Functions

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

type ArubaExportDataRow = {
  Number: number;
  "GOEDEREN OMSCHRIJVING": string;
  "GOEDEREN CODE": string;
  CTNS: number;
  STKS: number;
  BRUTO: number;
  FOB: number;
};

type ArubaSummaryRow = {
  Client: string;
  "Total Items": number;
  "Total CTNS": number;
  "Total STKS": number;
  "Total BRUTO": number;
  "Total FOB": number;
};

/**
 * Download Excel file with multiple tabs for Aruba Special data
 * Each client gets their own tab, plus a summary tab
 */
export function downloadArubaExcelFile(
  groups: ArubaGroup[],
  checkedFields: boolean[],
  filename: string = "Client Data.xlsx"
): void {
  // Helper function to safely convert to number
  const toNumber = (value: string | number | undefined): number => {
    if (value === undefined || value === null || value === "") {
      return 0;
    }
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  };

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Track summary data
  const summaryData: ArubaSummaryRow[] = [];

  // Track global index for checked fields
  let globalIndex = 0;

  // Create a tab for each client
  for (const group of groups) {
    const exportData: ArubaExportDataRow[] = [];
    let rowNumber = 1;

    // Track totals for this client
    let totalCTNS = 0;
    let totalSTKS = 0;
    let totalBRUTO = 0;
    let totalFOB = 0;
    let itemCount = 0;

    for (const field of group.fields) {
      if (checkedFields[globalIndex]) {
        exportData.push({
          Number: rowNumber,
          "GOEDEREN OMSCHRIJVING": String(
            field["GOEDEREN OMSCHRIJVING"] || ""
          ).trim(),
          "GOEDEREN CODE": String(field["GOEDEREN CODE"] || "").trim(),
          CTNS: Math.round(toNumber(field.CTNS)),
          STKS: Math.round(toNumber(field.STKS)),
          BRUTO: parseFloat(toNumber(field.BRUTO).toFixed(1)),
          FOB: parseFloat(toNumber(field.FOB).toFixed(2)),
        });

        totalCTNS += Math.round(toNumber(field.CTNS));
        totalSTKS += Math.round(toNumber(field.STKS));
        totalBRUTO += toNumber(field.BRUTO);
        totalFOB += toNumber(field.FOB);
        itemCount++;
        rowNumber++;
      }
      globalIndex++;
    }

    // Only create tab if there's data
    if (exportData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
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

      // Sanitize sheet name (Excel has restrictions)
      let sheetName = group.clientName.substring(0, 31); // Max 31 chars
      sheetName = sheetName.replace(/[:\\/?*\[\]]/g, "-"); // Remove invalid chars

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Add to summary
      summaryData.push({
        Client: group.clientName,
        "Total Items": itemCount,
        "Total CTNS": totalCTNS,
        "Total STKS": totalSTKS,
        "Total BRUTO": parseFloat(totalBRUTO.toFixed(1)),
        "Total FOB": parseFloat(totalFOB.toFixed(2)),
      });
    }
  }

  // Create summary sheet
  if (summaryData.length > 0) {
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);

    // Auto-size columns for summary
    const summaryColumnWidths = [
      { wch: 20 }, // Client
      { wch: 12 }, // Total Items
      { wch: 12 }, // Total CTNS
      { wch: 12 }, // Total STKS
      { wch: 12 }, // Total BRUTO
      { wch: 12 }, // Total FOB
    ];
    summaryWs["!cols"] = summaryColumnWidths;

    // Add summary as first sheet
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  }

  // Write and download the file
  XLSX.writeFile(wb, filename);
}

/**
 * Copy Aruba Special data to clipboard (tab-separated format)
 */
export function formatArubaForClipboard(
  groups: ArubaGroup[],
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

  const headers = [
    "Number",
    "Client",
    "GOEDEREN OMSCHRIJVING",
    "GOEDEREN CODE",
    "CTNS",
    "STKS",
    "BRUTO",
    "FOB",
  ];

  const excelData = [headers.join("\t")];

  let globalRowNumber = 1;
  let globalIndex = 0;

  for (const group of groups) {
    for (const field of group.fields) {
      if (checkedFields[globalIndex]) {
        const row = [
          globalRowNumber.toString(),
          group.clientName,
          String(field["GOEDEREN OMSCHRIJVING"] || "").trim(),
          String(field["GOEDEREN CODE"] || "").trim(),
          Math.round(toNumber(field.CTNS)).toString(),
          Math.round(toNumber(field.STKS)).toString(),
          parseFloat(toNumber(field.BRUTO).toFixed(1)).toString(),
          parseFloat(toNumber(field.FOB).toFixed(2)).toString(),
        ];
        excelData.push(row.join("\t"));
        globalRowNumber++;
      }
      globalIndex++;
    }
  }

  return excelData.join("\n");
}
