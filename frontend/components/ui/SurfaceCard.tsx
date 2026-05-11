import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function SurfaceCard({
  children,
  className = '',
  padding = 'md',
  interactive = false,
  ...props
}: SurfaceCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        rounded-xl border border-slate-200 bg-white
        dark:border-white/10 dark:bg-surface-2
        ${interactive ? 'transition-all hover:border-brand/30 dark:hover:border-white/20 dark:hover:bg-surface-3 cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
