import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import { useUserNames, useUserSearch } from '@shared/api/directory';
import {
  Button,
  BuildingIcon,
  CalendarIcon,
  EmptyState,
  PlusIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from '@shared/ui';

import {
  statusOfCohort,
  useCohortDetails,
  useCohortMutations,
  useCohorts,
  type CohortDto,
  type CohortStatus,
} from '../api/cohortApi';
import { describeAcademicError, useCourses } from '../api/courseApi';
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

const statusView: Record<CohortStatus, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Ativa', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'muted' },
  planned: { label: 'Planejada', tone: 'warning' },
};

/** As datas da turma são dias de calendário, gravados à meia-noite UTC. */
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso));

/** A validade do convite é um instante: mostrada no fuso de quem vê. */
const formatInstant = (iso: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(iso));

type Action = 'create' | 'professor' | 'student' | 'invite' | null;

/** RF-TUR-001 a RF-TUR-004 (o ingresso por convite, RF-TUR-005, é a tela de aceite). */
export function ClassesPage() {
  const user = useCurrentUser();
  const coursesQuery = useCourses();
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const { cohorts, isPending } = useCohorts(courses);
  const mutations = useCohortMutations();
  const can = (permission: string) => hasPermission(user, permission);

  const [action, setAction] = useState<Action>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CohortStatus>('all');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [lastInvitationUrl, setLastInvitationUrl] = useState('');

  const courseNames = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses],
  );
  const courseName = (courseId: string) => courseNames.get(courseId) ?? 'Curso';

  const visibleClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return cohorts.filter((cohort) => {
      const searchable = [cohort.identification, courseNames.get(cohort.courseId), cohort.term]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      const matchesStatus = status === 'all' || statusOfCohort(cohort) === status;
      return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [cohorts, courseNames, search, status]);

  const selectedClass =
    visibleClasses.find((cohort) => cohort.id === selectedClassId) ?? visibleClasses[0];
  const closed = selectedClass ? statusOfCohort(selectedClass) === 'closed' : true;
  const details = useCohortDetails(selectedClass?.id, user.permissions);
  const professorIds = (details.professors.data ?? []).map((item) => item.userId);
  const enrollments = details.enrollments.data ?? [];
  const names = useUserNames([...professorIds, ...enrollments.map((item) => item.userId)]);
  const professorCandidates = useUserSearch(
    { role: 'PROFESSOR' },
    can('COHORT:ASSIGN_PROFESSOR') && action === 'professor',
  );

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

  async function handleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    let done = false;

    if (action === 'create') {
      if (!text('name') || !text('term') || !text('course')) {
        toast.error('Preencha o curso, o nome e o período da turma.');
        return;
      }
      if (text('endDate') < text('startDate')) {
        toast.error('A data final deve ser igual ou posterior à data inicial.');
        return;
      }
      done = await run(async () => {
        const created = await mutations.create.mutateAsync({
          courseId: text('course'),
          identification: text('name'),
          term: text('term'),
          startsAt: `${text('startDate')}T00:00:00.000Z`,
          endsAt: `${text('endDate')}T00:00:00.000Z`,
        });
        setSelectedClassId(created.id);
        setSearch('');
        setStatus('all');
      }, 'Turma criada.');
    } else if (selectedClass && action === 'professor') {
      done = await run(
        () =>
          mutations.assignProfessor.mutateAsync({
            cohortId: selectedClass.id,
            userId: text('professor'),
          }),
        'Professor designado.',
      );
    } else if (selectedClass && action === 'student') {
      done = await run(
        () =>
          mutations.enroll.mutateAsync({
            cohortId: selectedClass.id,
            name: text('name'),
            email: text('email'),
          }),
        'Aluno cadastrado na turma.',
      );
    } else if (selectedClass && action === 'invite') {
      const expiresAt = new Date(`${text('expiresAt')}T23:59:59`);
      if (expiresAt.getTime() < Date.now()) {
        toast.error('A validade do convite deve ser uma data futura.');
        return;
      }
      done = await run(async () => {
        const issued = await mutations.invite.mutateAsync({
          cohortId: selectedClass.id,
          expiresAt: expiresAt.toISOString(),
        });
        setLastInvitationUrl(issued.url ? `${window.location.origin}${issued.url}` : '');
      }, 'Convite emitido.');
    }

    if (done) setAction(null);
  }

  const activeTerms = new Set(
    cohorts.filter((cohort) => statusOfCohort(cohort) === 'active').map((cohort) => cohort.term),
  );

  return (
    <PageScaffold
      actions={
        <>
          {can('INVITATION:CREATE') && (
            <Button
              className="rounded-padrao px-6"
              disabled={!selectedClass || closed}
              onClick={() => setAction('invite')}
              variant="outline"
            >
              Emitir convite
            </Button>
          )}
          {can('COHORT:CREATE') && (
            <Button className="rounded-padrao px-7" onClick={() => setAction('create')}>
              <PlusIcon className="h-5 w-5" />
              Nova turma
            </Button>
          )}
        </>
      }
      activeSection="classes"
      description="Gerencie turmas por curso e período letivo, incluindo professores, alunos cadastrados e convites de ingresso."
      eyebrow="Turmas"
      title="Turmas"
    >
      <AcademicActionDialog
        description={
          action === 'create'
            ? 'Cadastre a turma e o período letivo.'
            : `Turma: ${selectedClass?.identification ?? ''}.`
        }
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        onSubmit={(event) => void handleAction(event)}
        open={action !== null}
        title={
          action === 'create'
            ? 'Nova turma'
            : action === 'professor'
              ? 'Designar professor'
              : action === 'student'
                ? 'Cadastrar aluno'
                : 'Emitir convite multiuso'
        }
      >
        {action === 'create' ? (
          <>
            <AcademicField label="Nome da turma" name="name" required />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Curso</span>
              <select className={academicFieldClass} name="course" required>
                {courses
                  .filter((course) => course.active)
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
              </select>
            </label>
            <AcademicField label="Período letivo" name="term" placeholder="2026.2" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <AcademicField label="Data inicial" name="startDate" required type="date" />
              <AcademicField label="Data final" name="endDate" required type="date" />
            </div>
          </>
        ) : action === 'invite' ? (
          <AcademicField label="Validade do convite" name="expiresAt" required type="date" />
        ) : action === 'professor' ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vince-muted">Professor</span>
            <select className={academicFieldClass} name="professor" required>
              <option value="">Selecione</option>
              {(professorCandidates.data?.items ?? []).map((professor) => (
                <option key={professor.id} value={professor.id}>
                  {professor.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <AcademicField label="Nome do aluno" name="name" required />
            <AcademicField label="E-mail do aluno" name="email" required type="email" />
          </>
        )}
      </AcademicActionDialog>
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={<BuildingIcon className="h-5 w-5" />}
          label="Turmas cadastradas"
          value={String(cohorts.length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Períodos ativos"
          value={String(activeTerms.size)}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Professores da turma"
          value={selectedClass ? String(professorIds.length) : '—'}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Alunos da turma"
          value={selectedClass && details.enrollments.data ? String(enrollments.length) : '—'}
        />
      </section>

      <section className="mt-8 rounded-lg border border-vince-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar turmas</span>
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-12 w-full rounded-lg border border-vince-border bg-white pl-14 pr-5 text-base text-vince-muted placeholder:text-vince-muted focus:border-vince-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por turma, curso ou período..."
              value={search}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <FilterChip active={status === 'all'} onClick={() => setStatus('all')}>
              Todas
            </FilterChip>
            <FilterChip active={status === 'active'} onClick={() => setStatus('active')}>
              Ativas
            </FilterChip>
            <FilterChip active={status === 'planned'} onClick={() => setStatus('planned')}>
              Planejadas
            </FilterChip>
            <FilterChip active={status === 'closed'} onClick={() => setStatus('closed')}>
              Encerradas
            </FilterChip>
          </div>
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-5">
          {visibleClasses.map((cohort) => (
            <ClassCard
              cohort={cohort}
              courseName={courseName(cohort.courseId)}
              key={cohort.id}
              onSelect={() => setSelectedClassId(cohort.id)}
              selected={cohort.id === selectedClass?.id}
            />
          ))}
          {isPending && (
            <p className="text-center text-vince-muted" role="status">
              Carregando turmas…
            </p>
          )}
          {!isPending && visibleClasses.length === 0 && (
            <EmptyState
              title="Nenhuma turma encontrada"
              description="Ajuste a busca ou os filtros para encontrar outras turmas."
            />
          )}
        </div>

        <SectionPanel title="Operação da turma">
          {selectedClass && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-primary">
                  {selectedClass.term}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-vince-text">
                  {selectedClass.identification}
                </h2>
                <p className="mt-2 text-vince-muted">{courseName(selectedClass.courseId)}</p>
              </div>

              <div className="grid gap-3">
                {can('COHORT:ASSIGN_PROFESSOR') && (
                  <Button disabled={closed} onClick={() => setAction('professor')}>
                    Designar professor
                  </Button>
                )}
                {can('ENROLLMENT:CREATE') && (
                  <Button disabled={closed} onClick={() => setAction('student')} variant="outline">
                    Cadastrar aluno
                  </Button>
                )}
                {can('INVITATION:CREATE') && (
                  <Button disabled={closed} onClick={() => setAction('invite')} variant="outline">
                    Emitir convite multiuso
                  </Button>
                )}
                {can('COHORT:DEACTIVATE') && selectedClass.active && (
                  <Button
                    onClick={() =>
                      void run(
                        () => mutations.deactivate.mutateAsync(selectedClass),
                        'Turma encerrada.',
                      )
                    }
                    variant="outline"
                  >
                    Encerrar turma
                  </Button>
                )}
              </div>

              {lastInvitationUrl && (
                <p
                  className="break-all rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
                  role="status"
                >
                  Link do convite: <span className="font-semibold">{lastInvitationUrl}</span>
                </p>
              )}

              <ListBox title="Professores">
                {professorIds.map((professorId) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    key={professorId}
                  >
                    <span className="font-medium text-vince-muted">
                      {names.nameOf(professorId)}
                    </span>
                    {can('COHORT:REVOKE_PROFESSOR') && (
                      <button
                        aria-label={`Revogar professor ${names.nameOf(professorId)}`}
                        className="min-h-10 text-sm font-semibold text-vince-primary"
                        onClick={() =>
                          void run(
                            () =>
                              mutations.revokeProfessor.mutateAsync({
                                cohortId: selectedClass.id,
                                userId: professorId,
                              }),
                            'Vínculo do professor revogado.',
                          )
                        }
                        type="button"
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                ))}
                {professorIds.length === 0 && (
                  <p className="px-4 py-4 text-sm text-vince-muted">Nenhum professor designado.</p>
                )}
              </ListBox>

              {details.enrollments.data && (
                <ListBox title="Alunos matriculados">
                  {enrollments.map((enrollment) => (
                    <p className="px-4 py-3 text-sm text-vince-muted" key={enrollment.id}>
                      {names.nameOf(enrollment.userId)}
                    </p>
                  ))}
                  {enrollments.length === 0 && (
                    <p className="px-4 py-4 text-sm text-vince-muted">Nenhum aluno matriculado.</p>
                  )}
                </ListBox>
              )}

              {details.invitations.data && (
                <ListBox title="Convites">
                  {details.invitations.data.map((invitation) => {
                    const active = invitation.state === 'ACTIVE';
                    return (
                      <div className="px-4 py-3" key={invitation.invitationId}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="break-all font-bold text-vince-primary">
                            Convite {invitation.invitationId.slice(-6).toUpperCase()}
                          </span>
                          <StatusBadge
                            label={
                              active
                                ? 'Ativo'
                                : invitation.state === 'REVOKED'
                                  ? 'Revogado'
                                  : 'Encerrado'
                            }
                            tone={active ? 'success' : 'muted'}
                          />
                        </div>
                        <p className="mt-1 text-sm text-vince-muted">
                          Validade:{' '}
                          {invitation.expiresAt ? formatInstant(invitation.expiresAt) : '—'} · Usos:{' '}
                          {invitation.useCount ?? 0}
                        </p>
                        {active && can('INVITATION:REVOKE') && (
                          <button
                            aria-label={`Revogar convite ${invitation.invitationId.slice(-6).toUpperCase()}`}
                            className="mt-2 min-h-10 text-sm font-semibold text-vince-primary"
                            onClick={() =>
                              void run(
                                () =>
                                  mutations.revokeInvitation.mutateAsync({
                                    cohortId: selectedClass.id,
                                    invitationId: invitation.invitationId,
                                  }),
                                'Convite revogado.',
                              )
                            }
                            type="button"
                          >
                            Revogar convite
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {details.invitations.data.length === 0 && (
                    <p className="px-4 py-4 text-sm text-vince-muted">
                      Nenhum convite emitido para esta turma.
                    </p>
                  )}
                </ListBox>
              )}
            </div>
          )}
          {!selectedClass && (
            <p className="text-sm text-vince-muted">
              Selecione uma turma da lista para gerenciar seus vínculos.
            </p>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function ListBox({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-vince-border">
      <div className="border-b border-vince-border px-4 py-3 font-bold text-vince-text">
        {title}
      </div>
      <div className="divide-y divide-vince-border">{children}</div>
    </div>
  );
}

function ClassCard({
  cohort,
  courseName,
  onSelect,
  selected,
}: {
  cohort: CohortDto;
  courseName: string;
  onSelect: () => void;
  selected: boolean;
}) {
  const view = statusView[statusOfCohort(cohort)];

  return (
    <article className="rounded-lg border border-vince-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <StatusBadge label={view.label} tone={view.tone} />
            <span className="text-sm font-semibold text-vince-muted">{cohort.term}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-vince-text">{cohort.identification}</h2>
          <p className="mt-2 text-vince-muted">{courseName}</p>
        </div>
        <Button
          aria-pressed={selected}
          onClick={onSelect}
          variant={selected ? 'primary' : 'outline'}
        >
          Gerenciar
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-vince-border pt-5 lg:grid-cols-4">
        <Info label="Início" value={formatDate(cohort.startsAt)} />
        <Info label="Fim" value={formatDate(cohort.endsAt)} />
        <Info label="Período" value={cohort.term} />
        <Info label="Situação" value={cohort.active ? 'Ativa' : 'Desativada'} />
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-muted">{label}</p>
      <p className="mt-1 text-base font-extrabold text-vince-text">{value}</p>
    </div>
  );
}
