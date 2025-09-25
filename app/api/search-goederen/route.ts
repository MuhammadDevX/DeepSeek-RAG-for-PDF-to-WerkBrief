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

    const { query, topK } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const numTopK = parseInt(topK) || 5;
    if (numTopK <= 0 || numTopK > 100) {
      return NextResponse.json(
        { error: "topK must be between 1 and 100" },
        { status: 400 }
      );
    }

    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const index = pc.Index(getEnvOrThrow("PINECONE_INDEX"));

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: "All of the products mentioned in this description:\n" + query,
    });

    const result = await index.query({
      vector: embedding,
      topK: numTopK,
      includeMetadata: true,
    });

    type Match = {
      id?: string;
      score?: number;
      metadata?: {
        text?: string;
        code?: string | number;
        desc?: string;
        gdesc?: string;
        category?: string;
        [key: string]: unknown;
      };
    };

    const matches = (result.matches ?? []) as unknown as Match[];

    const searchResults = matches.map((match, index) => ({
      id: match.id || `result-${index}`,
      score: match.score || 0,
      item: match.metadata?.desc || "N/A",
      goederen_omschrijving: match.metadata?.gdesc || "N/A",
      goederen_code:
        match.metadata?.code !== undefined
          ? String(match.metadata.code)
          : "N/A",
      category: match.metadata?.category || "N/A",
      text: match.metadata?.text || "",
      // Include all metadata for complete information
      metadata: match.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      results: searchResults,
      query,
      topK: numTopK,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error during search" },
      { status: 500 }
    );
  }
}
