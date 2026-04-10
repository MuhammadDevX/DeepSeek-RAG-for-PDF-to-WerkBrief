import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
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

// GET /api/admin/audit - List all activity across all users
export async function GET(req: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50")));
    const filterUserId = searchParams.get("userId") || null;
    const filterAction = searchParams.get("action") || "all";

    const werkbriefPrefix = filterUserId
      ? `werkbrief-history/${filterUserId}/`
      : "werkbrief-history/";
    const arubaPrefix = filterUserId
      ? `aruba-special-history/${filterUserId}/`
      : "aruba-special-history/";
    const adminAuditPrefix = "admin-audit-log/";

    const fetchList = async (prefix: string) => {
      const results: Array<{ Key?: string; LastModified?: Date; Size?: number }> = [];
      let continuationToken: string | undefined;

      do {
        const res = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: process.env.DO_SPACES_BUCKET,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          })
        );
        results.push(...(res.Contents || []));
        continuationToken = res.NextContinuationToken;
      } while (continuationToken);

      return results;
    };

    const promises: Promise<Array<{ Key?: string; LastModified?: Date; Size?: number }>>[] = [];
    if (filterAction !== "aruba" && filterAction !== "admin") promises.push(fetchList(werkbriefPrefix));
    else promises.push(Promise.resolve([]));

    if (filterAction !== "werkbrief" && filterAction !== "admin") promises.push(fetchList(arubaPrefix));
    else promises.push(Promise.resolve([]));

    if (filterAction === "admin" || filterAction === "all") promises.push(fetchList(adminAuditPrefix));
    else promises.push(Promise.resolve([]));

    const [werkbriefItems, arubaItems, adminItems] = await Promise.all(promises);

    type RawItem = {
      type: "werkbrief" | "aruba" | "admin";
      userId: string;
      key: string;
      lastModified: Date;
      size: number;
    };

    const allItems: RawItem[] = [];

    for (const item of werkbriefItems) {
      if (!item.Key) continue;
      const parts = item.Key.split("/");
      if (parts.length < 3) continue;
      allItems.push({
        type: "werkbrief",
        userId: parts[1],
        key: item.Key,
        lastModified: item.LastModified!,
        size: item.Size || 0,
      });
    }

    for (const item of arubaItems) {
      if (!item.Key) continue;
      const parts = item.Key.split("/");
      if (parts.length < 3) continue;
      allItems.push({
        type: "aruba",
        userId: parts[1],
        key: item.Key,
        lastModified: item.LastModified!,
        size: item.Size || 0,
      });
    }

    for (const item of adminItems) {
      if (!item.Key) continue;
      // admin-audit-log/{adminUserId}/{timestamp}.json
      const parts = item.Key.split("/");
      if (parts.length < 3) continue;
      allItems.push({
        type: "admin",
        userId: parts[1],
        key: item.Key,
        lastModified: item.LastModified!,
        size: item.Size || 0,
      });
    }

    allItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    const total = allItems.length;
    const start = (page - 1) * limit;
    const pageItems = allItems.slice(start, start + limit);

    // Fetch Clerk user info for unique userIds on this page
    const pageUserIds = [...new Set(pageItems.map((i) => i.userId).filter(Boolean))];
    const client = await clerkClient();

    type UserInfo = {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };

    const userMap: Record<string, UserInfo> = {};

    await Promise.allSettled(
      pageUserIds.map(async (uid) => {
        try {
          const user = await client.users.getUser(uid);
          userMap[uid] = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email:
              user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
                ?.emailAddress || null,
          };
        } catch {
          userMap[uid] = { id: uid, firstName: "Unknown", lastName: "User", email: null };
        }
      })
    );

    const items = pageItems.map((item) => ({
      type: item.type,
      key: item.key,
      timestamp: item.lastModified.toISOString(),
      size: item.size,
      user: userMap[item.userId] || {
        id: item.userId,
        firstName: "Unknown",
        lastName: "User",
        email: null,
      },
    }));

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}

// POST /api/admin/audit - Log an admin action
export async function POST(req: NextRequest) {
  try {
    const { sessionClaims, userId } = await auth();
    if (sessionClaims?.metadata?.role !== "admin" || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetUserId, targetUserEmail, details } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const key = `admin-audit-log/${userId}/${timestamp}.json`;

    const logEntry = {
      adminUserId: userId,
      action,
      targetUserId: targetUserId || null,
      targetUserEmail: targetUserEmail || null,
      details: details || {},
      timestamp,
    };

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: JSON.stringify(logEntry, null, 2),
        ContentType: "application/json",
        Metadata: {
          "admin-user-id": userId,
          "action": action,
          "target-user-id": targetUserId || "",
          "created-at": timestamp,
        },
      })
    );

    return NextResponse.json({ success: true, key, timestamp });
  } catch (error) {
    console.error("Error logging admin action:", error);
    return NextResponse.json({ error: "Failed to log admin action" }, { status: 500 });
  }
}
