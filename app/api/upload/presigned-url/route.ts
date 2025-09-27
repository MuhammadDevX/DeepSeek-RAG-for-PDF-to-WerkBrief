import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
});

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await req.json();

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

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uniqueFileName,
      ContentType: fileType,
      // Add metadata
      Metadata: {
        "original-name": fileName,
        "upload-timestamp": new Date().toISOString(),
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600, // URL expires in 10 minutes
    });

    // Return both the presigned URL and the file key
    return NextResponse.json({
      presignedUrl,
      fileKey: uniqueFileName,
      fileUrl: `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${uniqueFileName}`,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
