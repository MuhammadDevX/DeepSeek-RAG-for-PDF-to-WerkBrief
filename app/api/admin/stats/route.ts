import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

export async function GET() {
  try {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const fetchAllKeys = async (prefix: string) => {
      const results: Array<{ Key?: string; LastModified?: Date }> = [];
      let token: string | undefined;
      do {
        const res = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: process.env.DO_SPACES_BUCKET,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: token,
          })
        );
        results.push(...(res.Contents || []));
        token = res.NextContinuationToken;
      } while (token);
      return results;
    };

    const client = await clerkClient();

    const [totalUsersRes, werkbriefItems, arubaItems] = await Promise.allSettled([
      client.users.getUserList({ limit: 1 }),
      fetchAllKeys("werkbrief-history/"),
      fetchAllKeys("aruba-special-history/"),
    ]);

    const totalUsers =
      totalUsersRes.status === "fulfilled" ? totalUsersRes.value.totalCount : 0;
    const wItems = werkbriefItems.status === "fulfilled" ? werkbriefItems.value : [];
    const aItems = arubaItems.status === "fulfilled" ? arubaItems.value : [];

    const allItems = [...wItems, ...aItems];

    // Active unique users this week
    const weeklyActiveUserIds = new Set(
      allItems
        .filter((i) => i.LastModified && i.LastModified >= oneWeekAgo)
        .map((i) => i.Key?.split("/")[1])
        .filter(Boolean)
    );

    // Per-day breakdown for the last 7 days
    const dailyCounts: Record<string, { werkbrief: number; aruba: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyCounts[label] = { werkbrief: 0, aruba: 0 };
    }

    for (const item of wItems) {
      if (!item.LastModified || item.LastModified < oneWeekAgo) continue;
      const label = item.LastModified.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (dailyCounts[label]) dailyCounts[label].werkbrief++;
    }

    for (const item of aItems) {
      if (!item.LastModified || item.LastModified < oneWeekAgo) continue;
      const label = item.LastModified.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (dailyCounts[label]) dailyCounts[label].aruba++;
    }

    const dailyActivity = Object.entries(dailyCounts).map(([date, counts]) => ({
      date,
      ...counts,
      total: counts.werkbrief + counts.aruba,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeThisWeek: weeklyActiveUserIds.size,
        totalWerkbriefs: wItems.length,
        totalAruba: aItems.length,
        totalActivity: wItems.length + aItems.length,
        werkbriefsThisMonth: wItems.filter(
          (i) => i.LastModified && i.LastModified >= oneMonthAgo
        ).length,
        arubaThisMonth: aItems.filter(
          (i) => i.LastModified && i.LastModified >= oneMonthAgo
        ).length,
        dailyActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
