import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useFormatters } from '@shared/i18n';
import {
  Button,
  CalendarIcon,
  EmptyState,
  FilterChip,
  MetricCard,
  Notice,
  SectionPanel,
  UsersIcon,
} from '@shared/ui';

import { useAdvisorTeams, useCourseEvents } from '../api/hooks';
import type { CourseEvent, TeamWithSignals } from '../model/progress';

import { TeamsTable } from './TeamsTable';
import { QueryFeedback } from './QueryFeedback';

type Filter = 'all' | 'withSignal' | 'notDelivered';
type Sort = 'signals' | 'lastEdit' | 'deadline' | 'name';

const filters: Filter[] = ['all', 'withSignal', 'notDelivered'];
const sorts: Sort[] = ['signals', 'lastEdit', 'deadline', 'name'];

/** RF-ACP-001 e RF-ACP-003 — Equipes sob orientação, com os sinais de atenção. */
export function AdvisorTeamsPanel() {
  const { t } = useTranslation('progress');
  const { compareText, formatNumber } = useFormatters();
  const { data: teams, error, refetch } = useAdvisorTeams();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('signals');

  if (!teams) {
    return (
      <QueryFeedback
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        description={t('teams.emptyBody')}
        icon={<UsersIcon className="h-8 w-8" />}
        title={t('teams.emptyTitle')}
      />
    );
  }

  const matches: Record<Filter, (team: TeamWithSignals) => boolean> = {
    all: () => true,
    notDelivered: (team) => team.delivery === 'pending',
    withSignal: (team) => team.signals.length > 0,
  };
  const comparators: Record<Sort, (a: TeamWithSignals, b: TeamWithSignals) => number> = {
    deadline: (a, b) => a.milestone.deadline.localeCompare(b.milestone.deadline),
    lastEdit: (a, b) => a.lastEditedAt.localeCompare(b.lastEditedAt),
    name: (a, b) => compareText(a.name, b.name),
    signals: (a, b) => b.signals.length - a.signals.length || compareText(a.name, b.name),
  };
  const visible = teams.filter(matches[filter]).sort(comparators[sort]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard label={t('metrics.teams')} value={formatNumber(teams.length)} />
        <MetricCard
          label={t('metrics.withSignal')}
          tone="danger"
          value={formatNumber(teams.filter(matches.withSignal).length)}
        />
        <MetricCard
          label={t('metrics.notDelivered')}
          value={formatNumber(teams.filter(matches.notDelivered).length)}
        />
        <MetricCard
          label={t('metrics.pendingRemarks')}
          value={formatNumber(teams.reduce((sum, team) => sum + team.pendingRemarks, 0))}
        />
      </div>

      <section className="min-w-0 rounded-lg border border-vince-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-vince-border px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((key) => (
              <FilterChip active={filter === key} key={key} onClick={() => setFilter(key)}>
                {t(`filter.${key}`)} ({teams.filter(matches[key]).length})
              </FilterChip>
            ))}
          </div>
          <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-vince-muted">
            {t('sort.label')}
            <select
              className="h-10 max-w-full rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary"
              onChange={(event) => setSort(event.target.value as Sort)}
              value={sort}
            >
              {sorts.map((key) => (
                <option key={key} value={key}>
                  {t(`sort.${key}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TeamsTable links={['article', 'review', 'discussion']} teams={visible} />
      </section>

      <Notice>{t('teams.signalNote')}</Notice>
    </div>
  );
}

/** RF-ACP-002 — Eventos do curso e as suas equipes, para o coordenador. */
export function CoursePanel() {
  const { t } = useTranslation('progress');
  const { data: events, error, refetch } = useCourseEvents();

  if (!events) {
    return (
      <QueryFeedback
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        description={t('course.emptyBody')}
        icon={<CalendarIcon className="h-8 w-8" />}
        title={t('course.emptyTitle')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Notice>{t('course.coordinatorNote')}</Notice>
      {events.map((event) => (
        <EventCard event={event} key={event.id} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: CourseEvent }) {
  const { t } = useTranslation('progress');
  const { formatDate, formatNumber } = useFormatters();
  const [open, setOpen] = useState(false);
  const figures = [
    { label: t('course.teams'), value: event.teams.length },
    { label: t('course.delivered'), value: event.deliveredCurrent },
    { label: t('course.withSignal'), value: event.withSignal },
    { label: t('course.concluded'), value: event.concluded },
  ];

  return (
    <SectionPanel
      actions={
        <Button
          aria-controls={`course-teams-${event.id}`}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          size="sm"
          variant="outline"
        >
          {open ? t('course.hideTeams') : t('course.showTeams')}
        </Button>
      }
      title={event.name}
    >
      <p className="text-sm font-semibold text-vince-muted">{t(`course.scope.${event.scope}`)}</p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {figures.map((figure) => (
          <div className="rounded-lg border border-vince-border px-4 py-3" key={figure.label}>
            <dt className="text-sm text-vince-muted">{figure.label}</dt>
            <dd className="text-3xl font-black text-vince-primary">{formatNumber(figure.value)}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
        {t('course.schedule')}
      </h3>
      <ol className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
        {event.schedule.map((milestone, index) => (
          <li className="text-vince-text" key={milestone.name}>
            <span className="font-semibold">
              {index + 1}. {milestone.name}
            </span>{' '}
            <span className="text-sm text-vince-muted">— {formatDate(milestone.deadline)}</span>
          </li>
        ))}
      </ol>

      {open && (
        <div
          className="-mx-4 -mb-4 mt-6 border-t border-vince-border sm:-mx-6 sm:-mb-6"
          id={`course-teams-${event.id}`}
        >
          <TeamsTable links={['article']} showAdvisor teams={event.teams} />
        </div>
      )}
    </SectionPanel>
  );
}
