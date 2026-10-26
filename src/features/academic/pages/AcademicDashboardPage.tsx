import {
  CalendarIcon,
  ChartIcon,
  DocumentIcon,
  GraduationCapIcon,
  UserIcon,
  UsersIcon,
} from '@shared/ui';

import { useCurrentUser } from '@features/admin';
import {
  courseName,
  useArticles,
  useEventDirectory,
  useEventRegistrations,
} from '@features/articles';
import { ArticleList } from '@features/review';

import { dashboardActivities } from '../model/academic';
import { useAcademicData } from '../api/academicStore';
import {
  MetricCard,
  PageScaffold,
  ProgressBar,
  SectionPanel,
} from '../components/AcademicPrimitives';

export function AcademicDashboardPage() {
  const currentUser = useCurrentUser();
  const { data: workspaceArticles = [] } = useArticles();
  const { data: eventDirectory } = useEventDirectory();
  const { data: registrations = [] } = useEventRegistrations();
  const events = eventDirectory?.events ?? [];
  const {
    data: { articles, classGroups, courses, teams },
  } = useAcademicData();

  if (currentUser.role === 'coordinator') {
    const professorCount = new Set(classGroups.flatMap((group) => group.professors)).size;
    const studentCount = classGroups.reduce((total, group) => total + group.students, 0);

    return (
      <PageScaffold
        activeSection="dashboard"
        description="Acompanhe pessoas, turmas e eventos vinculados à coordenação acadêmica."
        eyebrow="Coordenação"
        title={`Olá, ${currentUser.name}`}
      >
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          <MetricCard
            icon={<UserIcon className="h-5 w-5" />}
            label="Professores"
            value={String(professorCount)}
          />
          <MetricCard
            icon={<UsersIcon className="h-5 w-5" />}
            label="Alunos vinculados"
            value={String(studentCount)}
          />
          <MetricCard
            icon={<GraduationCapIcon className="h-5 w-5" />}
            label="Turmas"
            value={String(classGroups.length)}
          />
          <MetricCard
            icon={<CalendarIcon className="h-5 w-5" />}
            label="Inscrições abertas"
            value={String(events.filter((event) => event.registrationOpen).length)}
          />
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/admin/pessoas', label: 'Ver professores e alunos' },
            { href: '/admin/eventos', label: 'Gerenciar eventos e avaliadores' },
            { href: '/admin/turmas', label: 'Consultar turmas' },
            { href: '/artigos/modelo', label: 'Escolher ou importar modelo' },
          ].map((action) => (
            <a
              className="flex min-h-20 items-center justify-between rounded-lg border border-vince-border bg-white px-5 py-4 font-bold text-vince-primary shadow-sm transition-colors hover:bg-vince-tertiary"
              href={action.href}
              key={action.href}
            >
              {action.label}
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </section>

        <SectionPanel className="mt-8" title="Próximos eventos">
          <div className="grid gap-3 lg:grid-cols-2">
            {events.map((event) => (
              <article className="rounded-lg border border-vince-border p-5" key={event.id}>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-primary">
                  {event.registrationOpen ? 'Inscrições abertas' : 'Inscrições fechadas'}
                </p>
                <h2 className="mt-2 text-lg font-extrabold text-vince-text">{event.name}</h2>
                <p className="mt-2 text-sm text-vince-muted">
                  {courseName(event.courseId) || 'Toda a instituição'} · {event.createdBy}
                </p>
              </article>
            ))}
          </div>
        </SectionPanel>
      </PageScaffold>
    );
  }

  if (currentUser.role === 'advisor' || currentUser.role === 'student') {
    const isStudent = currentUser.role === 'student';

    return (
      <PageScaffold
        activeSection="dashboard"
        description={
          isStudent
            ? 'Escolha um modelo para escrever ou inscreva-se nos eventos disponíveis para sua turma.'
            : 'Oriente equipes, escreva artigos e organize seus próprios eventos de teste ou TCC.'
        }
        eyebrow={isStudent ? 'Minha jornada' : 'Orientação'}
        title={`Olá, ${currentUser.name}`}
      >
        <section className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-5">
          <MetricCard
            icon={<DocumentIcon className="h-5 w-5" />}
            label={isStudent ? 'Meus artigos' : 'Artigos orientados'}
            value={String(workspaceArticles.length)}
          />
          <MetricCard
            icon={<UsersIcon className="h-5 w-5" />}
            label={isStudent ? 'Minhas inscrições' : 'Eventos independentes'}
            value={String(
              isStudent
                ? registrations.length
                : events.filter(
                    (event) => event.kind !== 'official' && event.createdById === currentUser.id,
                  ).length,
            )}
          />
          <MetricCard
            icon={<ChartIcon className="h-5 w-5" />}
            label={isStudent ? 'Eventos disponíveis' : 'Eventos oficiais'}
            value={String(events.filter((event) => event.kind === 'official').length)}
          />
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: '/admin/artigos',
              label: isStudent ? 'Abrir meus artigos' : 'Ver artigos orientados',
            },
            { href: '/artigos/modelo', label: 'Escolher ou importar modelo' },
            {
              href: '/admin/eventos',
              label: isStudent ? 'Inscrever-me em um evento' : 'Criar evento de teste ou TCC',
            },
          ].map((action) => (
            <a
              className="flex min-h-20 items-center justify-between rounded-lg border border-vince-border bg-white px-5 py-4 font-bold text-vince-primary shadow-sm transition-colors hover:bg-vince-tertiary"
              href={action.href}
              key={action.href}
            >
              {action.label}
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </section>

        {isStudent && (
          <section className="mt-8 rounded-lg border border-vince-border bg-white p-5 sm:p-7">
            <h2 className="text-xl font-extrabold text-vince-text">Como participar de um evento</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                [
                  '1. Encontre o evento',
                  'Consulte os eventos disponibilizados pela coordenação e os prazos de inscrição.',
                ],
                [
                  '2. Confirme sua inscrição',
                  'Abra o evento e clique em Inscrever-me. Sua participação ficará registrada.',
                ],
                [
                  '3. Escolha o modelo',
                  'Use artigo científico, resumo expandido, um modelo oficial do evento ou importe seu próprio modelo.',
                ],
              ].map(([title, description]) => (
                <li className="rounded-lg bg-vince-surface p-4" key={title}>
                  <h3 className="font-bold text-vince-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-vince-muted">{description}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <ArticleList title={isStudent ? 'Meu trabalho em andamento' : 'Trabalhos sob orientação'} />
      </PageScaffold>
    );
  }

  const metrics = [
    {
      icon: <GraduationCapIcon className="h-5 w-5" />,
      label: 'Cursos ativos',
      value: String(courses.filter((course) => course.status === 'active').length),
    },
    {
      icon: <CalendarIcon className="h-5 w-5" />,
      label: 'Turmas abertas',
      value: String(classGroups.filter((group) => group.status === 'active').length),
    },
    { icon: <UsersIcon className="h-5 w-5" />, label: 'Equipes', value: String(teams.length) },
    {
      icon: <DocumentIcon className="h-5 w-5" />,
      label: 'Artigos',
      value: String(articles.length),
    },
    {
      icon: <ChartIcon className="h-5 w-5" />,
      label: 'Eventos ativos',
      value: String(events.filter((event) => event.registrationOpen).length),
    },
  ];

  return (
    <PageScaffold
      activeSection="dashboard"
      description="Bem-vindo de volta. Aqui está o resumo operacional das atividades acadêmicas recentes."
      eyebrow="Dashboard"
      title="Visão Geral Acadêmica"
    >
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-5">
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
