import React from 'react';

interface SettingRowProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
}

export function SettingRow({ icon, title, description, rightElement, onClick }: SettingRowProps) {
  const isClickable = !!onClick;
  const Wrapper = isClickable ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`
        flex w-full items-center justify-between py-4 text-left
        border-b border-slate-100 dark:border-white/5 last:border-0
        ${isClickable ? 'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] px-2 -mx-2 rounded-lg' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-[#111520] dark:text-slate-400 border border-slate-200 dark:border-white/10">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
          )}
        </div>
      </div>
      {rightElement && (
        <div className="ml-4 shrink-0">
          {rightElement}
        </div>
      )}
    </Wrapper>
  );
}
