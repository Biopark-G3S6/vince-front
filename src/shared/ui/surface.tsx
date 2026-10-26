import type { ReactNode } from 'react';

import { cn } from '@shared/lib/cn';

/**
 * Superfícies de base do portal: cartões, painéis, selos e indicadores.
 * Não contêm regra de negócio nem chamam a API (ADR-0016 §21).
 */

type MetricCardProps = {
  icon?: ReactNode;
  label: string;
  tone?: 'default' | 'muted' | 'danger';
  value: string;
};

export function MetricCard({ icon, label, tone = 'default', value }: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-vince-border bg-white p-4 shadow-sm sm:p-5">
      {icon && (
        <span
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-vince-tertiary text-vince-primary',
            tone === 'muted' && 'text-vince-muted',
          )}
        >
          {icon}
        </span>
      )}
      <p
        className={cn(
          'text-3xl font-black sm:text-4xl',
          icon && 'mt-3 sm:mt-5',
          tone === 'default' && 'text-vince-primary',
          tone === 'muted' && 'text-vince-muted',
          tone === 'danger' && 'text-red-800',
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-vince-muted sm:text-base">{label}</p>
    </article>
  );
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'muted' | 'primary';

const badgeToneClass: Record<BadgeTone, string> = {
  danger: 'border-red-200 bg-red-50 text-red-800',
  muted: 'border-vince-border bg-[#f8eeee] text-vince-muted',
  primary: 'border-vince-border bg-vince-tertiary text-vince-primary',
  success: 'border-green-200 bg-green-100 text-green-800',
  warning: 'border-[#edd4a6] bg-[#fff7e8] text-[#7a5415]',
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
        badgeToneClass[tone],
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}

type SectionPanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  title: string;
};

export function SectionPanel({ actions, children, className, title }: SectionPanelProps) {
  return (
    <section
      className={cn('min-w-0 rounded-lg border border-vince-border bg-white shadow-sm', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vince-border px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="min-w-0 break-words text-lg font-extrabold text-vince-text sm:text-xl">
          {title}
        </h2>
        {actions}
      </div>
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </section>
  );
}

type FilterChipProps = {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
};

export function FilterChip({ active = false, children, onClick }: FilterChipProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-[#ff7c98] bg-[#ff7c98] text-vince-primary'
          : 'border-vince-border bg-white text-vince-muted hover:bg-vince-tertiary hover:text-vince-primary',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-full overflow-hidden rounded-full bg-[#e8e2e3]">
        <span
          className="block h-full rounded-full bg-vince-primary"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </span>
      <span className="w-11 text-sm font-semibold text-vince-muted">{value}%</span>
    </div>
  );
}

type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const noticeToneClass: Record<NoticeTone, string> = {
  danger: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-vince-border bg-vince-tertiary text-vince-primary',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-[#edd4a6] bg-[#fff7e8] text-[#7a5415]',
};

type NoticeProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: string;
  tone?: NoticeTone;
};

export function Notice({ children, className, icon, title, tone = 'info' }: NoticeProps) {
  return (
    <div
      className={cn('flex gap-3 rounded-lg border px-4 py-3', noticeToneClass[tone], className)}
      role={tone === 'danger' ? 'alert' : 'note'}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 text-sm leading-6">
        {title && <p className="font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

type EmptyStateProps = {
  action?: ReactNode;
  description?: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-vince-border bg-white px-6 py-10 text-center">
      {icon && <span className="mb-3 text-vince-muted">{icon}</span>}
      <p className="font-semibold text-vince-text">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-vince-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
