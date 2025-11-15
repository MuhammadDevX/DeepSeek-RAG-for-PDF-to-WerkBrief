import { Werkbrief } from "@/lib/ai/schema";
import * as XLSX from "xlsx-js-style";

// Note: This function returns tab-separated format for clipboard
// Tab-separated format doesn't support styling (bold headers, colored cells)
// Styling is only available when downloading Excel files (.xlsx)
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
  // Note: Tab-separated format for clipboard doesn't support styling (bold headers)
  // Styling is only available when downloading Excel files (.xlsx)
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
  let totalCTNS = 0;
  let totalSTKS = 0;
  let totalBRUTO = 0;
  let totalFOB = 0;

  fields.forEach((field, index) => {
    if (checkedFields[index]) {
      const ctns = Math.round(toNumber(field.CTNS));
      const stks = Math.round(toNumber(field.STKS));
      const bruto = parseFloat(toNumber(field.BRUTO).toFixed(1));
      const fob = parseFloat(toNumber(field.FOB).toFixed(2));

      const row = [
        rowNumber.toString(),
        String(field["GOEDEREN OMSCHRIJVING"] || "").trim(),
        String(field["GOEDEREN CODE"] || "").trim(),
        ctns.toString(), // Integer values
        stks.toString(), // Integer values
        bruto.toString(), // 1 decimal place
        fob.toString(), // 2 decimal places
      ];
      excelData.push(row.join("\t"));

      totalCTNS += ctns;
      totalSTKS += stks;
      totalBRUTO += bruto;
      totalFOB += fob;
      rowNumber++;
    }
  });

  // Add sum row
  const sumRow = [
    "",
    "",
    "",
    totalCTNS.toString(),
    totalSTKS.toString(),
    parseFloat(totalBRUTO.toFixed(1)).toString(),
    parseFloat(totalFOB.toFixed(2)).toString(),
  ];
  excelData.push(sumRow.join("\t"));

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

  // Make column headers bold (row 0)
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true },
    };
  }

  // Calculate totals
  let totalCTNS = 0;
  let totalSTKS = 0;
  let totalBRUTO = 0;
  let totalFOB = 0;

  exportData.forEach((row) => {
    totalCTNS += row.CTNS;
    totalSTKS += row.STKS;
    totalBRUTO += row.BRUTO;
    totalFOB += row.FOB;
  });

  // Add sum row with blue highlight
  const sumRowIndex = exportData.length + 1; // +1 for header row

  // Manually add sum row cells with proper styling
  const sumRowData = [
    { col: 0, val: "" },
    { col: 1, val: "" },
    { col: 2, val: "" },
    { col: 3, val: totalCTNS },
    { col: 4, val: totalSTKS },
    { col: 5, val: parseFloat(totalBRUTO.toFixed(1)) },
    { col: 6, val: parseFloat(totalFOB.toFixed(2)) },
  ];

  for (const { col, val } of sumRowData) {
    const cellAddress = XLSX.utils.encode_cell({ r: sumRowIndex, c: col });
    ws[cellAddress] = {
      t: typeof val === "number" ? "n" : "s",
      v: val,
      s: {
        fill: { fgColor: { rgb: "4472C4" } }, // Blue color
        font: { color: { rgb: "FFFFFF" }, bold: true },
      },
    };
  }

  // Update range to include sum row
  const newRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
  newRange.e.r = sumRowIndex;
  ws["!ref"] = XLSX.utils.encode_range(newRange);

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
  consigneeName?: string;
  freightCharge?: number;
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
  filename: string = "Client Data.xlsx",
  trackingNumber?: string,
  initialSplit?: number
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

  // Track split number (increments for each tab)
  let currentSplit = initialSplit || 1;

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
          BRUTO: parseFloat(toNumber(field.BRUTO).toFixed(2)), // Changed to 2 decimal places
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

      // Add tracking number header if provided
      if (trackingNumber) {
        const headerText = `AWB - ${trackingNumber} - ${currentSplit}`;
        XLSX.utils.sheet_add_aoa(ws, [[headerText]], { origin: "H1" });

        // Make the tracking header bold
        const headerCell = "H1";
        if (!ws[headerCell]) ws[headerCell] = { t: "s", v: headerText };
        ws[headerCell].s = {
          font: { bold: true },
        };
      }

      // Make all column headers bold (row 1 by default after json_to_sheet)
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
          font: { bold: true },
        };
      }

      // Add sum row with blue highlight
      const sumRowIndex = exportData.length + 1; // +1 for header row

      // Manually add sum row cells with proper styling
      const sumRowData = [
        { col: 0, val: "" },
        { col: 1, val: "" },
        { col: 2, val: "" },
        { col: 3, val: totalCTNS },
        { col: 4, val: totalSTKS },
        { col: 5, val: parseFloat(totalBRUTO.toFixed(2)) },
        { col: 6, val: parseFloat(totalFOB.toFixed(2)) },
      ];

      for (const { col, val } of sumRowData) {
        const cellAddress = XLSX.utils.encode_cell({ r: sumRowIndex, c: col });
        ws[cellAddress] = {
          t: typeof val === "number" ? "n" : "s",
          v: val,
          s: {
            fill: { fgColor: { rgb: "4472C4" } }, // Blue color
            font: { color: { rgb: "FFFFFF" }, bold: true },
          },
        };
      }

      // Update range to include sum row
      const newRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
      newRange.e.r = sumRowIndex;
      ws["!ref"] = XLSX.utils.encode_range(newRange);

      // Add vracht row below sum row
      if (group.freightCharge !== undefined) {
        const vrachtRowIndex = sumRowIndex + 1;

        // Add vracht row cells
        ws[XLSX.utils.encode_cell({ r: vrachtRowIndex, c: 5 })] = {
          t: "s",
          v: "Vracht",
        };
        ws[XLSX.utils.encode_cell({ r: vrachtRowIndex, c: 6 })] = {
          t: "n",
          v: parseFloat(group.freightCharge.toFixed(2)),
        };

        // Update range to include vracht row
        newRange.e.r = vrachtRowIndex;
        ws["!ref"] = XLSX.utils.encode_range(newRange);
      }

      // Auto-size columns
      const columnWidths = [
        { wch: 8 }, // Number
        { wch: 25 }, // GOEDEREN OMSCHRIJVING
        { wch: 15 }, // GOEDEREN CODE
        { wch: 8 }, // CTNS
        { wch: 8 }, // STKS
        { wch: 10 }, // BRUTO
        { wch: 10 }, // FOB
        { wch: 25 }, // Extra column for tracking header
      ];
      ws["!cols"] = columnWidths;

      // Extract the number from the PDF filename if it exists
      // Format: [Number]-[Something].pdf -> extract the number
      const numberMatch = group.clientName.match(/^(\d+)/);
      const pdfNumber = numberMatch ? numberMatch[1] : "";

      // Use consigneeName if available, otherwise use the full clientName
      const displayName = group.consigneeName || group.clientName;

      // Create sheet name: [Number]-[Client Name]
      let sheetName = pdfNumber ? `${pdfNumber}-${displayName}` : displayName;
      sheetName = sheetName.substring(0, 31); // Max 31 chars
      sheetName = sheetName.replace(/[:\\/?*\[\]]/g, "-"); // Remove invalid chars

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Add to summary
      summaryData.push({
        Client: displayName,
        "Total Items": itemCount,
        "Total CTNS": totalCTNS,
        "Total STKS": totalSTKS,
        "Total BRUTO": parseFloat(totalBRUTO.toFixed(2)),
        "Total FOB": parseFloat(totalFOB.toFixed(2)),
      });

      // Increment split number for next tab
      currentSplit++;
    }
  }

  // Create summary sheet
  if (summaryData.length > 0) {
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);

    // Make summary headers bold
    const summaryRange = XLSX.utils.decode_range(summaryWs["!ref"] || "A1");
    for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!summaryWs[cellAddress]) continue;

      summaryWs[cellAddress].s = {
        font: { bold: true },
      };
    }

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
 * Note: Tab-separated format for clipboard doesn't support styling (bold headers, colored cells)
 * Styling is only available when downloading Excel files (.xlsx)
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
  let totalCTNS = 0;
  let totalSTKS = 0;
  let totalBRUTO = 0;
  let totalFOB = 0;

  for (const group of groups) {
    // Use consigneeName if available, otherwise use clientName
    const displayName = group.consigneeName || group.clientName;

    for (const field of group.fields) {
      if (checkedFields[globalIndex]) {
        const ctns = Math.round(toNumber(field.CTNS));
        const stks = Math.round(toNumber(field.STKS));
        const bruto = parseFloat(toNumber(field.BRUTO).toFixed(2));
        const fob = parseFloat(toNumber(field.FOB).toFixed(2));

        const row = [
          globalRowNumber.toString(),
          displayName,
          String(field["GOEDEREN OMSCHRIJVING"] || "").trim(),
          String(field["GOEDEREN CODE"] || "").trim(),
          ctns.toString(),
          stks.toString(),
          bruto.toString(), // Changed to 2 decimal places
          fob.toString(),
        ];
        excelData.push(row.join("\t"));

        totalCTNS += ctns;
        totalSTKS += stks;
        totalBRUTO += bruto;
        totalFOB += fob;
        globalRowNumber++;
      }
      globalIndex++;
    }
  }

  // Add sum row
  const sumRow = [
    "",
    "",
    "",
    "",
    totalCTNS.toString(),
    totalSTKS.toString(),
    parseFloat(totalBRUTO.toFixed(2)).toString(),
    parseFloat(totalFOB.toFixed(2)).toString(),
  ];
  excelData.push(sumRow.join("\t"));

  return excelData.join("\n");
}
