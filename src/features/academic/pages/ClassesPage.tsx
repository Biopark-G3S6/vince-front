import { useMemo, useState } from 'react';

import {
  Button,
  BuildingIcon,
  CalendarIcon,
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
import { classGroups, type ClassGroup, type ClassStatus } from '../model/academic';

const statusView: Record<ClassStatus, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  active: { label: 'Ativa', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'muted' },
  planned: { label: 'Planejada', tone: 'warning' },
};

export function ClassesPage() {
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
  }, [search, status]);

  const selectedClass =
    classGroups.find((classGroup) => classGroup.id === selectedClassId) ??
    visibleClasses[0] ??
    classGroups[0];

  return (
    <PageScaffold
      actions={
        <>
          <Button className="rounded-padrao px-6" variant="outline">
            Emitir convite
          </Button>
          <Button className="rounded-padrao px-7">
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
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<BuildingIcon className="h-5 w-5" />}
          label="Turmas cadastradas"
          value={String(classGroups.length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Períodos ativos"
          value={String(classGroups.filter((classGroup) => classGroup.status === 'active').length)}
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

      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          {visibleClasses.map((classGroup) => (
            <ClassCard
              classGroup={classGroup}
              key={classGroup.id}
              onSelect={() => setSelectedClassId(classGroup.id)}
            />
          ))}
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
                <Button>Designar professor</Button>
                <Button variant="outline">Cadastrar aluno</Button>
                <Button variant="outline">Emitir convite multiuso</Button>
              </div>

              <div className="rounded-lg border border-vince-border">
                <div className="border-b border-vince-border px-4 py-3 font-bold text-vince-text">
                  Professores
                </div>
                <div className="divide-y divide-vince-border">
                  {selectedClass.professors.map((professor) => (
                    <div className="flex items-center justify-between px-4 py-3" key={professor}>
                      <span className="font-medium text-vince-muted">{professor}</span>
                      <button className="text-sm font-semibold text-vince-primary" type="button">
                        Revogar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-vince-border">
                <div className="border-b border-vince-border px-4 py-3 font-bold text-vince-text">
                  Convites ativos
                </div>
                <div className="divide-y divide-vince-border">
                  {selectedClass.invitations.map((invitation) => (
                    <div className="px-4 py-3" key={invitation.code}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-vince-primary">{invitation.code}</span>
                        <StatusBadge
                          label={invitation.status === 'active' ? 'Ativo' : 'Revogado'}
                          tone={invitation.status === 'active' ? 'success' : 'muted'}
                        />
                      </div>
                      <p className="mt-1 text-sm text-vince-muted">
                        Validade: {invitation.expiresAt} · Usos: {invitation.uses}
                      </p>
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
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function ClassCard({ classGroup, onSelect }: { classGroup: ClassGroup; onSelect: () => void }) {
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
        <Button onClick={onSelect} variant="outline">
          Gerenciar
        </Button>
      </div>

      <div className="mt-6 grid gap-4 border-t border-vince-border pt-5 md:grid-cols-4">
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
