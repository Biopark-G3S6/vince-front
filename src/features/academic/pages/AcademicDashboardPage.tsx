import type { ReactNode } from 'react';

import {
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  DocumentIcon,
  GraduationCapIcon,
  UsersIcon,
} from '@shared/ui';

import { hasPermission, useCurrentUser, type SessionUser } from '@features/admin';
import { useInstitutions } from '@features/institutions';
import { useUserNames } from '@shared/api/directory';

import { useArticles } from '../api/articleApi';
import { useCohorts } from '../api/cohortApi';
import { useCourses, type CourseDto } from '../api/courseApi';
import { useEvents, useTemplates, type EventDto } from '../api/eventApi';
import type { ArticleSummaryDto } from '../api/teamApi';
import {
  MetricCard,
  PageScaffold,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

/**
 * O painel inicial de cada perfil, lido da API: o administrador de sistema vê as
 * instituições; a gestão (administração institucional e coordenação) vê cursos, eventos e a
 * situação dos artigos; o professor, os trabalhos sob orientação; o aluno, o próprio artigo.
 * Não há inscrição em evento (RF-EVT-001 RN2): o aluno vê os eventos que o alcançam.
 */

type Status = ArticleSummaryDto['status'];

const statusView: Record<
  Status,
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  STARTED: { label: 'Iniciado', tone: 'muted' },
  IN_PROGRESS: { label: 'Em desenvolvimento', tone: 'warning' },
  IN_REVIEW: { label: 'Em revisão', tone: 'primary' },
  FINISHED: { label: 'Finalizado', tone: 'success' },
};

const pipeline: Status[] = ['STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'FINISHED'];

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatDate = (iso: string) => dateFormat.format(new Date(iso));

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

function byRecentUpdate(left: ArticleSummaryDto, right: ArticleSummaryDto) {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function QuickLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-3">
      {links.map((link) => (
        <a
          className="flex min-h-20 items-center justify-between rounded-lg border border-vince-border bg-white px-5 py-4 font-bold text-vince-primary shadow-sm transition-colors hover:bg-vince-tertiary"
          href={link.href}
          key={link.href}
        >
          {link.label}
          <span aria-hidden="true">→</span>
        </a>
      ))}
    </section>
  );
}

function Metrics({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">{children}</section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-vince-muted">{children}</p>;
}

/** O artigo com equipe, evento, etapa corrente e orientador responsável. */
function ArticleCards({
  articles,
  empty,
  events,
}: {
  articles: ArticleSummaryDto[];
  empty: string;
  events: EventDto[];
}) {
  const names = useUserNames(articles.map((article) => article.advisorId));
  const titleOf = (eventId: string) => events.find((event) => event.id === eventId)?.title;

  if (articles.length === 0) return <Empty>{empty}</Empty>;

  return (
    <div className="divide-y divide-vince-border">
      {articles.map((article) => {
        const view = statusView[article.status];
        return (
          <article
            className="flex flex-wrap items-start justify-between gap-4 py-5 first:pt-0 last:pb-0"
            key={article.id}
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold text-vince-text">
                {article.title ?? 'Artigo sem título'}
              </h3>
              <p className="mt-1 text-sm text-vince-muted">
                {[article.teamIdentification, titleOf(article.eventId)].filter(Boolean).join(' · ')}
              </p>
              {article.advisorId && (
                <p className="mt-1 text-sm text-vince-muted">
                  Orientação: {names.nameOf(article.advisorId, '—')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusBadge label={view.label} tone={view.tone} />
              {article.currentMilestoneDeadline && article.status !== 'FINISHED' && (
                <span className="text-sm text-vince-muted">
                  Etapa {article.currentMilestoneOrder} · até{' '}
                  {formatDate(article.currentMilestoneDeadline)}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Quantos artigos há em cada situação do ciclo (RF-ART-001). */
function StatusBreakdown({ articles }: { articles: ArticleSummaryDto[] }) {
  if (articles.length === 0) return <Empty>Nenhum artigo nos eventos alcançados.</Empty>;

  return (
    <div className="space-y-5">
      {pipeline.map((status) => {
        const count = articles.filter((article) => article.status === status).length;
        return (
          <div key={status}>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-vince-text">{statusView[status].label}</span>
              <span className="text-vince-muted">
                {count} {count === 1 ? 'artigo' : 'artigos'}
              </span>
            </div>
            <ProgressBar value={Math.round((count / articles.length) * 100)} />
          </div>
        );
      })}
    </div>
  );
}

function SystemDashboard() {
  const { data: institutions = [] } = useInstitutions();
  const active = institutions.filter((institution) => institution.status === 'active');

  return (
    <PageScaffold
      activeSection="dashboard"
      description="Instituições atendidas pela plataforma e a situação de cada uma."
      eyebrow="Dashboard"
      title="Visão Geral da Plataforma"
    >
      <Metrics>
        <MetricCard
          icon={<BuildingIcon className="h-5 w-5" />}
          label="Instituições ativas"
          value={String(active.length)}
        />
        <MetricCard
          icon={<BuildingIcon className="h-5 w-5" />}
          label="Instituições desativadas"
          value={String(institutions.length - active.length)}
        />
      </Metrics>

      <SectionPanel
        actions={
          <a
            className="font-semibold text-vince-primary hover:underline"
            href="/admin/instituicoes"
          >
            Gerenciar
          </a>
        }
        className="mt-8"
        title="Instituições"
      >
        {institutions.length === 0 ? (
          <Empty>Nenhuma instituição cadastrada.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {institutions.map((institution) => (
              <article className="rounded-lg border border-vince-border p-5" key={institution.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-vince-text">{institution.name}</h3>
                    <p className="mt-1 text-sm text-vince-muted">
                      {[
                        institution.acronym,
                        [institution.city, institution.state].filter(Boolean).join('/'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <StatusBadge
                    label={institution.status === 'active' ? 'Ativa' : 'Desativada'}
                    tone={institution.status === 'active' ? 'success' : 'muted'}
                  />
                </div>
                {institution.domain && (
                  <p className="mt-3 text-sm text-vince-primary">{institution.domain}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionPanel>
    </PageScaffold>
  );
}

/**
 * Os eventos ativos com o escopo legível. A contagem de equipes vem dos artigos alcançados;
 * sem nenhum (ou sem leitura de artigos), mostra só o limite do evento.
 */
function ActiveEvents({
  articles,
  events,
  scopeOf,
}: {
  articles: ArticleSummaryDto[] | null;
  events: EventDto[];
  scopeOf: (event: EventDto) => string;
}) {
  if (events.length === 0) return <Empty>Nenhum evento ativo.</Empty>;

  return (
    <div className="divide-y divide-vince-border">
      {events.map((event) => {
        const teams = articles?.filter((article) => article.eventId === event.id).length;
        const limit = `${event.maxTeams} ${event.maxTeams === 1 ? 'equipe' : 'equipes'}`;
        return (
          <article className="py-4 first:pt-0 last:pb-0" key={event.id}>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-primary">
              {scopeOf(event)}
            </p>
            <h3 className="mt-1 font-extrabold text-vince-text">{event.title}</h3>
            <p className="mt-1 text-sm text-vince-muted">
              {event.theme} · {teams ? `${teams} de ${limit}` : `até ${limit}`}
            </p>
          </article>
        );
      })}
    </div>
  );
}

/** Os cursos com o coordenador corrente (RF-CUR-002). */
function CourseCoordination({ courses }: { courses: CourseDto[] }) {
  const names = useUserNames(courses.map((course) => course.coordinatorId));

  if (courses.length === 0) return <Empty>Nenhum curso cadastrado.</Empty>;

  return (
    <div className="divide-y divide-vince-border">
      {courses.map((course) => (
        <article
          className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
          key={course.id}
        >
          <div className="min-w-0">
            <h3 className="font-extrabold text-vince-text">{course.name}</h3>
            <p className="mt-1 text-sm text-vince-muted">
              {course.coordinatorId
                ? `Coordenação: ${names.nameOf(course.coordinatorId, '—')}`
                : 'Sem coordenador designado'}
            </p>
          </div>
          <StatusBadge
            label={course.active ? course.identification : 'Desativado'}
            tone={course.active ? 'primary' : 'muted'}
          />
        </article>
      ))}
    </div>
  );
}

const viewAll = (href: string, label: string) => (
  <a className="font-semibold text-vince-primary hover:underline" href={href}>
    {label}
  </a>
);

/**
 * A gestão: coordenação e administração institucional. Só a coordenação acompanha equipes e
 * artigos (RF-ART-001); a administração, sem `ARTICLE:READ`, vê cursos, eventos e modelos.
 */
function ManagementDashboard({ user }: { user: SessionUser }) {
  const can = (permission: string) => hasPermission(user, permission);
  const isCoordinator = user.role === 'coordinator';
  const readsArticles = can('ARTICLE:READ');
  const { data: courses = [] } = useCourses(can('COURSE:READ'));
  const { cohorts } = useCohorts(can('COHORT:READ'));
  const { data: events = [] } = useEvents();
  const { data: articles = [] } = useArticles({}, readsArticles);
  const { data: templates = [] } = useTemplates(!readsArticles && can('TEMPLATE:READ'));

  const ownCourses = isCoordinator
    ? courses.filter((course) => course.coordinatorId === user.id)
    : courses.filter((course) => course.active);
  const activeEvents = events.filter((event) => event.status === 'ACTIVE');
  const recent = [...articles].sort(byRecentUpdate).slice(0, 5);

  const scopeOf = (event: EventDto) => {
    const course = courses.find((item) => item.id === event.courseId)?.name;
    if (event.scopeType === 'INSTITUTION') return 'Toda a instituição';
    if (event.scopeType === 'COURSE') return course ?? 'Curso';
    const cohort = cohorts.find((item) => item.id === event.scopeId)?.identification;
    return [cohort ? `Turma ${cohort}` : 'Turma', course].filter(Boolean).join(' · ');
  };

  if (!readsArticles) {
    return (
      <PageScaffold
        activeSection="dashboard"
        description="Resumo da instituição: cursos e coordenação, eventos em andamento e modelos de artigo."
        eyebrow="Dashboard"
        title="Visão Geral Acadêmica"
      >
        <Metrics>
          <MetricCard
            icon={<GraduationCapIcon className="h-5 w-5" />}
            label="Cursos ativos"
            value={String(ownCourses.length)}
          />
          <MetricCard
            icon={<UsersIcon className="h-5 w-5" />}
            label="Cursos sem coordenador"
            value={String(ownCourses.filter((course) => !course.coordinatorId).length)}
          />
          <MetricCard
            icon={<CalendarIcon className="h-5 w-5" />}
            label="Eventos ativos"
            value={String(activeEvents.length)}
          />
          <MetricCard
            icon={<DocumentIcon className="h-5 w-5" />}
            label="Modelos de artigo"
            value={String(templates.filter((template) => template.active).length)}
          />
        </Metrics>

        <section className="mt-8 grid gap-8 xl:grid-cols-2">
          <SectionPanel
            actions={viewAll('/admin/cursos', 'Ver cursos')}
            title="Cursos e coordenação"
          >
            <CourseCoordination courses={courses} />
          </SectionPanel>
          <SectionPanel
            actions={viewAll('/admin/eventos', 'Ver eventos')}
            title="Eventos em andamento"
          >
            <ActiveEvents articles={null} events={activeEvents} scopeOf={scopeOf} />
          </SectionPanel>
        </section>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      activeSection="dashboard"
      description={
        isCoordinator
          ? 'Acompanhe os cursos que você coordena, os eventos e a produção das equipes.'
          : 'Resumo dos cursos, dos eventos em andamento e da situação dos artigos.'
      }
      eyebrow={isCoordinator ? 'Coordenação' : 'Dashboard'}
      title={isCoordinator ? `Olá, ${user.name}` : 'Visão Geral Acadêmica'}
    >
      <Metrics>
        <MetricCard
          icon={<GraduationCapIcon className="h-5 w-5" />}
          label={isCoordinator ? 'Cursos coordenados' : 'Cursos ativos'}
          value={String(ownCourses.length)}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Equipes"
          value={String(articles.length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Eventos ativos"
          value={String(activeEvents.length)}
        />
        <MetricCard
          icon={<DocumentIcon className="h-5 w-5" />}
          label="Artigos finalizados"
          value={String(articles.filter((article) => article.status === 'FINISHED').length)}
        />
      </Metrics>

      <section className="mt-8 grid gap-8 xl:grid-cols-2">
        <SectionPanel title="Situação dos artigos">
          <StatusBreakdown articles={articles} />
        </SectionPanel>
        <SectionPanel
          actions={viewAll('/admin/eventos', 'Ver eventos')}
          title="Eventos em andamento"
        >
          <ActiveEvents articles={articles} events={activeEvents} scopeOf={scopeOf} />
        </SectionPanel>
      </section>

      <SectionPanel
        actions={viewAll('/admin/artigos', 'Ver todos')}
        className="mt-8"
        title="Artigos atualizados recentemente"
      >
        <ArticleCards
          articles={recent}
          empty="Nenhum artigo nos eventos alcançados."
          events={events}
        />
      </SectionPanel>
    </PageScaffold>
  );
}

function AdvisorDashboard({ user }: { user: SessionUser }) {
  const { data: events = [] } = useEvents();
  const { data: articles = [] } = useArticles();
  const advised = articles.filter((article) => article.advisorId === user.id);

  return (
    <PageScaffold
      activeSection="dashboard"
      description="Acompanhe as equipes que você orienta e as entregas que aguardam correção."
      eyebrow="Orientação"
      title={`Olá, ${user.name}`}
    >
      <Metrics>
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Equipes sob orientação"
          value={String(advised.length)}
        />
        <MetricCard
          icon={<DocumentIcon className="h-5 w-5" />}
          label="Aguardando correção"
          value={String(advised.filter((article) => article.status === 'IN_REVIEW').length)}
        />
        <MetricCard
          icon={<ChartIcon className="h-5 w-5" />}
          label="Artigos finalizados"
          value={String(advised.filter((article) => article.status === 'FINISHED').length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Eventos"
          value={String(events.filter((event) => event.status === 'ACTIVE').length)}
        />
      </Metrics>

      <QuickLinks
        links={[
          { href: '/admin/artigos', label: 'Ver artigos orientados' },
          { href: '/admin/equipes', label: 'Ver equipes' },
          { href: '/admin/eventos', label: 'Ver eventos' },
        ]}
      />

      <SectionPanel className="mt-8" title="Trabalhos sob orientação">
        <ArticleCards
          articles={[...advised].sort(byRecentUpdate)}
          empty="Nenhuma equipe tem você como orientador responsável."
          events={events}
        />
      </SectionPanel>
    </PageScaffold>
  );
}

function StudentDashboard({ user }: { user: SessionUser }) {
  const { data: events = [] } = useEvents();
  const { data: articles = [] } = useArticles();
  const own = articles.filter((article) => article.memberIds.includes(user.id));
  const nextDeadline = own
    .filter((article) => article.status !== 'FINISHED' && article.currentMilestoneDeadline)
    .map((article) => article.currentMilestoneDeadline as string)
    .sort()[0];

  return (
    <PageScaffold
      activeSection="dashboard"
      description="Acompanhe o artigo da sua equipe, os prazos do cronograma e os eventos da sua turma."
      eyebrow="Minha jornada"
      title={`Olá, ${user.name}`}
    >
      <Metrics>
        <MetricCard
          icon={<DocumentIcon className="h-5 w-5" />}
          label="Meus artigos"
          value={String(own.length)}
        />
        <MetricCard
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Meus eventos"
          value={String(events.filter((event) => event.status === 'ACTIVE').length)}
        />
        <MetricCard
          icon={<ChartIcon className="h-5 w-5" />}
          label="Próxima entrega"
          value={nextDeadline ? shortDate.format(new Date(nextDeadline)) : '—'}
        />
        <MetricCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Artigos finalizados"
          value={String(own.filter((article) => article.status === 'FINISHED').length)}
        />
      </Metrics>

      <QuickLinks
        links={[
          { href: '/admin/artigos', label: 'Abrir meus artigos' },
          { href: '/admin/equipes', label: 'Minha equipe' },
          { href: '/admin/eventos', label: 'Eventos da turma' },
        ]}
      />

      <SectionPanel className="mt-8" title="Meu trabalho em andamento">
        <ArticleCards
          articles={[...own].sort(byRecentUpdate)}
          empty="Você ainda não integra uma equipe. Consulte os eventos da sua turma em Equipes."
          events={events}
        />
      </SectionPanel>
    </PageScaffold>
  );
}

export function AcademicDashboardPage() {
  const user = useCurrentUser();

  if (user.role === 'systemAdmin') return <SystemDashboard />;
  if (user.role === 'student') return <StudentDashboard user={user} />;
  if (user.role === 'advisor') return <AdvisorDashboard user={user} />;
  return <ManagementDashboard user={user} />;
}
