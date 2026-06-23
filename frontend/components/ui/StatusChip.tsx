// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

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
    success: 'bg-brand-dim text-brand-light border-border-green',
    warning: 'bg-warning-dim text-text-amber border-warning/25',
    error: 'bg-emergency-dim text-text-red border-border-red',
    info: 'bg-surface-3 text-text-2 border-border-md',
    neutral: 'bg-surface-2 text-text-3 border-border',
  };

  const sizes = {
    sm: 'text-micro px-2 py-0.5',
    md: 'text-caption px-2.5 py-1',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-sm border font-semibold uppercase ${styles[status]} ${sizes[size]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </div>
  );
}
