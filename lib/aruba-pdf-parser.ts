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

  console.log("🔍 Starting product extraction from Aruba invoice text...");

  // Find the product table section - more flexible header matching
  // Table starts after headers and before totals section
  const tableStartRegex =
    /ASIN[\s\S]*?DESCRIPTION[\s\S]*?TOTAL UNIT[\s\S]*?VALUE[\s\S]*?\(USD\)/i;
  const tableEndRegex = /TOTAL ITEM VALUE/i;

  const tableStartMatch = pdfText.match(tableStartRegex);
  if (!tableStartMatch) {
    console.warn("❌ Could not find product table headers in PDF");
    console.log("PDF text preview:", pdfText.substring(0, 500));
    return products;
  }

  console.log("✅ Found product table headers");

  const tableStartIndex = tableStartMatch.index! + tableStartMatch[0].length;
  const tableEndMatch = pdfText.substring(tableStartIndex).match(tableEndRegex);
  const tableEndIndex = tableEndMatch
    ? tableStartIndex + tableEndMatch.index!
    : pdfText.length;

  const tableText = pdfText.substring(tableStartIndex, tableEndIndex).trim();
  console.log(`📋 Table text length: ${tableText.length} characters`);
  console.log("Table text preview:", tableText.substring(0, 300));

  // Split into lines for processing
  const lines = tableText.split("\n").filter((line) => line.trim().length > 0);
  console.log(`📄 Processing ${lines.length} lines`);

  let currentProduct: Partial<ExtractedProduct> | null = null;
  let descriptionBuffer = "";
  let sellerOfRecordSkipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip "Seller of Record:" line and the next line (seller name)
    if (line.includes("Seller of Record:")) {
      sellerOfRecordSkipNext = true;
      console.log(`   ⏭️ Skipping "Seller of Record" line`);
      continue;
    }

    if (sellerOfRecordSkipNext) {
      sellerOfRecordSkipNext = false;
      console.log(`   ⏭️ Skipping seller name line: ${line}`);
      continue;
    }

    // Check if line starts with ASIN pattern (B followed by 9 alphanumeric characters)
    const asinMatch = line.match(/^([B][A-Z0-9]{9})(.*)$/);

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
          console.log(`   ✅ Saved product: ${currentProduct.asin}`);
        } else {
          console.warn(
            `   ⚠️ Incomplete product skipped: ${currentProduct.asin}`
          );
        }
      }

      // Start new product
      const asin = asinMatch[1];
      const restOfLine = asinMatch[2];

      console.log(`   🆕 Found new product ASIN: ${asin}`);
      currentProduct = { asin };
      descriptionBuffer = restOfLine;
    } else if (currentProduct) {
      // Check if this line contains the numerical data
      // Data line format (all concatenated without spaces):
      // PRODUCT_GROUP (2-4 letters) + HS_CODE (digits with dots) + EXPORT_CONTROL (alphanumeric) +
      // COUNTRY_CODE (2 letters) + QUANTITY + NET_WEIGHT + UNIT_VALUE + TOTAL_VALUE
      // Example: TOY4202.39.0000EAR99CN10.0013.9913.99
      // Breakdown: TOY + 4202.39.0000 + EAR99 + CN + 1 + 0.00 + 13.99 + 13.99

      // More robust pattern: Find the country code (2 capital letters) followed by numbers
      const dataMatch = line.match(
        /^([A-Z]{2,4})[\d.]+([A-Z0-9]+)([A-Z]{2})([\d.]+)$/
      );

      if (dataMatch) {
        console.log(`   📊 Found data line: ${line}`);

        // Extract everything after the country code (last 2 capital letters before numbers)
        const countryCodeMatch = line.match(/([A-Z]{2})([\d.]+)$/);

        if (countryCodeMatch) {
          const numbersAfterCountry = countryCodeMatch[2];
          console.log(
            `   🔢 Numbers after country code: ${numbersAfterCountry}`
          );

          // Parse the concatenated numbers: QUANTITY + NET_WEIGHT + UNIT_VALUE + TOTAL_VALUE
          // Example: 10.0013.9913.99 should be: 1, 0.00, 13.99, 13.99
          // Strategy: Use regex to extract 4 decimal values with specific patterns
          // Pattern: (integer or decimal)(decimal)(decimal)(decimal)
          // More specific: quantity can be integer, weights/prices have 2 decimal places

          // Try to match: (digits)(digit.digit{2})(digit+.digit{2})(digit+.digit{2})
          // This handles: 1 0.00 13.99 13.99 or 10 5.50 25.99 259.90
          const preciseMatch = numbersAfterCountry.match(
            /^(\d+)(\d\.\d{2})(\d+\.\d{2})(\d+\.\d{2})$/
          );

          if (preciseMatch) {
            const quantity = parseFloat(preciseMatch[1]);
            const totalNetWeight = parseFloat(preciseMatch[2]);
            const unitValue = parseFloat(preciseMatch[3]);
            const totalUnitValue = parseFloat(preciseMatch[4]);

            console.log(
              `   📐 Parsed values: qty=${quantity}, weight=${totalNetWeight}, unit=${unitValue}, total=${totalUnitValue}`
            );

            currentProduct.quantity = quantity;
            currentProduct.totalNetWeight = totalNetWeight;
            currentProduct.unitValue = unitValue;
            currentProduct.totalUnitValue = totalUnitValue;

            console.log(`   💰 Successfully extracted all values!`);
          } else {
            console.warn(
              `   ⚠️ Could not parse number pattern from: ${numbersAfterCountry}`
            );
            console.log(`   🔍 Trying alternative parsing method...`);

            // Fallback: Try to split by looking for price patterns (X.XX)
            // Find all X.XX patterns and assume quantity is before the first one
            const priceMatches = numbersAfterCountry.match(/\d+\.\d{2}/g);
            const quantityMatch = numbersAfterCountry.match(/^(\d+)/);

            if (priceMatches && priceMatches.length >= 3 && quantityMatch) {
              const quantity = parseFloat(quantityMatch[1]);
              const totalNetWeight = parseFloat(priceMatches[0]);
              const unitValue = parseFloat(priceMatches[1]);
              const totalUnitValue = parseFloat(priceMatches[2]);

              console.log(
                `   📐 Fallback parsed: qty=${quantity}, weight=${totalNetWeight}, unit=${unitValue}, total=${totalUnitValue}`
              );

              currentProduct.quantity = quantity;
              currentProduct.totalNetWeight = totalNetWeight;
              currentProduct.unitValue = unitValue;
              currentProduct.totalUnitValue = totalUnitValue;

              console.log(`   💰 Successfully extracted with fallback method!`);
            } else {
              console.warn(
                `   ⚠️ Fallback also failed. Found ${
                  priceMatches?.length || 0
                } price patterns`
              );
            }
          }
        } else {
          console.warn(`   ⚠️ Could not find country code pattern in: ${line}`);
        }
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
      console.log(`   ✅ Saved last product: ${currentProduct.asin}`);
    } else {
      console.warn(
        `   ⚠️ Last product incomplete, skipped: ${currentProduct.asin}`
      );
    }
  }

  console.log(`✅ Extraction complete: Found ${products.length} products`);
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
  console.log("Extracted text is:", text);
  // Extract products using regex
  const products = extractProductsFromArubaText(text, pageMapping);

  return {
    clientName,
    products,
  };
}
