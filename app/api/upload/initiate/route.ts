import { NextRequest, NextResponse } from "next/server";
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { storeUploadSession } from "@/lib/upload-session";

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
    const { fileName, fileType, fileSize, uploadId } = await req.json();

    // Validate file type (only allow PDFs for security)
    if (!fileType || !fileType.includes("pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (e.g., max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum 100MB allowed." },
        { status: 400 }
      );
    }

    // Generate unique file key
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `uploads/${uuidv4()}.${fileExtension}`;

    // Initiate multipart upload
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uniqueFileName,
      ContentType: fileType,
      Metadata: {
        "original-name": fileName,
        "upload-timestamp": new Date().toISOString(),
        "upload-id": uploadId,
      },
    });

    const response = await s3Client.send(command);

    // Store upload info for chunk uploads
    if (response.UploadId) {
      storeUploadSession(uploadId, uniqueFileName, response.UploadId);
    }

    return NextResponse.json({
      uploadId: response.UploadId,
      fileKey: uniqueFileName,
    });
  } catch (error) {
    console.error("Error initiating multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to initiate upload" },
      { status: 500 }
    );
  }
}
