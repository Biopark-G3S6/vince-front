import { useState } from 'react';
import { toast } from 'sonner';

import { CreateTeamDialog } from '@features/articles';
import { ArticleList } from '@features/review';
import { Button, PlusIcon, SearchIcon, UserIcon, UsersIcon } from '@shared/ui';

import {
  MetricCard,
  PageScaffold,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { type ArticleStatus, type Team } from '../model/academic';
import { useAcademicCollection } from '../api/academicStore';
import { AcademicActionDialog, academicFieldClass } from '../components/AcademicActionDialog';

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
  const [teams, setTeams] = useAcademicCollection('teams');
  const [academicEvents] = useAcademicCollection('academicEvents');
  const [eligibleStudents, setEligibleStudents] = useAcademicCollection('eligibleStudents');
  const [inviting, setInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useAcademicCollection('pendingInvitations');
  const [creating, setCreating] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '');
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0);
  const selectedEvent = academicEvents.find((event) => event.title === selectedTeam?.event);
  const advisorOptions = selectedEvent?.advisors ?? [];
  const teamFull = Boolean(
    selectedTeam && selectedTeam.members.length >= (selectedEvent?.maxTeamSize ?? 0),
  );

  function assignStudent(student: string) {
    if (!selectedTeam || teamFull) {
      toast.error('Esta equipe já atingiu o limite de integrantes.');
      return;
    }
    setTeams((current) =>
      current.map((team) =>
        team.id === selectedTeam.id
          ? {
              ...team,
              members: [
                ...team.members,
                { name: student, course: selectedEvent?.course ?? '', role: 'Coautor' },
              ],
            }
          : team,
      ),
    );
    setEligibleStudents((current) => current.filter((name) => name !== student));
    setPendingInvitations((current) =>
      current.filter((invitation) => invitation.student !== student),
    );
    toast.success(`${student} designado para ${selectedTeam.name} na demonstração.`);
  }

  return (
    <PageScaffold
      actions={
        <>
          <Button
            disabled={!selectedTeam || teamFull || eligibleStudents.length === 0}
            onClick={() => setInviting(true)}
            variant="outline"
          >
            Convidar aluno
          </Button>
          <Button className="rounded-padrao px-7" onClick={() => setCreating(true)}>
            <PlusIcon className="h-5 w-5" />
            Criar equipe
          </Button>
        </>
      }
      activeSection="teams"
      personaRoles={['advisor', 'coordinator', 'institutionAdmin']}
      description="Forme equipes por evento, controle vagas, convites, alunos elegíveis e orientador responsável."
      eyebrow="Equipes"
      title="Equipes"
    >
      <ArticleList title="Equipes e artigos" />
      <CreateTeamDialog onOpenChange={setCreating} open={creating} />
      <AcademicActionDialog
        description={`Convide um aluno para ${selectedTeam?.name ?? 'a equipe'}. O convite é salvo neste navegador.`}
        onOpenChange={setInviting}
        open={inviting}
        submitLabel="Emitir convite"
        title="Convidar aluno"
        onSubmit={(event) => {
          event.preventDefault();
          const student = String(new FormData(event.currentTarget).get('student') ?? '');
          if (!selectedTeam || !student) return;
          if (
            pendingInvitations.some(
              (invitation) =>
                invitation.student === student && invitation.teamId === selectedTeam.id,
            )
          ) {
            toast.error('Este aluno já tem um convite pendente para a equipe.');
            return;
          }
          setPendingInvitations((current) => [...current, { student, teamId: selectedTeam.id }]);
          setInviting(false);
          toast.success(`Convite registrado para ${student} na demonstração.`);
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-vince-muted">Aluno elegível</span>
          <select className={academicFieldClass} name="student" required>
            {eligibleStudents.map((student) => (
              <option key={student} value={student}>
                {student}
              </option>
            ))}
          </select>
        </label>
      </AcademicActionDialog>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
        <MetricCard
          icon={<PlusIcon className="h-5 w-5" />}
          label="Convites pendentes"
          value={String(pendingInvitations.length)}
        />
      </section>

      <section className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-5">
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vince-border px-4 py-3"
                  key={student}
                >
                  <span className="font-medium text-vince-muted">{student}</span>
                  <button
                    aria-label={`Designar ${student} para ${selectedTeam?.name ?? 'equipe'}`}
                    className="min-h-10 text-sm font-semibold text-vince-primary disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!selectedTeam || teamFull}
                    onClick={() => assignStudent(student)}
                    type="button"
                  >
                    Designar
                  </button>
                </div>
              ))}
              {eligibleStudents.length === 0 && (
                <p className="text-sm text-vince-muted">
                  Todos os alunos elegíveis já foram designados.
                </p>
              )}
              {teamFull && (
                <p className="text-sm text-vince-muted" role="status">
                  A equipe selecionada atingiu o limite de integrantes. Selecione outra equipe para
                  continuar.
                </p>
              )}
            </div>
          </SectionPanel>

          <SectionPanel title="Responsável da equipe">
            {selectedTeam && (
              <form
                className="space-y-5"
                key={`${selectedTeam.id}-${selectedTeam.responsibleAdvisor}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const responsibleAdvisor = String(
                    new FormData(event.currentTarget).get('advisor') ?? '',
                  );
                  if (!advisorOptions.includes(responsibleAdvisor)) {
                    toast.error('Selecione um orientador vinculado ao evento.');
                    return;
                  }
                  setTeams((current) =>
                    current.map((team) =>
                      team.id === selectedTeam.id ? { ...team, responsibleAdvisor } : team,
                    ),
                  );
                  toast.success('Orientador responsável atualizado na demonstração.');
                }}
              >
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
                  <select
                    className="h-12 w-full rounded-lg border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                    defaultValue={selectedTeam.responsibleAdvisor}
                    name="advisor"
                    required
                  >
                    {advisorOptions.map((advisor) => (
                      <option key={advisor} value={advisor}>
                        {advisor}
                      </option>
                    ))}
                  </select>
                </label>

                <Button type="submit">Salvar responsável</Button>
                <div className="rounded-lg border border-vince-border bg-[#fffafa] p-4 text-sm leading-6 text-vince-muted">
                  Apenas orientadores vinculados ao evento podem ser definidos como responsáveis
                  pela avaliação final desta equipe.
                </div>
              </form>
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
        <Button
          aria-pressed={selected}
          onClick={onSelect}
          variant={selected ? 'primary' : 'outline'}
        >
          Gerenciar
        </Button>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
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
          <div className="flex flex-wrap -space-x-2">
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
