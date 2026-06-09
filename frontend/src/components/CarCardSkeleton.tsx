export default function CarCardSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 overflow-hidden">
      {/* Image skeleton */}
      <div className="aspect-[16/10] skeleton-shimmer" />

      {/* Content skeleton */}
      <div className="p-4 flex-1 flex flex-col space-y-3">
        <div className="h-4 skeleton-shimmer rounded-md w-4/5" />
        <div className="flex gap-1.5">
          <div className="h-5 skeleton-shimmer rounded-md w-14" />
          <div className="h-5 skeleton-shimmer rounded-md w-20" />
          <div className="h-5 skeleton-shimmer rounded-md w-16" />
        </div>
        <div className="h-3 skeleton-shimmer rounded-md w-1/3 mt-auto" />
      </div>
    </div>
  );
}
