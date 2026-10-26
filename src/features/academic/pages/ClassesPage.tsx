import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

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
  FilterChip,
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { type ClassGroup, type ClassStatus } from '../model/academic';
import { useAcademicCollection } from '../api/academicStore';
import {
  AcademicActionDialog,
  AcademicField,
  academicFieldClass,
} from '../components/AcademicActionDialog';

const statusView: Record<ClassStatus, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Ativa', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'muted' },
  planned: { label: 'Planejada', tone: 'warning' },
};

export function ClassesPage() {
  const [classGroups, setClassGroups] = useAcademicCollection('classGroups');
  const [courses] = useAcademicCollection('courses');
  const [action, setAction] = useState<'create' | 'professor' | 'student' | 'invite' | null>(null);
  const [registeredStudents, setRegisteredStudents] = useAcademicCollection('registeredStudents');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ClassStatus>('all');
  const [selectedClassId, setSelectedClassId] = useState(classGroups[0]?.id ?? '');

  const visibleClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return classGroups.filter((classGroup) => {
      const searchable = [
        classGroup.name,
        classGroup.course,
        classGroup.term,
        classGroup.professors.join(' '),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      const matchesStatus = status === 'all' || classGroup.status === status;

      return (
        matchesStatus && (normalizedSearch.length === 0 || searchable.includes(normalizedSearch))
      );
    });
  }, [classGroups, search, status]);

  const selectedClass =
    visibleClasses.find((classGroup) => classGroup.id === selectedClassId) ?? visibleClasses[0];

  function handleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    if (action === 'create') {
      if (!text('name') || !text('term')) {
        toast.error('Preencha o nome e o período da turma.');
        return;
      }
      if (text('endDate') < text('startDate')) {
        toast.error('A data final deve ser igual ou posterior à data inicial.');
        return;
      }
      const formatDate = (date: string) =>
        new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`));
      const classGroup: ClassGroup = {
        id: crypto.randomUUID(),
        name: text('name'),
        course: text('course'),
        term: text('term'),
        startDate: formatDate(text('startDate')),
        endDate: formatDate(text('endDate')),
        status: 'planned',
        students: 0,
        professors: [],
        invitations: [],
      };
      setClassGroups((current) => [...current, classGroup]);
      setSelectedClassId(classGroup.id);
      setSearch('');
      setStatus('all');
      toast.success('Turma criada na demonstração.');
    } else if (selectedClass) {
      if (action === 'professor') {
        const name = text('name');
        if (!name) {
          toast.error('Informe o nome do professor.');
          return;
        }
        if (
          selectedClass.professors.some(
            (professor) => professor.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
          )
        ) {
          toast.error('Este professor já está designado para a turma.');
          return;
        }
        setClassGroups((current) =>
          current.map((group) =>
            group.id === selectedClass.id
              ? { ...group, professors: [...group.professors, name] }
              : group,
          ),
        );
        toast.success('Professor designado na demonstração.');
      } else if (action === 'student') {
        const name = text('name');
        if (!name) {
          toast.error('Informe o nome do aluno.');
          return;
        }
        if (
          (registeredStudents[selectedClass.id] ?? []).some(
            (student) => student.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
          )
        ) {
          toast.error('Este aluno já foi cadastrado nesta turma.');
          return;
        }
        setRegisteredStudents((current) => ({
          ...current,
          [selectedClass.id]: [...(current[selectedClass.id] ?? []), name],
        }));
        setClassGroups((current) =>
          current.map((group) =>
            group.id === selectedClass.id ? { ...group, students: group.students + 1 } : group,
          ),
        );
        toast.success('Aluno cadastrado na demonstração.');
      } else if (action === 'invite') {
        const expiresAt = text('expiresAt');
        if (new Date(`${expiresAt}T23:59:59`).getTime() < Date.now()) {
          toast.error('A validade do convite deve ser uma data futura.');
          return;
        }
        const invitation = {
          code: `TURMA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          expiresAt: new Intl.DateTimeFormat('pt-BR').format(new Date(`${expiresAt}T12:00:00`)),
          status: 'active' as const,
          uses: 0,
        };
        setClassGroups((current) =>
          current.map((group) =>
            group.id === selectedClass.id
              ? { ...group, invitations: [...group.invitations, invitation] }
              : group,
          ),
        );
        toast.success('Convite emitido na demonstração.');
      }
    }
    setAction(null);
  }

  return (
    <PageScaffold
      actions={
        <>
          <Button
            className="rounded-padrao px-6"
            disabled={!selectedClass || selectedClass.status === 'closed'}
            onClick={() => setAction('invite')}
            variant="outline"
          >
            Emitir convite
          </Button>
          <Button className="rounded-padrao px-7" onClick={() => setAction('create')}>
            <PlusIcon className="h-5 w-5" />
            Nova turma
          </Button>
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
            ? 'Cadastre a turma e o período letivo. Os dados são salvos neste navegador.'
            : `Turma: ${selectedClass?.name ?? ''}. Os dados são salvos neste navegador.`
        }
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        onSubmit={handleAction}
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
                  .filter((course) => course.status === 'active')
                  .map((course) => (
                    <option key={course.id} value={course.name}>
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
        ) : (
          <AcademicField
            label={action === 'professor' ? 'Nome do professor' : 'Nome do aluno'}
            name="name"
            required
          />
        )}
      </AcademicActionDialog>
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={<BuildingIcon className="h-5 w-5" />}
          label="Turmas cadastradas"
          value={String(classGroups.length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Períodos ativos"
          value={String(
            new Set(
              classGroups
                .filter((classGroup) => classGroup.status === 'active')
                .map((classGroup) => classGroup.term),
            ).size,
          )}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Professores"
          value={String(new Set(classGroups.flatMap((classGroup) => classGroup.professors)).size)}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Alunos vinculados"
          value={String(classGroups.reduce((total, classGroup) => total + classGroup.students, 0))}
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
              placeholder="Buscar por turma, curso, período ou professor..."
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
          {visibleClasses.map((classGroup) => (
            <ClassCard
              classGroup={classGroup}
              key={classGroup.id}
              onSelect={() => setSelectedClassId(classGroup.id)}
              selected={classGroup.id === selectedClass?.id}
            />
          ))}
          {visibleClasses.length === 0 && (
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
                  {selectedClass.name}
                </h2>
                <p className="mt-2 text-vince-muted">{selectedClass.course}</p>
              </div>

              <div className="grid gap-3">
                <Button
                  disabled={selectedClass.status === 'closed'}
                  onClick={() => setAction('professor')}
                >
                  Designar professor
                </Button>
                <Button
                  disabled={selectedClass.status === 'closed'}
                  onClick={() => setAction('student')}
                  variant="outline"
                >
                  Cadastrar aluno
                </Button>
                <Button
                  disabled={selectedClass.status === 'closed'}
                  onClick={() => setAction('invite')}
                  variant="outline"
                >
                  Emitir convite multiuso
                </Button>
              </div>

              <div className="rounded-lg border border-vince-border">
                <div className="border-b border-vince-border px-4 py-3 font-bold text-vince-text">
                  Professores
                </div>
                <div className="divide-y divide-vince-border">
                  {selectedClass.professors.map((professor) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      key={professor}
                    >
                      <span className="font-medium text-vince-muted">{professor}</span>
                      <button
                        aria-label={`Revogar professor ${professor}`}
                        className="min-h-10 text-sm font-semibold text-vince-primary"
                        onClick={() => {
                          setClassGroups((current) =>
                            current.map((group) =>
                              group.id === selectedClass.id
                                ? {
                                    ...group,
                                    professors: group.professors.filter(
                                      (name) => name !== professor,
                                    ),
                                  }
                                : group,
                            ),
                          );
                          toast.success('Vínculo do professor revogado na demonstração.');
                        }}
                        type="button"
                      >
                        Revogar
                      </button>
                    </div>
                  ))}
                  {selectedClass.professors.length === 0 && (
                    <p className="px-4 py-4 text-sm text-vince-muted">
                      Nenhum professor designado.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-vince-border">
                <div className="border-b border-vince-border px-4 py-3 font-bold text-vince-text">
                  Convites ativos
                </div>
                <div className="divide-y divide-vince-border">
                  {selectedClass.invitations.map((invitation) => (
                    <div className="px-4 py-3" key={invitation.code}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="break-all font-bold text-vince-primary">
                          {invitation.code}
                        </span>
                        <StatusBadge
                          label={invitation.status === 'active' ? 'Ativo' : 'Revogado'}
                          tone={invitation.status === 'active' ? 'success' : 'muted'}
                        />
                      </div>
                      <p className="mt-1 text-sm text-vince-muted">
                        Validade: {invitation.expiresAt} · Usos: {invitation.uses}
                      </p>
                      {invitation.status === 'active' && (
                        <button
                          aria-label={`Revogar convite ${invitation.code}`}
                          className="mt-2 min-h-10 text-sm font-semibold text-vince-primary"
                          onClick={() => {
                            setClassGroups((current) =>
                              current.map((group) =>
                                group.id === selectedClass.id
                                  ? {
                                      ...group,
                                      invitations: group.invitations.map((item) =>
                                        item.code === invitation.code
                                          ? { ...item, status: 'revoked' }
                                          : item,
                                      ),
                                    }
                                  : group,
                              ),
                            );
                            toast.success('Convite revogado na demonstração.');
                          }}
                          type="button"
                        >
                          Revogar convite
                        </button>
                      )}
                    </div>
                  ))}
                  {selectedClass.invitations.length === 0 && (
                    <p className="px-4 py-4 text-sm text-vince-muted">
                      Nenhum convite disponível para esta turma.
                    </p>
                  )}
                </div>
              </div>
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

function ClassCard({
  classGroup,
  onSelect,
  selected,
}: {
  classGroup: ClassGroup;
  onSelect: () => void;
  selected: boolean;
}) {
  const view = statusView[classGroup.status];

  return (
    <article className="rounded-lg border border-vince-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <StatusBadge label={view.label} tone={view.tone} />
            <span className="text-sm font-semibold text-vince-muted">{classGroup.term}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-vince-text">{classGroup.name}</h2>
          <p className="mt-2 text-vince-muted">{classGroup.course}</p>
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
        <Info label="Início" value={classGroup.startDate} />
        <Info label="Fim" value={classGroup.endDate} />
        <Info label="Alunos" value={String(classGroup.students)} />
        <Info label="Professores" value={String(classGroup.professors.length)} />
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
