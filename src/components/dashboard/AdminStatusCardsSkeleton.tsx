import { Skeleton } from '@/components/ui/skeleton';

export function AdminStatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i}
          className="bg-card dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
