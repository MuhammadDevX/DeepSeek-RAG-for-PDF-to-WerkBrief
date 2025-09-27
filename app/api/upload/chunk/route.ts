import { NextRequest, NextResponse } from "next/server";
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getUploadSession } from "@/lib/upload-session";

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
    const formData = await req.formData();
    const chunk = formData.get("chunk") as File;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const fileName = formData.get("fileName") as string;
    const uploadId = formData.get("uploadId") as string;

    if (!chunk || chunkIndex === undefined || !fileName || !uploadId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get upload info from shared session storage
    const uploadInfo = getUploadSession(uploadId);
    if (!uploadInfo) {
      return NextResponse.json(
        { error: "Upload session not found" },
        { status: 404 }
      );
    }

    // Convert chunk to buffer
    const buffer = Buffer.from(await chunk.arrayBuffer());

    // Upload part to S3
    const command = new UploadPartCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uploadInfo.fileKey,
      UploadId: uploadInfo.s3UploadId,
      PartNumber: chunkIndex + 1, // S3 part numbers are 1-based
      Body: buffer,
    });

    const response = await s3Client.send(command);

    return NextResponse.json({
      success: true,
      chunkIndex,
      etag: response.ETag,
    });
  } catch (error) {
    console.error("Error uploading chunk:", error);
    return NextResponse.json(
      { error: "Failed to upload chunk" },
      { status: 500 }
    );
  }
}
