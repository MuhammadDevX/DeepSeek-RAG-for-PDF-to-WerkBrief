import { NextRequest, NextResponse } from "next/server";
import { S3Client, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
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
    const { uploadId, fileKey, chunks } = await req.json();

    if (!uploadId || !fileKey || !chunks || !Array.isArray(chunks)) {
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

    // Sort chunks by index and format for S3
    interface ChunkData {
      chunkIndex: number;
      etag: string;
    }

    const sortedParts = (chunks as ChunkData[])
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((chunk) => ({
        ETag: chunk.etag,
        PartNumber: chunk.chunkIndex + 1, // S3 part numbers are 1-based
      }));

    // Complete the multipart upload
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uploadInfo.fileKey,
      UploadId: uploadInfo.s3UploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });

    const response = await s3Client.send(command);

    // Clean up session storage
    removeUploadSession(uploadId);

    const fileUrl = `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${uploadInfo.fileKey}`;

    return NextResponse.json({
      success: true,
      fileKey: uploadInfo.fileKey,
      fileUrl,
      location: response.Location,
    });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
