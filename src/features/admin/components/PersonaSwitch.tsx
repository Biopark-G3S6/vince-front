import { useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { resetMockDb } from '@shared/api/mockDb';
import { cn } from '@shared/lib/cn';

import { useCurrentUser, useSetRole, type Role } from '../model/persona';

type PersonaSwitchProps = {
  className?: string;
  roles: Role[];
};

export function PersonaSwitch({ className, roles }: PersonaSwitchProps) {
  const { t } = useTranslation('admin');
  const currentUser = useCurrentUser();
  const setRole = useSetRole();
  const fallbackRole = roles.includes(currentUser.role) ? null : roles[0];

  // A perspectiva vigente pode não existir nesta tela; assume-se a primeira oferecida.
  useEffect(() => {
    if (fallbackRole) {
      setRole(fallbackRole);
    }
  }, [fallbackRole, setRole]);

  return (
    <div
      className={cn(
        'mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-vince-border bg-white px-4 py-3',
        className,
      )}
    >
      <p className="text-sm font-semibold text-vince-muted">{t('persona.label')}</p>
      <div aria-label={t('persona.label')} className="flex flex-wrap gap-2" role="group">
        {roles.map((role) => {
          const active = role === currentUser.role;

          return (
            <button
              aria-pressed={active}
              className={cn(
                'h-9 rounded-full border px-4 text-sm font-semibold transition-colors',
                active
                  ? 'border-vince-primary bg-vince-primary text-white'
                  : 'border-vince-border bg-white text-vince-muted hover:bg-vince-tertiary hover:text-vince-primary',
              )}
              key={role}
              onClick={() => setRole(role)}
              type="button"
            >
              {t(`roles.${role}`)}
            </button>
          );
        })}
      </div>
      <button
        className="ml-auto text-sm font-semibold text-vince-primary hover:underline"
        onClick={resetMockDb}
        type="button"
      >
        {t('persona.reset')}
      </button>
    </div>
  );
}
