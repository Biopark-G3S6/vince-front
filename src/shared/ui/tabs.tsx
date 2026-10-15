import type { KeyboardEvent, ReactNode } from 'react';

import { cn } from '@shared/lib/cn';

export type TabItem<Key extends string> = {
  badge?: ReactNode;
  icon?: ReactNode;
  key: Key;
  label: string;
};

type TabsProps<Key extends string> = {
  /** Prefixo dos ids; o painel correspondente deve usar `${idPrefix}-panel-${key}`. */
  idPrefix: string;
  items: Array<TabItem<Key>>;
  label: string;
  onChange: (key: Key) => void;
  value: Key;
};

export function Tabs<Key extends string>({
  idPrefix,
  items,
  label,
  onChange,
  value,
}: TabsProps<Key>) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    const currentIndex = items.findIndex((item) => item.key === value);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = items[(currentIndex + offset + items.length) % items.length];

    if (next) {
      event.preventDefault();
      onChange(next.key);
      document.getElementById(`${idPrefix}-tab-${next.key}`)?.focus();
    }
  }

  return (
    <div
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-vince-border"
      onKeyDown={handleKeyDown}
      role="tablist"
    >
      {items.map((item) => {
        const selected = item.key === value;

        return (
          <button
            aria-controls={`${idPrefix}-panel-${item.key}`}
            aria-selected={selected}
            className={cn(
              '-mb-px inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-base font-semibold transition-colors',
              selected
                ? 'border-vince-primary text-vince-primary'
                : 'border-transparent text-vince-muted hover:text-vince-primary',
            )}
            id={`${idPrefix}-tab-${item.key}`}
            key={item.key}
            onClick={() => onChange(item.key)}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {item.icon}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
