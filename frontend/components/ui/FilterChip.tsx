// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

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
      role="radio"
      aria-checked={active}
      className={`
        sv-chip focus:outline-none focus:ring-2 focus:ring-brand-light/40 focus:ring-offset-1 focus:ring-offset-bg
        ${
          active
            ? 'sv-chip-active'
            : 'hover:border-border-md hover:bg-surface-2 hover:text-text-1'
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
