import { generateObject } from "ai";
import { openai } from "@/config/agents";
import { ProductsBoughtSchema, ProductFieldsSchema } from "./schema";
import { productsAnalyzerPrompt, werkbriefSystemPrompt } from "./prompt";
import { retrieveRelevantSnippets } from "./tool-pinecone";
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
            description || "Generate a werkbrief for the invoice."
          }\n\nInvoice/PDF Context (extracted text):\n${docContent}`,
          pageNumber
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

    // Flatten all fields from all documents
    const fields = allFields.flat();

    console.log(
      `Parallel processing completed. Total fields extracted: ${fields.length}`
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

export async function generateWerkbriefStep(text: string, pageNumber?: number) {
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

    // Dynamic topK calculation: number of products * 15 + 50 threshold
    const dynamicTopK = Math.max(store.products.length * 15 + 50, 50);
    console.log(
      `Using dynamic topK: ${dynamicTopK} for ${store.products.length} products`
    );

    const retrieved = await retrieveRelevantSnippets(
      `The item descriptions are: ${store.products
        .map((p, i) => `${i}.${p.desc}`)
        .join("\n")}`,
      dynamicTopK
    );

    const { object: werkBriefObj } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: werkbriefSystemPrompt,
      prompt: `Generate a werkbrief for the following products:${store.products
        .map((p, i) => {
          return `${i}.${p.desc}, cartons:${p.ctns}, bruto:${p.bruto}, fob:${p.fob}, stks:${p.stks}`;
        })
        .join("\n\n")}\n. Here are the relevant snippets:\n${retrieved
        .map((r, i) => `(${i + 1}) ${r}`)
        .join("\n")}`,
      schema: ProductFieldsSchema, // AI model only generates fields, not metadata
      temperature: 0,
    });

    // Agent assigns page number to all fields based on PDF structure
    // Model doesn't extract page numbers - they're not in the PDF content!
    const fieldsWithPageNumber = (werkBriefObj.fields || []).map((field) => ({
      ...field,
      "Page Number": pageNumber ?? 0, // Agent provides the page number
    }));

    return fieldsWithPageNumber;
  });
}
