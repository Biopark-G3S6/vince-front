import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import { useUserNames } from '@shared/api/directory';
import { Button, EmptyState, PlusIcon, UserIcon, UsersIcon } from '@shared/ui';

import { describeAcademicError } from '../api/courseApi';
import { useEventDetails, useEvents } from '../api/eventApi';
import {
  useEligibleStudents,
  useEventArticles,
  useMembers,
  useReceivedInvitations,
  useTeamInvitations,
  useTeamMutations,
  useTeams,
  type ArticleSummaryDto,
  type MemberRole,
  type TeamDto,
} from '../api/teamApi';
import {
  AcademicActionDialog,
  AcademicField,
  academicFieldClass,
} from '../components/AcademicActionDialog';
import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

const articleStatusView: Record<
  ArticleSummaryDto['status'],
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  FINISHED: { label: 'Finalizado', tone: 'success' },
  IN_PROGRESS: { label: 'Em desenvolvimento', tone: 'warning' },
  IN_REVIEW: { label: 'Em revisão', tone: 'primary' },
  STARTED: { label: 'Iniciado', tone: 'muted' },
};

const roleLabel: Record<MemberRole, string> = {
  LEADER: 'Líder',
  AUTHOR: 'Autor',
  COAUTHOR: 'Coautor',
};

/** RF-EQP-001 a RF-EQP-006: formação de equipes por evento. */
export function TeamsPage() {
  const user = useCurrentUser();
  const can = (permission: string) => hasPermission(user, permission);
  const eventsQuery = useEvents();
  const events = useMemo(
    () => (eventsQuery.data ?? []).filter((event) => event.status === 'ACTIVE'),
    [eventsQuery.data],
  );
  const [eventId, setEventId] = useState('');
  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];
  const teamsQuery = useTeams(selectedEvent?.id);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const articles = useEventArticles(selectedEvent?.id).data ?? [];
  const eventDetails = useEventDetails(selectedEvent?.id);
  const eventAdvisorIds = (eventDetails.advisors.data ?? []).map((item) => item.userId);
  const mutations = useTeamMutations();
  const received = useReceivedInvitations(can('TEAM:JOIN'));

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [creating, setCreating] = useState(false);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const members = useMembers(selectedTeam?.id);
  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');
  const invitations = useTeamInvitations(selectedTeam?.id, can('TEAM:INVITE_MEMBER'));
  const pendingInvitations = (invitations.data ?? []).filter((item) => item.status === 'PENDING');
  const eligible = useEligibleStudents(selectedEvent?.id, can('TEAM:ASSIGN_MEMBER'));
  const teamFull = Boolean(selectedEvent && activeMembers.length >= selectedEvent.maxTeamSize);

  const names = useUserNames([
    ...activeMembers.map((member) => member.userId),
    ...(eligible.data ?? []).map((item) => item.userId),
    ...pendingInvitations.map((item) => item.userId),
    ...eventAdvisorIds,
    ...teams.map((team) => team.responsibleAdvisorId),
  ]);

  const articleOf = (team: TeamDto) => articles.find((article) => article.teamId === team.id);
  const receivedItems = received.data ?? [];

  async function run(task: () => Promise<unknown>, success: string) {
    try {
      await task();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(describeAcademicError(error));
      return false;
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) return;
    const form = new FormData(event.currentTarget);
    const identification = String(form.get('identification') ?? '').trim();
    const articleTitle = String(form.get('articleTitle') ?? '').trim();
    const done = await run(async () => {
      const team = await mutations.create.mutateAsync({
        eventId: selectedEvent.id,
        identification,
        ...(articleTitle ? { articleTitle } : {}),
      });
      setSelectedTeamId(team.id);
    }, 'Equipe criada com o seu artigo.');
    if (done) setCreating(false);
  }

  return (
    <PageScaffold
      actions={
        can('TEAM:CREATE') ? (
          <Button
            className="rounded-padrao px-7"
            disabled={!selectedEvent}
            onClick={() => setCreating(true)}
          >
            <PlusIcon className="h-5 w-5" />
            Criar equipe
          </Button>
        ) : undefined
      }
      activeSection="teams"
      description="Forme equipes por evento, controle vagas, convites, alunos elegíveis e orientador responsável."
      eyebrow="Equipes"
      title="Equipes"
    >
      <AcademicActionDialog
        description={`A equipe nasce no evento ${selectedEvent?.title ?? ''}, já com o seu artigo.`}
        onOpenChange={setCreating}
        onSubmit={(event) => void createTeam(event)}
        open={creating}
        submitLabel="Criar equipe"
        title="Criar equipe"
      >
        <AcademicField label="Nome da equipe" name="identification" required />
        <AcademicField label="Título do artigo" maxLength={300} name="articleTitle" />
      </AcademicActionDialog>

      {receivedItems.length > 0 && (
        <SectionPanel title="Convites recebidos">
          <ul className="space-y-3">
            {receivedItems.map((invitation) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vince-border p-4"
                key={invitation.id}
              >
                <span className="text-vince-text">
                  Convite para a equipe{' '}
                  <strong>
                    {teams.find((team) => team.id === invitation.teamId)?.identification ??
                      'de um evento seu'}
                  </strong>{' '}
                  · válido até{' '}
                  {new Intl.DateTimeFormat('pt-BR').format(new Date(invitation.expiresAt))}
                </span>
                <span className="flex gap-2">
                  <Button
                    onClick={() =>
                      void run(
                        () => mutations.accept.mutateAsync(invitation.id),
                        'Você entrou na equipe.',
                      )
                    }
                    size="sm"
                  >
                    Aceitar
                  </Button>
                  <Button
                    onClick={() =>
                      void run(
                        () => mutations.decline.mutateAsync(invitation.id),
                        'Convite recusado.',
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    Recusar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Equipes no evento"
          value={selectedEvent ? `${teams.length}/${selectedEvent.maxTeams}` : '—'}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Integrantes da equipe"
          value={
            selectedTeam && selectedEvent
              ? `${activeMembers.length}/${selectedEvent.maxTeamSize}`
              : '—'
          }
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Alunos sem equipe"
          value={eligible.data ? String(eligible.data.length) : '—'}
        />
      </section>

      <label className="mt-8 block max-w-xl">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">Evento</span>
        <select
          className={academicFieldClass}
          onChange={(change) => {
            setEventId(change.target.value);
            setSelectedTeamId('');
          }}
          value={selectedEvent?.id ?? ''}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>

      <section className="mt-6 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-w-0 content-start gap-5">
          {teams.map((team) => {
            const article = articleOf(team);
            const view = article ? articleStatusView[article.status] : undefined;
            return (
              <article
                className="rounded-lg border border-vince-border bg-white p-6 shadow-sm"
                key={team.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    {view && <StatusBadge label={view.label} tone={view.tone} />}
                    <h3 className="mt-3 text-xl font-extrabold text-vince-text">
                      {team.identification}
                    </h3>
                    <p className="mt-1 text-vince-muted">{article?.title ?? 'Artigo sem título'}</p>
                    <p className="mt-2 text-sm text-vince-muted">
                      Orientador responsável:{' '}
                      {team.responsibleAdvisorId
                        ? names.nameOf(team.responsibleAdvisorId)
                        : 'não definido'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {can('TEAM:JOIN') && !article?.memberIds.includes(user.id) && (
                      <Button
                        onClick={() =>
                          void run(
                            () => mutations.join.mutateAsync(team.id),
                            'Você entrou na equipe.',
                          )
                        }
                        variant="outline"
                      >
                        Ingressar
                      </Button>
                    )}
                    <Button
                      aria-label={`Gerenciar ${team.identification}`}
                      aria-pressed={team.id === selectedTeam?.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      variant={team.id === selectedTeam?.id ? 'primary' : 'outline'}
                    >
                      Detalhes
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
          {!teamsQuery.isPending && teams.length === 0 && (
            <EmptyState
              title="Nenhuma equipe neste evento"
              description="As equipes formadas no evento aparecerão aqui."
            />
          )}
        </div>

        <SectionPanel title="Composição da equipe">
          {selectedTeam ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-vince-text">
                {selectedTeam.identification}
              </h2>

              <div>
                <h3 className="mb-3 font-extrabold text-vince-text">Integrantes</h3>
                <ul className="space-y-2">
                  {activeMembers.map((member) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vince-border px-4 py-3"
                      key={member.id}
                    >
                      <span className="font-medium text-vince-text">
                        {names.nameOf(member.userId)}{' '}
                        <span className="text-sm text-vince-muted">· {roleLabel[member.role]}</span>
                      </span>
                      {can('TEAM:ASSIGN_MEMBER') && (
                        <span className="flex items-center gap-2">
                          <select
                            aria-label={`Papel de ${names.nameOf(member.userId)}`}
                            className="h-9 rounded-padrao border border-vince-border bg-white px-2 text-sm"
                            onChange={(change) =>
                              void run(
                                () =>
                                  mutations.setRole.mutateAsync({
                                    teamId: selectedTeam.id,
                                    userId: member.userId,
                                    role: change.target.value as MemberRole,
                                  }),
                                'Papel atualizado.',
                              )
                            }
                            value={member.role}
                          >
                            <option value="LEADER">Líder</option>
                            <option value="AUTHOR">Autor</option>
                            <option value="COAUTHOR">Coautor</option>
                          </select>
                          {can('TEAM:REMOVE_MEMBER') && (
                            <button
                              aria-label={`Remover ${names.nameOf(member.userId)}`}
                              className="text-sm font-semibold text-vince-primary"
                              onClick={() =>
                                void run(
                                  () =>
                                    mutations.removeMember.mutateAsync({
                                      teamId: selectedTeam.id,
                                      userId: member.userId,
                                    }),
                                  'Integrante removido.',
                                )
                              }
                              type="button"
                            >
                              Remover
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                  {activeMembers.length === 0 && (
                    <p className="text-sm text-vince-muted">Nenhum integrante ainda.</p>
                  )}
                </ul>
              </div>

              {eligible.data && (
                <div>
                  <h3 className="mb-3 font-extrabold text-vince-text">
                    Alunos elegíveis sem equipe
                  </h3>
                  <ul className="space-y-2">
                    {eligible.data.map((student) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vince-border px-4 py-3"
                        key={student.userId}
                      >
                        <span className="text-vince-text">{names.nameOf(student.userId)}</span>
                        <span className="flex gap-2">
                          <Button
                            aria-label={`Designar ${names.nameOf(student.userId)}`}
                            disabled={teamFull}
                            onClick={() =>
                              void run(
                                () =>
                                  mutations.assignMember.mutateAsync({
                                    teamId: selectedTeam.id,
                                    userId: student.userId,
                                  }),
                                'Aluno designado à equipe.',
                              )
                            }
                            size="sm"
                          >
                            Designar
                          </Button>
                          {can('TEAM:INVITE_MEMBER') && (
                            <Button
                              aria-label={`Convidar ${names.nameOf(student.userId)}`}
                              onClick={() =>
                                void run(
                                  () =>
                                    mutations.invite.mutateAsync({
                                      teamId: selectedTeam.id,
                                      userId: student.userId,
                                    }),
                                  'Convite enviado ao aluno.',
                                )
                              }
                              size="sm"
                              variant="outline"
                            >
                              Convidar
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                    {eligible.data.length === 0 && (
                      <p className="text-sm text-vince-muted">
                        Todos os alunos elegíveis já têm equipe.
                      </p>
                    )}
                  </ul>
                </div>
              )}

              {invitations.data && (
                <div>
                  <h3 className="mb-3 font-extrabold text-vince-text">Convites pendentes</h3>
                  {pendingInvitations.map((invitation) => (
                    <p className="text-sm text-vince-muted" key={invitation.id}>
                      {names.nameOf(invitation.userId)} · até{' '}
                      {new Intl.DateTimeFormat('pt-BR').format(new Date(invitation.expiresAt))}
                    </p>
                  ))}
                  {pendingInvitations.length === 0 && (
                    <p className="text-sm text-vince-muted">Nenhum convite pendente.</p>
                  )}
                </div>
              )}

              {can('TEAM:ASSIGN_ADVISOR') && (
                <div>
                  <h3 className="mb-3 font-extrabold text-vince-text">Orientador responsável</h3>
                  <form
                    className="grid gap-3 sm:grid-cols-[1fr_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const userId = String(new FormData(event.currentTarget).get('advisor') ?? '');
                      if (!userId) return;
                      void run(
                        () =>
                          mutations.assignAdvisor.mutateAsync({ teamId: selectedTeam.id, userId }),
                        'Orientador responsável designado.',
                      );
                    }}
                  >
                    <select
                      aria-label="Orientador responsável"
                      className={academicFieldClass}
                      defaultValue={selectedTeam.responsibleAdvisorId ?? ''}
                      key={selectedTeam.responsibleAdvisorId ?? 'none'}
                      name="advisor"
                    >
                      <option value="">Selecione um orientador do evento</option>
                      {eventAdvisorIds.map((advisorId) => (
                        <option key={advisorId} value={advisorId}>
                          {names.nameOf(advisorId)}
                        </option>
                      ))}
                    </select>
                    <Button type="submit">Designar responsável</Button>
                  </form>
                  {selectedTeam.responsibleAdvisorId && can('TEAM:REVOKE_ADVISOR') && (
                    <Button
                      className="mt-3"
                      onClick={() =>
                        void run(
                          () =>
                            mutations.revokeAdvisor.mutateAsync({
                              teamId: selectedTeam.id,
                              userId: selectedTeam.responsibleAdvisorId ?? '',
                            }),
                          'Orientador responsável revogado.',
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      Revogar responsável
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-vince-muted">Selecione uma equipe.</p>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}
