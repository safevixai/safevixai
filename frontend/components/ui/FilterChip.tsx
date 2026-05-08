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
        inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors
        focus:outline-none focus:ring-2 focus:ring-[#1A5C38] focus:ring-offset-1 focus:ring-offset-[#0A0E14]
        ${
          active
            ? 'bg-[#1A5C38]/20 text-[#00C896] border border-[#1A5C38]/40'
            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-[#111520] dark:text-slate-400 dark:border-white/5 dark:hover:bg-[#181D2A] dark:hover:text-slate-300'
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
