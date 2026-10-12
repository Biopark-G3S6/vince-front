import type { JSONContent } from '@tiptap/core';

import { formatCitation, type Reference } from './references';

/**
 * O conteúdo do artigo é dado estruturado, não arquivo (RF-EDT-001 RN4). Estas funções
 * convertem entre o documento do editor e os parágrafos identificados sobre os quais
 * se ancoram a entrega, o apontamento e a comparação de versões.
 */

export type ArticleParagraph = {
  heading?: string;
  id: string;
  text: string;
};

export type CitationResolver = (referenceId: string, page: string) => string;

export function createCitationResolver(references: Reference[]): CitationResolver {
  return (referenceId, page) =>
    formatCitation(
      references.find((reference) => reference.id === referenceId),
      page,
    );
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);

/** Texto de um nó, com cada citação resolvida a partir da referência vinculada. */
export function nodeText(node: JSONContent, resolveCitation: CitationResolver): string {
  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (node.type === 'citation') {
    return resolveCitation(String(node.attrs?.referenceId ?? ''), String(node.attrs?.page ?? ''));
  }

  if (node.type === 'hardBreak') {
    return ' ';
  }

  const children = node.content ?? [];
  const separator = children.some((child) => BLOCK_TYPES.has(child.type ?? '')) ? ' ' : '';

  return children
    .map((child) => nodeText(child, resolveCitation))
    .filter((text) => text.length > 0)
    .join(separator);
}

/** Cada bloco de primeiro nível vira um parágrafo; o título acompanha o bloco seguinte. */
export function toParagraphs(
  doc: JSONContent,
  resolveCitation: CitationResolver,
): ArticleParagraph[] {
  const paragraphs: ArticleParagraph[] = [];
  let pending: { id: string; text: string } | null = null;

  (doc.content ?? []).forEach((node, index) => {
    const id = String(node.attrs?.blockId ?? `block-${index}`);

    // Título e autoria do artigo compõem a capa; não são trecho do texto.
    if (id.startsWith(COVER_PREFIX) || node.type === 'horizontalRule') {
      return;
    }

    const text = nodeText(node, resolveCitation).trim();

    if (node.type === 'heading') {
      if (pending) {
        paragraphs.push({ heading: pending.text, id: pending.id, text: '' });
      }

      pending = text ? { id, text } : null;
      return;
    }

    if (!text) {
      return;
    }

    paragraphs.push(pending ? { heading: pending.text, id, text } : { id, text });
    pending = null;
  });

  if (pending) {
    const { id, text } = pending as { id: string; text: string };
    paragraphs.push({ heading: text, id, text: '' });
  }

  return paragraphs;
}

const COVER_PREFIX = 'cover-';

/** Acrescenta ao documento o título e a autoria do artigo, como no modelo. */
export function withCover(doc: JSONContent, title: string, authors: string[]): JSONContent {
  return {
    ...doc,
    content: [
      {
        attrs: { blockId: `${COVER_PREFIX}title`, level: 1, textAlign: 'center' },
        content: [{ text: title, type: 'text' }],
        type: 'heading',
      },
      {
        attrs: { blockId: `${COVER_PREFIX}authors`, textAlign: 'center' },
        content: [{ marks: [{ type: 'bold' }], text: authors.join(', '), type: 'text' }],
        type: 'paragraph',
      },
      { type: 'horizontalRule' },
      ...(doc.content ?? []),
    ],
  };
}

/** O documento sem o título e a autoria — para onde a capa é apresentada à parte. */
export function withoutCover(doc: JSONContent): JSONContent {
  const content = doc.content ?? [];
  const isCover = (node: JSONContent | undefined) =>
    String(node?.attrs?.blockId ?? '').startsWith(COVER_PREFIX);
  const start = content.findIndex((node) => !isCover(node));
  const skipRule = start > 0 && content[start]?.type === 'horizontalRule' ? 1 : 0;

  return { ...doc, content: start < 0 ? [] : content.slice(start + skipRule) };
}

const PLAIN_CITATION = /\(([A-ZÀ-Ú][A-ZÀ-Ú\s.;&]*?), (\d{4})(?:, p\. ([^)]+))?\)/g;

function inlineContent(text: string, references: Reference[]): JSONContent[] {
  const content: JSONContent[] = [];
  let cursor = 0;

  for (const match of text.matchAll(PLAIN_CITATION)) {
    const reference = references.find(
      (candidate) => formatCitation(candidate) === `(${match[1]}, ${match[2]})`,
    );

    if (!reference) {
      continue;
    }

    if (match.index > cursor) {
      content.push({ text: text.slice(cursor, match.index), type: 'text' });
    }

    content.push({ attrs: { page: match[3] ?? '', referenceId: reference.id }, type: 'citation' });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    content.push({ text: text.slice(cursor), type: 'text' });
  }

  return content;
}

/**
 * Monta o documento do editor a partir de parágrafos. A chamada escrita como texto que
 * corresponda a uma referência registrada passa a ser citação vinculada.
 */
export function fromParagraphs(
  paragraphs: ArticleParagraph[],
  references: Reference[],
): JSONContent {
  const content: JSONContent[] = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.heading) {
      content.push({
        attrs: { blockId: `${paragraph.id}-heading`, level: 2 },
        content: [{ text: paragraph.heading, type: 'text' }],
        type: 'heading',
      });
    }

    if (paragraph.text) {
      content.push({
        attrs: { blockId: paragraph.id },
        content: inlineContent(paragraph.text, references),
        type: 'paragraph',
      });
    }
  });

  return { content, type: 'doc' };
}

/** Referências citadas no texto — impede a remoção de referência em uso. */
export function citedReferenceIds(node: JSONContent, found = new Set<string>()): Set<string> {
  if (node.type === 'citation' && node.attrs?.referenceId) {
    found.add(String(node.attrs.referenceId));
  }

  (node.content ?? []).forEach((child) => citedReferenceIds(child, found));

  return found;
}
