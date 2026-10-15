import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import { ChevronRightIcon } from '@shared/ui';

import type { Role } from '../model/persona';

import { AdminShell, type AdminSection } from './AdminShell';
import { PersonaSwitch } from './PersonaSwitch';

type PageScaffoldProps = {
  actions?: ReactNode;
  activeSection: AdminSection;
  children: ReactNode;
  description: string;
  eyebrow: string;
  /** Perfis entre os quais a tela permite alternar a perspectiva de demonstração. */
  personaRoles?: Role[];
  title: string;
};

export function PageScaffold({
  actions,
  activeSection,
  children,
  description,
  eyebrow,
  personaRoles,
  title,
}: PageScaffoldProps) {
  const { t } = useTranslation('admin');

  return (
    <AdminShell activeSection={activeSection}>
      <main className="px-6 py-12 lg:px-[50px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-sm text-vince-muted">
              <span>{t('breadcrumbRoot')}</span>
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

        {personaRoles && <PersonaSwitch roles={personaRoles} />}

        {children}
      </main>
    </AdminShell>
  );
}
