import type { ReactNode } from 'react';

import { AdminShell } from '@features/admin';
import { ChevronRightIcon } from '@shared/ui';

import { cn } from '@shared/lib/cn';

type AcademicSection = 'dashboard' | 'courses' | 'classes' | 'events' | 'teams' | 'articles';

type PageScaffoldProps = {
  actions?: ReactNode;
  activeSection: AcademicSection;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function PageScaffold({
  actions,
  activeSection,
  children,
  description,
  eyebrow,
  title,
}: PageScaffoldProps) {
  return (
    <AdminShell activeSection={activeSection}>
      <main className="px-6 py-12 lg:px-[50px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-sm text-vince-muted">
              <span>Admin</span>
              <ChevronRightIcon className="h-4 w-4" />
              <span className="font-bold text-vince-primary">{eyebrow}</span>
            </nav>
            <h1 className="text-4xl font-extrabold tracking-normal text-vince-text lg:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-4xl text-lg leading-7 text-vince-muted">{description}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-3 lg:pt-9">{actions}</div>}
        </div>

        {children}
      </main>
    </AdminShell>
  );
}

type MetricCardProps = {
  icon?: ReactNode;
  label: string;
  tone?: 'default' | 'muted' | 'danger';
  value: string;
};

export function MetricCard({ icon, label, tone = 'default', value }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-vince-border bg-white p-5 shadow-sm">
      <span
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full',
          tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-vince-tertiary text-vince-primary',
          tone === 'muted' && 'text-vince-muted',
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          'mt-5 text-4xl font-black',
          tone === 'default' && 'text-vince-primary',
          tone === 'muted' && 'text-vince-muted',
          tone === 'danger' && 'text-red-800',
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-base font-medium text-vince-muted">{label}</p>
    </article>
  );
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'muted' | 'primary';

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
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
        badgeToneClass[tone],
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
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
    <section className={cn('rounded-lg border border-vince-border bg-white shadow-sm', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-vince-border px-6 py-5">
        <h2 className="text-xl font-extrabold text-vince-text">{title}</h2>
        {actions}
      </div>
      <div className="p-6">{children}</div>
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
      className={cn(
        'h-10 rounded-full border px-5 text-base font-medium transition-colors',
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
