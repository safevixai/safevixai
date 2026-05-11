import React from 'react';

interface TerminalHeaderProps {
  title: string;
  subtitle?: string;
  status?: 'online' | 'offline' | 'emergency';
  rightElement?: React.ReactNode;
}

export function TerminalHeader({
  title,
  subtitle,
  status = 'online',
  rightElement,
}: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 md:px-6 border-b border-border bg-surface-1 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold tracking-tight text-text-1 uppercase font-mono">
              {title}
            </h1>
            {status === 'online' && (
              <span className="flex h-2 w-2 rounded-full bg-brand-light animate-pulse" title="System Online" />
            )}
            {status === 'emergency' && (
              <span className="flex h-2 w-2 rounded-full bg-emergency animate-ping" title="Emergency Active" />
            )}
            {status === 'offline' && (
              <span className="flex h-2 w-2 rounded-full bg-text-3" title="System Offline" />
            )}
          </div>
          {subtitle && (
            <span className="text-[10px] md:text-xs font-semibold tracking-wider text-text-3 uppercase font-mono mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {rightElement && (
        <div className="flex items-center">
          {rightElement}
        </div>
      )}
    </div>
  );
}
