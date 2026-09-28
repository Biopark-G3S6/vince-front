import type { ReactNode } from 'react';

import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  DashboardIcon,
  DocumentIcon,
  GlobeIcon,
  GraduationCapIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from '@shared/ui';

import { cn } from '@shared/lib/cn';

type AdminShellProps = {
  children: ReactNode;
};

const navItems = [
  { label: 'Dashboard', icon: DashboardIcon, active: false },
  { label: 'Instituições', icon: BuildingIcon, active: true },
  { label: 'Cursos', icon: GraduationCapIcon, active: false },
  { label: 'Eventos', icon: CalendarIcon, active: false },
  { label: 'Equipes', icon: UsersIcon, active: false },
  { label: 'Artigos', icon: DocumentIcon, active: false },
  { label: 'Perfil', icon: UserIcon, active: false },
  { label: 'Configurações', icon: SettingsIcon, active: false },
];

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen border-t-4 border-vince-primary bg-vince-surface text-vince-text lg:grid lg:grid-cols-[348px_1fr]">
      <aside className="border-b border-vince-border bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="border-b border-vince-border px-7 py-9">
          <p className="text-2xl font-black text-vince-primary">VinceArt</p>
          <p className="mt-2 text-base text-vince-muted">Academic Portal</p>
        </div>

        <nav aria-label="Menu administrativo" className="space-y-2 px-3 py-7">
          {navItems.map((item) => {
            const NavIcon = item.icon;

            return (
              <a
                className={cn(
                  'relative flex h-11 items-center gap-5 rounded-lg px-5 text-base font-medium text-vince-muted transition-colors hover:bg-vince-tertiary hover:text-vince-primary',
                  item.active && 'bg-[#ff7c98] text-vince-primary hover:bg-[#ff7c98]',
                )}
                href="/admin/instituicoes"
                key={item.label}
              >
                {item.active && (
                  <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-vince-primary" />
                )}
                <NavIcon className="h-6 w-6 shrink-0" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex h-[70px] items-center justify-end border-b border-vince-border bg-white px-8">
          <div className="flex items-center gap-7">
            <button
              aria-label="Notificações"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-muted hover:bg-vince-tertiary"
              type="button"
            >
              <BellIcon className="h-6 w-6" />
            </button>
            <button
              aria-label="Idioma"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-muted hover:bg-vince-tertiary"
              type="button"
            >
              <GlobeIcon className="h-7 w-7" />
            </button>
            <span className="h-11 w-px bg-vince-border" />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-base font-semibold">Admin Geral</p>
                <p className="text-sm text-vince-muted">System Admin</p>
              </div>
              <img
                alt="Admin Geral"
                className="h-10 w-10 rounded-full object-cover"
                src="/assets/admin-avatar.png"
              />
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
