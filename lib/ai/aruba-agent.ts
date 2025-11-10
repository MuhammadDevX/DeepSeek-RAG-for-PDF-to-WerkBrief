import { generateObject } from "ai";
import { openai } from "@/config/agents";
import { ArubaProductFieldsSchema } from "./schema";
import { retrieveRelevantSnippets } from "./tool-pinecone";
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
}> {
  const productDescription = product.description;

  // Retrieve relevant snippets from Pinecone
  const snippets = await retrieveRelevantSnippets(productDescription, 3);

  const prompt = `${description}

Product Description: ${productDescription}

Context from knowledge base:
${snippets}

Based on the product description and the context from the knowledge base, provide the GOEDEREN CODE and GOEDEREN OMSCHRIJVING in Dutch.`;

  const systemPrompt = `You are an expert at matching product descriptions to their corresponding Dutch goods codes (GOEDEREN CODE) and descriptions (GOEDEREN OMSCHRIJVING).

Your task:
1. Analyze the product description
2. Use the knowledge base snippets to find the matching GOEDEREN CODE
3. Provide accurate GOEDEREN OMSCHRIJVING in Dutch
4. Provide a confidence score (0-100%)

Be precise and use the exact codes and descriptions from the knowledge base when available.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ArubaProductFieldsSchema,
      prompt,
      system: systemPrompt,
      temperature: 0.3,
    });

    // Return first field (should only have one)
    if (result.object.fields.length > 0) {
      const field = result.object.fields[0];
      return {
        "GOEDEREN OMSCHRIJVING":
          field["GOEDEREN OMSCHRIJVING"] || productDescription,
        "GOEDEREN CODE": field["GOEDEREN CODE"] || "UNKNOWN",
        Confidence: field.Confidence || "0%",
      };
    }

    // Fallback if no fields returned
    return {
      "GOEDEREN OMSCHRIJVING": productDescription,
      "GOEDEREN CODE": "UNKNOWN",
      Confidence: "0%",
    };
  } catch (error) {
    console.error("Error enriching product:", error);
    return {
      "GOEDEREN OMSCHRIJVING": productDescription,
      "GOEDEREN CODE": "ERROR",
      Confidence: "0%",
    };
  }
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
      CTNS: 1, // Default to 1, can be edited by user
      STKS: product.quantity,
      BRUTO: product.totalNetWeight,
      FOB: product.totalUnitValue,
      Confidence: enrichedData.Confidence,
      "Page Number": product.pageNumber,
    };
  });

  safeProgress({
    type: "complete",
    currentStep: `Completed processing ${enrichedProducts.length} products for ${clientName}`,
    totalProducts: products.length,
    processedProducts: enrichedProducts.length,
  });

  return enrichedProducts;
}
