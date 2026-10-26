import { useTranslation } from 'react-i18next';

import { cn } from '@shared/lib/cn';

import { useCurrentUser, type Role } from '../model/persona';

type PersonaSwitchProps = {
  className?: string;
  roles: Role[];
};

/** Compatibilidade visual para telas antigas: a identidade agora é fixa pela sessão. */
export function PersonaSwitch({ className, roles }: PersonaSwitchProps) {
  const { t } = useTranslation('admin');
  const currentUser = useCurrentUser();

  if (!roles.includes(currentUser.role)) return null;

  return (
    <p className={cn('text-sm font-semibold text-vince-muted', className)}>
      {t('persona.connectedAs', {
        defaultValue: 'Perfil conectado: {{role}}',
        role: t(`roles.${currentUser.role}`),
      })}
    </p>
  );
}
