import type { JSONContent } from '@tiptap/core';
import type { IRunOptions, Paragraph, Table } from 'docx';

import type { CitationResolver } from '../model/document';
import { abntNorm } from '../model/editor';
import { formatReference, type Reference } from '../model/references';

export type ArticleCover = {
  advisor: string;
  authors: string[];
  city: string;
  institution: string;
  title: string;
  year: string;
};

type ExportInput = {
  content: JSONContent;
  cover: ArticleCover;
  /** Lista de referências já ordenada pela norma. */
  references: Reference[];
  referencesTitle: string;
  resolveCitation: CitationResolver;
};

/**
 * Gera o `.docx` do artigo com a formatação da norma e a lista de referências
 * (RF-EDT-007 RN1). A biblioteca só é carregada quando alguém exporta.
 */
export async function exportDocx({
  content,
  cover,
  references,
  referencesTitle,
  resolveCitation,
}: ExportInput): Promise<Blob> {
  const docx = await import('docx');
  const { AlignmentType, convertMillimetersToTwip: mm } = docx;
  const alignments = {
    center: AlignmentType.CENTER,
    justify: AlignmentType.JUSTIFIED,
    left: AlignmentType.LEFT,
    right: AlignmentType.RIGHT,
  };
  const lineSpacing = (value: unknown) => Math.round(Number(value ?? abntNorm.lineHeight) * 240);

  function runs(node: JSONContent, base: IRunOptions = {}) {
    return (node.content ?? []).map((child) => {
      if (child.type === 'citation') {
        return new docx.TextRun({
          ...base,
          text: resolveCitation(String(child.attrs?.referenceId), String(child.attrs?.page ?? '')),
        });
      }

      if (child.type === 'hardBreak') {
        return new docx.TextRun({ ...base, break: 1 });
      }

      const marks = new Map((child.marks ?? []).map((mark) => [mark.type, mark.attrs ?? {}]));
      const color = marks.get('textStyle')?.color as string | undefined;

      return new docx.TextRun({
        ...base,
        bold: base.bold ?? marks.has('bold'),
        color: color?.startsWith('#') ? color.slice(1) : undefined,
        italics: marks.has('italic'),
        strike: marks.has('strike'),
        subScript: marks.has('subscript'),
        superScript: marks.has('superscript'),
        text: child.text ?? '',
        underline: marks.has('underline') ? {} : undefined,
      });
    });
  }

  function blocks(node: JSONContent, quoted = false): Array<Paragraph | Table> {
    const attrs = node.attrs ?? {};

    switch (node.type) {
      case 'heading':
        return [
          new docx.Paragraph({
            children: runs(node, { allCaps: attrs.level === 1, bold: attrs.level !== 3 }),
            keepNext: true,
            spacing: { after: 240, before: 360, line: lineSpacing(null) },
          }),
        ];
      case 'paragraph':
        return [
          new docx.Paragraph({
            alignment: alignments[(attrs.textAlign as keyof typeof alignments) ?? 'justify'],
            children: runs(node, quoted ? { size: 20 } : {}),
            // Citação longa: recuo de 4 cm, corpo 10 e entrelinha simples.
            indent: quoted ? { left: mm(40) } : { firstLine: mm(12.5) },
            spacing: { after: 120, line: quoted ? 240 : lineSpacing(attrs.lineHeight) },
          }),
        ];
      case 'blockquote':
        return (node.content ?? []).flatMap((child) => blocks(child, true));
      case 'bulletList':
      case 'orderedList':
        return (node.content ?? []).flatMap((item, index) =>
          (item.content ?? []).map(
            (child) =>
              new docx.Paragraph({
                bullet: node.type === 'bulletList' ? { level: 0 } : undefined,
                children: [
                  ...(node.type === 'orderedList'
                    ? [new docx.TextRun({ text: `${index + 1}. ` })]
                    : []),
                  ...runs(child),
                ],
                indent: node.type === 'orderedList' ? { left: mm(12.5) } : undefined,
                spacing: { line: lineSpacing(null) },
              }),
          ),
        );
      case 'table':
        return [
          new docx.Table({
            rows: (node.content ?? []).map(
              (row) =>
                new docx.TableRow({
                  children: (row.content ?? []).map(
                    (cell) =>
                      new docx.TableCell({
                        children: (cell.content ?? []).map(
                          (child) =>
                            new docx.Paragraph({
                              children: runs(child, { bold: cell.type === 'tableHeader' }),
                            }),
                        ),
                      }),
                  ),
                }),
            ),
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
          }),
        ];
      case 'horizontalRule':
        return [new docx.Paragraph({ children: [new docx.PageBreak()] })];
      default:
        return [];
    }
  }

  const centered = (text: string, options: IRunOptions = {}, before = 0) =>
    new docx.Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new docx.TextRun({ ...options, text })],
      spacing: { before, line: lineSpacing(null) },
    });

  const document = new docx.Document({
    sections: [
      {
        children: [
          centered(cover.institution, { allCaps: true }),
          centered(cover.title, { bold: true, size: 28 }, 3600),
          ...cover.authors.map((author, index) => centered(author, {}, index === 0 ? 1800 : 0)),
          centered(cover.advisor),
          centered(cover.city, {}, 3600),
          centered(cover.year),
          new docx.Paragraph({ children: [new docx.PageBreak()] }),
          ...(content.content ?? []).flatMap((node) => blocks(node)),
          new docx.Paragraph({ children: [new docx.PageBreak()] }),
          centered(referencesTitle, { allCaps: true, bold: true }),
          // Na lista de referências: alinhamento à esquerda e entrelinha simples.
          ...references.map(
            (reference) =>
              new docx.Paragraph({
                alignment: AlignmentType.LEFT,
                children: formatReference(reference).map(
                  (segment) => new docx.TextRun({ bold: segment.emphasis, text: segment.text }),
                ),
                spacing: { after: 240, line: 240 },
              }),
          ),
        ],
        properties: {
          page: {
            margin: {
              bottom: mm(abntNorm.margins.bottom * 10),
              left: mm(abntNorm.margins.left * 10),
              right: mm(abntNorm.margins.right * 10),
              top: mm(abntNorm.margins.top * 10),
            },
          },
        },
      },
    ],
    styles: { default: { document: { run: { font: abntNorm.fontFamily, size: 24 } } } },
  });

  return docx.Packer.toBlob(document);
}
