"use server";

import { checkRole } from "@/utils/roles";
import { clerkClient } from "@clerk/nextjs/server";

export async function setRole(formData: FormData) {
  const client = await clerkClient();

  // Check that the user trying to set the role is an admin
  if (!checkRole("admin")) {
    return { message: "Not Authorized" };
  }

  try {
    const res = await client.users.updateUserMetadata(
      formData.get("id") as string,
      {
        publicMetadata: { role: formData.get("role") },
      }
    );
    return { message: res.publicMetadata };
  } catch (err) {
    return { message: err };
  }
}

export async function removeRole(formData: FormData) {
  const client = await clerkClient();

  try {
    const res = await client.users.updateUserMetadata(
      formData.get("id") as string,
      {
        publicMetadata: { role: null },
      }
    );
    return { message: res.publicMetadata };
  } catch (err) {
    return { message: err };
  }
}

export async function banUser(formData: FormData) {
  // Check that the user trying to ban is an admin
  if (!checkRole("admin")) {
    return { success: false, message: "Not Authorized" };
  }

  try {
    const userId = formData.get("id") as string;

    const client = await clerkClient();
    await client.users.banUser(userId);

    return { success: true, message: "User banned successfully" };
  } catch (err) {
    console.error("Error banning user:", err);
    return { success: false, message: "Failed to ban user" };
  }
}

export async function unbanUser(formData: FormData) {
  // Check that the user trying to unban is an admin
  if (!checkRole("admin")) {
    return { success: false, message: "Not Authorized" };
  }

  try {
    const userId = formData.get("id") as string;

    const client = await clerkClient();
    await client.users.unbanUser(userId);

    return { success: true, message: "User unbanned successfully" };
  } catch (err) {
    console.error("Error unbanning user:", err);
    return { success: false, message: "Failed to unban user" };
  }
}
