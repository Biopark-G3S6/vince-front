import { useState, type FormEvent } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import type { DirectoryUser } from '@shared/api/directory';
import { http } from '@shared/api/http';
import { Button, SearchIcon, TrashIcon, UserIcon, UsersIcon } from '@shared/ui';

import { describeAcademicError } from '../api/courseApi';
import { academicFieldClass } from '../components/AcademicActionDialog';
import {
  FilterChip,
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

type RoleFilter = 'all' | 'PROFESSOR' | 'STUDENT';

/** Um convite de ingresso da instituição (`GET /institutions/:id/invitations`). */
type Invitation = {
  id: string;
  targetEmail: string | null;
  roleCode: string;
  state: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED';
  expiresAt: string;
};

const roleLabel: Record<string, string> = {
  INSTITUTION_ADMIN: 'Administrador',
  COORDINATOR: 'Coordenador',
  PROFESSOR: 'Professor',
  STUDENT: 'Aluno',
};

const invitationState: Record<
  Invitation['state'],
  { label: string; tone: 'success' | 'warning' | 'muted' }
> = {
  ACTIVE: { label: 'Pendente', tone: 'warning' },
  EXHAUSTED: { label: 'Aceito', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'muted' },
  REVOKED: { label: 'Revogado', tone: 'muted' },
};

const DAY = 24 * 3600 * 1000;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Professores e alunos da instituição, pelo diretório (user-directory), e o convite de
 * professor (RF-ACS-009: o coordenador e o administrador institucional convidam professores).
 */
export function PeoplePage() {
  const user = useCurrentUser();
  const client = useQueryClient();
  const institutionId = user.institutionId;
  const canInvite = hasPermission(user, 'INVITATION:CREATE') && Boolean(institutionId);
  const canReadInvitations = hasPermission(user, 'INVITATION:READ') && Boolean(institutionId);
  const canRevoke = hasPermission(user, 'INVITATION:REVOKE');

  const [role, setRole] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [validDays, setValidDays] = useState(7);
  const [invitationUrl, setInvitationUrl] = useState('');

  const people = useQuery({
    queryKey: ['people', role, search.trim()],
    queryFn: () =>
      http.page<DirectoryUser>('/users', {
        role: role === 'all' ? undefined : role,
        search: search.trim() || undefined,
        pageSize: 100,
        withTotal: 'true',
      }),
  });
  const counts = useQuery({
    queryKey: ['people', 'counts'],
    queryFn: async () => {
      const [professors, students] = await Promise.all(
        ['PROFESSOR', 'STUDENT'].map((code) =>
          http.page<DirectoryUser>('/users', { role: code, pageSize: 1, withTotal: 'true' }),
        ),
      );
      return {
        professors: professors?.pagination.totalItems ?? 0,
        students: students?.pagination.totalItems ?? 0,
      };
    },
  });

  const invitationsKey = ['people', 'invitations', institutionId] as const;
  const invitations = useQuery({
    queryKey: invitationsKey,
    queryFn: async () =>
      (await http.all<Invitation>(`/institutions/${institutionId}/invitations`)).filter(
        (invitation) => invitation.roleCode === 'PROFESSOR',
      ),
    enabled: canReadInvitations,
  });

  const invite = useMutation({
    mutationFn: () =>
      http.post<{ id: string; url: string }>(`/institutions/${institutionId}/invitations`, {
        roleCode: 'PROFESSOR',
        targetEmail: email.trim().toLowerCase(),
        expiresAt: new Date(Date.now() + validDays * DAY).toISOString(),
      }),
    onSuccess: async (issued) => {
      setInvitationUrl(`${window.location.origin}${issued.url}`);
      setEmail('');
      toast.success('Convite de professor emitido.');
      await client.invalidateQueries({ queryKey: invitationsKey });
    },
    onError: (error) => toast.error(describeAcademicError(error)),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      http.post(`/institutions/${institutionId}/invitations/${invitationId}/revocation`),
    onSuccess: async () => {
      toast.success('Convite revogado.');
      await client.invalidateQueries({ queryKey: invitationsKey });
    },
    onError: (error) => toast.error(describeAcademicError(error)),
  });

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    invite.mutate();
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar; selecione o link e copie manualmente.');
    }
  }

  const items = people.data?.items ?? [];

  return (
    <PageScaffold
      activeSection="people"
      description="Consulte professores e alunos da instituição e convide professores para criar a própria conta."
      eyebrow="Pessoas"
      title="Professores e alunos"
    >
      <section className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-5">
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Professores"
          value={counts.data ? String(counts.data.professors) : '—'}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Alunos"
          value={counts.data ? String(counts.data.students) : '—'}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Convites pendentes"
          tone="muted"
          value={
            invitations.data
              ? String(invitations.data.filter((item) => item.state === 'ACTIVE').length)
              : '—'
          }
        />
      </section>

      {canInvite && (
        <SectionPanel className="mt-8" title="Convidar professor">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]"
            onSubmit={submitInvite}
          >
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                E-mail do professor
              </span>
              <input
                className={academicFieldClass}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Validade do convite
              </span>
              <select
                className={academicFieldClass}
                onChange={(event) => setValidDays(Number(event.target.value))}
                value={validDays}
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </label>
            <Button className="self-end" disabled={invite.isPending} type="submit">
              Convidar professor
            </Button>
          </form>
          <p className="mt-2 text-sm text-vince-muted">
            O professor cria a própria conta pelo link. Depois, a coordenação o designa às turmas.
          </p>
          {invitationUrl && (
            <div
              className="mt-3 flex flex-col gap-3 rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <p className="break-all">
                Link do convite: <span className="font-semibold">{invitationUrl}</span>
              </p>
              <Button
                onClick={() => void copyInvitation()}
                size="sm"
                type="button"
                variant="outline"
              >
                Copiar link
              </Button>
            </div>
          )}

          {canReadInvitations && (
            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-vince-text">Convites de professor</h3>
              {invitations.data?.length === 0 && (
                <p className="rounded-lg border border-dashed border-vince-border p-4 text-sm text-vince-muted">
                  Nenhum convite de professor emitido.
                </p>
              )}
              {(invitations.data ?? []).map((invitation) => {
                const state = invitationState[invitation.state];
                const label = invitation.targetEmail ?? 'Convite aberto';
                return (
                  <article
                    className="flex flex-col gap-3 rounded-lg border border-vince-border bg-[#fffafa] p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={invitation.id}
                  >
                    <div className="min-w-0 break-words">
                      <p className="font-semibold text-vince-text">{label}</p>
                      <p className="text-sm text-vince-muted">
                        válido até {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge label={state.label} tone={state.tone} />
                      {invitation.state === 'ACTIVE' && canRevoke && (
                        <Button
                          aria-label={`Revogar convite de ${label}`}
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate(invitation.id)}
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
                );
              })}
            </div>
          )}
        </SectionPanel>
      )}

      <SectionPanel className="mt-8" title="Diretório da instituição">
        <div className="flex flex-col gap-4 border-b border-vince-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar professor ou aluno</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-11 w-full rounded-lg border border-vince-border bg-white pl-12 pr-4 text-vince-text focus:border-vince-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              type="search"
              value={search}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={role === 'all'} onClick={() => setRole('all')}>
              Todos
            </FilterChip>
            <FilterChip active={role === 'PROFESSOR'} onClick={() => setRole('PROFESSOR')}>
              Professores
            </FilterChip>
            <FilterChip active={role === 'STUDENT'} onClick={() => setRole('STUDENT')}>
              Alunos
            </FilterChip>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((person) => (
            <article
              className="rounded-lg border border-vince-border bg-[#fffafa] p-4"
              key={person.id}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vince-tertiary font-bold text-vince-primary">
                  {initials(person.name)}
                </span>
                <div className="min-w-0 break-words">
                  <h2 className="font-extrabold text-vince-text">{person.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-vince-primary">
                    {(person.roleCodes ?? []).map((code) => roleLabel[code] ?? code).join(' · ')}
                  </p>
                  <p className="mt-2 text-sm text-vince-muted">{person.email}</p>
                  {person.active === false && (
                    <p className="mt-1 text-sm font-semibold text-vince-muted">Conta inativa</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {people.isPending && (
          <p className="py-10 text-center text-vince-muted" role="status">
            Carregando pessoas…
          </p>
        )}
        {!people.isPending && items.length === 0 && (
          <p className="py-10 text-center text-vince-muted">Nenhuma pessoa encontrada.</p>
        )}
        {people.data?.pagination.hasNext && (
          <p className="mt-4 text-sm text-vince-muted">
            Mostrando as primeiras 100 pessoas; refine a busca para encontrar outras.
          </p>
        )}
      </SectionPanel>
    </PageScaffold>
  );
}
