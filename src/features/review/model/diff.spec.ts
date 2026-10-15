import { describe, expect, it } from 'vitest';

import { countChangedWords, diffParagraphs, diffWords } from './diff';

describe('diffWords', () => {
  it('assinala inserção, remoção e alteração no nível da palavra', () => {
    const segments = diffWords('dados de três centros', 'dados anonimizados de dois centros');

    expect(
      segments.filter((segment) => segment.kind === 'insert').map((s) => s.text.trim()),
    ).toEqual(['anonimizados', 'dois']);
    expect(
      segments.filter((segment) => segment.kind === 'delete').map((s) => s.text.trim()),
    ).toEqual(['três']);
    expect(countChangedWords(segments)).toEqual({ deleted: 1, inserted: 2 });
  });

  it('reconstrói as duas versões a partir dos segmentos', () => {
    const before = 'O objetivo é investigar a robustez.';
    const after = 'O objetivo primário é medir a robustez dos modelos.';
    const segments = diffWords(before, after);
    const join = (skip: string) =>
      segments
        .filter((segment) => segment.kind !== skip)
        .map((segment) => segment.text)
        .join('');

    expect(join('insert')).toBe(before);
    expect(join('delete')).toBe(after);
  });

  it('não assinala nada em textos idênticos', () => {
    expect(diffWords('mesmo texto', 'mesmo texto')).toEqual([
      { kind: 'equal', text: 'mesmo texto' },
    ]);
  });
});

describe('diffParagraphs', () => {
  const before = [
    { id: 'a', text: 'Primeiro parágrafo.' },
    { id: 'b', text: 'Segundo parágrafo.' },
    { id: 'c', text: 'Terceiro parágrafo.' },
  ];

  it('classifica cada parágrafo e mantém o removido junto do que o precedia', () => {
    const after = [
      { id: 'a', text: 'Primeiro parágrafo.' },
      { id: 'c', text: 'Terceiro parágrafo revisto.' },
      { id: 'd', text: 'Parágrafo novo.' },
    ];

    expect(diffParagraphs(before, after).map((diff) => [diff.id, diff.change])).toEqual([
      ['a', 'equal'],
      ['b', 'removed'],
      ['c', 'changed'],
      ['d', 'added'],
    ]);
  });

  it('apresenta a primeira entrega como parágrafos novos', () => {
    expect(diffParagraphs([], before).every((diff) => diff.change === 'added')).toBe(true);
  });
});
