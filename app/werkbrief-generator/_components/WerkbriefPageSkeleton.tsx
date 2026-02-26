import { Skeleton } from "@/components/ui/skeleton";

export function WerkbriefPageSkeleton() {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-full mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 mt-1" />
      </div>

      {/* Upload card */}
      <div className="w-full max-w-2xl border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-36 rounded-lg mt-2" />
      </div>

      {/* Table header bar */}
      <div className="w-full flex items-center justify-between gap-3 mt-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-xl border border-gray-100">
        {/* Header row */}
        <div className="grid grid-cols-11 gap-2 px-3 py-3 bg-gray-50 border-b border-gray-100">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 6 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-11 gap-2 px-3 py-3 border-b border-gray-50 animate-pulse"
          >
            <Skeleton className="h-4 w-4 mx-auto rounded" />
            <Skeleton className="h-6 w-6 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-8 mx-auto rounded" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
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
