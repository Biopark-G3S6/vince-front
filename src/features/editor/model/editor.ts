import type { JSONContent } from '@tiptap/core';

import type { ArticleParagraph } from './document';

export type ArticleStatus = 'STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'FINISHED';

/** Margens da página, em centímetros. */
export type PageMargins = { bottom: number; left: number; right: number; top: number };

/** Formatação da norma vigente — ABNT nesta versão (RF-EDT-005 RN1). */
export const abntNorm = {
  fontFamily: 'Arial',
  fontSize: '12pt',
  lineHeight: '1.5',
  margins: { bottom: 2, left: 3, right: 2, top: 3 } satisfies PageMargins,
  textAlign: 'justify',
};

export function sameMargins(a: PageMargins, b: PageMargins) {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

export type ImportMetadata = {
  fileName: string;
  importedAt: string;
  importedBy: string;
  lastModified: string;
  sizeInBytes: number;
};

export type EditorState = {
  /** Só integrante da equipe edita, e apenas em STARTED e IN_PROGRESS (RF-EDT-001). */
  editable: boolean;
  importMeta: ImportMetadata | null;
  isMember: boolean;
  lastEditedAt: string;
  /** Código que explica o modo de leitura, quando houver. */
  lockCode: 'ARTICLE_LOCKED_FOR_REVIEW' | 'ARTICLE_ALREADY_FINISHED' | 'READ_ONLY_ROLE' | null;
  margins: PageMargins;
  status: ArticleStatus;
};

export type HistoryKind = 'delivery' | 'checkpoint' | 'manual' | 'restore' | 'import';

/** Estado preservado do artigo: entrega ou ponto intermediário (RF-EDT-008 RN1). */
export type HistoryEntry = {
  at: string;
  /** Autoria por trecho, pelo identificador do parágrafo (RF-EDT-002 RN3). */
  authors: Record<string, string>;
  authorName: string;
  automatic: boolean;
  /** Documento completo; ausente nas entregas, que guardam os parágrafos. */
  content: JSONContent | null;
  id: string;
  kind: HistoryKind;
  milestone: string;
  paragraphs: ArticleParagraph[];
};

/** Dados institucionais da capa do artigo de demonstração. */
export const coverDefaults = {
  city: 'Toledo, PR',
  institution: 'Faculdade Regional de Tecnologia',
  year: '2026',
};
