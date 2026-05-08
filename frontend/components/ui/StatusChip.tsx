import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusChipProps {
  status: StatusType;
  label: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function StatusChip({ status, label, icon, size = 'sm' }: StatusChipProps) {
  const styles = {
    success: 'bg-[#1A5C38]/10 text-[#00C896] border-[#1A5C38]/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-[#DC2626]/10 text-[#FF6B6B] border-[#DC2626]/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded border font-medium uppercase tracking-wider ${styles[status]} ${sizes[size]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </div>
  );
}
