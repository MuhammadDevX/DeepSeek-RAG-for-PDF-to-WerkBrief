import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";

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
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      return NextResponse.json(
        { error: "Server configuration error. Please contact administrator." },
        { status: 500 }
      );
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
    const index = pc.Index(getEnvOrThrow("PINECONE_INDEX"));

    // Delete vectors in batches of 1000 (Pinecone's limit)
    const batchSize = 1000;
    let deletedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      try {
        await index.deleteMany(batch);
        deletedCount += batch.length;
      } catch (error) {
        console.error(`Failed to delete batch:`, error);
        failedCount += batch.length;
      }
    }

    return NextResponse.json({
      success: deletedCount > 0,
      message: `Successfully deleted ${deletedCount} items from knowledge base`,
      deletedCount,
      failedCount,
      totalRequested: ids.length,
    });
  } catch (error) {
    console.error("Delete from knowledge base error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while deleting items",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Delete from Knowledge Base API",
    method: "POST",
    requiredBody: {
      ids: "Array of document IDs to delete",
    },
  });
}
