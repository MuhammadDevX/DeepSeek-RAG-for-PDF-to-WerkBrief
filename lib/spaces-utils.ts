import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

export async function downloadFileFromSpaces(fileKey: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: fileKey,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("No file content received");
    }

    // Convert the stream to buffer
    const chunks: Uint8Array[] = [];

    if (response.Body && "getReader" in response.Body) {
      const reader = (response.Body as ReadableStream).getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } else {
      // Fallback for Node.js streams
      const stream = response.Body as NodeJS.ReadableStream;
      for await (const chunk of stream) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("Error downloading file from Spaces:", error);
    throw new Error("Failed to download file from storage");
  }
}

export async function deleteFileFromSpaces(fileKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: fileKey,
    });

    await s3Client.send(command);
    console.log(`File deleted from Spaces: ${fileKey}`);
  } catch (error) {
    console.error("Error deleting file from Spaces:", error);
    // Don't throw here - deletion failure shouldn't break the main process
  }
}
