import React from 'react';

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'standard' | 'feature' | 'terminal' | 'profile' | 'emergency';
  interactive?: boolean;
}

export const SurfaceCard = React.memo(function SurfaceCard({
  children,
  className = '',
  padding = 'md',
  variant = 'standard',
  interactive = false,
  ...props
}: SurfaceCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6',
  };

  const variantClasses = {
    standard: 'sv-card',
    feature: 'sv-card sv-card-feature',
    terminal: 'rounded-panel border border-border-warm bg-surface-1 shadow-card',
    profile: 'rounded-card border border-border bg-surface-2 shadow-card',
    emergency: 'sv-card-emergency',
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${interactive ? 'sv-card-interactive cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});
