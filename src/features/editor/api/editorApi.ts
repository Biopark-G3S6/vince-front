import type { JSONContent } from '@tiptap/core';

import {
  cacheBackendArticle,
  canReadArticle,
  currentArticle,
  DEMO_ARTICLE_ID,
  type BackendArticleSummary,
} from '@features/articles';
import { findMilestone, getReviewCycle, saveDraft } from '@features/review';
import { ApiError } from '@shared/api/apiError';
import { apiRequest, isBackendEnabled, requireUuid } from '@shared/api/client';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  citedReferenceIds,
  createCitationResolver,
  fromParagraphs,
  toParagraphs,
  withCover,
  type ArticleParagraph,
} from '../model/document';
import { abntNorm } from '../model/editor';
import type {
  EditorState,
  HistoryEntry,
  HistoryKind,
  ImportMetadata,
  PageMargins,
} from '../model/editor';
import {
  emptyReference,
  missingFields,
  type Reference,
  type ReferenceData,
} from '../model/references';

/**
 * Backend simulado da edição do artigo (RF-EDT-001 a 008). O texto vive como dado
 * estruturado; o rascunho em parágrafos é compartilhado com o ciclo de correção.
 */

type Checkpoint = {
  at: string;
  authorId: string;
  authors: Record<string, string>;
  content: JSONContent;
  id: string;
  kind: Exclude<HistoryKind, 'delivery'>;
};

type EditorDb = {
  authorship: Record<string, string>;
  checkpoints: Checkpoint[];
  importMeta: ImportMetadata | null;
  margins: PageMargins;
  references: Reference[];
  snapshot: JSONContent | null;
  /** Estado do documento colaborativo, codificado. */
  ydoc: string | null;
};

const advisorId = () => currentArticle.advisor.id;
const memberIds = () => currentArticle.members.map((member) => member.id);

/** Intervalo mínimo entre pontos intermediários preservados pelo sistema. */
const CHECKPOINT_INTERVAL = 2 * 60_000;
const MAX_CHECKPOINTS = 15;

const demoSeed = (): EditorDb => ({
  authorship: {
    'p-goal': 'user-maria',
    'p-intro': 'user-joao',
    'p-method': 'user-joao',
    'p-theory': 'user-carlos',
  },
  checkpoints: [],
  importMeta: null,
  // Margens fora da norma, para que a formatação tenha o que corrigir (RF-EDT-005).
  margins: { bottom: 2.5, left: 2.5, right: 2.5, top: 2.5 },
  references: [
    {
      ...emptyReference,
      authors: ['Silva, Carlos Eduardo'],
      id: 'reference-silva',
      pages: '45-62',
      place: 'São Paulo',
      title: 'Aprendizado federado em saúde',
      type: 'article',
      vehicle: 'Revista Brasileira de Informática em Saúde',
      year: '2022',
    },
    {
      ...emptyReference,
      authors: ['LeCun, Yann'],
      doi: '10.1038/nature14539',
      id: 'reference-lecun',
      pages: '436-444',
      title: 'Deep learning',
      type: 'article',
      vehicle: 'Nature',
      year: '2015',
    },
    {
      ...emptyReference,
      authors: ['Gulshan, Varun'],
      id: 'reference-gulshan',
      pages: '2402-2410',
      title:
        'Desenvolvimento e validação de algoritmo de aprendizado profundo para detecção de retinopatia diabética',
      type: 'article',
      vehicle: 'JAMA',
      year: '2016',
    },
    {
      ...emptyReference,
      authors: ['Topol, Eric'],
      edition: '1',
      id: 'reference-topol',
      place: 'Nova York',
      publisher: 'Basic Books',
      title: 'Medicina profunda',
      type: 'book',
      year: '2019',
    },
  ],
  snapshot: null,
  ydoc: null,
});

/** O artigo recém-criado: sem referências, sem histórico e com a página já na norma. */
const blankSeed = (): EditorDb => ({
  authorship: {},
  checkpoints: [],
  importMeta: null,
  margins: { bottom: 2, left: 3, right: 2, top: 3 },
  references: [],
  snapshot: null,
  ydoc: null,
});

/** Cada artigo tem o seu documento, as suas referências e o seu histórico. */
function db() {
  const articleId = currentArticle.id;

  return createMockCollection<EditorDb>(`editor.${articleId}`, () =>
    articleId === DEMO_ARTICLE_ID ? demoSeed() : blankSeed(),
  );
}

function memberName(userId: string | null) {
  return currentArticle.members.find((member) => member.id === userId)?.name ?? '';
}

function assertReach(actorId: string) {
  if (!canReadArticle(actorId, currentArticle)) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }
}

function assertMember(actorId: string) {
  if (!memberIds().includes(actorId)) {
    throw new ApiError('PERMISSION_DENIED');
  }
}

async function readCycle() {
  return getReviewCycle(advisorId());
}

function currentContent(state: EditorDb, draft: ArticleParagraph[]): JSONContent {
  return state.snapshot ?? initialDocument(draft, state.references);
}

export async function getEditorState(actorId: string): Promise<EditorState> {
  if (isBackendEnabled()) {
    const article = await fetchBackendArticle();
    const isMember = article.memberIds.includes(actorId);
    const status = article.status as EditorState['status'];
    const lockCode =
      status === 'IN_REVIEW'
        ? 'ARTICLE_LOCKED_FOR_REVIEW'
        : status === 'FINISHED'
          ? 'ARTICLE_ALREADY_FINISHED'
          : isMember
            ? null
            : 'READ_ONLY_ROLE';
    const margins = article.formatProfile.margins;
    return {
      editable: isMember && (status === 'STARTED' || status === 'IN_PROGRESS'),
      importMeta: null,
      isMember,
      lastEditedAt: article.updatedAt,
      lockCode,
      margins: isPageMargins(margins) ? margins : abntNorm.margins,
      status,
    };
  }
  assertReach(actorId);

  const cycle = await readCycle();
  const state = db().read();
  const isMember = memberIds().includes(actorId);
  const lockCode =
    cycle.status === 'IN_REVIEW'
      ? 'ARTICLE_LOCKED_FOR_REVIEW'
      : cycle.status === 'FINISHED'
        ? 'ARTICLE_ALREADY_FINISHED'
        : isMember
          ? null
          : 'READ_ONLY_ROLE';

  return {
    editable: lockCode === null,
    importMeta: state.importMeta,
    isMember,
    lastEditedAt: cycle.lastEditedAt,
    lockCode,
    margins: state.margins,
    status: cycle.status,
  };
}

/**
 * O artigo de demonstração nasce com dois desvios de formatação — entrelinha simples e
 * alinhamento à esquerda —, para que a aplicação da norma tenha o que corrigir.
 */
function withSeedFormatting(doc: JSONContent): JSONContent {
  const overrides: Record<string, Record<string, string>> = {
    'p-method': { textAlign: 'left' },
    'p-theory': { lineSpacing: '1' },
  };

  return {
    ...doc,
    content: (doc.content ?? []).map((node) => ({
      ...node,
      attrs: { ...node.attrs, ...overrides[String(node.attrs?.blockId)] },
    })),
  };
}

/**
 * Documento de partida de quem abre o artigo pela primeira vez: o rascunho já existente
 * ou, no artigo novo, o conteúdo da versão do template que o evento congelou.
 */
function initialDocument(draft: ArticleParagraph[], references: Reference[]): JSONContent {
  const isDemo = currentArticle.id === DEMO_ARTICLE_ID;
  const body =
    draft.length > 0 || !currentArticle.initialContent
      ? fromParagraphs(draft, references)
      : currentArticle.initialContent;

  return withCover(
    isDemo ? withSeedFormatting(body) : body,
    currentArticle.title,
    currentArticle.members.map((member) => member.name),
  );
}

export type StoredDocument = { seed: JSONContent; ydoc: string | null };

async function fetchBackendArticle() {
  const article = await apiRequest<BackendArticleSummary>(
    `/articles/${requireUuid(currentArticle.id)}`,
  );
  cacheBackendArticle(article);
  return article;
}

function cleanArticleContent(content: JSONContent): JSONContent {
  const attrs = { ...content.attrs };
  delete attrs.vinceFormat;
  return { ...content, attrs };
}

function isPageMargins(value: unknown): value is PageMargins {
  if (!value || typeof value !== 'object') return false;
  const margins = value as Record<string, unknown>;
  return ['top', 'right', 'bottom', 'left'].every(
    (key) => typeof margins[key] === 'number' && Number.isFinite(margins[key]),
  );
}

function contentToParagraphs(content: JSONContent): ArticleParagraph[] {
  const plainText = (node: JSONContent): string => {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return ' ';
    return (node.content ?? []).map(plainText).join(' ');
  };
  const result: ArticleParagraph[] = [];
  let heading: { id: string; text: string } | null = null;
  for (const [index, node] of (content.content ?? []).entries()) {
    const id = String(node.attrs?.blockId ?? `block-${index}`);
    if (id.startsWith('cover-') || node.type === 'horizontalRule') continue;
    const text = plainText(node).trim();
    if (node.type === 'heading') {
      if (heading) result.push({ heading: heading.text, id: heading.id, text: '' });
      heading = text ? { id, text } : null;
      continue;
    }
    if (!text) continue;
    result.push(heading ? { heading: heading.text, id, text } : { id, text });
    heading = null;
  }
  if (heading) result.push({ heading: heading.text, id: heading.id, text: '' });
  return result;
}

/** Estado preservado do documento e o conteúdo de partida, para quem o abre primeiro. */
export async function loadDocument(actorId: string): Promise<StoredDocument> {
  if (isBackendEnabled()) {
    const article = await fetchBackendArticle();
    const content = article.content as JSONContent;
    return {
      seed: cleanArticleContent(content?.type === 'doc' ? content : { type: 'doc', content: [] }),
      ydoc: null,
    };
  }
  assertReach(actorId);

  const cycle = await readCycle();
  const state = db().read();

  return {
    seed: state.snapshot ?? initialDocument(cycle.draft, state.references),
    ydoc: state.ydoc,
  };
}

/**
 * Preserva o que foi digitado, sem ação de salvar (RF-EDT-001 RN3), registra a autoria
 * dos trechos alterados e guarda pontos intermediários para o histórico.
 */
export async function persistDocument(
  actorId: string,
  document: { snapshot: JSONContent; ydoc: string },
) {
  if (isBackendEnabled()) {
    const article = await fetchBackendArticle();
    const content = cleanArticleContent(document.snapshot);
    const updated = await apiRequest<BackendArticleSummary>(
      `/articles/${requireUuid(article.id)}/content`,
      {
        body: { content, formatProfile: article.formatProfile },
        method: 'PUT',
      },
    );
    cacheBackendArticle(updated);
    return;
  }
  const before = db().read();
  const resolve = createCitationResolver(before.references);
  const paragraphs = toParagraphs(document.snapshot, resolve);
  const previous = new Map(
    (before.snapshot ? toParagraphs(before.snapshot, resolve) : []).map((item) => [
      item.id,
      item.text,
    ]),
  );

  // A recusa — artigo em correção, concluído ou ator que não é integrante — vem daqui.
  await saveDraft(actorId, paragraphs);

  db().update((draft) => {
    const authorship: Record<string, string> = {};

    paragraphs.forEach((paragraph) => {
      // Na primeira preservação nada foi alterado ainda: vale a autoria já registrada.
      const unchanged = !before.snapshot || previous.get(paragraph.id) === paragraph.text;
      authorship[paragraph.id] = unchanged ? (draft.authorship[paragraph.id] ?? actorId) : actorId;
    });

    draft.authorship = authorship;
    draft.snapshot = document.snapshot;
    draft.ydoc = document.ydoc;

    const last = draft.checkpoints[draft.checkpoints.length - 1];

    if (!last || Date.now() - new Date(last.at).getTime() >= CHECKPOINT_INTERVAL) {
      pushCheckpoint(draft, actorId, 'checkpoint', document.snapshot);
    }
  });
}

function pushCheckpoint(
  draft: EditorDb,
  actorId: string,
  kind: Checkpoint['kind'],
  content: JSONContent,
) {
  draft.checkpoints.push({
    at: new Date().toISOString(),
    authorId: actorId,
    authors: { ...draft.authorship },
    content,
    id: createId('checkpoint'),
    kind,
  });
  draft.checkpoints = draft.checkpoints.slice(-MAX_CHECKPOINTS);
}

/** Marca no histórico um estado salvo pelo autor, restaurado ou importado. */
export function registerCheckpoint(
  actorId: string,
  kind: 'restore' | 'import' | 'manual',
  content: JSONContent,
) {
  if (isBackendEnabled()) {
    return (async () => {
      const article = await fetchBackendArticle();
      const versions = await apiRequest<
        Array<{
          id: string;
          content: JSONContent;
          kind: string;
        }>
      >(`/articles/${requireUuid(article.id)}/history`);
      const target =
        kind === 'restore'
          ? versions.find((version) => JSON.stringify(version.content) === JSON.stringify(content))
          : undefined;
      if (target) {
        const updated = await apiRequest<BackendArticleSummary>(
          `/articles/${requireUuid(article.id)}/history/${requireUuid(target.id)}/restoration`,
          { body: {}, method: 'POST' },
        );
        cacheBackendArticle(updated);
        return;
      }
      if (kind === 'import') return;
      const updated = await apiRequest<BackendArticleSummary>(
        `/articles/${requireUuid(article.id)}/content`,
        {
          body: { content: cleanArticleContent(content), formatProfile: article.formatProfile },
          method: 'PUT',
        },
      );
      cacheBackendArticle(updated);
    })();
  }
  return respond(() => {
    assertMember(actorId);
    db().update((draft) => pushCheckpoint(draft, actorId, kind, content));
  });
}

async function assertEditable(actorId: string) {
  assertMember(actorId);

  const { status } = await readCycle();

  if (status === 'IN_REVIEW') {
    throw new ApiError('ARTICLE_LOCKED_FOR_REVIEW');
  }

  if (status === 'FINISHED') {
    throw new ApiError('ARTICLE_ALREADY_FINISHED');
  }
}

/** RF-EDT-008 — Entregas e pontos intermediários, do mais recente para o mais antigo. */
export async function listHistory(actorId: string): Promise<HistoryEntry[]> {
  if (isBackendEnabled()) {
    const article = await fetchBackendArticle();
    const versions = await apiRequest<
      Array<{
        id: string;
        kind: string;
        content: JSONContent;
        authorId: string | null;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>
    >(`/articles/${requireUuid(article.id)}/history`);
    return versions.map((version) => ({
      at: version.createdAt,
      authorName: version.authorId ?? '—',
      authors: {},
      automatic: version.kind === 'SUBMISSION',
      content: version.content,
      id: version.id,
      kind:
        version.kind === 'IMPORT'
          ? 'import'
          : version.kind === 'RESTORE'
            ? 'restore'
            : version.kind === 'SUBMISSION'
              ? 'delivery'
              : 'checkpoint',
      milestone: typeof version.metadata.milestone === 'string' ? version.metadata.milestone : '',
      paragraphs: contentToParagraphs(version.content),
    }));
  }
  assertMember(actorId);

  const cycle = await readCycle();
  const state = db().read();
  const resolve = createCitationResolver(state.references);

  const deliveries: HistoryEntry[] = cycle.submissions.map((submission) => ({
    at: submission.submittedAt,
    authorName: memberName(submission.submittedBy),
    authors: state.authorship,
    automatic: submission.automatic,
    content: null,
    id: submission.id,
    kind: 'delivery',
    milestone: findMilestone(cycle, submission.milestoneId)?.name ?? '',
    paragraphs: submission.paragraphs,
  }));
  const checkpoints: HistoryEntry[] = state.checkpoints.map((checkpoint) => ({
    at: checkpoint.at,
    authorName: memberName(checkpoint.authorId),
    authors: checkpoint.authors,
    automatic: false,
    content: checkpoint.content,
    id: checkpoint.id,
    kind: checkpoint.kind,
    milestone: '',
    paragraphs: toParagraphs(checkpoint.content, resolve),
  }));

  return [...deliveries, ...checkpoints].sort((a, b) => b.at.localeCompare(a.at));
}

/** A restauração cria estado novo e só é possível com o artigo editável (RN3, E1). */
export function assertCanRestore(actorId: string) {
  if (isBackendEnabled()) {
    return getEditorState(actorId).then((state) => {
      if (state.lockCode) throw new ApiError(state.lockCode);
    });
  }
  return assertEditable(actorId);
}

export function listReferences(actorId: string) {
  if (isBackendEnabled()) {
    return apiRequest<
      Array<{
        id: string;
        type: string;
        authors: unknown;
        title: string;
        year: number | null;
        vehicle: string | null;
        edition: string | null;
        place: string | null;
        publisher: string | null;
        pages: string | null;
        doi: string | null;
        url: string | null;
      }>
    >(`/articles/${requireUuid(currentArticle.id)}/references`).then((items) =>
      items.map(toFrontendReference),
    );
  }
  return respond(() => {
    assertReach(actorId);
    return db().read().references;
  });
}

/** Referências do artigo, para a verificação cruzada de RF-IAA-002. */
export function getArticleReferences() {
  if (isBackendEnabled()) return listReferences(currentArticle.advisor.id);
  return respond(() => db().read().references);
}

function toFrontendReference(reference: {
  id: string;
  type: string;
  authors: unknown;
  title: string;
  year: number | null;
  vehicle: string | null;
  edition: string | null;
  place: string | null;
  publisher: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
}): Reference {
  const authors = Array.isArray(reference.authors)
    ? reference.authors.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    ...emptyReference,
    authors,
    doi: reference.doi ?? '',
    edition: reference.edition ?? '',
    id: reference.id,
    pages: reference.pages ?? '',
    place: reference.place ?? '',
    publisher: reference.publisher ?? '',
    title: reference.title,
    type: reference.type as Reference['type'],
    url: reference.url ?? '',
    vehicle: reference.vehicle ?? '',
    year: reference.year === null ? '' : String(reference.year),
  };
}

/** A citação é vínculo: alterada a referência, o texto do rascunho acompanha. */
async function syncDraft(actorId: string) {
  const state = db().read();

  if (state.snapshot) {
    await saveDraft(
      actorId,
      toParagraphs(state.snapshot, createCitationResolver(state.references)),
    );
  }
}

export type SaveReferenceInput = {
  data: ReferenceData;
  id?: string;
  /**
   * Referência vinda de DOI ou de texto colado: registra o que foi reconhecido, mesmo
   * com campos faltantes (RF-EDT-003 E2).
   */
  lenient?: boolean;
};

/** RF-EDT-003 — Registrar ou alterar referência. */
export async function saveReference(
  actorId: string,
  { data, id, lenient = false }: SaveReferenceInput,
) {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    const body = {
      type: data.type,
      authors: data.authors,
      title: data.title,
      year: data.year ? Number(data.year) : null,
      vehicle: data.vehicle,
      edition: data.edition,
      place: data.place,
      publisher: data.publisher,
      pages: data.pages,
      doi: data.doi,
      url: data.url,
    };
    const saved = await apiRequest<{
      id: string;
      type: string;
      authors: unknown;
      title: string;
      year: number | null;
      vehicle: string | null;
      edition: string | null;
      place: string | null;
      publisher: string | null;
      pages: string | null;
      doi: string | null;
      url: string | null;
    }>(
      id
        ? `/articles/${articleId}/references/${requireUuid(id, 'RESOURCE_NOT_FOUND')}`
        : `/articles/${articleId}/references`,
      { body, method: id ? 'PATCH' : 'POST' },
    );
    return toFrontendReference(saved);
  }
  await assertEditable(actorId);

  const missing = missingFields(data);

  if (missing.length > 0 && !lenient) {
    throw new ApiError('VALIDATION_FAILED', { fields: missing });
  }

  const saved: Reference = { ...data, id: id ?? createId('reference') };

  db().update((draft) => {
    const index = draft.references.findIndex((reference) => reference.id === saved.id);

    if (id && index < 0) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    if (index >= 0) {
      draft.references[index] = saved;
    } else {
      draft.references.push(saved);
    }
  });

  await syncDraft(actorId);

  return saved;
}

/**
 * Remove uma referência. `citedInEditor` traz as citações do texto aberto, que podem
 * ainda não ter sido preservadas.
 */
export async function deleteReference(
  actorId: string,
  referenceId: string,
  citedInEditor: string[] = [],
) {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    if (citedInEditor.length > 0) throw new ApiError('REFERENCE_IN_USE');
    await apiRequest<void>(
      `/articles/${articleId}/references/${requireUuid(referenceId, 'RESOURCE_NOT_FOUND')}`,
      { method: 'DELETE' },
    );
    return;
  }
  await assertEditable(actorId);

  db().update((draft) => {
    // Referência citada no texto não é removida (RF-EDT-003 E3).
    const cited = draft.snapshot ? citedReferenceIds(draft.snapshot) : new Set<string>();

    if (cited.has(referenceId) || citedInEditor.includes(referenceId)) {
      throw new ApiError('REFERENCE_IN_USE');
    }

    draft.references = draft.references.filter((reference) => reference.id !== referenceId);
  });
}

const knownDois: Record<string, ReferenceData> = {
  '10.1038/nature21056': {
    ...emptyReference,
    authors: ['Esteva, Andre'],
    doi: '10.1038/nature21056',
    pages: '115-118',
    title: 'Dermatologist-level classification of skin cancer with deep neural networks',
    type: 'article',
    vehicle: 'Nature',
    year: '2017',
  },
};

/** Interpreta um DOI. O que não for reconhecido volta em branco, para o ator completar. */
export function lookupDoi(doi: string) {
  return respond((): ReferenceData => {
    const key = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');

    return knownDois[key] ?? { ...emptyReference, doi: key };
  });
}

export async function setMargins(
  actorId: string,
  margins: PageMargins,
  currentDocument?: JSONContent,
) {
  if (isBackendEnabled()) {
    const article = await fetchBackendArticle();
    const content = cleanArticleContent(currentDocument ?? article.content);
    const updated = await apiRequest<BackendArticleSummary>(
      `/articles/${requireUuid(article.id)}/content`,
      {
        body: {
          content,
          formatProfile: { ...article.formatProfile, margins },
        },
        method: 'PUT',
      },
    );
    cacheBackendArticle(updated);
    return;
  }
  await assertEditable(actorId);
  db().update((draft) => {
    draft.margins = margins;
  });
}

/** Os metadados do arquivo importado são preservados (RF-EDT-006 RN3). */
export async function recordImport(
  actorId: string,
  file: { fileName: string; lastModified: string; sizeInBytes: number; content?: JSONContent },
) {
  if (isBackendEnabled()) {
    if (!file.content) throw new ApiError('VALIDATION_FAILED');
    const articleId = requireUuid(currentArticle.id);
    const imported = await apiRequest<BackendArticleSummary>(`/articles/${articleId}/imports`, {
      body: {
        fileName: file.fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: file.sizeInBytes,
        content: cleanArticleContent(file.content),
        metadata: { lastModified: file.lastModified },
        confirmReplace: true,
      },
      method: 'POST',
    });
    cacheBackendArticle(imported);
    return;
  }
  await assertEditable(actorId);
  db().update((draft) => {
    draft.importMeta = {
      ...file,
      importedAt: new Date().toISOString(),
      importedBy: memberName(actorId),
    };
  });
}

export type ExportData = {
  content: JSONContent;
  margins: PageMargins;
  references: Reference[];
};

/** RF-EDT-007 — Conteúdo a exportar, disponível em qualquer estado do artigo (RN2). */
export async function getExportData(actorId: string): Promise<ExportData> {
  if (isBackendEnabled()) {
    const [article, references] = await Promise.all([
      fetchBackendArticle(),
      listReferences(actorId),
    ]);
    const margins = article.formatProfile.margins;
    return {
      content: cleanArticleContent(article.content),
      margins: isPageMargins(margins) ? margins : abntNorm.margins,
      references,
    };
  }
  assertReach(actorId);

  const cycle = await readCycle();
  const state = db().read();

  return {
    content: currentContent(state, cycle.draft),
    margins: state.margins,
    references: state.references,
  };
}
