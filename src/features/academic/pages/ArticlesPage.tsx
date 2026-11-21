import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { hasPermission, useCurrentUser } from '@features/admin';
import { useUserNames } from '@shared/api/directory';
import {
  Button,
  CheckCircleIcon,
  ConfirmDialog,
  DocumentIcon,
  EditIcon,
  EmptyState,
  PlusIcon,
} from '@shared/ui';

import {
  useArticleMutations,
  useArticles,
  useAssessments,
  usePublications,
  useTeamNames,
  type AssessmentDto,
  type PublicationDto,
} from '../api/articleApi';
import { describeAcademicError } from '../api/courseApi';
import { useEventDetails, useEvents } from '../api/eventApi';
import type { ArticleSummaryDto } from '../api/teamApi';
import { academicFieldClass } from '../components/AcademicActionDialog';
import {
  MetricCard,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

type Status = ArticleSummaryDto['status'];

const statusView: Record<
  Status,
  { label: string; tone: 'success' | 'warning' | 'primary' | 'muted' }
> = {
  FINISHED: { label: 'Finalizado', tone: 'success' },
  IN_PROGRESS: { label: 'Em desenvolvimento', tone: 'warning' },
  IN_REVIEW: { label: 'Em revisão', tone: 'primary' },
  STARTED: { label: 'Iniciado', tone: 'muted' },
};

const pipeline: Status[] = ['STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'FINISHED'];

const kindLabel = {
  CONFERENCE: 'Evento científico',
  JOURNAL: 'Periódico',
  OTHER: 'Outro',
} as const;

const errorText: Record<string, string> = {
  PERMISSION_DENIED: 'Só o orientador responsável pela equipe avalia o artigo.',
  ARTICLE_LOCKED_FOR_REVIEW: 'O artigo está em revisão e não pode ser alterado agora.',
  ARTICLE_ALREADY_FINISHED: 'O artigo já foi concluído.',
};

function describe(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : '';
  return errorText[code] ?? describeAcademicError(error);
}

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso)) : '—';

/** A data da publicação é um dia de calendário, guardado em UTC. */
const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));

/** RF-ART-001 a RF-ART-004: situação, avaliação, notas individuais e publicação externa. */
export function ArticlesPage() {
  const user = useCurrentUser();
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const articlesQuery = useArticles({
    eventId: eventFilter || undefined,
    status: statusFilter || undefined,
  });
  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);
  const teamNames = useTeamNames(articles);
  const events = useEvents().data ?? [];
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const selected = articles.find((article) => article.id === selectedArticleId) ?? articles[0];

  return (
    <PageScaffold
      activeSection="articles"
      description="Acompanhe a situação do artigo, registre avaliações, notas individuais e publicações externas."
      eyebrow="Artigos"
      title={user.roles.includes('student') && user.roles.length === 1 ? 'Meus artigos' : 'Artigos'}
    >
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          icon={<DocumentIcon className="h-5 w-5" />}
          label="Artigos acompanhados"
          value={String(articles.length)}
        />
        <MetricCard
          icon={<EditIcon className="h-5 w-5" />}
          label="Em revisão"
          value={String(articles.filter((article) => article.status === 'IN_REVIEW').length)}
        />
        <MetricCard
          icon={<CheckCircleIcon className="h-5 w-5" />}
          label="Finalizados"
          value={String(articles.filter((article) => article.status === 'FINISHED').length)}
        />
        <MetricCard
          icon={<PlusIcon className="h-5 w-5" />}
          label="Em andamento"
          value={String(articles.filter((article) => article.status !== 'FINISHED').length)}
        />
      </section>

      <section className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <SectionPanel title="Lista de artigos">
          <div className="mb-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-vince-muted">Evento</span>
              <select
                className={academicFieldClass}
                onChange={(change) => setEventFilter(change.target.value)}
                value={eventFilter}
              >
                <option value="">Todos os eventos</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-vince-muted">Situação</span>
              <select
                className={academicFieldClass}
                onChange={(change) => setStatusFilter(change.target.value as '' | Status)}
                value={statusFilter}
              >
                <option value="">Todas as situações</option>
                {pipeline.map((step) => (
                  <option key={step} value={step}>
                    {statusView[step].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {articles.map((article) => (
              <button
                aria-label={`Abrir artigo ${article.title ?? teamNames.get(article.teamId) ?? ''}`}
                aria-pressed={article.id === selected?.id}
                className="w-full rounded-lg border border-vince-border p-4 text-left transition-colors hover:bg-vince-tertiary"
                key={article.id}
                onClick={() => setSelectedArticleId(article.id)}
                type="button"
              >
                <StatusBadge
                  label={statusView[article.status].label}
                  tone={statusView[article.status].tone}
                />
                <h2 className="mt-3 text-lg font-extrabold text-vince-text">
                  {article.title ?? 'Artigo sem título'}
                </h2>
                <p className="mt-1 text-sm text-vince-muted">
                  {teamNames.get(article.teamId) ?? 'Equipe'}
                </p>
              </button>
            ))}
            {articlesQuery.isPending && (
              <p className="text-sm text-vince-muted" role="status">
                Carregando artigos…
              </p>
            )}
            {!articlesQuery.isPending && articles.length === 0 && (
              <EmptyState
                title="Nenhum artigo"
                description="Os artigos nascem com as equipes dos eventos em que você participa."
              />
            )}
          </div>
        </SectionPanel>

        {selected && (
          <ArticleWorkspace
            article={selected}
            key={selected.id}
            teamName={teamNames.get(selected.teamId) ?? 'Equipe'}
          />
        )}
      </section>
    </PageScaffold>
  );
}

function ArticleWorkspace({ article, teamName }: { article: ArticleSummaryDto; teamName: string }) {
  const user = useCurrentUser();
  const can = (permission: string) => hasPermission(user, permission);
  const isResponsible = article.advisorId === user.id;
  const isMember = article.memberIds.includes(user.id);
  const assessments = useAssessments(article.id, isResponsible);
  const publications = usePublications(article.id, can('PUBLICATION:READ'));
  // Mantém a publicação quem integra a equipe, o responsável e os orientadores do evento.
  const eventAdvisors = useEventDetails(article.eventId).advisors.data ?? [];
  const keepsPublications =
    isMember || isResponsible || eventAdvisors.some((item) => item.userId === user.id);
  const history = assessments.data ?? [];
  const names = useUserNames([
    ...article.memberIds,
    article.advisorId,
    ...history.map((item) => item.evaluatedBy),
    ...history.map((item) => item.memberId),
  ]);
  const mutations = useArticleMutations();
  const [title, setTitle] = useState(article.title ?? '');
  const [editingPublicationId, setEditingPublicationId] = useState('');
  const [removing, setRemoving] = useState<PublicationDto | null>(null);

  const articleGrades = history.filter((item) => item.memberId === null);
  const latestGrade = articleGrades[0];
  const latestMemberGrade = (memberId: string) =>
    history.find((item) => item.memberId === memberId);
  const memberGrades = history.filter((item) => item.memberId !== null);
  const describeGrade = (grade: AssessmentDto) =>
    `${grade.score.toLocaleString('pt-BR')} em ${formatDate(grade.createdAt)}, por ${names.nameOf(grade.evaluatedBy)}`;

  async function run(task: () => Promise<unknown>, success: string) {
    try {
      await task();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(describe(error));
      return false;
    }
  }

  async function gradeArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () =>
        mutations.grade.mutateAsync({
          articleId: article.id,
          score: Number(form.get('articleGrade')),
          feedback: String(form.get('feedback') ?? '').trim(),
        }),
      'Avaliação registrada.',
    );
  }

  async function gradeMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scores = article.memberIds
      .map((memberId) => ({ memberId, raw: String(form.get(`member-${memberId}`) ?? '') }))
      .filter((item) => item.raw !== '')
      .map((item) => ({ memberId: item.memberId, score: Number(item.raw) }));
    if (scores.length === 0) {
      toast.error('Informe ao menos uma nota individual.');
      return;
    }
    await run(
      () => mutations.gradeMembers.mutateAsync({ articleId: article.id, scores }),
      'Notas individuais registradas.',
    );
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const url = String(form.get('url') ?? '').trim();
    if (!/^https?:\/\//.test(url)) {
      toast.error('Informe uma URL com http ou https.');
      return;
    }
    const done = await run(
      () =>
        mutations.publish.mutateAsync({
          articleId: article.id,
          venueName: String(form.get('venueName') ?? '').trim(),
          kind: String(form.get('kind')) as 'CONFERENCE' | 'JOURNAL' | 'OTHER',
          publicationDate: new Date(
            `${String(form.get('publicationDate'))}T12:00:00Z`,
          ).toISOString(),
          url,
        }),
      'Publicação registrada.',
    );
    if (done) formElement.reset();
  }

  async function updatePublication(event: FormEvent<HTMLFormElement>, publicationId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get('url') ?? '').trim();
    if (!/^https?:\/\//.test(url)) {
      toast.error('Informe uma URL com http ou https.');
      return;
    }
    const done = await run(
      () =>
        mutations.updatePublication.mutateAsync({
          articleId: article.id,
          publicationId,
          venueName: String(form.get('venueName') ?? '').trim(),
          kind: String(form.get('kind')) as 'CONFERENCE' | 'JOURNAL' | 'OTHER',
          publicationDate: new Date(
            `${String(form.get('publicationDate'))}T12:00:00Z`,
          ).toISOString(),
          url,
        }),
      'Publicação atualizada.',
    );
    if (done) setEditingPublicationId('');
  }

  const currentStep = pipeline.indexOf(article.status);

  return (
    <div className="min-w-0 space-y-6">
      <SectionPanel title="Situação do artigo">
        <StatusBadge
          label={statusView[article.status].label}
          tone={statusView[article.status].tone}
        />
        <h2 className="mt-4 text-3xl font-extrabold text-vince-text">
          {article.title ?? 'Artigo sem título'}
        </h2>
        <p className="mt-1 text-vince-muted">
          {teamName} · Orientador responsável:{' '}
          {article.advisorId ? names.nameOf(article.advisorId) : 'não definido'}
        </p>
        <ol aria-label="Etapas do artigo" className="mt-6 grid gap-3 sm:grid-cols-4">
          {pipeline.map((step, index) => (
            <li
              aria-current={index === currentStep ? 'step' : undefined}
              className={`rounded-lg border p-3 text-sm font-semibold ${
                index <= currentStep
                  ? 'border-vince-primary bg-vince-tertiary text-vince-primary'
                  : 'border-vince-border text-vince-muted'
              }`}
              key={step}
            >
              {statusView[step].label}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-vince-muted">
          Etapa corrente do cronograma:{' '}
          {article.currentMilestoneOrder
            ? `${article.currentMilestoneOrder}ª, prazo ${formatDate(article.currentMilestoneDeadline)}`
            : 'nenhuma etapa aberta'}
        </p>
        <p className="mt-2 text-sm text-vince-muted">
          Integrantes: {article.memberIds.map((id) => names.nameOf(id)).join(', ') || 'nenhum'}
        </p>

        {isMember && can('ARTICLE:EDIT') && (
          <form
            className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  mutations.rename.mutateAsync({
                    articleId: article.id,
                    title: title.trim() || null,
                  }),
                'Título atualizado.',
              );
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Título do artigo
              </span>
              <input
                className={academicFieldClass}
                maxLength={300}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <Button className="self-end" type="submit" variant="outline">
              Salvar título
            </Button>
          </form>
        )}
      </SectionPanel>

      {isResponsible && (
        <SectionPanel title="Avaliação do orientador">
          <form className="space-y-4" onSubmit={(event) => void gradeArticle(event)}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Nota do artigo
              </span>
              <input
                className={academicFieldClass}
                defaultValue={latestGrade?.score}
                key={latestGrade?.id ?? 'none'}
                max={10}
                min={0}
                name="articleGrade"
                required
                step={0.1}
                type="number"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Parecer do orientador responsável
              </span>
              <textarea
                className={`${academicFieldClass} min-h-24 py-3`}
                defaultValue={latestGrade?.feedback ?? ''}
                key={`fb-${latestGrade?.id ?? 'none'}`}
                maxLength={4000}
                name="feedback"
              />
            </label>
            <Button type="submit">Registrar avaliação</Button>
          </form>

          {article.memberIds.length > 0 && (
            <form className="mt-8 space-y-4" onSubmit={(event) => void gradeMembers(event)}>
              <h3 className="font-extrabold text-vince-text">Notas individuais</h3>
              {article.memberIds.map((memberId) => (
                <label className="grid items-center gap-3 sm:grid-cols-[1fr_140px]" key={memberId}>
                  <span className="text-vince-text">Nota de {names.nameOf(memberId)}</span>
                  <input
                    className={academicFieldClass}
                    defaultValue={latestMemberGrade(memberId)?.score}
                    key={latestMemberGrade(memberId)?.id ?? memberId}
                    max={10}
                    min={0}
                    name={`member-${memberId}`}
                    step={0.1}
                    type="number"
                  />
                </label>
              ))}
              <Button type="submit" variant="outline">
                Salvar notas individuais
              </Button>
            </form>
          )}

          {articleGrades.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 font-extrabold text-vince-text">Histórico da nota do artigo</h3>
              <ul className="space-y-1 text-sm text-vince-muted">
                {articleGrades.map((grade) => (
                  <li key={grade.id}>
                    {describeGrade(grade)}
                    {grade.feedback ? ` — "${grade.feedback}"` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {memberGrades.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-extrabold text-vince-text">
                Histórico das notas individuais
              </h3>
              <ul className="space-y-1 text-sm text-vince-muted">
                {memberGrades.map((grade) => (
                  <li key={grade.id}>
                    {names.nameOf(grade.memberId)}: {describeGrade(grade)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionPanel>
      )}

      {can('PUBLICATION:READ') && (
        <SectionPanel title="Publicação externa">
          <ul className="space-y-3">
            {(publications.data ?? []).map((publication) =>
              editingPublicationId === publication.id ? (
                <li className="rounded-lg border border-vince-primary p-4" key={publication.id}>
                  <form
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={(event) => void updatePublication(event, publication.id)}
                  >
                    <PublicationFields publication={publication} />
                    <div className="flex gap-3 sm:col-span-2">
                      <Button type="submit">Salvar alterações</Button>
                      <Button
                        onClick={() => setEditingPublicationId('')}
                        type="button"
                        variant="outline"
                      >
                        Cancelar edição
                      </Button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-vince-border p-4"
                  key={publication.id}
                >
                  <div>
                    <p className="font-bold text-vince-text">{publication.venueName}</p>
                    <p className="text-sm text-vince-muted">
                      {kindLabel[publication.kind]} · {formatDay(publication.publicationDate)}
                    </p>
                    <a
                      className="break-all text-sm text-vince-primary underline"
                      href={publication.url}
                    >
                      {publication.url}
                    </a>
                  </div>
                  {keepsPublications && (
                    <span className="flex gap-2">
                      {can('PUBLICATION:UPDATE') && (
                        <Button
                          aria-label={`Editar publicação ${publication.venueName}`}
                          onClick={() => setEditingPublicationId(publication.id)}
                          size="sm"
                          variant="outline"
                        >
                          Editar
                        </Button>
                      )}
                      {can('PUBLICATION:DELETE') && (
                        <Button
                          aria-label={`Remover publicação ${publication.venueName}`}
                          onClick={() => setRemoving(publication)}
                          size="sm"
                          variant="outline"
                        >
                          Remover
                        </Button>
                      )}
                    </span>
                  )}
                </li>
              ),
            )}
            {publications.data?.length === 0 && (
              <p className="text-sm text-vince-muted">Nenhuma publicação registrada.</p>
            )}
          </ul>

          {can('PUBLICATION:CREATE') && keepsPublications && (
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => void publish(event)}
            >
              <PublicationFields />
              <div className="sm:col-span-2">
                <Button type="submit">Salvar publicação</Button>
              </div>
            </form>
          )}
        </SectionPanel>
      )}
      <ConfirmDialog
        cancelLabel="Voltar"
        confirmLabel="Remover publicação"
        description={`O registro de ${removing?.venueName ?? ''} deixa de constar no artigo e no relatório do curso.`}
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target) {
            void run(
              () =>
                mutations.unpublish.mutateAsync({
                  articleId: article.id,
                  publicationId: target.id,
                }),
              'Publicação removida.',
            );
          }
        }}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        open={removing !== null}
        title="Remover publicação?"
      />
    </div>
  );
}

/** Os campos do registro de publicação, na criação e na edição (RF-ART-004). */
function PublicationFields({ publication }: { publication?: PublicationDto }) {
  return (
    <>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">Veículo</span>
        <input
          className={academicFieldClass}
          defaultValue={publication?.venueName}
          name="venueName"
          required
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">Tipo</span>
        <select className={academicFieldClass} defaultValue={publication?.kind} name="kind">
          <option value="CONFERENCE">Evento científico</option>
          <option value="JOURNAL">Periódico</option>
          <option value="OTHER">Outro</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">Data</span>
        <input
          className={academicFieldClass}
          defaultValue={publication?.publicationDate.slice(0, 10)}
          name="publicationDate"
          required
          type="date"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">URL</span>
        <input
          className={academicFieldClass}
          defaultValue={publication?.url}
          name="url"
          required
          type="url"
        />
      </label>
    </>
  );
}
