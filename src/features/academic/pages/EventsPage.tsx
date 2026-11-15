import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import { useUserNames, useUserSearch } from '@shared/api/directory';
import { Button, CalendarIcon, EmptyState, PlusIcon, UsersIcon } from '@shared/ui';

import { useCohorts } from '../api/cohortApi';
import { describeAcademicError, useCourses } from '../api/courseApi';
import {
  useEventDetails,
  useEventMutations,
  useEvents,
  useTemplates,
  type EventDto,
  type EventInput,
  type EventScopeType,
} from '../api/eventApi';
import {
  AcademicActionDialog,
  AcademicField,
  academicFieldClass,
} from '../components/AcademicActionDialog';
import {
  FilterChip,
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

const scopeLabel: Record<EventScopeType, string> = {
  COHORT: 'Turma',
  COURSE: 'Curso',
  INSTITUTION: 'Instituição',
};

const errorText: Record<string, string> = {
  EVENT_SCOPE_NOT_ALLOWED: 'Seu vínculo não permite criar evento neste escopo.',
  MILESTONE_DATE_CONFLICT: 'Os prazos das etapas precisam ser crescentes, na ordem do cronograma.',
  MILESTONE_NOT_OPEN: 'A etapa já começou e não pode ser alterada.',
  STUDENT_NOT_ELIGIBLE: 'O professor não é elegível neste evento: está fora do escopo.',
};

function describe(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : '';
  return errorText[code] ?? describeAcademicError(error);
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );

type Action = 'create' | 'edit' | null;

/** RF-EVT-001 a RF-EVT-004: eventos por escopo, cronograma e orientadores. */
export function EventsPage() {
  const user = useCurrentUser();
  const can = (permission: string) => hasPermission(user, permission);
  const eventsQuery = useEvents();
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const coursesQuery = useCourses(can('COURSE:READ'));
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const { cohorts } = useCohorts(can('COHORT:READ') ? courses : []);
  const templates = useTemplates(can('TEMPLATE:READ') && can('EVENT:CREATE'));
  const mutations = useEventMutations();

  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [action, setAction] = useState<Action>(null);
  const [scopeType, setScopeType] = useState<EventScopeType>(
    user.roles.includes('institutionAdmin')
      ? 'INSTITUTION'
      : user.roles.includes('coordinator')
        ? 'COURSE'
        : 'COHORT',
  );

  const visibleEvents = events.filter(
    (event) =>
      filter === 'all' ||
      (filter === 'active' ? event.status === 'ACTIVE' : event.status === 'CANCELLED'),
  );
  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) ?? visibleEvents[0];
  const details = useEventDetails(selectedEvent?.id);
  const advisorIds = (details.advisors.data ?? []).map((item) => item.userId);
  const names = useUserNames([...advisorIds, selectedEvent?.ownerId]);
  const professors = useUserSearch({ role: 'PROFESSOR' }, can('EVENT:ASSIGN_ADVISOR'));

  const scopeName = (event: EventDto) => {
    if (event.scopeType === 'COURSE')
      return courses.find((course) => course.id === event.scopeId)?.name;
    if (event.scopeType === 'COHORT')
      return cohorts.find((cohort) => cohort.id === event.scopeId)?.identification;
    return 'Toda a instituição';
  };

  async function run(task: () => Promise<unknown>, success: string) {
    try {
      await task();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(describe(error));
      return false;
    }
  }

  function readInput(form: FormData): EventInput {
    const text = (key: string) => String(form.get(key) ?? '').trim();
    return {
      title: text('title'),
      theme: text('theme'),
      researchProblem: text('researchProblem'),
      objectives: text('objectives'),
      maxTeams: Number(form.get('maxTeams')),
      maxTeamSize: Number(form.get('maxTeamSize')),
    };
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const form = new FormData(submitEvent.currentTarget);
    const input = readInput(form);
    if (input.maxTeams < 1 || input.maxTeamSize < 1) {
      toast.error('Os limites de equipes e de integrantes devem ser positivos.');
      return;
    }

    if (action === 'create') {
      const scopeId =
        scopeType === 'INSTITUTION'
          ? (user.institutionId ?? '')
          : String(form.get('scopeId') ?? '');
      if (!scopeId) {
        toast.error('Selecione o alvo do escopo.');
        return;
      }
      const templateId = String(form.get('templateId') ?? '');
      const done = await run(async () => {
        const created = await mutations.create.mutateAsync({
          ...input,
          scopeType,
          scopeId,
          ...(templateId ? { templateId } : {}),
        });
        setSelectedEventId(created.id);
        setFilter('all');
      }, 'Evento criado.');
      if (done) setAction(null);
    } else if (action === 'edit' && selectedEvent) {
      const done = await run(
        () => mutations.update.mutateAsync({ id: selectedEvent.id, ...input }),
        'Evento atualizado.',
      );
      if (done) setAction(null);
    }
  }

  async function addMilestone(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!selectedEvent) return;
    const formElement = submitEvent.currentTarget;
    const form = new FormData(formElement);
    const milestones = details.milestones.data ?? [];
    const done = await run(
      () =>
        mutations.addMilestone.mutateAsync({
          eventId: selectedEvent.id,
          name: String(form.get('name') ?? '').trim(),
          order: (milestones.at(-1)?.order ?? 0) + 1,
          dueAt: new Date(`${String(form.get('dueAt'))}T23:59:00`).toISOString(),
        }),
      'Etapa adicionada ao cronograma.',
    );
    if (done) formElement.reset();
  }

  const editing = action === 'edit' ? selectedEvent : undefined;

  return (
    <PageScaffold
      actions={
        can('EVENT:CREATE') ? (
          <Button onClick={() => setAction('create')}>
            <PlusIcon className="h-5 w-5" />
            Novo evento
          </Button>
        ) : undefined
      }
      activeSection="events"
      description="Eventos acadêmicos por escopo, com tema, problema de pesquisa, limites de equipes, cronograma de entregas e orientadores."
      eyebrow="Eventos"
      title={user.roles.includes('student') && user.roles.length === 1 ? 'Meus eventos' : 'Eventos'}
    >
      <AcademicActionDialog
        description={
          action === 'create'
            ? 'O evento torna elegíveis os professores e alunos do alvo do escopo.'
            : 'Altere os dados do evento. Os limites não podem ficar abaixo do já utilizado.'
        }
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
        open={action !== null}
        submitLabel={action === 'create' ? 'Criar evento' : 'Salvar evento'}
        title={action === 'create' ? 'Novo evento' : 'Editar evento'}
      >
        {action === 'create' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Escopo</span>
              <select
                className={academicFieldClass}
                onChange={(change) => setScopeType(change.target.value as EventScopeType)}
                value={scopeType}
              >
                <option value="COHORT">Turma</option>
                <option value="COURSE">Curso</option>
                <option value="INSTITUTION">Instituição</option>
              </select>
            </label>
            {scopeType !== 'INSTITUTION' && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  {scopeType === 'COHORT' ? 'Turma' : 'Curso'}
                </span>
                <select className={academicFieldClass} name="scopeId" required>
                  <option value="">Selecione</option>
                  {scopeType === 'COHORT'
                    ? cohorts
                        .filter((cohort) => cohort.active)
                        .map((cohort) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.identification} ({cohort.term})
                          </option>
                        ))
                    : courses
                        .filter((course) => course.active)
                        .map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                </select>
              </label>
            )}
          </div>
        )}
        <AcademicField
          defaultValue={editing?.title}
          label="Título do evento"
          maxLength={200}
          name="title"
          required
        />
        <AcademicField
          defaultValue={editing?.theme}
          label="Tema"
          maxLength={500}
          name="theme"
          required
        />
        <AcademicField
          defaultValue={editing?.researchProblem}
          label="Problema de pesquisa"
          name="researchProblem"
          required
        />
        <AcademicField
          defaultValue={editing?.objectives}
          label="Objetivos"
          name="objectives"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AcademicField
            defaultValue={editing?.maxTeams ?? 10}
            label="Máximo de equipes"
            min={1}
            name="maxTeams"
            required
            type="number"
          />
          <AcademicField
            defaultValue={editing?.maxTeamSize ?? 4}
            label="Integrantes por equipe"
            min={1}
            name="maxTeamSize"
            required
            type="number"
          />
        </div>
        {action === 'create' && (templates.data?.length ?? 0) > 0 && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vince-muted">
              Modelo de artigo (opcional)
            </span>
            <select className={academicFieldClass} name="templateId">
              <option value="">Sem modelo</option>
              {(templates.data ?? [])
                .filter((template) => template.active)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
            </select>
          </label>
        )}
      </AcademicActionDialog>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Eventos ativos"
          value={String(events.filter((event) => event.status === 'ACTIVE').length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Eventos cancelados"
          tone="muted"
          value={String(events.filter((event) => event.status === 'CANCELLED').length)}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Orientadores do evento"
          value={selectedEvent ? String(advisorIds.length) : '—'}
        />
      </section>

      <div aria-label="Filtrar eventos" className="mt-8 flex flex-wrap gap-3">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos
        </FilterChip>
        <FilterChip active={filter === 'active'} onClick={() => setFilter('active')}>
          Ativos
        </FilterChip>
        <FilterChip active={filter === 'cancelled'} onClick={() => setFilter('cancelled')}>
          Cancelados
        </FilterChip>
      </div>

      <section className="mt-6 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-w-0 content-start gap-5">
          {visibleEvents.map((event) => (
            <article
              className="rounded-lg border border-vince-border bg-white p-6 shadow-sm"
              key={event.id}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <StatusBadge
                      label={event.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                      tone={event.status === 'ACTIVE' ? 'success' : 'muted'}
                    />
                    <span className="text-sm font-semibold text-vince-muted">
                      {scopeLabel[event.scopeType]} · {scopeName(event) ?? '—'}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight text-vince-text">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-vince-muted">{event.theme}</p>
                </div>
                <Button
                  aria-label={`Abrir ${event.title}`}
                  aria-pressed={event.id === selectedEvent?.id}
                  onClick={() => setSelectedEventId(event.id)}
                  variant={event.id === selectedEvent?.id ? 'primary' : 'outline'}
                >
                  Detalhes
                </Button>
              </div>
              <p className="mt-4 text-sm text-vince-muted">
                Até {event.maxTeams} equipes · até {event.maxTeamSize} integrantes por equipe
              </p>
            </article>
          ))}
          {eventsQuery.isPending && (
            <p className="text-center text-vince-muted" role="status">
              Carregando eventos…
            </p>
          )}
          {!eventsQuery.isPending && visibleEvents.length === 0 && (
            <EmptyState
              title="Nenhum evento encontrado"
              description="Quando houver eventos no seu escopo, eles aparecerão aqui."
            />
          )}
        </div>

        <SectionPanel title="Detalhes e cronograma">
          {selectedEvent ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-vince-text">{selectedEvent.title}</h2>
                <p className="mt-2 text-sm text-vince-muted">
                  Responsável: {names.nameOf(selectedEvent.ownerId)}
                </p>
              </div>
              <Info label="Tema" value={selectedEvent.theme} />
              <Info label="Problema de pesquisa" value={selectedEvent.researchProblem} />
              <Info label="Objetivos" value={selectedEvent.objectives} />

              {selectedEvent.status === 'ACTIVE' && can('EVENT:UPDATE') && (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setAction('edit')} size="sm" variant="outline">
                    Editar evento
                  </Button>
                  {can('EVENT:CANCEL') && (
                    <Button
                      onClick={() =>
                        void run(
                          () => mutations.cancel.mutateAsync(selectedEvent.id),
                          'Evento cancelado.',
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      Cancelar evento
                    </Button>
                  )}
                </div>
              )}

              <div>
                <h3 className="mb-3 font-extrabold text-vince-text">Cronograma de entregas</h3>
                <ol className="space-y-3">
                  {(details.milestones.data ?? []).map((milestone) => (
                    <li className="rounded-lg border border-vince-border p-4" key={milestone.id}>
                      <p className="font-bold text-vince-text">
                        {milestone.order}. {milestone.name}
                      </p>
                      <p className="text-sm text-vince-muted">
                        Prazo: {formatDate(milestone.dueAt)}
                      </p>
                      {selectedEvent.status === 'ACTIVE' && can('MILESTONE:DELETE') && (
                        <button
                          aria-label={`Remover etapa ${milestone.name}`}
                          className="mt-2 text-sm font-semibold text-vince-primary"
                          onClick={() =>
                            void run(
                              () =>
                                mutations.removeMilestone.mutateAsync({
                                  eventId: selectedEvent.id,
                                  milestoneId: milestone.id,
                                }),
                              'Etapa removida.',
                            )
                          }
                          type="button"
                        >
                          Remover
                        </button>
                      )}
                    </li>
                  ))}
                  {details.milestones.data?.length === 0 && (
                    <p className="text-sm text-vince-muted">Nenhuma etapa no cronograma.</p>
                  )}
                </ol>
                {selectedEvent.status === 'ACTIVE' && can('MILESTONE:CREATE') && (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_170px_auto]"
                    onSubmit={(submitEvent) => void addMilestone(submitEvent)}
                  >
                    <AcademicField label="Nova etapa" name="name" required />
                    <AcademicField label="Prazo da etapa" name="dueAt" required type="date" />
                    <Button className="self-end" type="submit">
                      Adicionar
                    </Button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-extrabold text-vince-text">Orientadores do evento</h3>
                <ul className="space-y-2">
                  {advisorIds.map((advisorId) => (
                    <li
                      className="flex items-center justify-between gap-3 rounded-lg border border-vince-border px-4 py-3"
                      key={advisorId}
                    >
                      <span className="font-medium text-vince-text">{names.nameOf(advisorId)}</span>
                      {can('EVENT:REVOKE_ADVISOR') && (
                        <button
                          aria-label={`Revogar orientador ${names.nameOf(advisorId)}`}
                          className="text-sm font-semibold text-vince-primary"
                          onClick={() =>
                            void run(
                              () =>
                                mutations.revokeAdvisor.mutateAsync({
                                  eventId: selectedEvent.id,
                                  userId: advisorId,
                                }),
                              'Orientador revogado.',
                            )
                          }
                          type="button"
                        >
                          Revogar
                        </button>
                      )}
                    </li>
                  ))}
                  {advisorIds.length === 0 && (
                    <p className="text-sm text-vince-muted">Nenhum orientador designado.</p>
                  )}
                </ul>
                {selectedEvent.status === 'ACTIVE' && can('EVENT:ASSIGN_ADVISOR') && (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
                    onSubmit={(submitEvent) => {
                      submitEvent.preventDefault();
                      const userId = String(
                        new FormData(submitEvent.currentTarget).get('advisor') ?? '',
                      );
                      if (!userId) return;
                      void run(
                        () =>
                          mutations.assignAdvisor.mutateAsync({
                            eventId: selectedEvent.id,
                            userId,
                          }),
                        'Orientador designado.',
                      );
                    }}
                  >
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-vince-muted">
                        Professor orientador
                      </span>
                      <select className={academicFieldClass} name="advisor" required>
                        <option value="">Selecione</option>
                        {(professors.data?.items ?? [])
                          .filter((professor) => !advisorIds.includes(professor.id))
                          .map((professor) => (
                            <option key={professor.id} value={professor.id}>
                              {professor.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Button className="self-end" type="submit">
                      Designar orientador
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-vince-muted">Selecione um evento para ver os detalhes.</p>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-muted">{label}</p>
      <p className="mt-1 text-base text-vince-text">{value}</p>
    </div>
  );
}
