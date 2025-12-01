import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isAdminOnlyRoute = createRouteMatcher(["/admin(.*)"]);
const isOperatorRoute = createRouteMatcher(["/aruba-special(.*)"]);
const isExpandRoute = createRouteMatcher(["/expand(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();

    const { sessionClaims } = await auth();
    const role = sessionClaims?.metadata?.role as string | undefined;

    // Admin-only routes (admin panel)
    if (isAdminOnlyRoute(req) && role !== "admin") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }

    // Operator routes (aruba-special/skyportal) - accessible by operator and admin
    if (isOperatorRoute(req) && role !== "admin" && role !== "operator") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }

    // Expand routes - accessible by admin only
    if (isExpandRoute(req) && role !== "admin") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
