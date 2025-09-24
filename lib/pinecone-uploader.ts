import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// Configuration constants
const BATCH_SIZE = 20; // Increased batch size for better parallelization
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const MAX_PARALLEL_BATCHES = 3; // Number of batches to process in parallel

export interface PineconeDocument {
  id: string;
  content: string;
  metadata: {
    desc: string;
    code: string;
    gdesc: string;
    category: string;
  };
}

export interface UploadResult {
  success: boolean;
  message: string;
  uploadedCount?: number;
  error?: string;
  failedCount?: number;
}

export interface ProgressCallback {
  (progress: {
    totalVectors: number;
    processedVectors: number;
    successfulVectors: number;
    failedVectors: number;
    currentBatch: number;
    totalBatches: number;
    status:
      | "processing"
      | "embedding"
      | "upserting"
      | "retrying"
      | "complete"
      | "error";
    message?: string;
  }): void;
}

/**
 * Retry utility function with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds
 * @param operationName - Name of the operation for logging
 * @param onRetry - Optional callback for retry notifications
 * @returns Promise with the result of the operation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY,
  operationName: string = "operation",
  onRetry?: (attempt: number, maxRetries: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt <= maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(
          `${operationName} failed (attempt ${attempt}/${
            maxRetries + 1
          }), retrying in ${delay}ms:`,
          lastError.message
        );

        // Notify about retry if callback provided
        if (onRetry) {
          onRetry(attempt, maxRetries, lastError);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Sleep utility function
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enhanced upload function with parallel processing, retry logic, and progress tracking
 * @param documents - Array of documents to upload
 * @param onProgress - Optional progress callback function
 * @returns Promise<UploadResult>
 */
export async function uploadToPinecone(
  documents: PineconeDocument[],
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  try {
    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const indexName = getEnvOrThrow("PINECONE_INDEX");
    const index = pc.Index(indexName);

    const totalVectors = documents.length;
    const totalBatches = Math.ceil(totalVectors / BATCH_SIZE);
    let successfulVectors = 0;
    let failedVectors = 0;

    // Progress tracking - only count completed vectors to prevent back-and-forth movement
    const updateProgress = (
      currentBatch: number,
      status:
        | "processing"
        | "embedding"
        | "upserting"
        | "retrying"
        | "complete"
        | "error",
      message?: string
    ) => {
      if (onProgress) {
        // Only count successfully processed and failed vectors (completed batches)
        // Do not include processingVectors to prevent progress bar from moving backwards
        const processedVectors = successfulVectors + failedVectors;
        onProgress({
          totalVectors,
          processedVectors: Math.min(processedVectors, totalVectors),
          successfulVectors,
          failedVectors,
          currentBatch,
          totalBatches,
          status,
          message,
        });
      }
    };

    console.log(
      `Starting parallel upload of ${totalVectors} documents in ${totalBatches} batches`
    );
    updateProgress(0, "processing", "Starting parallel upload process...");

    // Create batches
    const batches: PineconeDocument[][] = [];
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }

    // Process batches with controlled parallelism
    const processWithLimit = async (batchesToProcess: PineconeDocument[][]) => {
      const results = [];

      for (let i = 0; i < batchesToProcess.length; i += MAX_PARALLEL_BATCHES) {
        const parallelBatches = batchesToProcess.slice(
          i,
          i + MAX_PARALLEL_BATCHES
        );

        // Start processing these batches in parallel
        const batchPromises = parallelBatches.map((batch, batchIndex) =>
          processBatch(batch, i + batchIndex, index, updateProgress)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Update counters as each batch group completes
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.status === "fulfilled") {
            successfulVectors += result.value.successCount;
            failedVectors += result.value.failedCount;
          } else {
            console.error("Batch processing failed:", result.reason);
            failedVectors += parallelBatches[j]?.length || BATCH_SIZE;
          }
        }

        // Update progress after each batch group completes to show smooth progress
        updateProgress(
          Math.floor((i + parallelBatches.length) / MAX_PARALLEL_BATCHES),
          "processing",
          `Completed ${
            successfulVectors + failedVectors
          }/${totalVectors} vectors`
        );

        results.push(...batchResults);

        // Small delay between parallel batch groups to avoid overwhelming the API
        if (i + MAX_PARALLEL_BATCHES < batchesToProcess.length) {
          await sleep(500); // 500ms delay between batch groups
        }
      }

      return results;
    };

    await processWithLimit(batches);

    const uploadedCount = successfulVectors;
    updateProgress(
      totalBatches,
      "complete",
      `Upload completed: ${uploadedCount}/${totalVectors} vectors uploaded successfully`
    );

    if (failedVectors > 0) {
      console.warn(
        `Upload completed with ${failedVectors} failures out of ${totalVectors} total vectors`
      );
      return {
        success: uploadedCount > 0, // Success if at least some vectors were uploaded
        message: `Partially successful: ${uploadedCount} vectors uploaded, ${failedVectors} failed`,
        uploadedCount,
        failedCount: failedVectors,
      };
    }

    return {
      success: true,
      message: `Successfully uploaded ${uploadedCount} documents to Pinecone`,
      uploadedCount,
    };
  } catch (error) {
    console.error("Error uploading to Pinecone:", error);
    if (onProgress) {
      onProgress({
        totalVectors: documents.length,
        processedVectors: 0,
        successfulVectors: 0,
        failedVectors: documents.length,
        currentBatch: 0,
        totalBatches: Math.ceil(documents.length / BATCH_SIZE),
        status: "error",
        message: `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
    return {
      success: false,
      message: "Failed to upload to Pinecone",
      error: error instanceof Error ? error.message : "Unknown error",
      failedCount: documents.length,
    };
  }
}

/**
 * Process a single batch with retry logic
 * @param batch - Batch of documents to process
 * @param batchIndex - Index of the batch
 * @param index - Pinecone index instance
 * @param updateProgress - Progress callback function
 * @returns Promise with batch processing result
 */
async function processBatch(
  batch: PineconeDocument[],
  batchIndex: number,
  index: ReturnType<Pinecone["Index"]>,
  updateProgress: (
    currentBatch: number,
    status:
      | "processing"
      | "embedding"
      | "upserting"
      | "retrying"
      | "complete"
      | "error",
    message?: string
  ) => void
): Promise<{ successCount: number; failedCount: number }> {
  try {
    // Start processing this batch - show progress as "currently processing"
    updateProgress(
      batchIndex + 1,
      "embedding",
      `Generating embeddings for batch ${batchIndex + 1}`
    );

    // Generate embeddings with retry logic
    const embeddings = await withRetry(
      async () => {
        return await Promise.all(
          batch.map(async (doc) => {
            const { embedding } = await embed({
              model: openai.embedding("text-embedding-ada-002"),
              value: doc.content,
            });
            return {
              id: doc.id,
              values: embedding,
              metadata: doc.metadata,
            };
          })
        );
      },
      MAX_RETRIES,
      RETRY_DELAY,
      `Embedding generation for batch ${batchIndex + 1}`,
      (attempt, maxRetries) => {
        updateProgress(
          batchIndex + 1,
          "retrying",
          `Retrying embedding generation for batch ${
            batchIndex + 1
          } (attempt ${attempt}/${maxRetries})`
        );
      }
    );

    updateProgress(
      batchIndex + 1,
      "upserting",
      `Upserting batch ${batchIndex + 1} to Pinecone`
    );

    // Upsert to Pinecone with retry logic
    await withRetry(
      async () => await index.upsert(embeddings),
      MAX_RETRIES,
      RETRY_DELAY,
      `Pinecone upsert for batch ${batchIndex + 1}`,
      (attempt, maxRetries) => {
        updateProgress(
          batchIndex + 1,
          "retrying",
          `Retrying Pinecone upsert for batch ${
            batchIndex + 1
          } (attempt ${attempt}/${maxRetries})`
        );
      }
    );

    console.log(
      `✅ Successfully processed batch ${batchIndex + 1} (${
        batch.length
      } vectors)`
    );

    // Update progress to show batch completion (no longer processing)
    updateProgress(
      batchIndex + 1,
      "processing",
      `Completed batch ${batchIndex + 1}`
    );

    return { successCount: batch.length, failedCount: 0 };
  } catch (error) {
    console.error(
      `❌ Failed to process batch ${
        batchIndex + 1
      } after ${MAX_RETRIES} retries:`,
      error
    );
    updateProgress(
      batchIndex + 1,
      "error",
      `Failed to process batch ${batchIndex + 1}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return { successCount: 0, failedCount: batch.length };
  }
}

export async function testPineconeConnection(): Promise<boolean> {
  try {
    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const indexName = getEnvOrThrow("PINECONE_INDEX");
    const index = pc.Index(indexName);

    // Try to query the index to test connection
    await index.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 1,
      includeMetadata: false,
    });

    return true;
  } catch (error) {
    console.error("Pinecone connection test failed:", error);
    return false;
  }
}
