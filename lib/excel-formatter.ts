import { Werkbrief } from "@/lib/ai/schema";

export function formatForExcel(werkbrief: Werkbrief): string {
  // Create Excel-compatible format with tab-separated values
  const headers = [
    "Number",
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
      field["AWB - 392754819969-1"].toString() || "-",
    ];
    excelData.push(row.join("\t"));
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
