import { NextRequest, NextResponse } from "next/server";
import { S3Client, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getUploadSession, removeUploadSession } from "@/lib/upload-session";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json();

    if (!uploadId) {
      return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
    }

    // Get upload info from shared session storage
    const uploadInfo = getUploadSession(uploadId);
    if (!uploadInfo) {
      // If not found, consider it already cleaned up
      return NextResponse.json({ success: true });
    }

    // Abort the multipart upload
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uploadInfo.fileKey,
      UploadId: uploadInfo.s3UploadId,
    });

    await s3Client.send(command);

    // Clean up session storage
    removeUploadSession(uploadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error aborting multipart upload:", error);
    // Don't return error - cleanup should be best effort
    return NextResponse.json({ success: true });
  }
}
