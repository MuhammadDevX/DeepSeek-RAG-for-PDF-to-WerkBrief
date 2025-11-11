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

// Save aruba-special data to history (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await req.json();

    if (!data) {
      return NextResponse.json(
        { error: "Aruba data is required" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const historyKey = `aruba-special-history/${userId}/${timestamp}.json`;

    // Calculate metadata
    const totalFields =
      data.groups?.reduce(
        (sum: number, group: { fields: unknown[] }) =>
          sum + group.fields.length,
        0
      ) || 0;

    const totalBruto =
      data.groups?.reduce(
        (sum: number, group: { fields: Array<{ BRUTO?: number }> }) =>
          sum + group.fields.reduce((s, field) => s + (field.BRUTO || 0), 0),
        0
      ) || 0;

    const totalFOB =
      data.groups?.reduce(
        (sum: number, group: { fields: Array<{ FOB?: number }> }) =>
          sum + group.fields.reduce((s, field) => s + (field.FOB || 0), 0),
        0
      ) || 0;

    const historyData = {
      data,
      metadata: {
        userId,
        createdAt: timestamp,
        groupCount: data.groups?.length || 0,
        itemCount: totalFields,
        totalBruto,
        totalFOB,
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
        "item-count": String(totalFields),
        "group-count": String(data.groups?.length || 0),
      },
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      key: historyKey,
      timestamp,
    });
  } catch (error) {
    console.error("Error saving aruba data to history:", error);
    return NextResponse.json(
      { error: "Failed to save aruba data to history" },
      { status: 500 }
    );
  }
}

// Get aruba-special history for user (admin only)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefix = `aruba-special-history/${userId}/`;

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

    // Sort by last modified (newest first) and get metadata
    const historyItems = await Promise.all(
      listResponse.Contents.sort(
        (a, b) =>
          (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
      ).map(async (item) => {
        try {
          // Fetch the full object to get metadata
          const getCommand = new GetObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: item.Key,
          });

          const getResponse = await s3Client.send(getCommand);
          const bodyString = await getResponse.Body?.transformToString();
          const historyData = bodyString ? JSON.parse(bodyString) : null;

          return {
            key: item.Key,
            lastModified: item.LastModified?.toISOString(),
            size: item.Size,
            timestamp:
              historyData?.metadata?.createdAt ||
              item.LastModified?.toISOString(),
            metadata: historyData?.metadata || null,
          };
        } catch (error) {
          console.error(`Error fetching metadata for ${item.Key}:`, error);
          return {
            key: item.Key,
            lastModified: item.LastModified?.toISOString(),
            size: item.Size,
            timestamp: item.LastModified?.toISOString(),
            metadata: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      history: historyItems,
    });
  } catch (error) {
    console.error("Error fetching aruba history:", error);
    return NextResponse.json(
      { error: "Failed to fetch aruba history" },
      { status: 500 }
    );
  }
}

// Load specific aruba-special data from history
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { historyKey } = await req.json();

    if (!historyKey) {
      return NextResponse.json(
        { error: "History key is required" },
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
        { error: "Failed to read history data" },
        { status: 500 }
      );
    }

    const historyData = JSON.parse(bodyString);

    // Verify user owns this history item
    if (historyData.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to this history item" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: historyData.data,
      metadata: historyData.metadata,
    });
  } catch (error) {
    console.error("Error loading aruba history:", error);
    return NextResponse.json(
      { error: "Failed to load aruba history" },
      { status: 500 }
    );
  }
}
