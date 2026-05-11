import React from 'react';

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label: string;
  icon?: React.ReactNode;
}

export function FilterChip({ active = false, label, icon, className = '', ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`
        focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 focus:ring-offset-surface-1
        ${
          active
            ? 'bg-brand/20 text-brand border border-brand/40'
            : 'bg-surface-1 text-text-2 border border-border hover:bg-surface-2 dark:bg-surface-2 dark:text-text-2 dark:border-white/5 dark:hover:bg-surface-3 dark:hover:text-text-1'
        }
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </button>
  );
}
