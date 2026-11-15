import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import { useUserNames, useUserSearch } from '@shared/api/directory';
import {
  Button,
  EmptyState,
  FilterIcon,
  GraduationCapIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from '@shared/ui';

import {
  describeAcademicError,
  useCourseMutations,
  useCourses,
  type CourseDto,
} from '../api/courseApi';
import { AcademicActionDialog, AcademicField } from '../components/AcademicActionDialog';
import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

type CourseStatus = 'active' | 'inactive';

const statusView: Record<CourseStatus, { label: string; tone: 'success' | 'muted' }> = {
  active: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'muted' },
};

const statusOf = (course: CourseDto): CourseStatus => (course.active ? 'active' : 'inactive');

/** RF-CUR-001 (manter curso) e RF-CUR-002 (designar coordenador). */
export function CoursesPage() {
  const user = useCurrentUser();
  const coursesQuery = useCourses();
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const mutations = useCourseMutations();
  const names = useUserNames(courses.map((course) => course.coordinatorId));
  const canCreate = hasPermission(user, 'COURSE:CREATE');
  const canAssign = hasPermission(user, 'COURSE:ASSIGN_COORDINATOR');
  const professors = useUserSearch({ role: 'PROFESSOR' }, canAssign);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [status, setStatus] = useState<'all' | CourseStatus>('all');

  const visibleCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return courses.filter((course) => {
      const matchesStatus = status === 'all' || statusOf(course) === status;
      const searchable = [
        course.name,
        course.identification,
        names.nameOf(course.coordinatorId, ''),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');

      return (
        matchesStatus && (normalizedSearch.length === 0 || searchable.includes(normalizedSearch))
      );
    });
  }, [courses, names, search, status]);

  const selectedCourse =
    visibleCourses.find((course) => course.id === selectedCourseId) ?? visibleCourses[0];

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const identification = String(form.get('code') ?? '').trim();
    if (!name || !identification) {
      toast.error('Preencha o nome e o código.');
      return;
    }
    try {
      const created = await mutations.create.mutateAsync({ name, identification });
      setSelectedCourseId(created.id);
      setSearch('');
      setStatus('all');
      setCreating(false);
      toast.success('Curso cadastrado.');
    } catch (error) {
      toast.error(describeAcademicError(error));
    }
  }

  async function updateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;
    const form = new FormData(event.currentTarget);
    try {
      await mutations.update.mutateAsync({
        id: selectedCourse.id,
        name: String(form.get('name') ?? '').trim(),
        identification: String(form.get('code') ?? '').trim(),
      });
      setEditing(false);
      toast.success('Curso atualizado.');
    } catch (error) {
      toast.error(describeAcademicError(error));
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(describeAcademicError(error));
    }
  }

  return (
    <PageScaffold
      actions={
        canCreate ? (
          <Button className="rounded-padrao px-7" onClick={() => setCreating(true)} size="md">
            <PlusIcon className="h-5 w-5" />
            Novo curso
          </Button>
        ) : undefined
      }
      activeSection="courses"
      description="Cadastre, consulte, atualize e desative cursos da instituição, mantendo a coordenação ativa e auditável."
      eyebrow="Cursos"
      title="Cursos"
    >
      <AcademicActionDialog
        description="Informe os dados do novo curso. Ele pertence à sua instituição."
        onOpenChange={setCreating}
        onSubmit={(event) => void createCourse(event)}
        open={creating}
        submitLabel="Criar curso"
        title="Novo curso"
      >
        <AcademicField label="Nome do curso" name="name" required />
        <AcademicField label="Código" name="code" required />
      </AcademicActionDialog>
      {selectedCourse && (
        <AcademicActionDialog
          description="Altere o nome ou o código do curso."
          onOpenChange={setEditing}
          onSubmit={(event) => void updateCourse(event)}
          open={editing}
          submitLabel="Salvar curso"
          title="Editar curso"
        >
          <AcademicField
            defaultValue={selectedCourse.name}
            label="Nome do curso"
            name="name"
            required
          />
          <AcademicField
            defaultValue={selectedCourse.identification}
            label="Código"
            name="code"
            required
          />
        </AcademicActionDialog>
      )}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          icon={<GraduationCapIcon className="h-5 w-5" />}
          label="Cursos ativos"
          value={String(courses.filter((course) => course.active).length)}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Coordenadores definidos"
          value={String(courses.filter((course) => course.coordinatorId).length)}
        />
        <MetricCard
          icon={<FilterIcon className="h-5 w-5" />}
          label="Cursos desativados"
          tone="muted"
          value={String(courses.filter((course) => !course.active).length)}
        />
      </section>

      <section className="mt-8 rounded-lg border border-vince-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar cursos</span>
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-12 w-full rounded-lg border border-vince-border bg-white pl-14 pr-5 text-base text-vince-muted placeholder:text-vince-muted focus:border-vince-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por curso, código ou coordenador..."
              value={search}
            />
          </label>

          <select
            aria-label="Filtrar cursos por status"
            className="h-12 rounded-lg border border-vince-border bg-white px-5 text-base text-vince-text focus:border-vince-primary lg:w-[190px]"
            onChange={(event) => setStatus(event.target.value as 'all' | CourseStatus)}
            value={status}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm">
          <div aria-label="Lista de cursos" className="overflow-x-auto" role="region" tabIndex={0}>
            <div className="grid min-w-[760px] grid-cols-[1.7fr_0.7fr_1.4fr_0.3fr] border-b border-vince-border bg-[#fbf8f8] px-6 py-5 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
              <span>Curso</span>
              <span>Status</span>
              <span>Coordenador</span>
              <span>Ações</span>
            </div>
            {visibleCourses.map((course) => (
              <CourseRow
                coordinator={names.userOf(course.coordinatorId)}
                course={course}
                key={course.id}
                onSelect={() => setSelectedCourseId(course.id)}
                selected={course.id === selectedCourse?.id}
              />
            ))}
            {coursesQuery.isPending && (
              <p className="px-6 py-10 text-center text-vince-muted" role="status">
                Carregando cursos…
              </p>
            )}
            {!coursesQuery.isPending && visibleCourses.length === 0 && (
              <EmptyState
                title="Nenhum curso encontrado"
                description="Ajuste a busca ou o status para consultar outros cursos."
              />
            )}
          </div>
        </section>

        <SectionPanel title="Designar coordenador">
          {selectedCourse && (
            <form
              className="space-y-5"
              key={`${selectedCourse.id}-${selectedCourse.coordinatorId ?? 'none'}`}
              onSubmit={(event) => {
                event.preventDefault();
                const userId = String(new FormData(event.currentTarget).get('coordinator') ?? '');
                if (!userId) {
                  toast.error('Selecione um coordenador.');
                  return;
                }
                void run(
                  () => mutations.assignCoordinator.mutateAsync({ id: selectedCourse.id, userId }),
                  'Coordenação atualizada.',
                );
              }}
            >
              <div className="rounded-lg border border-vince-border bg-[#fffafa] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-primary">
                  Curso selecionado
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-vince-text">
                  {selectedCourse.name}
                </h3>
                <p className="mt-1 text-sm text-vince-muted">
                  {selectedCourse.identification} · {statusView[statusOf(selectedCourse)].label}
                </p>
              </div>

              {canAssign && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">
                    Coordenador ativo
                  </span>
                  <select
                    className="h-12 w-full rounded-lg border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                    defaultValue={selectedCourse.coordinatorId ?? ''}
                    name="coordinator"
                    required
                  >
                    <option value="">Selecione um coordenador</option>
                    {(professors.data?.items ?? []).map((professor) => (
                      <option key={professor.id} value={professor.id}>
                        {professor.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid gap-3">
                {canAssign && <Button type="submit">Salvar designação</Button>}
                {canAssign && (
                  <Button
                    disabled={!selectedCourse.coordinatorId}
                    onClick={() =>
                      void run(
                        () =>
                          mutations.revokeCoordinator.mutateAsync({
                            id: selectedCourse.id,
                            userId: selectedCourse.coordinatorId ?? '',
                          }),
                        'Coordenação revogada.',
                      )
                    }
                    type="button"
                    variant="outline"
                  >
                    Revogar coordenação
                  </Button>
                )}
                {hasPermission(user, 'COURSE:UPDATE') && (
                  <Button onClick={() => setEditing(true)} type="button" variant="outline">
                    Editar curso
                  </Button>
                )}
                {hasPermission(user, 'COURSE:DEACTIVATE') && selectedCourse.active && (
                  <Button
                    onClick={() =>
                      void run(
                        () => mutations.deactivate.mutateAsync(selectedCourse.id),
                        'Curso desativado.',
                      )
                    }
                    type="button"
                    variant="outline"
                  >
                    Desativar curso
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-vince-border p-4 text-sm leading-6 text-vince-muted">
                <p className="font-bold text-vince-text">Regra aplicada</p>
                <p className="mt-2">
                  No máximo um coordenador ativo por curso; a designação substitui a anterior.
                </p>
              </div>
            </form>
          )}
          {!selectedCourse && (
            <p className="text-sm text-vince-muted">
              Selecione um curso da lista para gerenciar a coordenação.
            </p>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function CourseRow({
  coordinator,
  course,
  onSelect,
  selected,
}: {
  coordinator: { name: string; email?: string } | undefined;
  course: CourseDto;
  onSelect: () => void;
  selected: boolean;
}) {
  const view = statusView[statusOf(course)];

  return (
    <article
      className="grid min-w-[760px] grid-cols-[1.7fr_0.7fr_1.4fr_0.3fr] items-center border-b border-vince-border px-6 py-5 last:border-b-0"
      data-selected={selected || undefined}
    >
      <div>
        <h2 className="text-lg font-extrabold text-vince-text">{course.name}</h2>
        <p className="mt-1 text-sm text-vince-muted">{course.identification}</p>
      </div>
      <StatusBadge label={view.label} tone={view.tone} />
      <div>
        <p className="font-semibold text-vince-text">
          {course.coordinatorId ? (coordinator?.name ?? 'Carregando…') : 'Nenhum'}
        </p>
        <p className="mt-1 text-sm text-vince-muted">
          {course.coordinatorId ? (coordinator?.email ?? '') : 'Coordenador não definido'}
        </p>
      </div>
      <button
        aria-label={`Selecionar ${course.name}`}
        aria-pressed={selected}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-primary hover:bg-vince-tertiary"
        onClick={onSelect}
        type="button"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
    </article>
  );
}
