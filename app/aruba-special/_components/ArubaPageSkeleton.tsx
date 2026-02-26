import { Skeleton } from "@/components/ui/skeleton";

export function ArubaPageSkeleton() {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-full mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-80 mt-1" />
      </div>

      {/* Multi-file upload area */}
      <div className="w-full max-w-2xl border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <Skeleton className="w-12 h-12 rounded-lg" />
          <Skeleton className="w-12 h-12 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-40 rounded-lg mt-2" />
      </div>

      {/* Table header bar */}
      <div className="w-full flex items-center justify-between gap-3 mt-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table placeholder with group headers */}
      <div className="w-full overflow-hidden rounded-xl border border-gray-100">
        {/* Group 1 header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <Skeleton className="h-5 w-48" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-9 gap-2 px-3 py-3 border-b border-gray-50 animate-pulse"
          >
            <Skeleton className="h-4 w-4 mx-auto rounded" />
            <Skeleton className="h-14 col-span-2 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-6 w-12 mx-auto rounded-full" />
          </div>
        ))}

        {/* Group 2 header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-9 gap-2 px-3 py-3 border-b border-gray-50 animate-pulse"
          >
            <Skeleton className="h-4 w-4 mx-auto rounded" />
            <Skeleton className="h-14 col-span-2 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-6 w-12 mx-auto rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
