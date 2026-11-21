import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { hasPermission, IDENTITY_KEY, PageScaffold, useCurrentUser } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { useUserNames, useUserSearch } from '@shared/api/directory';
import { fieldErrorsOf, http } from '@shared/api/http';
import { changeLanguage, i18n, selectableLanguages } from '@shared/i18n';
import {
  Button,
  CheckCircleIcon,
  LockIcon,
  LogOutIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from '@shared/ui';

type PermissionGrant = {
  id: string;
  beneficiaryId: string;
  granterId: string;
  permission: string;
  grantedAt: string;
  validUntil: string | null;
};

type Profile = {
  id: string;
  email: string;
  name: string;
  expertiseArea: string | null;
  preferredLanguage: string | null;
  institutionId: string | null;
  roleCodes: string[];
};

type AccessAccountPageProps = {
  onSignOut: () => void;
};

const roleLabel = {
  systemAdmin: 'ADMINISTRADOR DO SISTEMA',
  advisor: 'PROFESSOR',
  coordinator: 'COORDENADOR',
  institutionAdmin: 'ADMINISTRADOR',
  student: 'ALUNO',
} as const;

/** O nome de cada recurso do catálogo de permissões (URS §2.3), para leitura humana. */
const resourceLabel: Record<string, string> = {
  AI_SUMMARY: 'Resumo por IA',
  ARTICLE: 'Artigo',
  AUTHORSHIP_SIGNAL: 'Sinal de autoria',
  COHORT: 'Turma',
  COMPLIANCE_CHECK: 'Conformidade',
  CONTRIBUTION: 'Contribuição',
  COURSE: 'Curso',
  ENROLLMENT: 'Matrícula',
  EVENT: 'Evento',
  INSTITUTION: 'Instituição',
  INVITATION: 'Convite',
  MESSAGE: 'Mensagem',
  MILESTONE: 'Etapa',
  NOTIFICATION: 'Notificação',
  PERMISSION_GRANT: 'Concessão',
  PROGRESS: 'Acompanhamento',
  PUBLICATION: 'Publicação',
  REFERENCE: 'Referência',
  REMARK: 'Apontamento',
  REPORT: 'Relatório',
  RISK_SIGNAL: 'Sinal de risco',
  SIMILARITY_CHECK: 'Similaridade',
  SUBMISSION: 'Entrega',
  TEAM: 'Equipe',
  TEMPLATE: 'Template',
};

/** As permissões efetivas da sessão agrupadas por recurso (RF-ACS-001 RN2). */
function groupPermissions(permissions: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const code of permissions) {
    const [resource = code, action = ''] = code.split(':');
    const label = resourceLabel[resource] ?? resource;
    groups.set(label, [...(groups.get(label) ?? []), action]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}

const grantErrors: Record<string, string> = {
  GRANT_NOT_HELD_BY_GRANTER: 'Você só pode conceder permissões que possui.',
  SELF_GRANT_NOT_ALLOWED: 'Não é possível conceder permissão a si mesmo.',
  RESOURCE_NOT_FOUND: 'Beneficiário não encontrado na sua instituição.',
  VALIDATION_FAILED: 'Revise a permissão e a validade (precisa estar no futuro).',
  PERMISSION_DENIED: 'Você não tem permissão para esta operação.',
};

const PASSWORD_MIN = 12;

function formatDate(value: string | null) {
  if (!value) return 'Sem expiração';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** RF-ACS-002, RF-ACS-004 a RF-ACS-008 e RF-INT-001. */
export function AccessAccountPage({ onSignOut }: AccessAccountPageProps) {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => http.get<Profile>('/profile'),
  });
  const [profileName, setProfileName] = useState<string | null>(null);
  const [researchArea, setResearchArea] = useState<string | null>(null);
  const [language, setLanguage] = useState(i18n.resolvedLanguage ?? i18n.language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [permission, setPermission] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [reviewedUserId, setReviewedUserId] = useState('');

  const nameValue = profileName ?? profile.data?.name ?? currentUser.name;
  const areaValue = researchArea ?? profile.data?.expertiseArea ?? '';
  const canReadGrants = hasPermission(currentUser, 'PERMISSION_GRANT:READ');
  const canGrant = hasPermission(currentUser, 'PERMISSION_GRANT:CREATE');
  const canRevoke = hasPermission(currentUser, 'PERMISSION_GRANT:REVOKE');
  const showGrants = canReadGrants || canGrant;

  // RF-INS-001 RN4: o usuário vinculado lê a própria instituição para exibir o vínculo.
  const institution = useQuery({
    queryKey: ['institutions', currentUser.institutionId, 'own'],
    queryFn: () =>
      http.get<{ id: string; name: string }>(`/institutions/${currentUser.institutionId}`),
    enabled: Boolean(currentUser.institutionId),
    staleTime: 5 * 60_000,
  });
  const institutionLabel = currentUser.institutionId
    ? (institution.data?.name ?? (institution.isPending ? 'Carregando…' : '—'))
    : currentUser.institution || '—';
  const permissionGroups = groupPermissions(currentUser.permissions);

  // Todas as concessões ativas: alimentam a escolha do usuário a revisar (RF-ACS-008).
  const allGrants = useQuery({
    queryKey: ['permission-grants'],
    queryFn: () => http.all<PermissionGrant>('/permission-grants'),
    enabled: canReadGrants,
  });
  const reviewedGrants = useQuery({
    queryKey: ['permission-grants', reviewedUserId],
    queryFn: () =>
      http.all<PermissionGrant>('/permission-grants', { beneficiaryId: reviewedUserId }),
    enabled: canReadGrants && Boolean(reviewedUserId),
  });
  const grants = reviewedUserId ? reviewedGrants : allGrants;
  const candidates = useUserSearch({ search: beneficiarySearch.trim() }, canGrant);
  const names = useUserNames(
    (allGrants.data ?? []).flatMap((grant) => [grant.beneficiaryId, grant.granterId]),
  );
  const reviewable = [...new Set((allGrants.data ?? []).map((grant) => grant.beneficiaryId))].sort(
    (a, b) => names.nameOf(a).localeCompare(names.nameOf(b), 'pt-BR'),
  );

  const saveProfile = useMutation({
    mutationFn: (body: { name: string; expertiseArea: string | null; preferredLanguage: string }) =>
      http.patch<Profile>('/profile', body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['profile'], saved);
      await queryClient.invalidateQueries({ queryKey: IDENTITY_KEY });
      setProfileSaved(true);
    },
    onError: (error) =>
      toast.error(
        getErrorCode(error) === 'LANGUAGE_NOT_SUPPORTED'
          ? 'Idioma não suportado.'
          : 'Não foi possível salvar o perfil.',
      ),
  });

  const grantMutation = useMutation({
    mutationFn: () =>
      http.post<PermissionGrant>('/permission-grants', {
        beneficiaryId,
        permission,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success('Permissão concedida.');
      setBeneficiaryId('');
      setBeneficiarySearch('');
      setPermission('');
      setValidUntil('');
      await queryClient.invalidateQueries({ queryKey: ['permission-grants'] });
    },
    onError: (error) => toast.error(grantErrors[getErrorCode(error)] ?? 'Falha ao conceder.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (grantId: string) => http.delete(`/permission-grants/${grantId}`),
    onSuccess: async () => {
      toast.success('Concessão revogada.');
      await queryClient.invalidateQueries({ queryKey: ['permission-grants'] });
    },
    onError: (error) => toast.error(grantErrors[getErrorCode(error)] ?? 'Falha ao revogar.'),
  });

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameValue.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    await saveProfile.mutateAsync({
      name: nameValue.trim(),
      expertiseArea: areaValue.trim() || null,
      preferredLanguage: language,
    });
    await changeLanguage(language).catch(() => undefined);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    try {
      await http.put('/password', { currentPassword, newPassword });
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      const fields = fieldErrorsOf(error);
      setPasswordError(
        fields.some((item) => item.field === 'currentPassword')
          ? 'A senha atual não confere.'
          : fields.some((item) => item.field === 'newPassword')
            ? `A nova senha deve ter entre ${PASSWORD_MIN} e 128 caracteres.`
            : 'Não foi possível alterar a senha.',
      );
    }
  }

  function createGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!beneficiaryId || !permission) return;
    grantMutation.mutate();
  }

  return (
    <PageScaffold
      activeSection="access"
      eyebrow="Acesso"
      title="Meu acesso"
      description="Consulte sua identidade, ajuste preferências e encerre a sessão desta aba."
    >
      <section
        className={`mt-10 grid gap-6 ${showGrants ? 'xl:grid-cols-[1fr_0.9fr]' : 'mx-auto max-w-4xl'}`}
      >
        <div className="space-y-6">
          <Panel
            description="Esta identidade foi definida no login e não pode ser trocada dentro da plataforma."
            icon={ShieldIcon}
            title="Sessão e identidade"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <SessionPill label="Papel" value={roleLabel[currentUser.role]} />
              <SessionPill label="Instituição" value={institutionLabel} />
              <SessionPill
                label="Acesso"
                value={`${currentUser.permissions.length} permissões em ${permissionGroups.length} áreas`}
              />
            </div>
            <details className="mt-4 rounded-lg border border-vince-border bg-[#fffafa] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-vince-primary">
                Ver permissões efetivas
              </summary>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {permissionGroups.map(([area, actions]) => (
                  <div key={area}>
                    <dt className="font-bold text-vince-text">{area}</dt>
                    <dd className="text-vince-muted">{actions.join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </details>
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
              onSubmit={(event) => void handleProfile(event)}
              onChange={() => setProfileSaved(false)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome" onChange={setProfileName} required value={nameValue} />
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
                value={areaValue}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">Idioma</span>
                <select
                  className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  {selectableLanguages.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={saveProfile.isPending} type="submit">
                  Salvar perfil
                </Button>
                {profileSaved && (
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-800"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Perfil salvo
                  </span>
                )}
              </div>
            </form>
          </Panel>

          <Panel
            description={`Use de ${PASSWORD_MIN} a 128 caracteres.`}
            icon={LockIcon}
            title="Senha"
          >
            <form className="space-y-4" onSubmit={(event) => void savePassword(event)}>
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
              {passwordError && (
                <p className="text-sm font-semibold text-red-800" role="alert">
                  {passwordError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={!currentPassword || newPassword.length < PASSWORD_MIN}
                  type="submit"
                >
                  Atualizar senha
                </Button>
                {passwordSaved && (
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-800"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Senha atualizada
                  </span>
                )}
              </div>
            </form>
          </Panel>
        </div>

        {showGrants && (
          <Panel
            description="Conceda apenas permissões que você possui. A concessão pode ter prazo e é revogável a qualquer momento."
            icon={ShieldIcon}
            title="Concessões diretas"
          >
            {canGrant && (
              <form className="space-y-4" onSubmit={createGrant}>
                <Field
                  label="Buscar beneficiário"
                  onChange={(value) => {
                    setBeneficiarySearch(value);
                    setBeneficiaryId('');
                  }}
                  value={beneficiarySearch}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">
                    Beneficiário
                  </span>
                  <select
                    className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                    onChange={(event) => setBeneficiaryId(event.target.value)}
                    required
                    value={beneficiaryId}
                  >
                    <option value="">Selecione</option>
                    {(candidates.data?.items ?? [])
                      .filter((person) => person.id !== currentUser.id)
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} {person.email ? `(${person.email})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-vince-muted">
                      Permissão
                    </span>
                    <select
                      className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                      onChange={(event) => setPermission(event.target.value)}
                      required
                      value={permission}
                    >
                      <option value="">Selecione</option>
                      {currentUser.permissions.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-vince-muted">
                      Validade
                    </span>
                    <input
                      className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                      onChange={(event) => setValidUntil(event.target.value)}
                      type="datetime-local"
                      value={validUntil}
                    />
                  </label>
                </div>
                <Button disabled={grantMutation.isPending} type="submit">
                  <PlusIcon className="h-5 w-5" />
                  Conceder permissão
                </Button>
              </form>
            )}

            {canReadGrants && (
              <label className="mt-7 block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Usuário a revisar
                </span>
                <select
                  className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => setReviewedUserId(event.target.value)}
                  value={reviewedUserId}
                >
                  <option value="">Todos os usuários</option>
                  {reviewable.map((id) => (
                    <option key={id} value={id}>
                      {names.nameOf(id)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 space-y-3">
              {canReadGrants && grants.data?.length === 0 && (
                <p className="text-sm text-vince-muted">Nenhuma concessão ativa.</p>
              )}
              {(grants.data ?? []).map((grant) => (
                <article
                  className="rounded-lg border border-vince-border bg-[#fffafa] p-4"
                  key={grant.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-vince-text">
                        {names.nameOf(grant.beneficiaryId)}
                      </h3>
                      <p className="text-sm text-vince-muted">
                        {names.userOf(grant.beneficiaryId)?.email ?? ''}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-vince-primary">
                        {grant.permission}
                      </p>
                      <p className="mt-1 text-sm text-vince-muted">
                        Concedida por {names.nameOf(grant.granterId)} em{' '}
                        {formatDate(grant.grantedAt)}; validade: {formatDate(grant.validUntil)}
                      </p>
                    </div>
                    {canRevoke && (
                      <Button
                        aria-label={`Revogar concessão de ${names.nameOf(grant.beneficiaryId)}`}
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(grant.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Revogar
                      </Button>
                    )}
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
