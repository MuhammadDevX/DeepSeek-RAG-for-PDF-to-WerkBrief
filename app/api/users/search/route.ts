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
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.trim() === "") {
      return NextResponse.json({
        users: [],
        totalCount: 0,
        hasMore: false,
      });
    }

    // Search users using Clerk with pagination
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      query: query.trim(),
      limit: limit,
      offset: offset,
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

    // Calculate if there are more results
    const hasMore = usersResponse.totalCount > offset + users.length;

    return NextResponse.json({
      users,
      totalCount: usersResponse.totalCount,
      hasMore,
      currentOffset: offset,
      currentLimit: limit,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
