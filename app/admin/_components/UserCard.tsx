"use client";

import { useState } from "react";
import { Crown, Shield, User, Mail, Loader2, Check, X } from "lucide-react";
import { setRole, removeRole } from "../_actions";

interface UserCardProps {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    emailAddresses: Array<{
      id: string;
      emailAddress: string;
    }>;
    primaryEmailAddressId: string | null;
    publicMetadata: {
      role?: string;
    };
  };
}

export const UserCard = ({ user }: UserCardProps) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const email = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  )?.emailAddress;
  const userRole = (user.publicMetadata.role as string) || "none";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "moderator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
    }
  };

  const handleRoleChange = async (action: "admin" | "moderator" | "remove") => {
    setLoadingAction(action);
    setLastAction(null);

    try {
      let result;
      if (action === "remove") {
        const formData = new FormData();
        formData.append("id", user.id);
        result = await removeRole(formData);
      } else {
        const formData = new FormData();
        formData.append("id", user.id);
        formData.append("role", action);
        result = await setRole(formData);
      }

      if (result.message === "Not Authorized") {
        setLastAction({
          type: "error",
          message: "Not authorized to perform this action",
        });
      } else {
        setLastAction({
          type: "success",
          message: `Role ${
            action === "remove" ? "removed" : "updated"
          } successfully`,
        });
        // Refresh the page after a short delay to show the updated role
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch {
      setLastAction({
        type: "error",
        message: "Failed to update role. Please try again.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
      {/* User Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user.firstName?.charAt(0) || user.lastName?.charAt(0) || "U"}
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {user.firstName} {user.lastName}
              </h4>
              <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{email}</span>
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${getRoleBadgeColor(
              userRole
            )}`}
          >
            {getRoleIcon(userRole)}
            <span className="capitalize">{userRole}</span>
          </div>
        </div>

        {/* Feedback Message */}
        {lastAction && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium animate-in slide-in-from-top duration-300 ${
              lastAction.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30"
            }`}
          >
            {lastAction.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {lastAction.message}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-700">
          <button
            onClick={() => handleRoleChange("admin")}
            disabled={userRole === "admin" || loadingAction !== null}
            className="w-full px-4 py-3 text-sm font-medium rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 disabled:from-zinc-300 disabled:to-zinc-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {loadingAction === "admin" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            {loadingAction === "admin"
              ? "Updating..."
              : userRole === "admin"
              ? "Current Admin"
              : "Make Admin"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRoleChange("moderator")}
              disabled={userRole === "moderator" || loadingAction !== null}
              className="w-full px-3 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:from-zinc-300 disabled:to-zinc-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
            >
              {loadingAction === "moderator" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Shield className="h-3 w-3" />
              )}
              {loadingAction === "moderator"
                ? "Updating..."
                : userRole === "moderator"
                ? "Current"
                : "Moderator"}
            </button>

            <button
              onClick={() => handleRoleChange("remove")}
              disabled={userRole === "none" || loadingAction !== null}
              className="w-full px-3 py-2.5 text-sm font-medium rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-100 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1 shadow-md hover:shadow-lg"
            >
              {loadingAction === "remove" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {loadingAction === "remove"
                ? "Removing..."
                : userRole === "none"
                ? "No Role"
                : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
