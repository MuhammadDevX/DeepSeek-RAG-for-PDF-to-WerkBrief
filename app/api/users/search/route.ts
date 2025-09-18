import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin role
    const { sessionClaims } = await auth();

    if (sessionClaims?.metadata?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get search query from URL parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || query.trim() === "") {
      return NextResponse.json({ users: [] });
    }

    // Search users using Clerk
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      query: query.trim(),
    });

    // Format users data to match what the client expects
    const users = usersResponse.data.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses.map((email) => ({
        id: email.id,
        emailAddress: email.emailAddress,
      })),
      primaryEmailAddressId: user.primaryEmailAddressId,
      publicMetadata: user.publicMetadata,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
