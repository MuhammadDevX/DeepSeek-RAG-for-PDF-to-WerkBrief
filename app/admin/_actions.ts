"use server";

import { checkRole } from "@/utils/roles";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown>
) {
  try {
    const timestamp = new Date().toISOString();
    const key = `admin-audit-log/${adminUserId}/${timestamp}-${action}.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: JSON.stringify({ adminUserId, action, targetUserId, details, timestamp }, null, 2),
        ContentType: "application/json",
        Metadata: {
          "admin-user-id": adminUserId,
          action,
          "target-user-id": targetUserId,
          "created-at": timestamp,
        },
      })
    );
  } catch {
    // Non-fatal: audit log failure should not block the action
  }
}

export async function setRole(formData: FormData) {
  const client = await clerkClient();
  const { userId: adminUserId } = await auth();

  if (!checkRole("admin")) {
    return { message: "Not Authorized" };
  }

  try {
    const targetUserId = formData.get("id") as string;
    const role = formData.get("role") as string;

    const res = await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role },
    });

    if (adminUserId) {
      await logAdminAction(adminUserId, "set_role", targetUserId, { newRole: role });
    }

    return { message: res.publicMetadata };
  } catch (err) {
    return { message: err };
  }
}

export async function removeRole(formData: FormData) {
  const client = await clerkClient();
  const { userId: adminUserId } = await auth();

  if (!checkRole("admin")) {
    return { message: "Not Authorized" };
  }

  try {
    const targetUserId = formData.get("id") as string;

    const res = await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role: null },
    });

    if (adminUserId) {
      await logAdminAction(adminUserId, "remove_role", targetUserId, {});
    }

    return { message: res.publicMetadata };
  } catch (err) {
    return { message: err };
  }
}

export async function banUser(formData: FormData) {
  const { userId: adminUserId } = await auth();

  if (!checkRole("admin")) {
    return { success: false, message: "Not Authorized" };
  }

  try {
    const targetUserId = formData.get("id") as string;

    const client = await clerkClient();
    await client.users.banUser(targetUserId);

    if (adminUserId) {
      await logAdminAction(adminUserId, "ban_user", targetUserId, {});
    }

    return { success: true, message: "User banned successfully" };
  } catch (err) {
    console.error("Error banning user:", err);
    return { success: false, message: "Failed to ban user" };
  }
}

export async function unbanUser(formData: FormData) {
  const { userId: adminUserId } = await auth();

  if (!checkRole("admin")) {
    return { success: false, message: "Not Authorized" };
  }

  try {
    const targetUserId = formData.get("id") as string;

    const client = await clerkClient();
    await client.users.unbanUser(targetUserId);

    if (adminUserId) {
      await logAdminAction(adminUserId, "unban_user", targetUserId, {});
    }

    return { success: true, message: "User unbanned successfully" };
  } catch (err) {
    console.error("Error unbanning user:", err);
    return { success: false, message: "Failed to unban user" };
  }
}
