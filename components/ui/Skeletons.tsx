import React from 'react';
import { cn } from '@/src/lib/utils';

export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('app-card p-4 md:p-5', className)} dir="rtl">
      <div className="mb-4 h-7 w-44 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
