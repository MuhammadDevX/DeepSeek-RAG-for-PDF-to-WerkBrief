"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  rows?: number;
}

export const LoadingSkeleton = React.memo(
  ({ rows = 3 }: LoadingSkeletonProps) => {
    return (
      <>
        {Array.from({ length: rows }, (_, index) => (
          <tr key={`loading-${index}`} className="animate-pulse">
            <td className="px-2 py-3 text-center">
              <Skeleton className="w-4 h-4 mx-auto" />
            </td>
            <td className="px-2 py-3 text-center">
              <Skeleton className="w-6 h-6 mx-auto rounded-lg" />
            </td>
            <td className="px-2 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
            </td>
            <td className="px-3 py-3">
              <Skeleton className="h-16 rounded-lg" />
            </td>
            <td className="px-3 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-3 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-2 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-2 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-2 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-2 py-3">
              <Skeleton className="h-8 rounded-lg" />
            </td>
            <td className="px-2 py-3 text-center">
              <Skeleton className="w-12 h-6 mx-auto rounded-full" />
            </td>
          </tr>
        ))}
      </>
    );
  }
);

LoadingSkeleton.displayName = "LoadingSkeleton";
