import { NextRequest } from "next/server";

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

export async function POST(req: NextRequest) {
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
    if (pdfFile && pdfFile.size > 0) {
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
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error("Error sending progress:", error);
          isControllerClosed = true;
        }
      };

      // Start processing in background
      (async () => {
        try {
          const object = await generateWerkbrief(
            description,
            pdfBuffer,
            sendProgress
          );

          // Send final result only if controller is still active
          if (!isControllerClosed) {
            sendProgress({ type: "complete", data: object });
            isControllerClosed = true;
            controller.close();
          }
        } catch (error) {
          if (!isControllerClosed) {
            const errorMessage =
              error instanceof Error ? error.message : "unknown error";
            sendProgress({ type: "error", error: errorMessage });
            isControllerClosed = true;
            controller.close();
          }
        }
      })();

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming mode (backwards compatibility)
      const object = await generateWerkbrief(description, pdfBuffer);
      console.log("Object is ", object);
      return new Response(JSON.stringify(object), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
