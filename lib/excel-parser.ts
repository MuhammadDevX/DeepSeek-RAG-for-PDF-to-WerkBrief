import * as XLSX from 'xlsx';

export interface ExcelRow {
  [key: string]: any;
}

export interface ExcelData {
  rows: ExcelRow[];
  columns: string[];
  sheetName: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  columns?: string[];
  requiredColumns?: string[];
  missingColumns?: string[];
}

// Required columns based on the Python notebook
const REQUIRED_COLUMNS = [
  'Item Name',
  'Goederen Omschrijving',
  'Goederen Code (HS Code)'
];

export function parseExcelFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        // First row contains headers
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map((row: any[]) => {
          const rowObj: ExcelRow = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] || '';
          });
          return rowObj;
        });

        resolve({
          rows,
          columns: headers,
          sheetName
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function validateExcelColumns(columns: string[]): ValidationResult {
  const missingColumns = REQUIRED_COLUMNS.filter(
    required => !columns.some(col =>
      col.toLowerCase().trim() === required.toLowerCase().trim()
    )
  );

  if (missingColumns.length === 0) {
    return {
      isValid: true,
      message: 'All required columns found!',
      columns,
      requiredColumns: REQUIRED_COLUMNS
    };
  }

  return {
    isValid: false,
    message: `Missing required columns: ${missingColumns.join(', ')}`,
    columns,
    requiredColumns: REQUIRED_COLUMNS,
    missingColumns
  };
}

export function processExcelDataForPinecone(data: ExcelData): Array<{
  id: string;
  content: string;
  metadata: {
    desc: string;
    code: string;
    gdesc: string;
    category: string;
  };
}> {
  return data.rows.map((row, index) => {
    const itemName = row['Item Name'] || '';
    const goederenOmschrijving = row['Goederen Omschrijving'] || '';
    const goederenCode = row['Goederen Code (HS Code)'] || '';

    // Create content similar to the Python notebook
    const content = `The description of this item is: ${itemName}\nThe description of the goods is: ${goederenOmschrijving}`;

    return {
      id: itemName.replace(/[^\x00-\x7F]/g, ''),
      content,
      metadata: {
        desc: itemName,
        code: goederenCode,
        gdesc: goederenOmschrijving,
        category: 'NaN'
      }
    };
  });
}
