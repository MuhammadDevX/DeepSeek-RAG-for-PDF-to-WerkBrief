import { NextRequest, NextResponse } from "next/server";
import { processExcelDataForPinecone } from "@/lib/excel-parser";
import { uploadToPinecone, ProgressCallback } from "@/lib/pinecone-uploader";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { excelData, streaming } = body;

    if (!excelData) {
      return NextResponse.json(
        { error: "No Excel data provided" },
        { status: 400 }
      );
    }

    // Validate that we have the required structure
    if (
      !excelData.rows ||
      !excelData.columns ||
      !Array.isArray(excelData.rows)
    ) {
      return NextResponse.json(
        { error: "Invalid Excel data structure" },
        { status: 400 }
      );
    }

    // Process data for Pinecone
    const pineconeDocuments = processExcelDataForPinecone(excelData);

    // If streaming is requested, use Server-Sent Events
    if (streaming) {
      const encoder = new TextEncoder();
      let controller: ReadableStreamDefaultController;
      let isControllerClosed = false;

      const stream = new ReadableStream({
        start(ctrl) {
          controller = ctrl;
        },
        cancel() {
          isControllerClosed = true;
        },
      });

      // Function to send progress updates
      const sendProgress: ProgressCallback = (progress) => {
        if (!isControllerClosed) {
          try {
            const data = JSON.stringify({
              type: "progress",
              data: progress,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch (error) {
            console.error("Error sending progress update:", error);
          }
        }
      };

      // Start the upload process in the background
      uploadToPinecone(pineconeDocuments, sendProgress)
        .then((result) => {
          if (!isControllerClosed) {
            try {
              // Send final result with uploaded IDs
              const uploadedIds = pineconeDocuments.map((doc) => doc.id);
              const data = JSON.stringify({
                type: "complete",
                data: {
                  ...result,
                  totalRows: excelData.rows.length,
                  columns: excelData.columns,
                  uploadedIds, // Include the IDs for undo functionality
                },
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            } catch (error) {
              console.error("Error sending completion update:", error);
            }
          }
        })
        .catch((error) => {
          if (!isControllerClosed) {
            try {
              const data = JSON.stringify({
                type: "error",
                data: {
                  success: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown error occurred",
                },
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            } catch (err) {
              console.error("Error sending error update:", err);
            }
          }
        });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Regular upload without progress tracking
      const uploadResult = await uploadToPinecone(pineconeDocuments);

      if (!uploadResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: uploadResult.error || "Failed to upload to Pinecone",
            failedCount: uploadResult.failedCount,
          },
          { status: 500 }
        );
      }

      // Include uploaded IDs for undo functionality
      const uploadedIds = pineconeDocuments.map((doc) => doc.id);

      return NextResponse.json({
        success: true,
        message: uploadResult.message,
        uploadedCount: uploadResult.uploadedCount,
        failedCount: uploadResult.failedCount || 0,
        totalRows: excelData.rows.length,
        columns: excelData.columns,
        uploadedIds, // Include the IDs for undo functionality
      });
    }
  } catch (error) {
    console.error("Error processing Excel data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Excel Knowledge Base Upload API",
    requiredColumns: [
      "Item Name",
      "Goederen Omschrijving",
      "Goederen Code (HS Code)",
    ],
  });
}
