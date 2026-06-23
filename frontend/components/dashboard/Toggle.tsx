// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import React, { memo } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  ariaLabel?: string;
}

const Toggle = memo(function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        aria-label={ariaLabel}
      />
      <div className="w-11 h-6 rounded-pill border border-border bg-surface-3 transition-all peer peer-focus:ring-2 peer-focus:ring-brand-light/40 peer-checked:bg-brand after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-card after:transition-all peer-checked:after:translate-x-5"></div>
    </label>
  );
});

export default Toggle;
