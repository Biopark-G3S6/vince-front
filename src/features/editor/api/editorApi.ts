import type { JSONContent } from '@tiptap/core';

import { canReadArticle, currentArticle, DEMO_ARTICLE_ID } from '@features/articles';
import { findMilestone, getReviewCycle, saveDraft } from '@features/review';
import { ApiError } from '@shared/api/apiError';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  citedReferenceIds,
  createCitationResolver,
  fromParagraphs,
  toParagraphs,
  withCover,
  type ArticleParagraph,
} from '../model/document';
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

/** Estado preservado do documento e o conteúdo de partida, para quem o abre primeiro. */
export async function loadDocument(actorId: string): Promise<StoredDocument> {
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
  return assertEditable(actorId);
}

export function listReferences(actorId: string) {
  return respond(() => {
    assertReach(actorId);
    return db().read().references;
  });
}

/** Referências do artigo, para a verificação cruzada de RF-IAA-002. */
export function getArticleReferences() {
  return respond(() => db().read().references);
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

export async function setMargins(actorId: string, margins: PageMargins) {
  await assertEditable(actorId);
  db().update((draft) => {
    draft.margins = margins;
  });
}

/** Os metadados do arquivo importado são preservados (RF-EDT-006 RN3). */
export async function recordImport(
  actorId: string,
  file: { fileName: string; lastModified: string; sizeInBytes: number },
) {
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
  assertReach(actorId);

  const cycle = await readCycle();
  const state = db().read();

  return {
    content: currentContent(state, cycle.draft),
    margins: state.margins,
    references: state.references,
  };
}
