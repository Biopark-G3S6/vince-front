import { useState, type ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  CheckCircleIcon,
  DashboardIcon,
  DocumentIcon,
  EditIcon,
  GlobeIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from '@shared/ui';

import { cn } from '@shared/lib/cn';

import { useCurrentUser } from '../model/persona';

import { useShellSlots } from './ShellSlots';

export type AdminSection =
  | 'dashboard'
  | 'institutions'
  | 'courses'
  | 'classes'
  | 'events'
  | 'teams'
  | 'articles'
  | 'editor'
  | 'templates'
  | 'review'
  | 'discussion'
  | 'notifications'
  | 'assistance'
  | 'progress'
  | 'language'
  | 'access'
  | 'settings';

type AdminShellProps = {
  activeSection: AdminSection;
  children: ReactNode;
};

const navItems = [
  { section: 'dashboard', icon: DashboardIcon, href: '/admin/dashboard' },
  {
    section: 'institutions',
    icon: BuildingIcon,
    href: '/admin/instituicoes',
  },
  { section: 'courses', icon: GraduationCapIcon, href: '/admin/cursos' },
  { section: 'classes', icon: BuildingIcon, href: '/admin/turmas' },
  { section: 'events', icon: CalendarIcon, href: '/admin/eventos' },
  { section: 'teams', icon: UsersIcon, href: '/admin/equipes' },
  { section: 'articles', icon: DocumentIcon, href: '/admin/artigos' },
  { section: 'templates', icon: LandmarkIcon, href: '/admin/templates' },
  { section: 'editor', icon: EditIcon, href: '/admin/editor' },
  { section: 'review', icon: CheckCircleIcon, href: '/admin/correcao' },
  { section: 'discussion', icon: ChatIcon, href: '/admin/discussao' },
  { section: 'assistance', icon: SparklesIcon, href: '/admin/assistencia' },
  { section: 'progress', icon: ChartIcon, href: '/admin/acompanhamento' },
  { section: 'language', icon: GlobeIcon, href: '/admin/idioma' },
  { section: 'access', icon: UserIcon, href: '/admin/acesso' },
  { section: 'settings', icon: SettingsIcon, href: '/admin/acesso' },
] satisfies Array<{
  section: AdminSection;
  icon: typeof DashboardIcon;
  href: string;
}>;

export function AdminShell({ activeSection, children }: AdminShellProps) {
  const { i18n, t } = useTranslation('admin');
  const currentUser = useCurrentUser();
  const slots = useShellSlots();
  const [collapsed, setCollapsed] = useState(false);
  const menuToggleLabel = collapsed ? t('shell.expandMenu') : t('shell.collapseMenu');

  return (
    <div
      className={cn(
        'min-h-screen border-t-4 border-vince-primary bg-vince-surface text-vince-text transition-[grid-template-columns] duration-300 lg:grid',
        collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[320px_1fr] xl:grid-cols-[348px_1fr]',
      )}
    >
      <aside className="border-b border-vince-border bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div
          className={cn(
            'flex items-center gap-3 border-b border-vince-border px-7 py-8',
            collapsed ? 'justify-center px-3' : 'justify-between',
          )}
        >
          <a
            aria-label="VinceArt"
            className={cn('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}
            href="/"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-padrao bg-vince-primary text-xl font-black text-white">
              V
            </span>
            <span className={cn('min-w-0', collapsed && 'sr-only')}>
              <span className="block text-2xl font-black leading-none text-vince-primary">
                VinceArt
              </span>
              <span className="mt-1 block text-base text-vince-muted">{t('shell.tagline')}</span>
            </span>
          </a>
          <button
            aria-label={menuToggleLabel}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-padrao text-vince-muted transition-colors hover:bg-vince-tertiary hover:text-vince-primary',
              collapsed && 'hidden lg:inline-flex',
            )}
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        <nav
          aria-label={t('shell.menu')}
          className={cn('space-y-2 px-3 py-7', collapsed && 'px-2')}
        >
          {navItems.map((item) => {
            const NavIcon = item.icon;
            const active = item.section === activeSection;

            return (
              <a
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center gap-5 rounded-lg px-5 text-base font-medium text-vince-muted transition-colors hover:bg-vince-tertiary hover:text-vince-primary',
                  collapsed && 'justify-center px-0',
                  active && 'bg-[#ff7c98] text-vince-primary hover:bg-[#ff7c98]',
                )}
                href={item.href}
                key={item.section}
                title={collapsed ? t(`nav.${item.section}`) : undefined}
              >
                {active && (
                  <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-vince-primary" />
                )}
                <NavIcon className="h-6 w-6 shrink-0" />
                <span className={cn(collapsed && 'sr-only')}>{t(`nav.${item.section}`)}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex h-[70px] items-center justify-between gap-4 border-b border-vince-border bg-white px-6 lg:px-8">
          <button
            aria-label={menuToggleLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-padrao text-vince-muted transition-colors hover:bg-vince-tertiary hover:text-vince-primary lg:hidden"
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <label className="relative hidden w-full max-w-[320px] md:block">
            <span className="sr-only">{t('shell.search')}</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-11 w-full rounded-full border border-vince-border bg-white pl-12 pr-4 text-base text-vince-muted placeholder:text-[#8a7b7e] focus:border-vince-primary"
              placeholder={t('shell.searchPlaceholder')}
              type="search"
            />
          </label>

          <div className="ml-auto flex items-center gap-5 sm:gap-7">
            {slots.notifications ?? (
              <a
                aria-label={t('shell.notifications')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-muted hover:bg-vince-tertiary"
                href="/admin/notificacoes"
              >
                <BellIcon className="h-6 w-6" />
              </a>
            )}
            <a
              aria-current={activeSection === 'language' ? 'page' : undefined}
              aria-label={t('shell.language')}
              className="inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold uppercase text-vince-muted hover:bg-vince-tertiary"
              href="/admin/idioma"
            >
              <GlobeIcon className="h-7 w-7" />
              <span className="hidden sm:inline">{i18n.resolvedLanguage ?? i18n.language}</span>
            </a>
            <span className="hidden h-11 w-px bg-vince-border sm:block" />
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-base font-semibold">{currentUser.name}</p>
                <p className="text-sm text-vince-muted">{t(`roles.${currentUser.role}`)}</p>
              </div>
              <span
                aria-label={currentUser.name}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-vince-primary text-sm font-bold text-white"
              >
                {currentUser.initials}
              </span>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
