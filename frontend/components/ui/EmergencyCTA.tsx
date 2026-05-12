import React from 'react';

interface EmergencyCTAProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function EmergencyCTA({ title, subtitle, icon, className = '', ...props }: EmergencyCTAProps) {
  return (
    <button
      type="button"
      className={`
        relative w-full overflow-hidden rounded-xl bg-emergency p-4 text-left text-white shadow-lg
        transition-transform active:scale-[0.98]
        hover:bg-emergency-dark focus:outline-none focus:ring-2 focus:ring-emergency focus:ring-offset-2 focus:ring-offset-bg
        ${className}
      `}
      {...props}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-mono text-lg font-bold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm font-medium text-white/80">{subtitle}</p>}
          </div>
        </div>
      </div>
    </button>
  );
}
