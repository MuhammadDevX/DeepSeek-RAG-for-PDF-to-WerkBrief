import { NextRequest } from "next/server";
import { processArubaInvoice } from "@/lib/ai/aruba-agent";
import {
  downloadFileFromSpaces,
  deleteFileFromSpaces,
} from "@/lib/spaces-utils";
import { extractArubaInvoiceData } from "@/lib/aruba-pdf-parser";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 7200; // 2 hours for large file processing

interface ProgressData {
  type: "progress" | "complete" | "error";
  currentStep?: string;
  totalPDFs?: number;
  processedPDFs?: number;
  currentPDF?: string;
  totalProducts?: number;
  processedProducts?: number;
  data?: unknown;
  error?: string;
}

interface FileData {
  fileKey: string;
  fileName: string;
}

export async function POST(req: NextRequest) {
  const fileKeys: string[] = [];

  try {
    console.log("🚀 API: aruba-special POST request received");

    // Check if user is admin
    const { sessionClaims } = await auth();
    const role = sessionClaims?.metadata?.role as string | undefined;

    console.log(`👤 User role: ${role || "none"}`);

    if (role !== "admin") {
      console.warn("⚠️ Unauthorized access attempt - not admin");
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin access required." }),
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      console.error("❌ Invalid content type:", contentType);
      return new Response(
        JSON.stringify({
          error: "This endpoint requires JSON format with file keys.",
        }),
        { status: 400 }
      );
    }

    let description: string;
    let uploadedFiles: FileData[] = [];
    let streaming: boolean = false;

    try {
      const body = await req.json();
      console.log("📦 Request body received:", {
        hasDescription: !!body.description,
        filesCount: body.files?.length || 0,
        streaming: body.streaming,
      });

      description = body.description;
      uploadedFiles = body.files || [];
      streaming = body.streaming || false;
    } catch (jsonError) {
      console.error("❌ Failed to parse JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
        status: 400,
      });
    }

    if (!description) {
      console.error("❌ Missing description in request");
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400 }
      );
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.error("❌ No files provided in request");
      return new Response(
        JSON.stringify({ error: "At least one file is required" }),
        { status: 400 }
      );
    }

    console.log(
      `✅ Validation passed. Processing ${uploadedFiles.length} files with streaming: ${streaming}`
    );

    // Store file keys for cleanup
    fileKeys.push(...uploadedFiles.map((f) => f.fileKey));

    // If streaming is requested, use Server-Sent Events
    if (streaming) {
      console.log("📡 Setting up Server-Sent Events streaming...");
      console.log(
        `   Files to process: ${uploadedFiles
          .map((f) => f.fileName)
          .join(", ")}`
      );
      console.log(`   Description: ${description}`);

      const encoder = new TextEncoder();
      let controller: ReadableStreamDefaultController;
      let isControllerClosed = false;

      const stream = new ReadableStream({
        start(ctrl) {
          controller = ctrl;
          console.log("🔌 Stream controller initialized");
        },
        cancel() {
          console.log("⚠️ Stream cancelled by client");
          isControllerClosed = true;
        },
      });

      const sendProgress = (data: ProgressData) => {
        if (isControllerClosed) {
          console.log("⚠️ Cannot send progress: controller closed");
          return;
        }
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
          console.log(
            `📤 Sent progress: ${data.type} - ${data.currentStep || "no step"}`
          );
        } catch (error) {
          console.error("❌ Error sending progress:", error);
          isControllerClosed = true;
        }
      };

      // Process in background
      (async () => {
        try {
          console.log("📥 Starting background processing...");
          const allGroups = [];

          for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            const clientName = file.fileName.replace(/\.pdf$/i, "");

            console.log(
              `📄 Processing file ${i + 1}/${
                uploadedFiles.length
              }: ${clientName}`
            );

            if (isControllerClosed) {
              console.warn("⚠️ Stream controller closed, stopping processing");
              break;
            }

            sendProgress({
              type: "progress",
              currentStep: `Processing ${clientName}`,
              totalPDFs: uploadedFiles.length,
              processedPDFs: i,
              currentPDF: clientName,
            });

            try {
              // Download file from Spaces
              console.log(`⬇️ Downloading file from Spaces: ${file.fileKey}`);
              const pdfBuffer = await downloadFileFromSpaces(file.fileKey);
              console.log(`✅ Downloaded ${pdfBuffer.length} bytes`);

              // Extract products using regex
              console.log(`🔍 Extracting products from ${clientName}...`);
              const extractedData = await extractArubaInvoiceData(
                pdfBuffer,
                file.fileName
              );
              console.log(
                `✅ Extracted ${extractedData.products.length} products`
              );

              sendProgress({
                type: "progress",
                currentStep: `Extracted ${extractedData.products.length} products from ${clientName}`,
                totalPDFs: uploadedFiles.length,
                processedPDFs: i,
                currentPDF: clientName,
                totalProducts: extractedData.products.length,
                processedProducts: 0,
              });

              // Enrich products with AI
              console.log(
                `🤖 Enriching ${extractedData.products.length} products with AI...`
              );
              const enrichedFields = await processArubaInvoice(
                extractedData.products,
                clientName,
                description,
                (progress) => {
                  console.log(
                    `   📊 Progress: ${progress.processedProducts}/${progress.totalProducts} - ${progress.currentStep}`
                  );
                  sendProgress({
                    type: "progress",
                    currentStep: progress.currentStep,
                    totalPDFs: uploadedFiles.length,
                    processedPDFs: i,
                    currentPDF: clientName,
                    totalProducts: progress.totalProducts,
                    processedProducts: progress.processedProducts,
                  });
                }
              );
              console.log(`✅ AI enrichment complete for ${clientName}`);

              allGroups.push({
                clientName: extractedData.clientName,
                fields: enrichedFields,
              });

              sendProgress({
                type: "progress",
                currentStep: `Completed ${clientName}`,
                totalPDFs: uploadedFiles.length,
                processedPDFs: i + 1,
                currentPDF: clientName,
              });
            } catch (error) {
              console.error(`❌ Error processing ${clientName}:`, error);
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.error(`   Details: ${errorMessage}`);
              if (error instanceof Error && error.stack) {
                console.error(`   Stack trace: ${error.stack}`);
              }

              sendProgress({
                type: "error",
                error: `Failed to process ${clientName}: ${errorMessage}`,
              });
            }
          }

          if (!isControllerClosed) {
            console.log(
              `✅ All processing complete! Total groups: ${allGroups.length}`
            );
            const totalFields = allGroups.reduce(
              (sum, group) => sum + group.fields.length,
              0
            );
            console.log(
              `   Total enriched fields across all groups: ${totalFields}`
            );

            sendProgress({
              type: "complete",
              data: {
                groups: allGroups,
                totalGroups: allGroups.length,
              },
            });
            console.log("🏁 Closing stream controller");
            controller.close();
          }
        } catch (error) {
          console.error("❌ Fatal error in background processing:", error);
          if (error instanceof Error && error.stack) {
            console.error(`   Stack trace: ${error.stack}`);
          }

          if (!isControllerClosed) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error occurred";
            console.error(`   Sending error to client: ${errorMessage}`);

            sendProgress({
              type: "error",
              error: errorMessage,
            });
            controller.close();
          }
        } finally {
          // Cleanup uploaded files
          console.log(
            `🧹 Starting cleanup of ${fileKeys.length} uploaded files...`
          );
          let cleanupSuccessCount = 0;
          let cleanupFailCount = 0;

          for (const fileKey of fileKeys) {
            try {
              await deleteFileFromSpaces(fileKey);
              cleanupSuccessCount++;
              console.log(`   ✅ Cleaned up: ${fileKey}`);
            } catch (cleanupError) {
              cleanupFailCount++;
              console.error(
                `   ❌ Failed to cleanup file ${fileKey}:`,
                cleanupError
              );
            }
          }

          console.log(
            `🧹 Cleanup complete: ${cleanupSuccessCount} successful, ${cleanupFailCount} failed`
          );
        }
      })();

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response (fallback)
    console.log("📦 Using non-streaming mode (fallback)");
    const allGroups = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      console.log(
        `📄 Processing file ${i + 1}/${uploadedFiles.length}: ${file.fileName}`
      );

      try {
        console.log(`⬇️ Downloading from Spaces: ${file.fileKey}`);
        const pdfBuffer = await downloadFileFromSpaces(file.fileKey);
        console.log(`✅ Downloaded ${pdfBuffer.length} bytes`);

        console.log(`🔍 Extracting data from ${file.fileName}...`);
        const extractedData = await extractArubaInvoiceData(
          pdfBuffer,
          file.fileName
        );
        console.log(`✅ Extracted ${extractedData.products.length} products`);

        console.log(`🤖 Enriching with AI...`);
        const enrichedFields = await processArubaInvoice(
          extractedData.products,
          extractedData.clientName,
          description
        );
        console.log(
          `✅ AI enrichment complete: ${enrichedFields.length} fields`
        );

        allGroups.push({
          clientName: extractedData.clientName,
          fields: enrichedFields,
        });
      } catch (error) {
        console.error(`❌ Error processing ${file.fileName}:`, error);
        if (error instanceof Error && error.stack) {
          console.error(`   Stack trace: ${error.stack}`);
        }
      }
    }

    console.log(
      `✅ Non-streaming processing complete: ${allGroups.length} groups`
    );

    // Cleanup uploaded files
    console.log(`🧹 Starting cleanup of ${fileKeys.length} files...`);
    let cleanupCount = 0;
    for (const fileKey of fileKeys) {
      try {
        await deleteFileFromSpaces(fileKey);
        cleanupCount++;
        console.log(`   ✅ Cleaned up: ${fileKey}`);
      } catch (cleanupError) {
        console.error(`   ❌ Failed to cleanup file ${fileKey}:`, cleanupError);
      }
    }
    console.log(
      `🧹 Cleanup complete: ${cleanupCount}/${fileKeys.length} files removed`
    );

    return new Response(
      JSON.stringify({
        groups: allGroups,
        totalGroups: allGroups.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Aruba Special API:", error);

    // Cleanup on error
    for (const fileKey of fileKeys) {
      try {
        await deleteFileFromSpaces(fileKey);
      } catch (cleanupError) {
        console.error(`Failed to cleanup file ${fileKey}:`, cleanupError);
      }
    }

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500 }
    );
  }
}
