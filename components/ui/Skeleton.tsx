import React from 'react';
import { cn } from '@/src/lib/utils';

type SkeletonProps = {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

const radiusMap: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Lightweight skeleton loader (Tailwind) with subtle shimmer.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className, rounded = 'md' }) => {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-gray-200/70 dark:bg-gray-700/40',
        radiusMap[rounded],
        'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent before:animate-[shimmer_1.2s_infinite]',
        className,
      )}
    />
  );
};

export default Skeleton;
