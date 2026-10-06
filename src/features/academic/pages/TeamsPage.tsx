import { useState } from 'react';

import { Button, PlusIcon, SearchIcon, UserIcon, UsersIcon } from '@shared/ui';

import {
  MetricCard,
  PageScaffold,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { eligibleStudents, teams, type ArticleStatus, type Team } from '../model/academic';

const articleStatusView: Record<
  ArticleStatus,
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  finished: { label: 'Finalizado', tone: 'success' },
  inProgress: { label: 'Em desenvolvimento', tone: 'warning' },
  inReview: { label: 'Em revisão', tone: 'primary' },
  started: { label: 'Iniciado', tone: 'muted' },
};

export function TeamsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '');
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0);

  return (
    <PageScaffold
      actions={
        <>
          <Button variant="outline">Convidar aluno</Button>
          <Button className="rounded-padrao px-7">
            <PlusIcon className="h-5 w-5" />
            Criar equipe
          </Button>
        </>
      }
      activeSection="teams"
      description="Forme equipes por evento, controle vagas, convites, alunos elegíveis e orientador responsável."
      eyebrow="Equipes"
      title="Equipes"
    >
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Equipes ativas"
          value={String(teams.length)}
        />
        <MetricCard
          icon={<UserIcon className="h-5 w-5" />}
          label="Integrantes"
          value={String(totalMembers)}
        />
        <MetricCard
          icon={<SearchIcon className="h-5 w-5" />}
          label="Sem equipe"
          tone="danger"
          value={String(eligibleStudents.length)}
        />
        <MetricCard icon={<PlusIcon className="h-5 w-5" />} label="Convites pendentes" value="7" />
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              onSelect={() => setSelectedTeamId(team.id)}
              selected={team.id === selectedTeam?.id}
              team={team}
            />
          ))}
        </div>

        <div className="space-y-8">
          <SectionPanel title="Alunos elegíveis sem equipe">
            <div className="space-y-3">
              {eligibleStudents.map((student) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-vince-border px-4 py-3"
                  key={student}
                >
                  <span className="font-medium text-vince-muted">{student}</span>
                  <button className="text-sm font-semibold text-vince-primary" type="button">
                    Designar
                  </button>
                </div>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Responsável da equipe">
            {selectedTeam && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-primary">
                    {selectedTeam.event}
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-vince-text">
                    {selectedTeam.name}
                  </h2>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">
                    Orientador responsável
                  </span>
                  <select className="h-12 w-full rounded-lg border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary">
                    <option>{selectedTeam.responsibleAdvisor}</option>
                    <option>Dr. Ricardo Santos</option>
                    <option>Dra. Helena Torres</option>
                  </select>
                </label>

                <Button>Salvar responsável</Button>
                <div className="rounded-lg border border-vince-border bg-[#fffafa] p-4 text-sm leading-6 text-vince-muted">
                  Apenas orientadores vinculados ao evento podem ser definidos como responsáveis
                  pela avaliação final desta equipe.
                </div>
              </div>
            )}
          </SectionPanel>
        </div>
      </section>
    </PageScaffold>
  );
}

function TeamCard({
  onSelect,
  selected,
  team,
}: {
  onSelect: () => void;
  selected: boolean;
  team: Team;
}) {
  const view = articleStatusView[team.status];

  return (
    <article className="rounded-lg border border-vince-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge label={view.label} tone={view.tone} />
          <h2 className="mt-4 text-2xl font-extrabold text-vince-text">{team.name}</h2>
          <p className="mt-2 text-vince-muted">{team.article}</p>
          <p className="mt-1 text-sm text-vince-muted">{team.event}</p>
        </div>
        <Button onClick={onSelect} variant={selected ? 'primary' : 'outline'}>
          Gerenciar
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            Progresso do artigo
          </p>
          <ProgressBar value={team.progress} />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            Integrantes
          </p>
          <div className="flex -space-x-2">
            {team.members.map((member) => (
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-vince-tertiary text-sm font-black text-vince-primary ring-2 ring-white"
                key={member.name}
                title={`${member.name} · ${member.course}`}
              >
                {member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
