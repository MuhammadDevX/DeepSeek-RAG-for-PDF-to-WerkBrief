import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export async function POST(request: NextRequest) {
  try {
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

    const { itemName, goederenOmschrijving, goederenCode, category } =
      await request.json();

    // Validation
    if (!itemName || typeof itemName !== "string") {
      return NextResponse.json(
        { error: "Item Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!goederenOmschrijving || typeof goederenOmschrijving !== "string") {
      return NextResponse.json(
        { error: "Goederen Omschrijving is required and must be a string" },
        { status: 400 }
      );
    }

    if (!goederenCode || typeof goederenCode !== "string") {
      return NextResponse.json(
        { error: "Goederen Code is required and must be a string" },
        { status: 400 }
      );
    }

    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const index = pc.Index(getEnvOrThrow("PINECONE_INDEX"));

    // Create the text content to embed
    const content = `Item: ${itemName}\nGoederen Omschrijving: ${goederenOmschrijving}\nGoederen Code: ${goederenCode}${
      category ? `\nCategory: ${category}` : ""
    }`;

    // Generate embedding
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: content,
    });

    // Create unique ID
    const id = itemName // Remove all non-ASCII characters (Pinecone only supports ASCII)
      .replace(/[^\x00-\x7F]/g, "")
      // Remove disallowed punctuation and symbols, keep spaces
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      // Trim leading/trailing spaces
      .trim();

    // Upsert to Pinecone
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          desc: itemName,
          gdesc: goederenOmschrijving,
          code: goederenCode,
          category: category || "N/A",
          text: content,
          source: "manual_entry",
          added_at: new Date().toISOString(),
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Item successfully added to knowledge base",
      id,
      itemName,
      goederenOmschrijving,
      goederenCode,
    });
  } catch (error) {
    console.error("Add to knowledge base error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while adding item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
