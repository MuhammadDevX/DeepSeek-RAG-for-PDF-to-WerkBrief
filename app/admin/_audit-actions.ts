"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  S3Client,
  ListObjectsV2Command,
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface AuditItem {
  type: "werkbrief" | "aruba" | "admin";
  key: string;
  timestamp: string;
  size: number;
  user: AuditUser;
}

export interface AuditLogResult {
  success: boolean;
  error?: string;
  items: AuditItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DayData {
  date: string;
  werkbrief: number;
  aruba: number;
  total: number;
}

export interface AdminStats {
  totalUsers: number;
  activeThisWeek: number;
  totalWerkbriefs: number;
  totalAruba: number;
  totalActivity: number;
  werkbriefsThisMonth: number;
  arubaThisMonth: number;
  dailyActivity: DayData[];
}

export interface StatsResult {
  success: boolean;
  error?: string;
  stats?: AdminStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAllKeys(prefix: string) {
  const results: Array<{ Key?: string; LastModified?: Date; Size?: number }> = [];
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
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function getAuditLog(params: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
}): Promise<AuditLogResult> {
  try {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return { success: false, error: "Unauthorized", items: [], total: 0, page: 1, limit: 25, totalPages: 0 };
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(10, params.limit ?? 25));
    const filterAction = params.action ?? "all";
    const filterUserId = params.userId ?? null;

    const werkbriefPrefix = filterUserId
      ? `werkbrief-history/${filterUserId}/`
      : "werkbrief-history/";
    const arubaPrefix = filterUserId
      ? `aruba-special-history/${filterUserId}/`
      : "aruba-special-history/";

    const [werkbriefItems, arubaItems, adminItems] = await Promise.all([
      filterAction !== "aruba" && filterAction !== "admin"
        ? fetchAllKeys(werkbriefPrefix)
        : Promise.resolve([]),
      filterAction !== "werkbrief" && filterAction !== "admin"
        ? fetchAllKeys(arubaPrefix)
        : Promise.resolve([]),
      filterAction === "admin" || filterAction === "all"
        ? fetchAllKeys("admin-audit-log/")
        : Promise.resolve([]),
    ]);

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
      allItems.push({ type: "werkbrief", userId: parts[1], key: item.Key, lastModified: item.LastModified!, size: item.Size || 0 });
    }
    for (const item of arubaItems) {
      if (!item.Key) continue;
      const parts = item.Key.split("/");
      if (parts.length < 3) continue;
      allItems.push({ type: "aruba", userId: parts[1], key: item.Key, lastModified: item.LastModified!, size: item.Size || 0 });
    }
    for (const item of adminItems) {
      if (!item.Key) continue;
      const parts = item.Key.split("/");
      if (parts.length < 3) continue;
      allItems.push({ type: "admin", userId: parts[1], key: item.Key, lastModified: item.LastModified!, size: item.Size || 0 });
    }

    allItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    const total = allItems.length;
    const pageItems = allItems.slice((page - 1) * limit, page * limit);

    // Fetch Clerk user info for unique userIds on this page only
    const pageUserIds = [...new Set(pageItems.map((i) => i.userId).filter(Boolean))];
    const client = await clerkClient();
    const userMap: Record<string, AuditUser> = {};

    await Promise.allSettled(
      pageUserIds.map(async (uid) => {
        try {
          const user = await client.users.getUser(uid);
          userMap[uid] = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || null,
          };
        } catch {
          userMap[uid] = { id: uid, firstName: "Unknown", lastName: "User", email: null };
        }
      })
    );

    const items: AuditItem[] = pageItems.map((item) => ({
      type: item.type,
      key: item.key,
      timestamp: item.lastModified.toISOString(),
      size: item.size,
      user: userMap[item.userId] || { id: item.userId, firstName: "Unknown", lastName: "User", email: null },
    }));

    return { success: true, items, total, page, limit, totalPages: Math.ceil(total / limit) };
  } catch {
    return { success: false, error: "Failed to fetch audit log", items: [], total: 0, page: 1, limit: 25, totalPages: 0 };
  }
}

export async function getAdminStats(): Promise<StatsResult> {
  try {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const client = await clerkClient();

    const [totalUsersRes, wItems, aItems] = await Promise.all([
      client.users.getUserList({ limit: 1 }),
      fetchAllKeys("werkbrief-history/"),
      fetchAllKeys("aruba-special-history/"),
    ]);

    const allItems = [...wItems, ...aItems];

    const weeklyActiveUserIds = new Set(
      allItems
        .filter((i) => i.LastModified && i.LastModified >= oneWeekAgo)
        .map((i) => i.Key?.split("/")[1])
        .filter(Boolean)
    );

    // Build last-7-days daily breakdown
    const dailyCounts: Record<string, { werkbrief: number; aruba: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyCounts[label] = { werkbrief: 0, aruba: 0 };
    }
    for (const item of wItems) {
      if (!item.LastModified || item.LastModified < oneWeekAgo) continue;
      const label = item.LastModified.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dailyCounts[label]) dailyCounts[label].werkbrief++;
    }
    for (const item of aItems) {
      if (!item.LastModified || item.LastModified < oneWeekAgo) continue;
      const label = item.LastModified.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dailyCounts[label]) dailyCounts[label].aruba++;
    }

    const dailyActivity: DayData[] = Object.entries(dailyCounts).map(([date, counts]) => ({
      date,
      werkbrief: counts.werkbrief,
      aruba: counts.aruba,
      total: counts.werkbrief + counts.aruba,
    }));

    return {
      success: true,
      stats: {
        totalUsers: totalUsersRes.totalCount,
        activeThisWeek: weeklyActiveUserIds.size,
        totalWerkbriefs: wItems.length,
        totalAruba: aItems.length,
        totalActivity: wItems.length + aItems.length,
        werkbriefsThisMonth: wItems.filter((i) => i.LastModified && i.LastModified >= oneMonthAgo).length,
        arubaThisMonth: aItems.filter((i) => i.LastModified && i.LastModified >= oneMonthAgo).length,
        dailyActivity,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch stats" };
  }
}
