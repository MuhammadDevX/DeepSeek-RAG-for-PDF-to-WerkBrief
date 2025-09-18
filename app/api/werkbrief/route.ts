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

      const stream = new ReadableStream({
        start(ctrl) {
          controller = ctrl;
        },
      });

      // Function to send progress updates
      const sendProgress = (data: ProgressData) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Start processing in background
      (async () => {
        try {
          const object = await generateWerkbrief(
            description,
            pdfBuffer,
            sendProgress
          );

          // Send final result
          sendProgress({ type: "complete", data: object });
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "unknown error";
          sendProgress({ type: "error", error: errorMessage });
          controller.close();
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
