import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';

import { PageScaffold, useCurrentUser } from '@features/admin';
import { changeLanguage, i18n, supportedLanguages } from '@shared/i18n';
import { toast } from 'sonner';
import {
  Button,
  CheckCircleIcon,
  LockIcon,
  LogOutIcon,
  Notice,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from '@shared/ui';

type PermissionGrant = {
  id: string;
  beneficiary: string;
  beneficiaryEmail: string;
  grantedBy: string;
  grantedAt: string;
  permission: string;
  validUntil: string;
};

const initialGrants: PermissionGrant[] = [
  {
    id: 'grant-review',
    beneficiary: 'Prof. Marina Azevedo',
    beneficiaryEmail: 'marina.azevedo@frt.edu.br',
    grantedBy: 'Admin Geral',
    grantedAt: '18 Set, 2026',
    permission: 'PERMISSION_GRANT:READ',
    validUntil: '30 Out, 2026',
  },
  {
    id: 'grant-event',
    beneficiary: 'Prof. Rafael Torres',
    beneficiaryEmail: 'rafael.torres@frt.edu.br',
    grantedBy: 'Admin Geral',
    grantedAt: '21 Set, 2026',
    permission: 'EVENT:UPDATE',
    validUntil: '15 Nov, 2026',
  },
];

type AccessAccountPageProps = {
  onSignOut: () => void;
};

const roleView = {
  advisor: { label: 'PROFESSOR', permissions: 'Orientação e revisão' },
  coordinator: { label: 'COORDENADOR', permissions: 'Gestão acadêmica' },
  institutionAdmin: { label: 'ADMINISTRADOR', permissions: 'Administração institucional' },
  student: { label: 'ALUNO', permissions: 'Autoria e colaboração' },
} as const;

export function AccessAccountPage({ onSignOut }: AccessAccountPageProps) {
  const currentUser = useCurrentUser();
  const [profileName, setProfileName] = useState(currentUser.name);
  const [researchArea, setResearchArea] = useState(currentUser.researchArea);
  const [language, setLanguage] = useState(i18n.resolvedLanguage ?? i18n.language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [beneficiary, setBeneficiary] = useState('');
  const [beneficiaryEmail, setBeneficiaryEmail] = useState('');
  const [permission, setPermission] = useState('INSTITUTION:READ');
  const [validUntil, setValidUntil] = useState('');
  const [grants, setGrants] = useState(initialGrants);

  const passwordScore = useMemo(() => {
    const checks = [
      newPassword.length >= 10,
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /\d/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ];

    return checks.filter(Boolean).length;
  }, [newPassword]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileName.trim() || !researchArea.trim()) {
      toast.error('Informe o nome e a área de atuação.');
      return;
    }
    try {
      await changeLanguage(language);
      setProfileSaved(true);
    } catch {
      toast.error('Não foi possível atualizar o idioma. Tente novamente.');
    }
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || passwordScore < 5) return;
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
  }

  function createGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!beneficiary.trim() || !beneficiaryEmail.trim()) {
      return;
    }

    setGrants((current) => [
      {
        id: crypto.randomUUID(),
        beneficiary: beneficiary.trim(),
        beneficiaryEmail: beneficiaryEmail.trim().toLowerCase(),
        grantedBy: currentUser.name,
        grantedAt: new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
          .format(new Date())
          .replace('.', ''),
        permission,
        validUntil: validUntil || 'Sem expiração',
      },
      ...current,
    ]);
    setBeneficiary('');
    setBeneficiaryEmail('');
    setPermission('INSTITUTION:READ');
    setValidUntil('');
  }

  function revokeGrant(grantId: string) {
    setGrants((current) => current.filter((grant) => grant.id !== grantId));
  }

  return (
    <PageScaffold
      activeSection="access"
      eyebrow="Acesso"
      title="Meu acesso"
      description="Consulte sua identidade, ajuste preferências e encerre a sessão desta aba."
    >
      <Notice className="mt-6" title="Ambiente de demonstração">
        As alterações de perfil, senha e permissões nesta tela são exemplos e não alteram uma conta
        institucional.
      </Notice>

      <section
        className={`mt-10 grid gap-6 ${currentUser.role === 'institutionAdmin' ? 'xl:grid-cols-[1fr_0.9fr]' : 'mx-auto max-w-4xl'}`}
      >
        <div className="space-y-6">
          <Panel
            description="Esta identidade foi definida no login e não pode ser trocada dentro da plataforma."
            icon={ShieldIcon}
            title="Sessão e identidade"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <SessionPill label="Papel" value={roleView[currentUser.role].label} />
              <SessionPill label="Instituição" value={currentUser.institution} />
              <SessionPill label="Acesso" value={roleView[currentUser.role].permissions} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={onSignOut} variant="outline">
                <LogOutIcon className="h-5 w-5" />
                Encerrar sessão
              </Button>
              <span className="text-sm text-vince-muted">Voltar para a tela de entrada.</span>
            </div>
          </Panel>

          <Panel
            description="E-mail, papéis e vínculos não são editáveis pelo próprio usuário."
            icon={UserIcon}
            title="Meu perfil"
          >
            <form
              className="space-y-4"
              onSubmit={(event) => void saveProfile(event)}
              onChange={() => setProfileSaved(false)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome" onChange={setProfileName} required value={profileName} />
                <Field
                  disabled
                  label="E-mail"
                  onChange={() => undefined}
                  value={currentUser.email}
                />
              </div>
              <Field
                label="Área de atuação ou pesquisa"
                onChange={setResearchArea}
                required
                value={researchArea}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">Idioma</span>
                <select
                  className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  {supportedLanguages.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit">Salvar perfil</Button>
                {profileSaved && (
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-800"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Preferências aplicadas à demonstração
                  </span>
                )}
              </div>
            </form>
          </Panel>

          <Panel
            description="Use ao menos 10 caracteres, incluindo maiúscula, minúscula, número e caractere especial."
            icon={LockIcon}
            title="Senha"
          >
            <form className="space-y-4" onSubmit={savePassword}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Senha atual"
                  onChange={setCurrentPassword}
                  required
                  type="password"
                  value={currentPassword}
                />
                <Field
                  label="Nova senha"
                  onChange={(value) => {
                    setNewPassword(value);
                    setPasswordSaved(false);
                  }}
                  required
                  type="password"
                  value={newPassword}
                />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-vince-tertiary">
                <div
                  className="h-full rounded-full bg-vince-primary transition-all"
                  style={{ width: `${Math.max(passwordScore, 1) * 20}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={!currentPassword || passwordScore < 5} type="submit">
                  Atualizar senha
                </Button>
                {passwordSaved && (
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-800"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Senha validada na demonstração
                  </span>
                )}
              </div>
            </form>
          </Panel>
        </div>

        {currentUser.role === 'institutionAdmin' && (
          <Panel
            description="Conceda apenas permissões que o usuário concedente possui e revise concessões ativas periodicamente."
            icon={ShieldIcon}
            title="Concessões diretas"
          >
            <form className="space-y-4" onSubmit={createGrant}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Beneficiário"
                  onChange={setBeneficiary}
                  required
                  value={beneficiary}
                />
                <Field
                  label="E-mail do beneficiário"
                  onChange={setBeneficiaryEmail}
                  required
                  type="email"
                  value={beneficiaryEmail}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_170px]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">
                    Permissão
                  </span>
                  <select
                    className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                    onChange={(event) => setPermission(event.target.value)}
                    value={permission}
                  >
                    <option value="INSTITUTION:READ">INSTITUTION:READ</option>
                    <option value="INSTITUTION:UPDATE">INSTITUTION:UPDATE</option>
                    <option value="PERMISSION_GRANT:READ">PERMISSION_GRANT:READ</option>
                    <option value="EVENT:UPDATE">EVENT:UPDATE</option>
                  </select>
                </label>
                <Field label="Validade" onChange={setValidUntil} type="text" value={validUntil} />
              </div>
              <Button type="submit">
                <PlusIcon className="h-5 w-5" />
                Conceder permissão
              </Button>
            </form>

            <div className="mt-7 space-y-3">
              {grants.map((grant) => (
                <article
                  className="rounded-lg border border-vince-border bg-[#fffafa] p-4"
                  key={grant.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-vince-text">{grant.beneficiary}</h3>
                      <p className="text-sm text-vince-muted">{grant.beneficiaryEmail}</p>
                      <p className="mt-3 text-sm font-semibold text-vince-primary">
                        {grant.permission}
                      </p>
                      <p className="mt-1 text-sm text-vince-muted">
                        Concedida por {grant.grantedBy} em {grant.grantedAt}; validade:{' '}
                        {grant.validUntil}
                      </p>
                    </div>
                    <Button
                      aria-label={`Revogar concessão de ${grant.beneficiary}`}
                      onClick={() => revokeGrant(grant.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Revogar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}
      </section>
    </PageScaffold>
  );
}

type PanelProps = {
  children: ReactNode;
  description: string;
  icon: typeof ShieldIcon;
  title: string;
};

function Panel({ children, description, icon: Icon, title }: PanelProps) {
  return (
    <section className="min-w-0 rounded-lg border border-vince-border bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vince-tertiary text-vince-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-vince-text">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-vince-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6 min-w-0 break-words">{children}</div>
    </section>
  );
}

type SessionPillProps = {
  label: string;
  value: string;
};

function SessionPill({ label, value }: SessionPillProps) {
  return (
    <div className="rounded-lg border border-vince-border bg-[#fffafa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-muted">{label}</p>
      <p className="mt-2 font-extrabold text-vince-text">{value}</p>
    </div>
  );
}

type FieldProps = {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'email' | 'password' | 'text';
  value: string;
};

function Field({
  disabled = false,
  label,
  onChange,
  required = false,
  type = 'text',
  value,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-vince-muted">{label}</span>
      <input
        className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text disabled:bg-[#f7f1f2] disabled:text-vince-muted focus:border-vince-primary"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
