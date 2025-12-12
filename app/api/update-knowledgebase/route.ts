import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin or operator
    const { sessionClaims } = await auth();
    const userRole = sessionClaims?.metadata?.role;
    if (userRole !== "admin" && userRole !== "operator") {
      return NextResponse.json(
        { error: "Unauthorized. Admin or Operator access required." },
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

    const { id, itemName, goederenOmschrijving, goederenCode, category } =
      await request.json();

    // Validation
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "ID is required and must be a string" },
        { status: 400 }
      );
    }

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

    // Generate new embedding for updated content
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: content,
    });

    // Update the vector in Pinecone
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
          updated_at: new Date().toISOString(),
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Item successfully updated in knowledge base",
      id,
      itemName,
      goederenOmschrijving,
      goederenCode,
    });
  } catch (error) {
    console.error("Update knowledge base error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while updating item",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Update Knowledge Base API",
    method: "POST",
    requiredBody: {
      id: "Document ID to update",
      itemName: "Updated item name/description",
      goederenOmschrijving: "Updated goederen omschrijving",
      goederenCode: "Updated goederen code",
      category: "Updated category (optional)",
    },
  });
}
