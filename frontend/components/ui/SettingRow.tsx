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
        border-b border-border last:border-0
        ${isClickable ? 'cursor-pointer transition-colors hover:bg-surface-2 px-2 -mx-2 rounded-card' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-border bg-surface-2 text-text-2">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-body font-semibold text-text-1">{title}</span>
          {description && (
            <span className="text-caption text-text-3 mt-0.5">{description}</span>
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
