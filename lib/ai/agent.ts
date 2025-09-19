import { generateObject } from "ai";
import { openai } from "@/config/agents";
import { ProductsBoughtSchema, WerkbriefSchema } from "./schema";
import { productsAnalyzerPrompt, werkbriefSystemPrompt } from "./prompt";
import { retrieveRelevantSnippets } from "./tool-pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// Parallelization and retry configuration constants
const MAX_RETRIES = 5;
const PARALLEL_BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds in milliseconds
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay for retries
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay for retries

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
  if (pdfBuffer) {
    try {
      onProgress?.({
        type: "progress",
        currentStep: "Parsing PDF document...",
      });

      const blob = new Blob([new Uint8Array(pdfBuffer)], {
        type: "application/pdf",
      });
      const loader = new PDFLoader(blob);
      docs = await loader.load();

      onProgress?.({
        type: "progress",
        currentStep: `PDF parsed successfully. Found ${docs.length} document${
          docs.length !== 1 ? "s" : ""
        }`,
        totalDocuments: docs.length,
        processedDocuments: 0,
      });
    } catch (error) {
      console.warn("Failed to parse PDF:", error);
      onProgress?.({ type: "error", error: "Failed to parse PDF document" });
    }
  }

  if (docs.length === 0) {
    console.log("No documents to process");
    onProgress?.({ type: "complete", data: { fields: [] } });
    return { fields: [] };
  }

  console.log(`Starting parallel processing of ${docs.length} documents...`);
  onProgress?.({
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

    // Process documents in parallel batches with atomic progress tracking
    const allFields = await processBatches(docs, async (doc, index) => {
      console.log(`Processing document ${index + 1}/${docs.length}...`);

      const docContent = doc.pageContent;
      const productsStep = await generateWerkbriefStep(
        `${
          description || "Generate a werkbrief for the invoice."
        }\n\nInvoice/PDF Context (extracted text):\n${docContent}`
      );

      // Atomically increment the completed counter
      completedDocuments++;
      const currentCompleted = completedDocuments;

      console.log(
        `Document ${index + 1} processed successfully, found ${
          productsStep?.length || 0
        } fields. Total completed: ${currentCompleted}/${docs.length}`
      );

      onProgress?.({
        type: "progress",
        currentStep: `Completed ${currentCompleted} of ${
          docs.length
        } documents. Found ${
          productsStep?.length || 0
        } products in this document`,
        totalDocuments: docs.length,
        processedDocuments: currentCompleted,
      });

      return productsStep || [];
    });

    // Flatten all fields from all documents
    const fields = allFields.flat();

    console.log(
      `Parallel processing completed. Total fields extracted: ${fields.length}`
    );

    onProgress?.({
      type: "complete",
      data: { fields },
      currentStep: `Processing complete! Generated ${fields.length} werkbrief entries`,
      totalDocuments: docs.length,
      processedDocuments: docs.length,
    });

    return { fields };
  } catch (error) {
    console.error("Parallel processing failed:", error);
    onProgress?.({
      type: "error",
      error: error instanceof Error ? error.message : "Processing failed",
    });
    throw error;
  }
}

export async function generateWerkbriefStep(text: string) {
  // Input validation
  if (!text || text.trim().length < 10) {
    console.warn("Text too short for processing:", text.length);
    return [];
  }

  return await withRetry(async () => {
    const { object: store } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: productsAnalyzerPrompt,
      prompt: `${text.trim()}`,
      schema: ProductsBoughtSchema,
      temperature: 0, // For deterministic results
    });

    console.log(`Products extracted: ${store.products.length}`);

    if (store.products.length === 0) {
      console.warn("No products found in document");
      return [];
    }

    const retrieved = await retrieveRelevantSnippets(
      `The item descriptions are: ${store.products
        .map((p, i) => `${i}.${p.desc}`)
        .join("\n")}`,
      store.products.length
    );

    const { object: werkBriefObj } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: werkbriefSystemPrompt,
      prompt: `Generate a werkbrief for the following products:${store.products
        .map((p, i) => {
          return `${i}.${p.desc}, bruto:${p.bruto}, fob:${p.fob}, stks:${p.stks}`;
        })
        .join("\n\n")}\n. Here are the relevant snippets:\n${retrieved
        .map((r, i) => `(${i + 1}) ${r}`)
        .join("\n")}`,
      schema: WerkbriefSchema,
      temperature: 0, 
    });

    return werkBriefObj.fields || [];
  });
}
