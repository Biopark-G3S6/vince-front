import { useMemo, useState } from 'react';

import { SearchIcon, UserIcon, UsersIcon } from '@shared/ui';

import { useAcademicData } from '../api/academicStore';
import {
  FilterChip,
  MetricCard,
  PageScaffold,
  SectionPanel,
} from '../components/AcademicPrimitives';

type PersonView = {
  detail: string;
  name: string;
  role: 'professor' | 'student';
};

export function PeoplePage() {
  const {
    data: { classGroups, eligibleStudents, registeredStudents, teams },
  } = useAcademicData();
  const [role, setRole] = useState<'all' | PersonView['role']>('all');
  const [search, setSearch] = useState('');

  const people = useMemo(() => {
    const directory = new Map<string, PersonView>();

    for (const group of classGroups) {
      for (const professor of group.professors) {
        directory.set(`professor:${professor}`, {
          detail: `${group.course} · ${group.name}`,
          name: professor,
          role: 'professor',
        });
      }

      for (const student of registeredStudents[group.id] ?? []) {
        directory.set(`student:${student}`, {
          detail: `${group.course} · ${group.name}`,
          name: student,
          role: 'student',
        });
      }
    }

    for (const team of teams) {
      for (const member of team.members) {
        directory.set(`student:${member.name}`, {
          detail: `${member.course} · ${team.name}`,
          name: member.name,
          role: 'student',
        });
      }
    }

    for (const student of eligibleStudents) {
      if (!directory.has(`student:${student}`)) {
        directory.set(`student:${student}`, {
          detail: 'Aluno elegível, ainda sem equipe',
          name: student,
          role: 'student',
        });
      }
    }

    return [...directory.values()].sort((first, second) => first.name.localeCompare(second.name));
  }, [classGroups, eligibleStudents, registeredStudents, teams]);

  const visiblePeople = people.filter((person) => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return (
      (role === 'all' || person.role === role) &&
      (!normalizedSearch ||
        `${person.name} ${person.detail}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    );
  });
  const professors = people.filter((person) => person.role === 'professor').length;
  const students = people.filter((person) => person.role === 'student').length;

  return (
    <PageScaffold
      activeSection="people"
      description="Consulte professores e alunos vinculados às turmas e equipes sob sua coordenação."
      eyebrow="Coordenação"
      title="Professores e alunos"
    >
      <section className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-5">
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Pessoas listadas"
          value={String(people.length)}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Professores"
          value={String(professors)}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Alunos identificados"
          value={String(students)}
        />
      </section>

      <SectionPanel className="mt-8" title="Diretório acadêmico">
        <div className="flex flex-col gap-4 border-b border-vince-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar professor ou aluno</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-11 w-full rounded-lg border border-vince-border bg-white pl-12 pr-4 text-vince-text focus:border-vince-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, curso, turma ou equipe..."
              type="search"
              value={search}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={role === 'all'} onClick={() => setRole('all')}>
              Todos
            </FilterChip>
            <FilterChip active={role === 'professor'} onClick={() => setRole('professor')}>
              Professores
            </FilterChip>
            <FilterChip active={role === 'student'} onClick={() => setRole('student')}>
              Alunos
            </FilterChip>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePeople.map((person) => (
            <article
              className="rounded-lg border border-vince-border bg-[#fffafa] p-4"
              key={`${person.role}:${person.name}`}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vince-tertiary font-bold text-vince-primary">
                  {person.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-vince-text">{person.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-vince-primary">
                    {person.role === 'professor' ? 'Professor' : 'Aluno'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-vince-muted">{person.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        {visiblePeople.length === 0 && (
          <p className="py-10 text-center text-vince-muted">Nenhuma pessoa encontrada.</p>
        )}
      </SectionPanel>
    </PageScaffold>
  );
}
