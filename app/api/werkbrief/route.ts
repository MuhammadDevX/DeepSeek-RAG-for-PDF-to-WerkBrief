import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";
import { generateWerkbrief } from "@/lib/ai/agent";

interface ProgressData {
  type: "progress" | "complete" | "error";
  totalDocuments?: number;
  processedDocuments?: number;
  totalProducts?: number;
  processedProducts?: number;
  currentStep?: string;
  data?: unknown;
  error?: string;
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | undefined;

  try {
    const formData = await req.formData();
    const description = formData.get("description") as string;
    const pdfFile = formData.get("pdf") as File | null;
    const streaming = formData.get("streaming") === "true";

    if (!description) {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400 }
      );
    }

    let pdfBuffer: Buffer | undefined;

    // Handle PDF file - save to temporary file and create buffer
    if (pdfFile && pdfFile.size > 0) {
      // Save PDF to temporary file
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `temp_${Date.now()}_${pdfFile.name}`);
      const stream = fs.createWriteStream(tempFilePath);

      const reader = pdfFile.stream().getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stream.write(value);
        }
      } finally {
        stream.end();
      }

      // Also create buffer for existing functionality
      const arrayBuffer = await pdfFile.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    }

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
      const sendProgress = (data: ProgressData) => {
        if (isControllerClosed) {
          console.warn(
            "Attempted to send progress after controller was closed"
          );
          return;
        }

        try {
          // Ensure data is properly serializable
          const sanitizedData = JSON.parse(JSON.stringify(data));
          const jsonString = JSON.stringify(sanitizedData);

          // Validate that the JSON is complete and well-formed
          JSON.parse(jsonString); // This will throw if invalid

          const message = `data: ${jsonString}\n\n`;
          controller.enqueue(encoder.encode(message));

          console.log(
            `Sent progress: ${data.type}${
              data.currentStep ? ` - ${data.currentStep}` : ""
            }`
          );
        } catch (error) {
          console.error("Error sending progress:", error);
          // Don't close controller here, just log the error
          // Send an error message instead
          try {
            const errorMessage = `data: ${JSON.stringify({
              type: "error",
              error: "Failed to serialize progress data",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorMessage));
          } catch (fallbackError) {
            console.error("Even fallback error message failed:", fallbackError);
            isControllerClosed = true;
          }
        }
      };

      // Start processing in background with timeout
      const timeoutId = setTimeout(() => {
        if (!isControllerClosed) {
          console.warn("Stream timeout reached, closing connection");
          sendProgress({
            type: "error",
            error: "Request timeout - processing took too long",
          });
          isControllerClosed = true;
          controller.close();
        }
      }, 5 * 60 * 1000); // 5 minute timeout

      (async () => {
        try {
          const object = await generateWerkbrief(
            description,
            pdfBuffer,
            sendProgress
          );

          clearTimeout(timeoutId); // Clear timeout on success

          // Send final result only if controller is still active
          if (!isControllerClosed) {
            // Ensure the result is serializable
            const sanitizedObject = JSON.parse(JSON.stringify(object));
            sendProgress({ type: "complete", data: sanitizedObject });
            isControllerClosed = true;
            controller.close();
          }
        } catch (error) {
          clearTimeout(timeoutId); // Clear timeout on error

          if (!isControllerClosed) {
            const errorMessage =
              error instanceof Error ? error.message : "unknown error";
            console.error("Werkbrief generation error:", errorMessage);
            sendProgress({ type: "error", error: errorMessage });
            isControllerClosed = true;
            controller.close();
          }
        } finally {
          // Clean up temporary file
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
              console.log(`Temporary file deleted: ${tempFilePath}`);
            } catch (cleanupError) {
              console.error(
                `Failed to delete temporary file: ${tempFilePath}`,
                cleanupError
              );
            }
          }
        }
      })();

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          // Prevent buffering in some production environments
          "X-Accel-Buffering": "no",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } else {
      // Non-streaming mode (backwards compatibility)
      try {
        const object = await generateWerkbrief(description, pdfBuffer);
        console.log("Object is ", object);
        return new Response(JSON.stringify(object), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`Temporary file deleted: ${tempFilePath}`);
          } catch (cleanupError) {
            console.error(
              `Failed to delete temporary file: ${tempFilePath}`,
              cleanupError
            );
          }
        }
      }
    }
  } catch (error: unknown) {
    console.error(error);

    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Temporary file deleted after error: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(
          `Failed to delete temporary file after error: ${tempFilePath}`,
          cleanupError
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
