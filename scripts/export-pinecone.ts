/**
 * Pinecone Export Script
 *
 * Fetches all records from the Pinecone index and writes them to an Excel file.
 *
 * Usage:
 *   npx tsx scripts/export-pinecone.ts
 *
 * Output: pinecone-export-<timestamp>.xlsx in the project root
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Pinecone } from "@pinecone-database/pinecone";
import * as XLSX from "xlsx";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const FETCH_BATCH_SIZE = 20;
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 2000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: Missing environment variable "${name}"`);
    process.exit(1);
  }
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      process.stdout.write(
        `\n  [retry ${attempt}/${maxRetries - 1}] ${label} failed (${err?.message ?? err}). Retrying in ${delay / 1000}s...\n`
      );
      await sleep(delay);
    }
  }
  throw new Error("unreachable");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function main() {
  const apiKey = requireEnv("PINECONE_API_KEY");
  const indexName = requireEnv("PINECONE_INDEX");

  console.log("=== Pinecone Export ===");
  console.log(`Index: ${indexName}`);
  console.log("");

  const pc = new Pinecone({ apiKey });
  const index = pc.Index(indexName);

  // Step 1: List all vector IDs
  console.log("Step 1: Listing all vector IDs...");

  const allIds: string[] = [];
  let paginationToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    const listResult = await withRetry(
      `listPaginated (page ${pageCount + 1})`,
      () =>
        index.listPaginated({
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
    console.log("No vectors found. Exiting.");
    return;
  }

  // Step 2: Fetch metadata in batches
  console.log("\nStep 2: Fetching metadata...\n");

  const uniqueIds = [...new Set(allIds)];
  const batches = chunk(uniqueIds, FETCH_BATCH_SIZE);

  const rows: {
    ID: string;
    Description: string;
    Code: string | number;
    "Goederen Description": string;
    Category: string;
  }[] = [];

  let fetched = 0;
  let errors = 0;

  for (let i = 0; i < batches.length; i++) {
    const idBatch = batches[i];

    let fetchResult;
    try {
      fetchResult = await withRetry(
        `fetch batch ${i + 1}/${batches.length}`,
        () => index.fetch(idBatch)
      );
    } catch (err) {
      console.error(`\n  ERROR fetching batch ${i + 1}/${batches.length}:`, err);
      errors += idBatch.length;
      continue;
    }

    const records = Object.values(fetchResult.records ?? {});

    for (const record of records) {
      const meta = (record.metadata ?? {}) as Record<string, any>;
      rows.push({
        ID: record.id,
        Description: String(meta.desc ?? ""),
        Code: meta.code ?? "",
        "Goederen Description": String(meta.gdesc ?? ""),
        Category: String(meta.category ?? ""),
      });
      fetched++;
    }

    process.stdout.write(
      `\r  Progress: ${i + 1}/${batches.length} batches | ${fetched} records fetched | ${errors} errors`
    );
  }

  console.log(`\n  Done fetching. ${fetched} records collected.`);

  // Step 3: Write Excel file
  console.log("\nStep 3: Writing Excel file...");

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = [
    { wch: 60 }, // ID
    { wch: 80 }, // Description
    { wch: 15 }, // Code
    { wch: 40 }, // Goederen Description
    { wch: 20 }, // Category
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pinecone Records");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputPath = path.resolve(__dirname, `../pinecone-export-${timestamp}.xlsx`);

  XLSX.writeFile(workbook, outputPath);

  console.log(`\n=== Export Complete ===`);
  console.log(`Records exported : ${fetched}`);
  console.log(`Errors           : ${errors}`);
  console.log(`Output file      : ${outputPath}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
