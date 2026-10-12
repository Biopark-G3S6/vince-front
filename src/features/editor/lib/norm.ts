import type { Editor } from '@tiptap/core';

import { abntNorm } from '../model/editor';

export type NormReport = {
  /** Parágrafos realinhados para justificado. */
  alignment: number;
  /** Trechos devolvidos à fonte e ao tamanho da norma. */
  font: number;
  /** Parágrafos devolvidos à entrelinha da norma. */
  lineSpacing: number;
};

export function hasChanges(report: NormReport) {
  return report.alignment + report.font + report.lineSpacing > 0;
}

/**
 * Aplica a formatação da norma ao trecho selecionado ou ao documento inteiro, por ação
 * explícita do autor, e informa o que foi alterado (RF-EDT-005). Nada é reformatado
 * durante a digitação (RN3).
 */
export function applyNorm(
  editor: Editor,
  scope: 'selection' | 'document',
  defaults: { lineHeight: number; textAlign: string },
): NormReport {
  const { state } = editor;
  const range =
    scope === 'selection'
      ? { from: state.selection.from, to: state.selection.to }
      : { from: 0, to: state.doc.content.size };
  const transaction = state.tr;
  const report: NormReport = { alignment: 0, font: 0, lineSpacing: 0 };
  const textStyle = state.schema.marks.textStyle;

  state.doc.nodesBetween(range.from, range.to, (node, position) => {
    // Título e autoria, centralizados, não são corpo do texto.
    if (node.type.name === 'paragraph' && node.attrs.textAlign !== 'center') {
      const offAlignment = (node.attrs.textAlign ?? defaults.textAlign) !== abntNorm.textAlign;
      const offSpacing =
        Number(node.attrs.lineSpacing ?? defaults.lineHeight) !== Number(abntNorm.lineHeight);

      if (offAlignment || offSpacing) {
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          lineSpacing: abntNorm.lineHeight,
          textAlign: abntNorm.textAlign,
        });
        report.alignment += offAlignment ? 1 : 0;
        report.lineSpacing += offSpacing ? 1 : 0;
      }
    }

    const mark = textStyle && node.isText ? textStyle.isInSet(node.marks) : undefined;

    if (textStyle && mark && (mark.attrs.fontFamily || mark.attrs.fontSize)) {
      const end = position + node.nodeSize;
      const kept = { ...mark.attrs, fontFamily: null, fontSize: null };

      transaction.removeMark(position, end, mark);

      // Cor e demais atributos do trecho não são objeto da norma e permanecem.
      if (Object.values(kept).some((value) => value !== null && value !== undefined)) {
        transaction.addMark(position, end, textStyle.create(kept));
      }

      report.font += 1;
    }
  });

  if (transaction.docChanged) {
    editor.view.dispatch(transaction);
  }

  return report;
}
