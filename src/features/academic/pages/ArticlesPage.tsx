import { useState } from 'react';
import { toast } from 'sonner';

import { ArticleList } from '@features/review';
import { useCurrentUser } from '@features/admin';
import { Button, CheckCircleIcon, DocumentIcon, EditIcon, PlusIcon } from '@shared/ui';

import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { type ArticleEvaluation, type ArticleStatus } from '../model/academic';
import { useAcademicCollection } from '../api/academicStore';

const articleStatusView: Record<
  ArticleStatus,
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  finished: { label: 'Finalizado', tone: 'success' },
  inProgress: { label: 'Em desenvolvimento', tone: 'warning' },
  inReview: { label: 'Em revisão', tone: 'primary' },
  started: { label: 'Iniciado', tone: 'muted' },
};

const pipeline: Array<{ key: ArticleStatus; label: string }> = [
  { key: 'started', label: 'Iniciado' },
  { key: 'inProgress', label: 'Em desenvolvimento' },
  { key: 'inReview', label: 'Em revisão' },
  { key: 'finished', label: 'Finalizado' },
];

export function ArticlesPage() {
  const currentUser = useCurrentUser();
  const [articles, setArticles] = useAcademicCollection('articles');
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? '');
  const selectedArticle =
    articles.find((article) => article.id === selectedArticleId) ?? articles[0];

  if (currentUser.role === 'advisor' || currentUser.role === 'student') {
    const isStudent = currentUser.role === 'student';

    return (
      <PageScaffold
        actions={
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex min-h-11 items-center rounded-padrao border border-vince-border bg-white px-5 py-2 font-semibold text-vince-primary hover:bg-vince-tertiary"
              href={isStudent ? '/admin/eventos' : '/admin/equipes'}
            >
              {isStudent ? 'Inscrever-me em evento' : 'Gerenciar equipes'}
            </a>
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-padrao bg-vince-primary px-5 py-2 font-semibold text-white hover:bg-[#571424]"
              href="/artigos/modelo"
            >
              <PlusIcon className="h-5 w-5" /> Novo artigo
            </a>
          </div>
        }
        activeSection="articles"
        description={
          isStudent
            ? 'Crie artigos com um modelo padrão ou importado e participe dos eventos disponíveis para sua turma.'
            : 'Crie seus próprios artigos e acompanhe os trabalhos sob sua orientação, inclusive testes e TCCs.'
        }
        eyebrow={isStudent ? 'Minha produção' : 'Orientação'}
        title={isStudent ? 'Meus artigos' : 'Artigos orientados'}
      >
        <ArticleList
          title={isStudent ? 'Minha produção e artigos da equipe' : 'Minha produção e orientações'}
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-padrao border border-vince-border bg-white px-5 py-2 font-semibold text-vince-primary hover:bg-vince-tertiary"
            href="/artigos/modelo"
          >
            <PlusIcon className="h-5 w-5" /> Novo artigo
          </a>
          <Button
            className="rounded-padrao px-7"
            onClick={() => {
              const input = document.getElementById('publication-vehicle');
              input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              input?.focus({ preventScroll: true });
            }}
          >
            <PlusIcon className="h-5 w-5" />
            Registrar publicação
          </Button>
        </div>
      }
      activeSection="articles"
      description="Acompanhe a situação do artigo, registre avaliações, notas individuais e publicações externas."
      eyebrow="Artigos"
      title="Artigos"
    >
      <ArticleList title="Artigos das equipes" />

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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

      <section className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <SectionPanel title="Lista de artigos">
          <div className="space-y-3">
            {articles.map((article) => (
              <button
                aria-pressed={article.id === selectedArticle?.id}
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

        {selectedArticle && (
          <ArticleWorkspace
            article={selectedArticle}
            key={selectedArticle.id}
            onUpdate={(updated) =>
              setArticles((current) =>
                current.map((article) => (article.id === updated.id ? updated : article)),
              )
            }
          />
        )}
      </section>
    </PageScaffold>
  );
}

function ArticleWorkspace({
  article,
  onUpdate,
}: {
  article: ArticleEvaluation;
  onUpdate: (article: ArticleEvaluation) => void;
}) {
  const currentIndex = pipeline.findIndex((step) => step.key === article.status);

  return (
    <div className="min-w-0 space-y-8">
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
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const feedback = String(form.get('feedback') ?? '').trim();
              if (!feedback) {
                toast.error('Informe o parecer do orientador.');
                return;
              }
              onUpdate({ ...article, articleGrade: Number(form.get('articleGrade')), feedback });
              toast.success('Avaliação registrada na demonstração.');
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Nota do artigo
              </span>
              <input
                className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.articleGrade}
                name="articleGrade"
                required
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
                name="feedback"
                required
              />
            </label>
            <Button type="submit">Registrar avaliação</Button>
          </form>
        </SectionPanel>

        <SectionPanel title="Avaliação individual">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onUpdate({
                ...article,
                memberGrades: article.memberGrades.map((member, index) => ({
                  ...member,
                  grade: Number(form.get(`member-${index}`)),
                })),
              });
              toast.success('Notas individuais salvas na demonstração.');
            }}
          >
            {article.memberGrades.map((member, index) => (
              <label
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-vince-border px-4 py-3"
                key={member.name}
              >
                <span className="font-semibold text-vince-text">{member.name}</span>
                <input
                  className="h-10 w-24 rounded-lg border border-vince-border px-3 text-vince-text focus:border-vince-primary"
                  defaultValue={member.grade}
                  name={`member-${index}`}
                  required
                  max="10"
                  min="0"
                  step="0.1"
                  type="number"
                />
              </label>
            ))}
            <Button type="submit" variant="outline">
              Salvar notas individuais
            </Button>
          </form>
        </SectionPanel>
      </section>

      <SectionPanel title="Publicação externa">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const vehicle = String(form.get('vehicle') ?? '').trim();
            const url = String(form.get('url') ?? '').trim();
            const date = String(form.get('date') ?? '').trim();
            if (!vehicle || !date || !/^https?:\/\//i.test(url)) {
              toast.error('Informe o veículo, a data e uma URL com http ou https.');
              return;
            }
            onUpdate({
              ...article,
              externalPublication: {
                vehicle,
                url,
                date,
                type: article.externalPublication?.type ?? 'Publicação externa',
              },
            });
            toast.success('Publicação registrada na demonstração.');
          }}
        >
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px]">
            <label>
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Veículo</span>
              <input
                className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.externalPublication?.vehicle ?? ''}
                id="publication-vehicle"
                name="vehicle"
                required
                placeholder="Anais, periódico ou repositório"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-vince-muted">URL</span>
              <input
                className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.externalPublication?.url ?? ''}
                name="url"
                required
                type="url"
                placeholder="https://"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Data</span>
              <input
                className="h-12 w-full rounded-lg border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                defaultValue={article.externalPublication?.date ?? ''}
                name="date"
                required
                placeholder="dd mmm, aaaa"
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit">Salvar publicação</Button>
          </div>
        </form>
      </SectionPanel>
    </div>
  );
}
