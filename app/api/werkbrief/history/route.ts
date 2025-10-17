import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

// Save werkbrief to history
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { werkbrief, metadata } = await req.json();

    if (!werkbrief) {
      return NextResponse.json(
        { error: "Werkbrief data is required" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const historyKey = `werkbrief-history/${userId}/${timestamp}.json`;

    const historyData = {
      werkbrief,
      metadata: {
        ...metadata,
        userId,
        createdAt: timestamp,
      },
    };

    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: historyKey,
      Body: JSON.stringify(historyData, null, 2),
      ContentType: "application/json",
      Metadata: {
        "user-id": userId,
        "created-at": timestamp,
        "item-count": String(werkbrief.fields?.length || 0),
      },
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      historyKey,
      timestamp,
    });
  } catch (error) {
    console.error("Error saving werkbrief to history:", error);
    return NextResponse.json(
      { error: "Failed to save werkbrief to history" },
      { status: 500 }
    );
  }
}

// Get werkbrief history for user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefix = `werkbrief-history/${userId}/`;

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.DO_SPACES_BUCKET,
      Prefix: prefix,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json({
        success: true,
        history: [],
      });
    }

    // Sort by last modified date (newest first)
    const sortedContents = listResponse.Contents.sort((a, b) => {
      const dateA = a.LastModified?.getTime() || 0;
      const dateB = b.LastModified?.getTime() || 0;
      return dateB - dateA;
    });

    // Get metadata for each history item
    const historyItems = sortedContents.map((item) => ({
      key: item.Key!,
      lastModified: item.LastModified!.toISOString(),
      size: item.Size!,
      timestamp: item.Key!.split("/").pop()?.replace(".json", "") || "",
    }));

    return NextResponse.json({
      success: true,
      history: historyItems,
    });
  } catch (error) {
    console.error("Error fetching werkbrief history:", error);
    return NextResponse.json(
      { error: "Failed to fetch werkbrief history" },
      { status: 500 }
    );
  }
}

// Get specific werkbrief from history
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { historyKey } = await req.json();

    if (!historyKey || !historyKey.startsWith(`werkbrief-history/${userId}/`)) {
      return NextResponse.json(
        { error: "Invalid history key" },
        { status: 400 }
      );
    }

    const getCommand = new GetObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: historyKey,
    });

    const response = await s3Client.send(getCommand);
    const bodyString = await response.Body?.transformToString();

    if (!bodyString) {
      return NextResponse.json(
        { error: "Failed to read werkbrief data" },
        { status: 500 }
      );
    }

    const historyData = JSON.parse(bodyString);

    return NextResponse.json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    console.error("Error fetching specific werkbrief:", error);
    return NextResponse.json(
      { error: "Failed to fetch werkbrief" },
      { status: 500 }
    );
  }
}
