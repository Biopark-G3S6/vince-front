import { useMemo, useState } from 'react';

import {
  Button,
  FilterIcon,
  GraduationCapIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from '@shared/ui';

import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { courses, type Course, type CourseStatus } from '../model/academic';

const statusView: Record<CourseStatus, { label: string; tone: 'success' | 'muted' }> = {
  active: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'muted' },
};

export function CoursesPage() {
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? '');
  const [status, setStatus] = useState<'all' | CourseStatus>('all');

  const visibleCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return courses.filter((course) => {
      const matchesStatus = status === 'all' || course.status === status;
      const searchable = [course.name, course.code, course.institution, course.coordinator?.name]
        .join(' ')
        .toLocaleLowerCase('pt-BR');

      return (
        matchesStatus && (normalizedSearch.length === 0 || searchable.includes(normalizedSearch))
      );
    });
  }, [search, status]);

  const selectedCourse =
    courses.find((course) => course.id === selectedCourseId) ?? visibleCourses[0] ?? courses[0];

  return (
    <PageScaffold
      actions={
        <Button className="rounded-padrao px-7" size="md">
          <PlusIcon className="h-5 w-5" />
          Novo curso
        </Button>
      }
      activeSection="courses"
      description="Cadastre, consulte, atualize e desative cursos da instituição, mantendo a coordenação ativa e auditável."
      eyebrow="Cursos"
      title="Cursos"
    >
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={<GraduationCapIcon className="h-5 w-5" />}
          label="Cursos ativos"
          value={String(courses.filter((course) => course.status === 'active').length)}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Coordenadores definidos"
          value={String(courses.filter((course) => course.coordinator).length)}
        />
        <MetricCard
          icon={<FilterIcon className="h-5 w-5" />}
          label="Cursos desativados"
          tone="muted"
          value={String(courses.filter((course) => course.status === 'inactive').length)}
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
              placeholder="Buscar por curso, código, instituição ou coordenador..."
              value={search}
            />
          </label>

          <select
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

      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm">
          <div className="grid min-w-[940px] grid-cols-[1.7fr_0.7fr_1.4fr_0.55fr_0.55fr_0.3fr] border-b border-vince-border bg-[#fbf8f8] px-6 py-5 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            <span>Curso</span>
            <span>Status</span>
            <span>Coordenador</span>
            <span>Turmas</span>
            <span>Eventos</span>
            <span>Ações</span>
          </div>
          <div className="overflow-x-auto">
            {visibleCourses.map((course) => (
              <CourseRow
                course={course}
                key={course.id}
                onSelect={() => setSelectedCourseId(course.id)}
                selected={course.id === selectedCourse?.id}
              />
            ))}
          </div>
        </section>

        <SectionPanel title="Designar coordenador">
          {selectedCourse && (
            <div className="space-y-5">
              <div className="rounded-lg border border-vince-border bg-[#fffafa] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-primary">
                  Curso selecionado
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-vince-text">
                  {selectedCourse.name}
                </h3>
                <p className="mt-1 text-sm text-vince-muted">{selectedCourse.institution}</p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Coordenador ativo
                </span>
                <select className="h-12 w-full rounded-lg border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary">
                  <option>{selectedCourse.coordinator?.name ?? 'Sem coordenador'}</option>
                  <option>Dra. Helena Torres</option>
                  <option>Prof. Gustavo Lima</option>
                </select>
              </label>

              <div className="grid gap-3">
                <Button>Salvar designação</Button>
                <Button variant="outline">Revogar coordenação</Button>
              </div>

              <div className="rounded-lg border border-vince-border p-4 text-sm leading-6 text-vince-muted">
                <p className="font-bold text-vince-text">Trilha de auditoria</p>
                <p className="mt-2">Última alteração: 18 Set, 2026 por Admin Geral.</p>
                <p>Regra aplicada: no máximo um coordenador ativo por curso.</p>
              </div>
            </div>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function CourseRow({
  course,
  onSelect,
  selected,
}: {
  course: Course;
  onSelect: () => void;
  selected: boolean;
}) {
  const view = statusView[course.status];

  return (
    <article
      className="grid min-w-[940px] grid-cols-[1.7fr_0.7fr_1.4fr_0.55fr_0.55fr_0.3fr] items-center border-b border-vince-border px-6 py-5 last:border-b-0"
      data-selected={selected || undefined}
    >
      <div>
        <h2 className="text-lg font-extrabold text-vince-text">{course.name}</h2>
        <p className="mt-1 text-sm text-vince-muted">
          {course.code} · {course.institution}
        </p>
      </div>
      <StatusBadge label={view.label} tone={view.tone} />
      <div>
        <p className="font-semibold text-vince-text">{course.coordinator?.name ?? 'Nenhum'}</p>
        <p className="mt-1 text-sm text-vince-muted">
          {course.coordinator?.email ?? 'Coordenador não definido'}
        </p>
      </div>
      <span className="font-semibold text-vince-muted">{course.classes}</span>
      <span className="font-semibold text-vince-muted">{course.events}</span>
      <button
        aria-label={`Selecionar ${course.name}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-primary hover:bg-vince-tertiary"
        onClick={onSelect}
        type="button"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
    </article>
  );
}
