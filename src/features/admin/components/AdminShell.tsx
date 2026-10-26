import { useState, type ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  DocumentIcon,
  EditIcon,
  GlobeIcon,
  GraduationCapIcon,
  LandmarkIcon,
  MenuIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from '@shared/ui';

import { cn } from '@shared/lib/cn';

import { canAccessSection, type AdminSection } from '../model/accessPolicy';
import { useCurrentUser } from '../model/persona';

import { useShellSlots } from './ShellSlots';

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
  { section: 'people', icon: UsersIcon, href: '/admin/pessoas' },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuToggleLabel = collapsed ? t('shell.expandMenu') : t('shell.collapseMenu');
  const visibleItems = navItems.filter((item) => canAccessSection(currentUser.role, item.section));
  const itemLabel = (section: AdminSection) =>
    t(`roleNav.${currentUser.role}.${section}`, { defaultValue: t(`nav.${section}`) });
  const matchingItems = visibleItems.filter((item) =>
    itemLabel(item.section).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  function navigation(compact = false) {
    return (
      <nav aria-label={t('shell.menu')} className={cn('space-y-1 px-3 py-4', compact && 'px-2')}>
        {visibleItems.map((item) => {
          const NavIcon = item.icon;
          const active = item.section === activeSection;

          return (
            <a
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 items-center gap-4 rounded-lg px-4 py-2 text-sm font-medium text-vince-muted transition-colors hover:bg-vince-tertiary hover:text-vince-primary',
                compact && 'justify-center px-0',
                active && 'bg-vince-tertiary font-bold text-vince-primary',
              )}
              href={item.href}
              key={item.section}
              title={compact ? itemLabel(item.section) : undefined}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-vince-primary" />
              )}
              <NavIcon className="h-5 w-5 shrink-0" />
              <span className={cn(compact && 'sr-only')}>{itemLabel(item.section)}</span>
            </a>
          );
        })}
      </nav>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen border-t-4 border-vince-primary bg-vince-surface text-vince-text transition-[grid-template-columns] duration-300 lg:grid',
        collapsed
          ? 'lg:grid-cols-[88px_minmax(0,1fr)]'
          : 'lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]',
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-[60] rounded bg-white p-3 text-vince-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('shell.skipToContent')}
      </a>
      <aside className="hidden border-r border-vince-border bg-white lg:block">
        <div
          className={cn(
            'relative flex min-h-[86px] items-center border-b border-vince-border px-5 py-4',
            collapsed && 'justify-center px-3',
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
            aria-expanded={!collapsed}
            aria-label={menuToggleLabel}
            className="absolute -right-4 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-vince-muted transition-colors hover:text-vince-primary"
            onClick={() => setCollapsed((current) => !current)}
            title={menuToggleLabel}
            type="button"
          >
            {collapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {navigation(collapsed)}
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-[70px] items-center justify-between gap-2 border-b border-vince-border bg-white px-4 sm:gap-4 lg:px-8">
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button
                aria-label={t('shell.expandMenu')}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-padrao text-vince-muted hover:bg-vince-tertiary lg:hidden"
                type="button"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] overflow-y-auto bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-vince-border p-4">
                  <Dialog.Title className="text-2xl font-black text-vince-primary">
                    VinceArt
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label={t('shell.collapseMenu')}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-vince-muted hover:bg-vince-tertiary"
                  >
                    ×
                  </Dialog.Close>
                </div>
                {navigation()}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <a className="text-lg font-black text-vince-primary md:hidden" href="/admin/dashboard">
            VinceArt
          </a>

          <div className="relative hidden w-full max-w-[320px] md:block">
            <label>
              <span className="sr-only">{t('shell.search')}</span>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
              <input
                className="h-11 w-full rounded-full border border-vince-border bg-white pl-12 pr-4 text-base text-vince-muted placeholder:text-[#8a7b7e] focus:border-vince-primary"
                placeholder={t('shell.searchPlaceholder')}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                value={search}
              />
            </label>
            {search.trim() && (
              <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-lg border border-vince-border bg-white p-2 shadow-lg">
                {matchingItems.length ? (
                  matchingItems.map((item) => (
                    <a
                      key={item.section}
                      className="block rounded px-3 py-3 text-sm text-vince-primary hover:bg-vince-tertiary"
                      href={item.href}
                    >
                      {itemLabel(item.section)}
                    </a>
                  ))
                ) : (
                  <p className="p-3 text-sm text-vince-muted">{t('shell.noResults')}</p>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-4">
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
              <a
                aria-label={currentUser.name}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-vince-primary text-sm font-bold text-white"
                href="/admin/acesso"
                title={t('nav.access')}
              >
                {currentUser.initials}
              </a>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
