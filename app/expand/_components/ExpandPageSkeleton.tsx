import { Skeleton } from "@/components/ui/skeleton";

export function ExpandPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Skeleton className="h-10 w-80 mx-auto mb-4" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>

        {/* Upload zone card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 mb-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72" />
            <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 mt-2">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-40 rounded-lg mt-2" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        {/* Progress section placeholder */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mt-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-3 w-full rounded-full mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
