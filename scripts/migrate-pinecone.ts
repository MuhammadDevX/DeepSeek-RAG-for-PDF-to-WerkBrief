/**
 * Pinecone Migration Script
 *
 * Migrates all vectors from the source Pinecone index to a destination index.
 *
 * Source:      PINECONE_API_KEY + PINECONE_INDEX
 * Destination: TO_PINECONE_API_KEY + TO_PINECONE_INDEX
 *
 * Usage:
 *   npx tsx scripts/migrate-pinecone.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { Pinecone } from "@pinecone-database/pinecone";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ── Config ────────────────────────────────────────────────────────────────────

const FETCH_BATCH_SIZE = 20;  // IDs per fetch call (kept small — IDs go in the URL query string)
const UPSERT_BATCH_SIZE = 20; // vectors per upsert call
const MAX_RETRIES = 5;        // max attempts per API call
const RETRY_BASE_MS = 2000;   // base delay for exponential backoff (ms)

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: Missing environment variable "${name}"`);
    process.exit(1);
  }
  return value;
}

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLast = attempt === maxRetries;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s
      if (isLast) throw err;
      process.stdout.write(
        `\n  [retry ${attempt}/${maxRetries - 1}] ${label} failed (${err?.message ?? err}). Retrying in ${delay / 1000}s...\n`
      );
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sourceApiKey = requireEnv("PINECONE_API_KEY");
  const sourceIndex = requireEnv("PINECONE_INDEX");
  const destApiKey = requireEnv("TO_PINECONE_API_KEY");
  const destIndex = requireEnv("TO_PINECONE_INDEX");

  console.log("=== Pinecone Migration ===");
  console.log(`Source index : ${sourceIndex}`);
  console.log(`Dest index   : ${destIndex}`);
  console.log("");

  const sourcePc = new Pinecone({ apiKey: sourceApiKey });
  const destPc = new Pinecone({ apiKey: destApiKey });

  // ── Step 0: Describe source index and create destination index if needed ─────

  console.log("Step 0: Reading source index configuration...");

  const sourceDescription = await withRetry(
    "describeIndex",
    () => sourcePc.describeIndex(sourceIndex)
  );
  const { dimension, metric, spec } = sourceDescription;

  console.log(`  Dimension : ${dimension}`);
  console.log(`  Metric    : ${metric}`);
  console.log(`  Spec      : ${JSON.stringify(spec)}`);

  const existingIndexes = await withRetry("listIndexes", () => destPc.listIndexes());
  const destExists = (existingIndexes.indexes ?? []).some((idx) => idx.name === destIndex);

  if (destExists) {
    console.log(`  Destination index "${destIndex}" already exists — skipping creation.`);
  } else {
    console.log(`\n  Creating destination index "${destIndex}"...`);

    // Build a clean spec — only 'serverless' or 'pod' are accepted by createIndex
    let cleanSpec: any;
    if (spec?.serverless) {
      cleanSpec = { serverless: { cloud: spec.serverless.cloud, region: spec.serverless.region } };
    } else if (spec?.pod) {
      cleanSpec = { pod: spec.pod };
    } else {
      throw new Error("Unrecognised source index spec — expected serverless or pod.");
    }

    await withRetry("createIndex", () =>
      destPc.createIndex({
        name: destIndex,
        dimension: dimension!,
        metric: metric as "cosine" | "euclidean" | "dotproduct",
        spec: cleanSpec,
        waitUntilReady: true,
      })
    );
    console.log(`  Index "${destIndex}" created and ready.`);
  }

  const src = sourcePc.Index(sourceIndex);
  const dst = destPc.Index(destIndex);

  // ── Step 1: Collect all vector IDs from source ──────────────────────────────

  console.log("\nStep 1: Listing all vector IDs from source index...");

  const allIds: string[] = [];
  let paginationToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    const listResult = await withRetry(
      `listPaginated (page ${pageCount + 1})`,
      () =>
        src.listPaginated({
          limit: 100,
          ...(paginationToken ? { paginationToken } : {}),
        })
    );

    const ids = (listResult.vectors ?? []).map((v) => v.id!).filter(Boolean);
    allIds.push(...ids);
    paginationToken = listResult.pagination?.next;
    pageCount++;

    process.stdout.write(`\r  Listed ${allIds.length} IDs (page ${pageCount})...`);
  } while (paginationToken);

  console.log(`\n  Total vectors found: ${allIds.length}`);

  if (allIds.length === 0) {
    console.log("No vectors to migrate. Exiting.");
    return;
  }

  // ── Step 2: Fetch + upsert in batches ───────────────────────────────────────

  console.log("\nStep 2: Fetching from source and upserting to destination...\n");

  let totalUpserted = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  const upsertedIds = new Set<string>(); // deduplication guard

  // Deduplicate the ID list before batching
  const uniqueIds = [...new Set(allIds)];
  if (uniqueIds.length < allIds.length) {
    console.log(`  Deduplicated ${allIds.length - uniqueIds.length} duplicate IDs from list.\n`);
  }

  const fetchBatches = chunk(uniqueIds, FETCH_BATCH_SIZE);

  for (let i = 0; i < fetchBatches.length; i++) {
    const idBatch = fetchBatches[i];

    // Fetch vectors (values + metadata) from source with retry
    let fetchResult;
    try {
      fetchResult = await withRetry(
        `fetch batch ${i + 1}/${fetchBatches.length}`,
        () => src.fetch(idBatch)
      );
    } catch (err) {
      console.error(`\n  ERROR fetching batch ${i + 1}/${fetchBatches.length} after all retries:`, err);
      totalErrors += idBatch.length;
      continue;
    }

    const records = Object.values(fetchResult.records ?? {});

    if (records.length === 0) {
      console.warn(`\n  WARNING: Batch ${i + 1} returned 0 records (expected ${idBatch.length})`);
      continue;
    }

    // Build upsert vectors, skipping any already upserted IDs
    const vectors = records
      .filter((r) => r.values && r.values.length > 0)
      .filter((r) => {
        if (upsertedIds.has(r.id)) {
          totalSkipped++;
          return false;
        }
        return true;
      })
      .map((r) => ({
        id: r.id,
        values: r.values,
        metadata: r.metadata ?? {},
      }));

    // Upsert to destination with retry
    const upsertBatches = chunk(vectors, UPSERT_BATCH_SIZE);
    for (const upsertBatch of upsertBatches) {
      try {
        await withRetry(
          `upsert batch (batch ${i + 1})`,
          () => dst.upsert(upsertBatch)
        );
        for (const v of upsertBatch) upsertedIds.add(v.id);
        totalUpserted += upsertBatch.length;
      } catch (err) {
        console.error(`\n  ERROR upserting batch to destination after all retries:`, err);
        totalErrors += upsertBatch.length;
      }
    }

    process.stdout.write(
      `\r  Progress: ${i + 1}/${fetchBatches.length} batches | ${totalUpserted} upserted | ${totalSkipped} skipped | ${totalErrors} errors`
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log("\n\n=== Migration Complete ===");
  console.log(`Total IDs found      : ${allIds.length}`);
  console.log(`Unique IDs processed : ${uniqueIds.length}`);
  console.log(`Successfully upserted: ${totalUpserted}`);
  console.log(`Skipped (duplicates) : ${totalSkipped}`);
  console.log(`Errors               : ${totalErrors}`);

  if (totalErrors > 0) {
    console.warn("\nSome vectors failed to migrate. Check the errors above.");
    process.exit(1);
  } else {
    console.log("\nAll vectors migrated successfully.");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Run ───────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
