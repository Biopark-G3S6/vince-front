import { articleHref, useArticles } from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { EmptyState, SectionPanel, StatusBadge, type BadgeTone } from '@shared/ui';

import { readCycleOf } from '../api/reviewApi';
import { findMilestone, isPending, type ArticleStatus } from '../model/review';

const statusView: Record<ArticleStatus, { label: string; tone: BadgeTone }> = {
  FINISHED: { label: 'Finished', tone: 'success' },
  IN_PROGRESS: { label: 'In Progress', tone: 'warning' },
  IN_REVIEW: { label: 'In Review', tone: 'primary' },
  STARTED: { label: 'Started', tone: 'muted' },
};

const destinations = [
  { label: 'Abrir no editor', path: '/artigos/editor' },
  { label: 'Correção', path: '/admin/correcao' },
  { label: 'Discussão', path: '/admin/discussao' },
];

/**
 * Artigos das equipes cadastradas, com a situação de cada um. É daqui que se abre um
 * artigo: o endereço leva o artigo escolhido às telas que trabalham sobre ele.
 */
export function ArticleList({ title }: { title: string }) {
  const { formatDate } = useFormatters();
  const { data: articles = [] } = useArticles();

  return (
    <SectionPanel className="mt-8" title={title}>
      {articles.length === 0 ? (
        <EmptyState title="Nenhuma equipe criada ainda." />
      ) : (
        <ul className="divide-y divide-vince-border">
          {articles.map((article) => {
            const cycle = readCycleOf(article.id);
            const milestone = findMilestone(cycle, cycle.currentMilestoneId);
            const view = statusView[cycle.status];

            return (
              <li
                className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0"
                key={article.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold text-vince-text">{article.title}</p>
                  <p className="text-sm text-vince-muted">
                    {article.team} · {article.event} · {article.advisor.name}
                  </p>
                  <p className="mt-1 text-sm text-vince-muted">
                    {article.members.map((member) => member.name).join(', ')}
                  </p>
                </div>
                <div className="text-sm text-vince-muted">
                  <StatusBadge label={view.label} tone={view.tone} />
                  {milestone && (
                    <p className="mt-2">
                      {milestone.name} · até {formatDate(milestone.deadline)}
                    </p>
                  )}
                  <p>{cycle.remarks.filter(isPending).length} apontamentos pendentes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((destination, index) => (
                    <a
                      className={
                        index === 0
                          ? 'inline-flex h-9 items-center rounded-padrao bg-vince-primary px-3 text-sm font-semibold text-white hover:bg-[#571424]'
                          : 'inline-flex h-9 items-center rounded-padrao border border-vince-border px-3 text-sm font-semibold text-vince-primary hover:bg-vince-tertiary'
                      }
                      href={articleHref(destination.path, article.id)}
                      key={destination.path}
                    >
                      {destination.label}
                    </a>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionPanel>
  );
}
