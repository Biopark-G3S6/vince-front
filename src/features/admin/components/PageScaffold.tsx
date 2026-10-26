import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import { ChevronRightIcon } from '@shared/ui';

import type { AdminSection } from '../model/accessPolicy';
import { useCurrentUser, type Role } from '../model/persona';

import { AdminShell } from './AdminShell';

type PageScaffoldProps = {
  actions?: ReactNode;
  activeSection: AdminSection;
  children: ReactNode;
  description: string;
  eyebrow: string;
  /** Perfis documentados para a tela. A identidade ativa é definida pelo login. */
  personaRoles?: Role[];
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
  const { t } = useTranslation('admin');
  const currentUser = useCurrentUser();

  return (
    <AdminShell activeSection={activeSection}>
      <main
        className="min-w-0 px-4 py-7 sm:px-6 sm:py-10 lg:px-8 xl:px-10"
        id="main-content"
        tabIndex={-1}
      >
        <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <nav
              aria-label={t('breadcrumbLabel')}
              className="mb-4 flex flex-wrap items-center gap-2 text-sm text-vince-muted"
            >
              <span>{t(`roles.${currentUser.role}`)}</span>
              <ChevronRightIcon className="h-4 w-4" />
              <span className="font-bold text-vince-primary">{eyebrow}</span>
            </nav>
            <h1 className="break-words text-3xl font-extrabold tracking-tight text-vince-text sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-4xl text-base leading-7 text-vince-muted">{description}</p>
          </div>
          {actions && (
            <div className="flex min-w-0 max-w-full flex-wrap gap-3 xl:pt-9">{actions}</div>
          )}
        </div>

        {children}
      </main>
    </AdminShell>
  );
}
