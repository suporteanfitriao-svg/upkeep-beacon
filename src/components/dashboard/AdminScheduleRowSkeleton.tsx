import { Skeleton } from '@/components/ui/skeleton';

export function AdminScheduleRowSkeleton() {
  return (
    <div className="bg-card dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        {/* Left status bar skeleton */}
        <div className="w-1 bg-muted" />
        
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left section */}
            <div className="flex items-start gap-4 flex-1">
              {/* Property image skeleton */}
              <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
              
              {/* Property info */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-56 mb-3" />
                
                {/* Status badges */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Center section - times */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Skeleton className="h-3 w-12 mb-1 mx-auto" />
                <Skeleton className="h-6 w-14 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-3 w-12 mb-1 mx-auto" />
                <Skeleton className="h-6 w-14 mx-auto" />
              </div>
            </div>
            
            {/* Right section - cleaner */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Skeleton className="h-3 w-16 mb-1 ml-auto" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
            
            {/* Action button */}
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminScheduleRowSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <AdminScheduleRowSkeleton key={i} />
      ))}
    </div>
  );
}
