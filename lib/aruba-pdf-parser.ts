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
  consigneeName?: string;
  freightCharge?: number;
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

    // Skip "Seller of Record:" line
    // If the line contains "Seller of Record:" followed by text on the same line, don't skip next line
    // If the line ONLY contains "Seller of Record:", then skip the next line (which has the seller name)
    if (line.includes("Seller of Record:")) {
      // Check if seller name is on the same line
      const sellerOnSameLine = line.split("Seller of Record:")[1].trim();
      if (!sellerOnSameLine) {
        // Seller name is on next line, so skip it
        sellerOfRecordSkipNext = true;
      }
      console.log(`   ⏭️ Skipping "Seller of Record" line`);
      continue;
    }

    if (sellerOfRecordSkipNext) {
      sellerOfRecordSkipNext = false;
      console.log(`   ⏭️ Skipping seller name line: ${line}`);
      continue;
    }

    // Check if line starts with ASIN or ISBN-10 pattern
    // ASIN: B followed by 9 alphanumeric characters (e.g., B00YJJG39A)
    // ISBN-10: 10 alphanumeric characters, often starting with digit (e.g., 1935660500, 0553593560, 141978269X)
    // Must be followed by a letter (description start), NOT a dot (which indicates product category like BEAUTY6217.10.1090)
    const asinMatch = line.match(/^([B0-9][A-Z0-9]{9})([^.].*)$/);

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
      // Data line format (can have spaces in product category):
      // PRODUCT_GROUP (letters/spaces like "OFFICE PRODUCT", "PET PRODUCTS", "TOY") +
      // HS_CODE (digits with dots) + EXPORT_CONTROL (alphanumeric) +
      // COUNTRY_CODE (2 letters) + QUANTITY + NET_WEIGHT + UNIT_VALUE + TOTAL_VALUE
      // Examples:
      //   TOY9505.90.6000EAR99CN20.8413.4926.98
      //   OFFICE PRODUCT7326.90.6000EAR99CN10.6031.9931.99
      //   PET PRODUCTS8421.21.0000EAR99CN10.3817.5917.59
      //   MUSICAL INSTRUMENTS8540.81.0000EAR99US10.0438.6438.64 (split across lines)

      // Handle case where product category is split across lines (e.g., "MUSICAL" + "INSTRUMENTS" + data)
      let lineToCheck = line;
      let linesSkipped = 0;

      // If current line is just uppercase letters (possible partial category), try combining with next lines
      if (/^[A-Z\s]+$/.test(line) && i + 1 < lines.length) {
        let combined = line;
        let lookAheadIndex = i + 1;

        console.log(`   🔍 Starting combination from: "${line}"`);

        // Keep combining while we find uppercase letters or until we have a complete data line
        while (lookAheadIndex < lines.length) {
          const nextLine = lines[lookAheadIndex].trim();
          console.log(
            `   🔍 Looking at next line [${lookAheadIndex}]: "${nextLine}"`
          );

          // If next line is also just uppercase letters, combine it
          if (/^[A-Z\s]+$/.test(nextLine)) {
            combined += nextLine;
            linesSkipped++;
            lookAheadIndex++;
            console.log(`   🔗 Combining: "${line}" + "${nextLine}"`);
          }
          // If next line contains numbers (data line), combine it too
          // Data line can start with uppercase letter OR digit (e.g., "8540.81.0000EAR99US10.04...")
          else if (/\d/.test(nextLine) && nextLine.length > 10) {
            combined += nextLine;
            linesSkipped++;
            console.log(`   🔗 Adding data line: "${nextLine}"`);
            break; // Stop here, we have the complete data line
          } else {
            console.log(
              `   ❌ Line doesn't match any pattern, stopping combination`
            );
            break; // Stop if we hit something else
          }
        }

        console.log(`   ✅ Final combined line: "${combined}"`);
        lineToCheck = combined;
      }

      // More robust pattern: Match PRODUCT_GROUP (letters with optional spaces), then numbers
      // Pattern handles BOTH formats:
      // 1. Concatenated: DRUGSTORE3304.99.5000EAR99US40.362.7410.96
      // 2. Space-separated: BOOK 4901.99.0050 EAR99 US 1 1.45 54.95 54.95
      const dataMatch = lineToCheck.match(
        /^[A-Z\s]{2,25}\s*[\d.]+[A-Z0-9]+[A-Z]{2}[\d.]+$/
      );

      if (dataMatch) {
        console.log(`   📊 Found data line: ${lineToCheck}`);

        // If we combined lines, skip them in the main loop
        if (linesSkipped > 0) {
          i += linesSkipped;
          console.log(`   ⏭️ Skipped ${linesSkipped} combined lines`);
        }

        // Try space-separated format first (e.g., BOOK 4901.99.0050 EAR99 US 1 1.45 54.95 54.95)
        const parts = lineToCheck.split(/\s+/);
        let countryCodeIndex = -1;

        // Find the country code (2 uppercase letters that's a separate token)
        for (let j = parts.length - 1; j >= 0; j--) {
          if (/^[A-Z]{2}$/.test(parts[j])) {
            countryCodeIndex = j;
            break;
          }
        }

        if (countryCodeIndex !== -1 && parts.length >= countryCodeIndex + 5) {
          // Space-separated format found
          const quantity = parseFloat(parts[countryCodeIndex + 1]);
          const totalNetWeight = parseFloat(parts[countryCodeIndex + 2]);
          const unitValue = parseFloat(parts[countryCodeIndex + 3]);
          const totalUnitValue = parseFloat(parts[countryCodeIndex + 4]);

          console.log(
            `   📐 Parsed values (space-separated): qty=${quantity}, weight=${totalNetWeight}, unit=${unitValue}, total=${totalUnitValue}`
          );

          currentProduct.quantity = quantity;
          currentProduct.totalNetWeight = totalNetWeight;
          currentProduct.unitValue = unitValue;
          currentProduct.totalUnitValue = totalUnitValue;

          console.log(`   💰 Successfully extracted all values!`);
        } else {
          // Try concatenated format (e.g., DRUGSTORE3304.99.5000EAR99US40.362.7410.96)
          console.log(`   🔍 Trying concatenated format...`);

          // Extract everything after the country code (last 2 capital letters before numbers)
          const countryCodeMatch = lineToCheck.match(/([A-Z]{2})([\d.]+)$/);

          if (countryCodeMatch) {
            const numbersAfterCountry = countryCodeMatch[2];
            console.log(
              `   🔢 Numbers after country code: ${numbersAfterCountry}`
            );

            // Parse concatenated numbers: QUANTITY + NET_WEIGHT + UNIT_VALUE + TOTAL_VALUE
            // Examples:
            // 40.362.7410.96 -> 4, 0.36, 2.74, 10.96
            // 11.4554.9554.95 -> 1, 1.45, 54.95, 54.95
            // 20.2620.9941.98 -> 2, 0.26, 20.99, 41.98

            // Strategy: Split by finding price patterns (X.XX)
            // Quantity is 1-2 digits at start, then 3 price values with 2 decimals
            const preciseMatch = numbersAfterCountry.match(
              /^(\d{1,2})(\d\.\d{2})(\d+\.\d{2})(\d+\.\d{2})$/
            );

            if (preciseMatch) {
              const quantity = parseFloat(preciseMatch[1]);
              const totalNetWeight = parseFloat(preciseMatch[2]);
              const unitValue = parseFloat(preciseMatch[3]);
              const totalUnitValue = parseFloat(preciseMatch[4]);

              console.log(
                `   📐 Parsed values (concatenated): qty=${quantity}, weight=${totalNetWeight}, unit=${unitValue}, total=${totalUnitValue}`
              );

              currentProduct.quantity = quantity;
              currentProduct.totalNetWeight = totalNetWeight;
              currentProduct.unitValue = unitValue;
              currentProduct.totalUnitValue = totalUnitValue;

              console.log(`   💰 Successfully extracted all values!`);
            } else {
              console.warn(
                `   ⚠️ Could not parse concatenated numbers: ${numbersAfterCountry}`
              );
            }
          } else {
            console.warn(
              `   ⚠️ Could not find country code in: ${lineToCheck}`
            );
          }
        }
      } else {
        // Part of description (only add if not a split category line)
        // Don't add lines that are just uppercase letters (they're likely part of data line)
        if (!/^[A-Z\s]+$/.test(line) || line.length < 3) {
          descriptionBuffer += " " + line;
        }
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
 * Extract consignee name from PDF text
 * Looks for the CONSIGNEE section and extracts the name (first line after CONSIGNEE)
 */
function extractConsigneeName(pdfText: string): string | undefined {
  console.log("🔍 Extracting consignee name...");

  // Pattern: CONSIGNEE followed by the name on next line(s)
  // Example:
  // CONSIGNEE
  // Alexander Vrolijk
  const consigneeMatch = pdfText.match(/CONSIGNEE\s+([^\n]+)/i);

  if (consigneeMatch && consigneeMatch[1]) {
    const name = consigneeMatch[1].trim();
    console.log(`✅ Found consignee name: ${name}`);
    return name;
  }

  console.warn("⚠️ Could not extract consignee name");
  return undefined;
}

/**
 * Extract freight charge from PDF text
 * Looks for "FREIGHT CHARGE" followed by the numeric value
 */
function extractFreightCharge(pdfText: string): number | undefined {
  console.log("🔍 Extracting freight charge...");

  // Pattern: FREIGHT CHARGE followed by numeric value
  // Example: FREIGHT CHARGE 29.92
  const freightMatch = pdfText.match(/FREIGHT\s+CHARGE\s+([\d.]+)/i);

  if (freightMatch && freightMatch[1]) {
    const charge = parseFloat(freightMatch[1]);
    console.log(`✅ Found freight charge: ${charge}`);
    return charge;
  }

  console.warn("⚠️ Could not extract freight charge");
  return undefined;
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

  // Extract consignee name and freight charge
  const consigneeName = extractConsigneeName(text);
  const freightCharge = extractFreightCharge(text);

  return {
    clientName,
    products,
    consigneeName,
    freightCharge,
  };
}
