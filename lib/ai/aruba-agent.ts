import { generateObject } from "ai";
import { openai } from "@/config/agents";
import { ArubaProductFieldsSchema } from "./schema";
import { retrieveRelevantSnippets } from "./tool-pinecone";
import { IVA_RULES, DTZ_RULES } from "./default-codes";
import { classifyWithLibraryAgent } from "./library-agent";
import { ExtractedProduct } from "../aruba-pdf-parser";

// Parallelization and retry configuration constants
const MAX_RETRIES = 5;
const PARALLEL_BATCH_SIZE = 15;
const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds in milliseconds
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay for retries
const MAX_RETRY_DELAY = 25000; // 25 seconds max delay for retries

/**
 * Retry utility function with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        console.error(
          `Operation failed after ${maxRetries + 1} attempts:`,
          lastError.message
        );
        throw lastError;
      }

      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        MAX_RETRY_DELAY
      );

      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Process an array of items in batches with parallel processing
 */
async function processBatches<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = PARALLEL_BATCH_SIZE,
  delayBetweenBatches: number = DELAY_BETWEEN_BATCHES
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    console.log(
      `Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`
    );

    const batchPromises = batch.map((item, batchIndex) =>
      withRetry(() => processor(item, i + batchIndex))
    );

    const batchResults = await Promise.allSettled(batchPromises);
    const successfulResults = batchResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<R>).value);

    const failedCount = batchResults.length - successfulResults.length;

    if (failedCount > 0) {
      console.warn(
        `${failedCount} items failed in batch ${batchNumber}/${totalBatches} after retries`
      );
    }

    results.push(...successfulResults);

    console.log(
      `Batch ${batchNumber}/${totalBatches} completed with ${successfulResults.length}/${batch.length} successful items`
    );

    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Enrich single product with GOEDEREN CODE and OMSCHRIJVING from AI
 */
async function enrichProduct(
  product: ExtractedProduct,
  description: string
): Promise<{
  "GOEDEREN OMSCHRIJVING": string;
  "GOEDEREN CODE": string;
  Confidence: string;
  needsIVA: boolean;
  needsDTZ: boolean;
  defaultCode: string;
  defaultOmschrijving: string;
}> {
  const productDescription = product.description;

  // Library agent runs independently (regex search + best-category pick) so it
  // can be compared against the history agent below. Kick it off in parallel.
  const libraryPromise = classifyWithLibraryAgent(productDescription);

  // Retrieve relevant snippets from Pinecone (history / "AI" source)
  let snippets: string[] = [];
  try {
    snippets = await retrieveRelevantSnippets(productDescription, 3);
  } catch (error) {
    console.warn(`Snippet retrieval failed for "${productDescription}":`, error);
  }

  const prompt = `${description}

Product Description: ${productDescription}

Context from knowledge base:
${snippets.map((r, i) => `(${i + 1}) ${r}`).join("\n") || "(no relevant snippets found)"}

Based on the product description and the context from the knowledge base, provide the GOEDEREN CODE and GOEDEREN OMSCHRIJVING in Dutch, plus needsIVA and needsDTZ.`;

  const systemPrompt = `You are an expert at matching product descriptions to their corresponding Dutch goods codes (GOEDEREN CODE) and descriptions (GOEDEREN OMSCHRIJVING).

Your task:
1. Analyze the product description
2. Use the knowledge base snippets to find the SINGLE best-matching record
3. Use THAT record's exact GOEDEREN CODE and GOEDEREN OMSCHRIJVING (in Dutch)
4. Set the confidence score (0-100%) to reflect how well the product matches the specific record you chose — high for an exact/near-exact match, low for a loose one
5. If NONE of the snippets is a reasonable match, do not guess: return GOEDEREN CODE "00000000", GOEDEREN OMSCHRIJVING "ONBEKEND", and Confidence "0%"
6. For needsIVA and needsDTZ: if the snippet you chose states a "Needs IVA" / "Needs DTZ" value, use exactly that stored value. Only when the snippet does not state it, decide using the rules below.

${IVA_RULES}

${DTZ_RULES}

Be precise and use the exact codes and descriptions from the knowledge base when available.`;

  let ai = {
    "GOEDEREN OMSCHRIJVING": "ONBEKEND",
    "GOEDEREN CODE": "00000000",
    Confidence: "0%",
    needsIVA: false,
    needsDTZ: false,
  };

  try {
    const result = await generateObject({
      model: openai("gpt-5-mini"),
      schema: ArubaProductFieldsSchema,
      prompt,
      system: systemPrompt,
    });

    if (result.object.fields.length > 0) {
      const field = result.object.fields[0];
      ai = {
        "GOEDEREN OMSCHRIJVING":
          field["GOEDEREN OMSCHRIJVING"] || productDescription,
        "GOEDEREN CODE": field["GOEDEREN CODE"] || "UNKNOWN",
        Confidence: field.Confidence || "0%",
        needsIVA: field.needsIVA ?? false,
        needsDTZ: field.needsDTZ ?? false,
      };
    }
  } catch (error) {
    console.error("Error enriching product:", error);
    ai = {
      "GOEDEREN OMSCHRIJVING": productDescription,
      "GOEDEREN CODE": "ERROR",
      Confidence: "0%",
      needsIVA: false,
      needsDTZ: false,
    };
  }

  // Library source: independent prediction from the default-code table.
  const def = await libraryPromise;

  return {
    ...ai,
    defaultCode: def?.code ?? "",
    defaultOmschrijving: def?.omschrijving ?? "",
  };
}

/**
 * Process Aruba invoice products and enrich with AI
 */
export async function processArubaInvoice(
  products: ExtractedProduct[],
  clientName: string,
  description: string,
  onProgress?: (progress: {
    type: "progress" | "complete" | "error";
    currentStep?: string;
    totalProducts?: number;
    processedProducts?: number;
    clientName?: string;
    error?: string;
  }) => void
) {
  const safeProgress = (
    progress: Parameters<NonNullable<typeof onProgress>>[0]
  ) => {
    try {
      onProgress?.({ ...progress, clientName });
    } catch (error) {
      console.error("Error sending progress update:", error);
    }
  };

  if (products.length === 0) {
    safeProgress({
      type: "complete",
      currentStep: `No products found for ${clientName}`,
      totalProducts: 0,
      processedProducts: 0,
    });
    return [];
  }

  safeProgress({
    type: "progress",
    currentStep: `Processing ${products.length} product${
      products.length !== 1 ? "s" : ""
    } for ${clientName}...`,
    totalProducts: products.length,
    processedProducts: 0,
  });

  let completedProducts = 0;

  // Enrich products in parallel batches
  const enrichedProducts = await processBatches(products, async (product) => {
    const enrichedData = await enrichProduct(product, description);

    completedProducts++;
    safeProgress({
      type: "progress",
      currentStep: `Enriching product ${completedProducts}/${products.length} for ${clientName}...`,
      totalProducts: products.length,
      processedProducts: completedProducts,
    });

    return {
      "Item Description": product.description,
      "GOEDEREN OMSCHRIJVING": enrichedData["GOEDEREN OMSCHRIJVING"],
      "GOEDEREN CODE": enrichedData["GOEDEREN CODE"],
      defaultCode: enrichedData.defaultCode,
      defaultOmschrijving: enrichedData.defaultOmschrijving,
      codeSource: "ai" as const,
      needsIVA: enrichedData.needsIVA,
      needsDTZ: enrichedData.needsDTZ,
      CTNS: product.quantity, // Use quantity for CTNS
      STKS: product.quantity, // Use quantity for STKS
      BRUTO: product.totalNetWeight,
      FOB: product.totalUnitValue,
      Confidence: enrichedData.Confidence,
      "Page Number": product.pageNumber,
    };
  });

  // Merge duplicate rows within this client (same active code + omschrijving).
  const mergedProducts = mergeArubaFields(enrichedProducts);

  safeProgress({
    type: "complete",
    currentStep: `Completed processing ${mergedProducts.length} products for ${clientName}`,
    totalProducts: products.length,
    processedProducts: mergedProducts.length,
  });

  return mergedProducts;
}

type ArubaEnrichedField = {
  "Item Description": string;
  "GOEDEREN OMSCHRIJVING": string;
  "GOEDEREN CODE": string;
  defaultCode: string;
  defaultOmschrijving: string;
  codeSource: "ai" | "library";
  needsIVA: boolean;
  needsDTZ: boolean;
  CTNS: number;
  STKS: number;
  BRUTO: number;
  FOB: number;
  Confidence: string;
  "Page Number": number;
};

/**
 * Merge rows within a single client group that share the same active code +
 * omschrijving, summing numeric columns. Order-stable.
 */
function mergeArubaFields(fields: ArubaEnrichedField[]): ArubaEnrichedField[] {
  const merged: ArubaEnrichedField[] = [];
  const indexByKey = new Map<string, number>();

  const toNum = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return isNaN(n) ? 0 : n;
  };

  for (const field of fields) {
    const activeCode =
      field.codeSource === "library" && field.defaultCode
        ? field.defaultCode
        : field["GOEDEREN CODE"];
    const activeOms =
      field.codeSource === "library" && field.defaultOmschrijving
        ? field.defaultOmschrijving
        : field["GOEDEREN OMSCHRIJVING"];
    const key = `${String(activeCode).trim().toLowerCase()}|${String(activeOms)
      .trim()
      .toLowerCase()}`;

    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push({ ...field });
    } else {
      const target = merged[existingIndex];
      target.CTNS = toNum(target.CTNS) + toNum(field.CTNS);
      target.STKS = toNum(target.STKS) + toNum(field.STKS);
      target.BRUTO = toNum(target.BRUTO) + toNum(field.BRUTO);
      target.FOB = toNum(target.FOB) + toNum(field.FOB);
      target.needsIVA = target.needsIVA || field.needsIVA;
      target.needsDTZ = target.needsDTZ || field.needsDTZ;
    }
  }

  return merged;
}
