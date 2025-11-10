export interface ExtractedProduct {
  asin: string;
  description: string;
  quantity: number;
  totalNetWeight: number;
  unitValue: number;
  totalUnitValue: number;
  pageNumber: number;
}

export interface ExtractedInvoiceData {
  clientName: string;
  products: ExtractedProduct[];
}

/**
 * Extract products from Aruba-format PDF text using regex patterns
 * @param pdfText - The complete text extracted from the PDF
 * @param pageMapping - Map of text positions to page numbers for accurate page tracking
 * @returns Array of extracted products with their data
 */
export function extractProductsFromArubaText(
  pdfText: string,
  pageMapping: Map<number, number>
): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];

  // Find the product table section
  // Table starts after headers and before totals section
  const tableStartRegex =
    /ASIN\s+DESCRIPTION\s+PRODUCT GROUP\s+PE HS Code\s+EXPORT\s+CONTROL\s+NUMBER\s+COUNTRY\s+OF ORIGIN\s+QUANTITY\s+\(pcs\)\s+TOTAL NET\s+WEIGHT\s+\(kg\)\s+UNIT VALUE\s+TOTAL UNIT\s+VALUE\s+\(USD\)/i;
  const tableEndRegex = /TOTAL ITEM VALUE|FREIGHT CHARGE|GIFT WRAP CHARGE/i;

  const tableStartMatch = pdfText.match(tableStartRegex);
  if (!tableStartMatch) {
    console.warn("Could not find product table headers in PDF");
    return products;
  }

  const tableStartIndex = tableStartMatch.index! + tableStartMatch[0].length;
  const tableEndMatch = pdfText.substring(tableStartIndex).match(tableEndRegex);
  const tableEndIndex = tableEndMatch
    ? tableStartIndex + tableEndMatch.index!
    : pdfText.length;

  const tableText = pdfText.substring(tableStartIndex, tableEndIndex).trim();

  // Split into potential product rows
  // Products are separated by line breaks and follow a pattern
  const lines = tableText.split("\n").filter((line) => line.trim().length > 0);

  let currentProduct: Partial<ExtractedProduct> | null = null;
  let descriptionBuffer = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip seller/record lines
    if (line.includes("Seller of Record:")) {
      continue;
    }

    // Check if line starts with ASIN pattern (B followed by alphanumeric)
    const asinMatch = line.match(/^([B][A-Z0-9]{9})\s+(.+)/);

    if (asinMatch) {
      // Save previous product if exists
      if (currentProduct && currentProduct.asin) {
        currentProduct.description = descriptionBuffer.trim();
        if (isProductComplete(currentProduct)) {
          const pageNumber = getPageNumberForPosition(
            tableStartIndex +
              pdfText.substring(tableStartIndex).indexOf(currentProduct.asin),
            pageMapping
          );
          products.push({ ...currentProduct, pageNumber } as ExtractedProduct);
        }
      }

      // Start new product
      const asin = asinMatch[1];
      const restOfLine = asinMatch[2];

      currentProduct = { asin };
      descriptionBuffer = restOfLine;
    } else if (currentProduct) {
      // Check if this line contains the numerical data
      const dataMatch = line.match(
        /([A-Z]{2})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/
      );

      if (dataMatch) {
        // This line has the final numbers
        const quantity = parseInt(dataMatch[2], 10);
        const totalNetWeight = parseFloat(dataMatch[3]);
        const unitValue = parseFloat(dataMatch[4]);
        const totalUnitValue = parseFloat(dataMatch[5]);

        currentProduct.quantity = quantity;
        currentProduct.totalNetWeight = totalNetWeight;
        currentProduct.unitValue = unitValue;
        currentProduct.totalUnitValue = totalUnitValue;
      } else {
        // Part of description
        descriptionBuffer += " " + line;
      }
    }
  }

  // Save last product
  if (currentProduct && currentProduct.asin) {
    currentProduct.description = descriptionBuffer.trim();
    if (isProductComplete(currentProduct)) {
      const pageNumber = getPageNumberForPosition(
        tableStartIndex +
          pdfText.substring(tableStartIndex).indexOf(currentProduct.asin),
        pageMapping
      );
      products.push({ ...currentProduct, pageNumber } as ExtractedProduct);
    }
  }

  return products;
}

/**
 * Check if product has all required fields
 */
function isProductComplete(
  product: Partial<ExtractedProduct>
): product is ExtractedProduct {
  return !!(
    product.asin &&
    product.description &&
    typeof product.quantity === "number" &&
    typeof product.totalNetWeight === "number" &&
    typeof product.unitValue === "number" &&
    typeof product.totalUnitValue === "number"
  );
}

/**
 * Get page number for a given text position
 */
function getPageNumberForPosition(
  position: number,
  pageMapping: Map<number, number>
): number {
  let lastPage = 1;
  for (const [pos, page] of Array.from(pageMapping.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    if (position >= pos) {
      lastPage = page;
    } else {
      break;
    }
  }
  return lastPage;
}

/**
 * Extract text from PDF buffer and create page mapping
 * @param buffer - PDF file buffer
 * @returns Object with full text and page position mapping
 */
export async function extractTextWithPageMapping(buffer: Buffer): Promise<{
  text: string;
  pageMapping: Map<number, number>;
}> {
  // Use LangChain's PDFLoader for consistent text extraction
  const { PDFLoader } = await import(
    "@langchain/community/document_loaders/fs/pdf"
  );

  console.log("🔍 Extracting text from PDF using LangChain PDFLoader...");

  // Create a Blob from the buffer (same approach as agent.ts)
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/pdf",
  });

  const loader = new PDFLoader(blob);
  const docs = await loader.load();

  console.log(`✅ PDFLoader extracted ${docs.length} pages`);

  let fullText = "";
  const pageMapping = new Map<number, number>();

  // Process each document/page
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const startPosition = fullText.length;

    // Extract page number from document metadata (PDFLoader provides this as loc.pageNumber)
    const pageNumber = doc.metadata?.loc?.pageNumber || i + 1;

    pageMapping.set(startPosition, pageNumber);

    const pageText = doc.pageContent;

    if (pageText && pageText.trim().length > 0) {
      fullText += pageText + "\n";
    }

    console.log(
      `   Page ${pageNumber}: ${pageText.length} characters extracted`
    );
  }

  console.log(
    `✅ Total text extracted: ${fullText.length} characters from ${docs.length} pages`
  );

  return { text: fullText.trim(), pageMapping };
}

/**
 * Main function to extract invoice data from PDF buffer
 * @param buffer - PDF file buffer
 * @param fileName - Name of the PDF file (used as client name)
 * @returns Extracted invoice data
 */
export async function extractArubaInvoiceData(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedInvoiceData> {
  // Remove .pdf extension from filename to get client name
  const clientName = fileName.replace(/\.pdf$/i, "");

  // Extract text with page mapping
  const { text, pageMapping } = await extractTextWithPageMapping(buffer);

  // Extract products using regex
  const products = extractProductsFromArubaText(text, pageMapping);

  return {
    clientName,
    products,
  };
}
