import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@/config/agents";
import { ProductsBoughtSchema } from "./schema";
import { productsAnalyzerPrompt } from "./prompt";
import { retrieveRelevantSnippets } from "./tool-pinecone";
import { IVA_RULES, DTZ_RULES } from "./default-codes";
import { classifyWithLibraryAgent } from "./library-agent";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// Parallelization and retry configuration constants
const MAX_RETRIES = 5;
const PARALLEL_BATCH_SIZE = 15;
const DELAY_BETWEEN_BATCHES = 1500; // 1.5 seconds in milliseconds
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay for retries
const MAX_RETRY_DELAY = 25000; // 25 seconds max delay for retries

/**
 * Retry utility function with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay between retries in milliseconds
 * @returns Promise with the result of the operation
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

      // Calculate delay with exponential backoff (removed random jitter for consistency)
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
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param batchSize - Number of items to process in parallel
 * @param delayBetweenBatches - Delay between batches in milliseconds
 * @returns Promise with array of results
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

    // Process batch in parallel with individual error handling
    const batchPromises = batch.map((item, batchIndex) =>
      withRetry(() => processor(item, i + batchIndex))
    );

    const batchResults = await Promise.allSettled(batchPromises);
    const successfulResults = batchResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<R>).value);

    const failedCount = batchResults.length - successfulResults.length;
    const failedDocuments: Array<{ index: number; error: string }> = [];

    if (failedCount > 0) {
      console.warn(
        `${failedCount} items failed in batch ${batchNumber}/${totalBatches} after retries`
      );
      // Log specific failures for debugging
      batchResults.forEach((result, index) => {
        if (result.status === "rejected") {
          const documentIndex = i + index + 1;
          const errorMessage = result.reason?.message || "Unknown error";
          failedDocuments.push({
            index: documentIndex,
            error: errorMessage,
          });
          console.error(`Document ${documentIndex} failed:`, errorMessage);
        }
      });

      // Log summary of failed documents
      console.error(
        `Failed documents in batch ${batchNumber}:`,
        failedDocuments
      );
    }

    results.push(...successfulResults);

    console.log(
      `Batch ${batchNumber}/${totalBatches} completed with ${successfulResults.length}/${batch.length} successful items`
    );

    // Add delay between batches (except for the last batch)
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

// Consolidation function removed - users can now manually merge products as needed

export async function generateWerkbrief(
  description: string,
  pdfBuffer?: Buffer,
  onProgress?: (progress: {
    type: "progress" | "complete" | "error";
    totalDocuments?: number;
    processedDocuments?: number;
    totalProducts?: number;
    processedProducts?: number;
    currentStep?: string;
    data?: unknown;
    error?: string;
  }) => void
) {
  let docs = [];
  let isProcessingComplete = false;

  // Safe progress function that checks completion state
  const safeProgress = (
    progress: Parameters<NonNullable<typeof onProgress>>[0]
  ) => {
    if (isProcessingComplete) {
      console.warn("Attempted to send progress after processing completed");
      return;
    }
    try {
      onProgress?.(progress);
    } catch (error) {
      console.error("Error sending progress update:", error);
      isProcessingComplete = true;
    }
  };

  if (pdfBuffer) {
    try {
      safeProgress({
        type: "progress",
        currentStep: "Parsing PDF document...",
      });

      const blob = new Blob([new Uint8Array(pdfBuffer)], {
        type: "application/pdf",
      });
      const loader = new PDFLoader(blob);
      docs = await loader.load();

      safeProgress({
        type: "progress",
        currentStep: `PDF parsed successfully. Found ${docs.length} document${
          docs.length !== 1 ? "s" : ""
        }`,
        totalDocuments: docs.length,
        processedDocuments: 0,
      });
    } catch (error) {
      console.warn("Failed to parse PDF:", error);
      safeProgress({ type: "error", error: "Failed to parse PDF document" });
      isProcessingComplete = true;
    }
  }

  if (docs.length === 0) {
    console.log("No documents to process");
    safeProgress({
      type: "complete",
      data: { fields: [], missingPages: [], totalPages: 0 },
    });
    isProcessingComplete = true;
    return { fields: [], missingPages: [], totalPages: 0 };
  }

  console.log(`Starting parallel processing of ${docs.length} documents...`);
  safeProgress({
    type: "progress",
    currentStep: `Starting to process ${docs.length} document${
      docs.length !== 1 ? "s" : ""
    }...`,
    totalDocuments: docs.length,
    processedDocuments: 0,
  });

  try {
    // Create an atomic counter for real-time progress tracking in parallel processing
    let completedDocuments = 0;

    // Track successfully processed page numbers (simple array approach)
    const successfullyProcessedPages: number[] = [];
    const totalPages = docs.length;

    console.log(`Total pages in PDF: ${totalPages}`);

    // Process documents in parallel batches with atomic progress tracking
    const allFields = await processBatches(docs, async (doc, index) => {
      if (isProcessingComplete) {
        console.warn(
          `Skipping document ${index + 1} - processing already complete`
        );
        return [];
      }

      console.log(`Processing document ${index + 1}/${docs.length}...`);

      const docContent = doc.pageContent;
      // Extract page number from document metadata (PDFLoader provides this as loc.pageNumber)
      const pageNumber = doc.metadata?.loc?.pageNumber || index + 1;
      console.log(`Document ${index + 1} is page ${pageNumber} of the PDF`);

      try {
        
        const productsStep = await generateWerkbriefStep(
          `${
            description || "Generate an array of json with the required fields for the content extracted from the pdf file."
          }\n\nInvoice/PDF Context (extracted text):\n${docContent}`,
          pageNumber,
          description || ""
        );

        // Mark this page as successfully processed
        successfullyProcessedPages.push(pageNumber);

        // Atomically increment the completed counter
        completedDocuments++;
        const currentCompleted = completedDocuments;

        console.log(
          `Document ${index + 1} processed successfully, found ${
            productsStep?.length || 0
          } fields. Total completed: ${currentCompleted}/${docs.length}`
        );

        if (!isProcessingComplete) {
          safeProgress({
            type: "progress",
            currentStep: `Completed ${currentCompleted} of ${
              docs.length
            } documents. Found ${
              productsStep?.length || 0
            } products in this document`,
            totalDocuments: docs.length,
            processedDocuments: currentCompleted,
          });
        }

        return productsStep || [];
      } catch (error) {
        // Page failed - it will NOT be in successfullyProcessedPages
        console.error(
          `Failed to process page ${pageNumber}:`,
          error instanceof Error ? error.message : "Unknown error"
        );

        // Still increment the completed counter
        completedDocuments++;

        if (!isProcessingComplete) {
          safeProgress({
            type: "progress",
            currentStep: `Page ${pageNumber} could not be processed. Continuing with remaining pages... (${completedDocuments}/${docs.length})`,
            totalDocuments: docs.length,
            processedDocuments: completedDocuments,
          });
        }

        return [];
      }
    });

    // Calculate missing pages: find gaps from 1 to highest successfully processed page
    // Simple approach: check which numbers between 1 and max are missing
    const maxProcessedPage =
      successfullyProcessedPages.length > 0
        ? Math.max(...successfullyProcessedPages)
        : 0;

    const missingPages: number[] = [];
    for (let i = 1; i <= maxProcessedPage; i++) {
      if (!successfullyProcessedPages.includes(i)) {
        missingPages.push(i);
      }
    }

    console.log(
      `Successfully processed pages: ${successfullyProcessedPages.length}/${totalPages}`
    );
    if (missingPages.length > 0) {
      console.warn(
        `Missing pages: ${missingPages.join(", ")} (${
          missingPages.length
        } gaps found between pages 1-${maxProcessedPage})`
      );
    }

    // Flatten all fields from all documents, keep PDF order (stable sort by
    // page number; within a page the enrichment order already follows the
    // listing order), then merge duplicate rows that belong to the same client.
    const flattened = allFields.flat();
    const ordered = [...flattened].sort(
      (a, b) => (a["Page Number"] ?? 0) - (b["Page Number"] ?? 0)
    );
    const fields = mergeWerkbriefFields(ordered);

    console.log(
      `Parallel processing completed. Total fields extracted: ${fields.length} (from ${flattened.length} before merge)`
    );

    if (!isProcessingComplete) {
      const completionMessage =
        missingPages.length > 0
          ? `Processing complete! Generated ${
              fields.length
            } werkbrief entries. ${
              missingPages.length
            } gaps found in pages 1-${Math.max(...successfullyProcessedPages)}.`
          : `Processing complete! Generated ${fields.length} werkbrief entries. All ${totalPages} pages processed successfully.`;

      safeProgress({
        type: "complete",
        data: {
          fields: fields,
          missingPages,
          totalPages: totalPages,
        },
        currentStep: completionMessage,
        totalDocuments: docs.length,
        processedDocuments: docs.length,
      });
      isProcessingComplete = true;
    }

    return {
      fields: fields,
      missingPages,
      totalPages: totalPages,
    };
  } catch (error) {
    console.error("Parallel processing failed:", error);
    if (!isProcessingComplete) {
      safeProgress({
        type: "error",
        error: error instanceof Error ? error.message : "Processing failed",
      });
      isProcessingComplete = true;
    }
    throw error;
  }
}

// Per-product AI enrichment output (Pinecone-history source) including IVA/DTZ.
const WerkbriefEnrichSchema = z.object({
  "GOEDEREN OMSCHRIJVING": z.string({
    description: "Dutch goods description from the single best-matching snippet",
  }),
  "GOEDEREN CODE": z.string({
    description: "GOEDEREN CODE from the single best-matching snippet",
  }),
  Confidence: z.string({
    description: "Confidence score (0-100%) reflecting how well the chosen snippet matches",
  }),
  needsIVA: z.boolean({ description: "Whether the product requires IVA" }),
  needsDTZ: z.boolean({ description: "Whether the product requires DTZ" }),
});

type ProductBought = z.infer<typeof ProductsBoughtSchema>["products"][number];

/**
 * Enrich a single listed product: per-product Pinecone retrieval (AI source),
 * a parallel library default-code classification (library source), and IVA/DTZ
 * prediction. Never throws — always returns a complete field so no product is
 * dropped from the werkbrief.
 */
async function enrichWerkbriefProduct(
  product: ProductBought,
  description: string,
  pageNumber: number
) {
  const desc = product.desc;

  // Library agent runs independently (regex search + best-category pick) so it
  // can be compared against the history agent below. Kick it off in parallel.
  const libraryPromise = classifyWithLibraryAgent(desc);

  // History ("AI") source — retrieve this product's own snippets from Pinecone.
  let snippets: string[] = [];
  try {
    snippets = await retrieveRelevantSnippets(desc, 5);
  } catch (error) {
    console.warn(`Snippet retrieval failed for "${desc}":`, error);
  }

  const systemPrompt = `You are an expert dutch werkbrief creator matching a product to its GOEDEREN CODE and GOEDEREN OMSCHRIJVING.
- Pick the SINGLE most relevant snippet and use THAT record's exact GOEDEREN CODE and GOEDEREN OMSCHRIJVING (in Dutch).
- Confidence must reflect match quality: high (90-100%) for exact/near-exact, lower for loose matches.
- If NONE of the snippets is a reasonable match, do NOT guess: set GOEDEREN CODE "00000000", GOEDEREN OMSCHRIJVING "ONBEKEND", Confidence "0%".
- For needsIVA and needsDTZ: if the snippet you chose states a "Needs IVA" / "Needs DTZ" value, use exactly that stored value. Only when the snippet does not state it, decide using the rules below.

${IVA_RULES}

${DTZ_RULES}`;

  const prompt = `${description}

Product: ${desc} (cartons:${product.ctns}, bruto:${product.bruto}, fob:${product.fob}, stks:${product.stks})

Context from knowledge base:
${snippets.map((r, i) => `(${i + 1}) ${r}`).join("\n") || "(no relevant snippets found)"}

Based on the product and the snippets, provide the GOEDEREN CODE and GOEDEREN OMSCHRIJVING in Dutch, plus needsIVA and needsDTZ.`;

  let ai = {
    "GOEDEREN OMSCHRIJVING": "ONBEKEND",
    "GOEDEREN CODE": "00000000",
    Confidence: "0%",
    needsIVA: false,
    needsDTZ: false,
  };
  try {
    const { object } = await generateObject({
      model: openai("gpt-5-mini"),
      schema: WerkbriefEnrichSchema,
      system: systemPrompt,
      prompt,
    });
    ai = {
      "GOEDEREN OMSCHRIJVING": object["GOEDEREN OMSCHRIJVING"] || "ONBEKEND",
      "GOEDEREN CODE": object["GOEDEREN CODE"] || "00000000",
      Confidence: object.Confidence || "0%",
      needsIVA: object.needsIVA ?? false,
      needsDTZ: object.needsDTZ ?? false,
    };
  } catch (error) {
    console.error(`Enrichment failed for "${desc}":`, error);
  }

  // Library source: independent prediction from the default-code table.
  const def = await libraryPromise;

  return {
    "Item Description": desc,
    "GOEDEREN OMSCHRIJVING": ai["GOEDEREN OMSCHRIJVING"],
    "GOEDEREN CODE": ai["GOEDEREN CODE"],
    defaultCode: def?.code ?? "",
    defaultOmschrijving: def?.omschrijving ?? "",
    codeSource: "ai" as "ai" | "library",
    needsIVA: ai.needsIVA ?? false,
    needsDTZ: ai.needsDTZ ?? false,
    clientName: product.clientName || "",
    CTNS: product.ctns,
    STKS: product.stks,
    BRUTO: product.bruto,
    FOB: product.fob,
    Confidence: ai.Confidence,
    "Page Number": pageNumber,
  };
}

type WerkbriefField = Awaited<ReturnType<typeof enrichWerkbriefProduct>>;

export async function generateWerkbriefStep(
  text: string,
  pageNumber?: number,
  description = ""
): Promise<WerkbriefField[]> {
  // Input validation
  if (!text || text.trim().length < 10) {
    console.warn("Text too short for processing:", text.length);
    return [];
  }

  // Step 1: list the products on this page (order preserved).
  const { object: store } = await withRetry(() =>
    generateObject({
      model: openai("gpt-5-mini"),
      system: productsAnalyzerPrompt,
      prompt: `${text.trim()}`,
      schema: ProductsBoughtSchema,
    })
  );

  console.log(`Products extracted: ${store.products.length}`);

  if (store.products.length === 0) {
    console.warn("No products found in document");
    return [];
  }

  // Step 2: enrich every product in parallel batches (per-product Pinecone +
  // default-code + IVA/DTZ). processBatches preserves input order and the
  // processor never throws, so no product is dropped.
  const enriched = await processBatches(store.products, (product) =>
    enrichWerkbriefProduct(product, description, pageNumber ?? 0)
  );

  return enriched;
}

/**
 * Merge rows that belong to the same client and share the same active code +
 * omschrijving, summing the numeric columns. Order-stable (first occurrence
 * keeps its position).
 */
function mergeWerkbriefFields(fields: WerkbriefField[]): WerkbriefField[] {
  const merged: WerkbriefField[] = [];
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
    const key = `${(field.clientName || "").trim().toLowerCase()}|${String(
      activeCode
    ).trim().toLowerCase()}|${String(activeOms).trim().toLowerCase()}`;

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
      // Preserve an IVA/DTZ flag if any merged row requires it.
      target.needsIVA = target.needsIVA || field.needsIVA;
      target.needsDTZ = target.needsDTZ || field.needsDTZ;
    }
  }

  return merged;
}
