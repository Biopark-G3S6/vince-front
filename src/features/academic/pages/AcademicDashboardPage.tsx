import { CalendarIcon, ChartIcon, DocumentIcon, GraduationCapIcon, UsersIcon } from '@shared/ui';

import { dashboardActivities, teams } from '../model/academic';
import {
  MetricCard,
  PageScaffold,
  ProgressBar,
  SectionPanel,
} from '../components/AcademicPrimitives';

const metrics = [
  { icon: <GraduationCapIcon className="h-5 w-5" />, label: 'Cursos ativos', value: '2' },
  { icon: <CalendarIcon className="h-5 w-5" />, label: 'Turmas abertas', value: '3' },
  { icon: <UsersIcon className="h-5 w-5" />, label: 'Equipes', value: '48' },
  { icon: <DocumentIcon className="h-5 w-5" />, label: 'Artigos', value: '42' },
  { icon: <ChartIcon className="h-5 w-5" />, label: 'Eventos ativos', value: '5' },
];

export function AcademicDashboardPage() {
  return (
    <PageScaffold
      activeSection="dashboard"
      description="Bem-vindo de volta. Aqui está o resumo operacional das atividades acadêmicas recentes."
      eyebrow="Dashboard"
      title="Visão Geral Acadêmica"
    >
      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </section>

      <section className="mt-10 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <SectionPanel title="Situação das Equipes">
          <div className="space-y-6">
            {teams.map((team) => (
              <article className="rounded-lg border border-[#ead9dd] p-5" key={team.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-vince-text">{team.name}</h3>
                    <p className="mt-1 text-sm text-vince-muted">{team.article}</p>
                  </div>
                  <span className="font-bold text-vince-primary">{team.progress}%</span>
                </div>
                <div className="mt-5">
                  <ProgressBar value={team.progress} />
                </div>
              </article>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          actions={
            <a className="font-semibold text-vince-primary hover:underline" href="/admin/artigos">
              Ver todos
            </a>
          }
          title="Indicadores Acadêmicos"
        >
          <div className="divide-y divide-vince-border">
            {dashboardActivities.map((activity) => (
              <article className="flex gap-4 py-5 first:pt-0 last:pb-0" key={activity.title}>
                <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
                  <DocumentIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold leading-7 text-vince-text">
                    {activity.title}
                  </h3>
                  <p className="mt-1 text-sm text-vince-muted">{activity.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}
