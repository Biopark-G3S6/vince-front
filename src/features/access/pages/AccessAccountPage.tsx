import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';

import { AdminShell } from '@features/admin';
import {
  Button,
  CheckCircleIcon,
  ChevronRightIcon,
  LockIcon,
  LogOutIcon,
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

export function AccessAccountPage() {
  const [profileName, setProfileName] = useState('Admin Geral');
  const [researchArea, setResearchArea] = useState('Gestão acadêmica e governança institucional');
  const [language, setLanguage] = useState('pt-BR');
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

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaved(true);
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        grantedBy: 'Admin Geral',
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
    <AdminShell activeSection="access">
      <main className="px-6 py-12 lg:px-[50px]">
        <div>
          <nav className="mb-4 flex items-center gap-2 text-sm text-vince-muted">
            <span>Admin</span>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="font-bold text-vince-text">Acesso</span>
          </nav>
          <h1 className="text-4xl font-extrabold tracking-normal text-vince-text">
            Acesso e autenticação
          </h1>
          <p className="mt-3 max-w-3xl text-vince-muted">
            Gerencie a sessão corrente, dados próprios, senha e concessões diretas ativas.
          </p>
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <Panel
              description="A sessão é mantida por cookie HttpOnly; permissões no cliente servem somente para composição da interface."
              icon={ShieldIcon}
              title="Sessão e identidade"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <SessionPill label="Papel" value="SYSTEM_ADMIN" />
                <SessionPill label="Instituição" value="Todas" />
                <SessionPill label="Permissões" value="8 ativas" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="outline">
                  <LogOutIcon className="h-5 w-5" />
                  Encerrar sessão
                </Button>
                <span className="text-sm text-vince-muted">
                  Encerramento afeta apenas a sessão corrente.
                </span>
              </div>
            </Panel>

            <Panel
              description="E-mail, papéis e vínculos não são editáveis pelo próprio usuário."
              icon={UserIcon}
              title="Meu perfil"
            >
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome" onChange={setProfileName} required value={profileName} />
                  <Field
                    disabled
                    label="E-mail"
                    onChange={() => undefined}
                    value="admin@vinceart.edu.br"
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
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </label>
                <div className="flex items-center gap-3">
                  <Button type="submit">Salvar perfil</Button>
                  {profileSaved && (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-800">
                      <CheckCircleIcon className="h-4 w-4" />
                      Perfil atualizado
                    </span>
                  )}
                </div>
              </form>
            </Panel>

            <Panel
              description="Alteração autenticada exige a senha atual e encerra as demais sessões."
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
                <div className="flex items-center gap-3">
                  <Button disabled={passwordScore < 4} type="submit">
                    Atualizar senha
                  </Button>
                  {passwordSaved && (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-800">
                      <CheckCircleIcon className="h-4 w-4" />
                      Senha atualizada
                    </span>
                  )}
                </div>
              </form>
            </Panel>
          </div>

          <Panel
            description="Conceda apenas permissões que o usuário concedente possui e revise concessões ativas periodicamente."
            icon={ShieldIcon}
            title="Concessões diretas"
          >
            <form className="space-y-4" onSubmit={createGrant}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Beneficiário" onChange={setBeneficiary} value={beneficiary} />
                <Field
                  label="E-mail do beneficiário"
                  onChange={setBeneficiaryEmail}
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
        </section>
      </main>
    </AdminShell>
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
    <section className="rounded-lg border border-vince-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vince-tertiary text-vince-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-vince-text">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-vince-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
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
