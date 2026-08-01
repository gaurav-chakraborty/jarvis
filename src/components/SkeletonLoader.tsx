import React from 'react';

interface SkeletonLoaderProps {
  type: 'text' | 'box' | 'circle' | 'bar';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const Skeleton = React.memo(({ type, width = '100%', height = '20px', className = '' }: SkeletonLoaderProps) => {
  const baseClass = 'bg-gray-700 animate-pulse rounded';

  const getDimensions = () => {
    const w = typeof width === 'number' ? `${width}px` : width;
    const h = typeof height === 'number' ? `${height}px` : height;
    return { width: w, height: h };
  };

  const dims = getDimensions();

  switch (type) {
    case 'circle':
      return (
        <div
          className={`${baseClass} rounded-full ${className}`}
          style={{ width: dims.height, height: dims.height }}
        />
      );
    case 'box':
      return (
        <div
          className={`${baseClass} ${className}`}
          style={{ width: dims.width, height: dims.height }}
        />
      );
    case 'bar':
      return (
        <div
          className={`${baseClass} mb-2 ${className}`}
          style={{ width: dims.width, height: dims.height }}
        />
      );
    case 'text':
    default:
      return (
        <div
          className={`${baseClass} ${className}`}
          style={{ width: dims.width, height: dims.height }}
        />
      );
  }
});

Skeleton.displayName = 'Skeleton';

export const SkeletonLoader = React.memo(({ type, width, height, className, count = 1 }: SkeletonLoaderProps) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} type={type} width={width} height={height} className={className} />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export const PanelSkeleton = React.memo(() => (
  <div className="bg-gray-700 bg-opacity-30 rounded p-4 space-y-3">
    <Skeleton type="bar" width="40%" height="24px" />
    <Skeleton type="text" width="100%" height="16px" />
    <Skeleton type="text" width="90%" height="16px" />
    <Skeleton type="text" width="85%" height="16px" />
  </div>
));

PanelSkeleton.displayName = 'PanelSkeleton';

export const AnswerPanelSkeleton = React.memo(() => (
  <div className="bg-gray-700 bg-opacity-30 rounded p-4 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton type="bar" width="30%" height="20px" />
      <Skeleton type="circle" width="40px" height="40px" />
    </div>
    <Skeleton type="text" width="100%" height="16px" />
    <Skeleton type="text" width="100%" height="16px" />
    <Skeleton type="text" width="95%" height="16px" />
  </div>
));

AnswerPanelSkeleton.displayName = 'AnswerPanelSkeleton';
