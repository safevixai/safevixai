'use client';

import React from 'react';

export default function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border-md dark:border-white/5 bg-white dark:bg-white/5 p-6 animate-pulse ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-3 dark:bg-white/10" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface-3 dark:bg-white/10 rounded-full" />
          <div className="h-2 w-16 bg-surface-3 dark:bg-white/10 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full bg-surface-3 dark:bg-white/10 rounded-full" />
        <div className="h-2 w-[80%] bg-surface-3 dark:bg-white/10 rounded-full" />
      </div>
    </div>
  );
}
