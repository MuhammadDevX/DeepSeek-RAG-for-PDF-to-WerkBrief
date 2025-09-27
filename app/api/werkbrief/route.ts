import { NextRequest } from "next/server";
import { generateWerkbrief } from "@/lib/ai/agent";
import {
  downloadFileFromSpaces,
  deleteFileFromSpaces,
} from "@/lib/spaces-utils";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  let fileKey: string | undefined;

  try {
    const contentType = req.headers.get("content-type") || "";
    console.log("Request content-type:", contentType);

    // Only accept JSON requests now (Spaces upload method)
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({
          error:
            "This endpoint now requires JSON format. Please use the new Spaces upload method instead of direct file upload.",
        }),
        { status: 400 }
      );
    }

    let description: string;
    let uploadedFileKey: string | undefined;
    let streaming: boolean = false;
    let pdfBuffer: Buffer | undefined;

    // Parse JSON request body
    try {
      const body = await req.json();
      description = body.description;
      uploadedFileKey = body.fileKey;
      streaming = body.streaming || false;
    } catch (jsonError) {
      console.error("Failed to parse JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
        status: 400,
      });
    }

    if (!description) {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400 }
      );
    }

    // Handle PDF file - download from Spaces if file key is provided
    if (uploadedFileKey) {
      fileKey = uploadedFileKey;
      try {
        console.log(`Downloading file from Spaces: ${fileKey}`);
        pdfBuffer = await downloadFileFromSpaces(fileKey);
        console.log(
          `Successfully downloaded file, size: ${pdfBuffer.length} bytes`
        );
      } catch (error) {
        console.error("Failed to download file from Spaces:", error);
        return new Response(
          JSON.stringify({ error: "Failed to download uploaded file" }),
          { status: 400 }
        );
      }
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
          // Clean up file from Spaces
          if (fileKey) {
            await deleteFileFromSpaces(fileKey);
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
        // Clean up file from Spaces
        if (fileKey) {
          await deleteFileFromSpaces(fileKey);
        }
      }
    }
  } catch (error: unknown) {
    console.error(error);

    // Clean up file from Spaces in case of error
    if (fileKey) {
      await deleteFileFromSpaces(fileKey);
    }

    const errorMessage =
      error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
