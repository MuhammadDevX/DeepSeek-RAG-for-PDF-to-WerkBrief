import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Crown, UserCog } from "lucide-react";
import { Suspense } from "react";
import { AdminContent } from "./_components/AdminContent";

export default async function AdminDashboard() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-zinc-100 dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <UserCog className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Manage users, monitor activity, and audit platform usage across your team
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
            <Crown className="h-4 w-4" />
            Admin Access Required
          </div>
        </div>

        {/* Main content with stats + tabs */}
        <Suspense fallback={<div className="text-center text-zinc-400 py-8">Loading...</div>}>
          <AdminContent />
        </Suspense>
      </div>
    </div>
  );
}
