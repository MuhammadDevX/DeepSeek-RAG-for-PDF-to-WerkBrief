import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

interface WerkbriefItem {
  "Item Description": string;
  "GOEDEREN OMSCHRIJVING": string;
  "GOEDEREN CODE": string;
  CTNS: number;
  STKS: number;
  BRUTO: number;
  FOB: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // Check environment variables
    if (
      !process.env.PINECONE_API_KEY ||
      !process.env.PINECONE_INDEX ||
      !process.env.OPENAI_API_KEY
    ) {
      return NextResponse.json(
        { error: "Server configuration error. Please contact administrator." },
        { status: 500 }
      );
    }

    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const index = pc.Index(getEnvOrThrow("PINECONE_INDEX"));

    const vectors = [];
    let successCount = 0;
    let failedCount = 0;

    // Process items in batches
    for (const item of items as WerkbriefItem[]) {
      try {
        const {
          "Item Description": itemDesc,
          "GOEDEREN OMSCHRIJVING": gdesc,
          "GOEDEREN CODE": gcode,
        } = item;

        if (!itemDesc || !gdesc || !gcode) {
          failedCount++;
          continue;
        }

        // Create the text content to embed
        const content = `Item: ${itemDesc}\nGoederen Omschrijving: ${gdesc}\nGoederen Code: ${gcode}`;

        // Generate embedding
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-ada-002"),
          value: content,
        });

        // Create unique ID
        const id = itemDesc
          .replace(/[^\x00-\x7F]/g, "")
          // Remove disallowed punctuation and symbols, keep spaces
          .replace(/[^a-zA-Z0-9 _-]/g, "")
          // Trim leading/trailing spaces
          .trim();

        vectors.push({
          id,
          values: embedding,
          metadata: {
            desc: itemDesc,
            gdesc: gdesc,
            code: gcode,
            category: "",
            text: content,
            source: "werkbrief",
            added_at: new Date().toISOString(),
          },
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to process item:`, error);
        failedCount++;
      }
    }

    // Upsert vectors in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${successCount} items to knowledge base`,
      successCount,
      failedCount,
      totalProcessed: items.length,
    });
  } catch (error) {
    console.error("Batch add to knowledge base error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while adding items",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
