import { useState } from 'react';

import { Button, CheckCircleIcon, DocumentIcon, EditIcon, PlusIcon } from '@shared/ui';

import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { articles, type ArticleEvaluation, type ArticleStatus } from '../model/academic';

const articleStatusView: Record<
  ArticleStatus,
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  finished: { label: 'Finished', tone: 'success' },
  inProgress: { label: 'In Progress', tone: 'warning' },
  inReview: { label: 'In Review', tone: 'primary' },
  started: { label: 'Started', tone: 'muted' },
};

const pipeline: Array<{ key: ArticleStatus; label: string }> = [
  { key: 'started', label: 'Started' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'inReview', label: 'In Review' },
  { key: 'finished', label: 'Finished' },
];

export function ArticlesPage() {
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? '');
  const selectedArticle =
    articles.find((article) => article.id === selectedArticleId) ?? articles[0];

  return (
    <PageScaffold
      actions={
        <Button className="rounded-padrao px-7">
          <PlusIcon className="h-5 w-5" />
          Registrar publicação
        </Button>
      }
      activeSection="articles"
      description="Acompanhe a situação do artigo, registre avaliações, notas individuais e publicações externas."
      eyebrow="Artigos"
      title="Artigos"
    >
      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<DocumentIcon className="h-5 w-5" />}
          label="Artigos acompanhados"
          value={String(articles.length)}
        />
        <MetricCard
          icon={<EditIcon className="h-5 w-5" />}
          label="Em revisão"
          value={String(articles.filter((article) => article.status === 'inReview').length)}
        />
        <MetricCard
          icon={<CheckCircleIcon className="h-5 w-5" />}
          label="Finalizados"
          value={String(articles.filter((article) => article.status === 'finished').length)}
        />
        <MetricCard
          icon={<PlusIcon className="h-5 w-5" />}
          label="Publicações externas"
          value={String(articles.filter((article) => article.externalPublication).length)}
        />
      </section>

      <section className="mt-8 grid gap-8 2xl:grid-cols-[360px_1fr]">
        <SectionPanel title="Lista de artigos">
          <div className="space-y-3">
            {articles.map((article) => (
              <button
                className="w-full rounded-lg border border-vince-border p-4 text-left transition-colors hover:bg-vince-tertiary"
                key={article.id}
                onClick={() => setSelectedArticleId(article.id)}
                type="button"
              >
                <StatusBadge
                  label={articleStatusView[article.status].label}
                  tone={articleStatusView[article.status].tone}
                />
                <h2 className="mt-3 text-lg font-extrabold text-vince-text">{article.title}</h2>
                <p className="mt-1 text-sm text-vince-muted">{article.team}</p>
              </button>
            ))}
          </div>
        </SectionPanel>

        {selectedArticle && <ArticleWorkspace article={selectedArticle} />}
      </section>
    </PageScaffold>
  );
}

function ArticleWorkspace({ article }: { article: ArticleEvaluation }) {
  const currentIndex = pipeline.findIndex((step) => step.key === article.status);

  return (
    <div className="space-y-8">
      <SectionPanel
        actions={
          <a className="font-semibold text-vince-primary hover:underline" href="/admin/equipes">
            Ver equipe →
          </a>
        }
        title="Situação do artigo"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <StatusBadge
              label={articleStatusView[article.status].label}
              tone={articleStatusView[article.status].tone}
            />
            <h2 className="mt-4 text-3xl font-extrabold text-vince-text">{article.title}</h2>
            <p className="mt-2 text-vince-muted">
              {article.team} · Etapa atual: {article.currentMilestone}
            </p>
          </div>
          <div className="rounded-lg border border-vince-border bg-[#fffafa] px-5 py-4">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
              Próximo prazo
            </p>
            <p className="mt-1 text-2xl font-extrabold text-vince-primary">{article.dueDate}</p>
          </div>
        </div>

        <div className="mt-10">
          <div className="relative grid gap-4 md:grid-cols-4">
            <span className="absolute left-0 right-0 top-5 hidden h-1 bg-[#e8e2e3] md:block" />
            <span
              className="absolute left-0 top-5 hidden h-1 bg-vince-primary md:block"
              style={{ width: `${Math.max(0, currentIndex) * 33.3}%` }}
            />
            {pipeline.map((step, index) => {
              const reached = index <= currentIndex;

              return (
                <div className="relative text-center" key={step.key}>
                  <span
                    className={
                      reached
                        ? 'mx-auto flex h-11 w-11 items-center justify-center rounded-full border-4 border-vince-tertiary bg-vince-primary text-white'
                        : 'mx-auto flex h-11 w-11 items-center justify-center rounded-full border-4 border-vince-border bg-white text-vince-muted'
                    }
                  >
                    {reached ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                  </span>
                  <p className="mt-2 font-semibold text-vince-text">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-vince-border bg-[#fffafa] p-5">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            Feedback atual
          </p>
          <blockquote className="mt-3 border-l-4 border-vince-primary pl-5 text-lg leading-8 text-vince-text">
            "{article.feedback}"
          </blockquote>
        </div>
      </SectionPanel>

      <section className="grid gap-8 2xl:grid-cols-[1fr_1fr]">
        <SectionPanel title="Avaliar artigo">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Nota do artigo
              </span>
              <input
                className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.articleGrade}
                max="10"
                min="0"
                step="0.1"
                type="number"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Parecer do orientador responsável
              </span>
              <textarea
                className="min-h-32 w-full rounded-lg border border-vince-border p-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.feedback}
              />
            </label>
            <Button>Registrar avaliação</Button>
          </div>
        </SectionPanel>

        <SectionPanel title="Avaliação individual">
          <div className="space-y-4">
            {article.memberGrades.map((member) => (
              <label
                className="flex items-center justify-between gap-4 rounded-lg border border-vince-border px-4 py-3"
                key={member.name}
              >
                <span className="font-semibold text-vince-text">{member.name}</span>
                <input
                  className="h-10 w-24 rounded-lg border border-vince-border px-3 text-vince-text focus:border-vince-primary"
                  defaultValue={member.grade}
                  max="10"
                  min="0"
                  step="0.1"
                  type="number"
                />
              </label>
            ))}
            <Button variant="outline">Salvar notas individuais</Button>
          </div>
        </SectionPanel>
      </section>

      <SectionPanel title="Publicação externa">
        <div className="grid gap-5 2xl:grid-cols-[1fr_1fr_160px]">
          <label>
            <span className="mb-2 block text-sm font-semibold text-vince-muted">Veículo</span>
            <input
              className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
              defaultValue={article.externalPublication?.vehicle ?? ''}
              placeholder="Anais, periódico ou repositório"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-vince-muted">URL</span>
            <input
              className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
              defaultValue={article.externalPublication?.url ?? ''}
              placeholder="https://"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-vince-muted">Data</span>
            <input
              className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
              defaultValue={article.externalPublication?.date ?? ''}
              placeholder="dd mmm, aaaa"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <Button>Salvar publicação</Button>
        </div>
      </SectionPanel>
    </div>
  );
}
