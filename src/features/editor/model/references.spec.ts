import { describe, expect, it } from 'vitest';

import {
  citedReferenceIds,
  createCitationResolver,
  fromParagraphs,
  toParagraphs,
  withCover,
} from './document';
import {
  emptyReference,
  formatCitation,
  missingFields,
  parsePastedReference,
  referenceToText,
  sortReferences,
  type Reference,
} from './references';

const silva: Reference = {
  ...emptyReference,
  authors: ['Silva, Carlos Eduardo'],
  id: 'ref-silva',
  pages: '45-62',
  place: 'São Paulo',
  title: 'Aprendizado federado em saúde',
  type: 'article',
  vehicle: 'Revista Brasileira de Informática em Saúde',
  year: '2022',
};
const book: Reference = {
  ...emptyReference,
  authors: ['Costa, Ana', 'Alves, Bruno', 'Dias, Caio', 'Reis, Davi'],
  edition: '2',
  id: 'ref-book',
  place: 'Curitiba',
  publisher: 'Editora Acadêmica',
  title: 'Metodologia científica',
  type: 'book',
  year: '2020',
};

describe('referência estruturada (RF-EDT-003)', () => {
  it('gera a entrada da lista no formato da norma', () => {
    expect(referenceToText(silva)).toBe(
      'SILVA, Carlos Eduardo. Aprendizado federado em saúde. Revista Brasileira de Informática em Saúde, São Paulo, p. 45-62, 2022.',
    );
    expect(referenceToText(book)).toBe(
      'COSTA, Ana et al. Metodologia científica. 2. ed. Curitiba: Editora Acadêmica, 2020.',
    );
  });

  it('ordena a lista pela autoria', () => {
    const sorted = sortReferences([silva, book], (a, b) => a.localeCompare(b, 'pt-BR'));

    expect(sorted.map((reference) => reference.id)).toEqual(['ref-book', 'ref-silva']);
  });

  it('aponta os campos obrigatórios do tipo que faltam', () => {
    expect(missingFields({ ...emptyReference, title: 'Sem autor', type: 'book' })).toEqual([
      'authors',
      'year',
      'place',
      'publisher',
    ]);
    expect(missingFields(silva)).toEqual([]);
  });

  it('interpreta a referência colada e deixa em branco o que não reconhece', () => {
    const parsed = parsePastedReference(
      'ESTEVA, Andre. Classificação de câncer de pele com redes neurais. Nature, v. 542, 2017. DOI: 10.1038/nature21056.',
    );

    expect(parsed).toMatchObject({
      authors: ['Esteva, Andre'],
      doi: '10.1038/nature21056',
      title: 'Classificação de câncer de pele com redes neurais',
      vehicle: 'Nature',
      year: '2017',
    });
    expect(missingFields(parsePastedReference('texto solto sem estrutura'))).toContain('authors');
  });
});

describe('citação vinculada (RF-EDT-004)', () => {
  it('é formatada pela norma, com a página quando informada', () => {
    expect(formatCitation(silva)).toBe('(SILVA, 2022)');
    expect(formatCitation(silva, '51')).toBe('(SILVA, 2022, p. 51)');
    expect(formatCitation(book)).toBe('(COSTA et al., 2020)');
  });

  it('acompanha a referência: corrigir o ano altera o texto de todas as citações', () => {
    const doc = fromParagraphs(
      [
        {
          heading: '1. Introdução',
          id: 'p1',
          text: 'Há ganhos (SILVA, 2022) e limites (SILVA, 2022).',
        },
      ],
      [silva],
    );

    expect([...citedReferenceIds(doc)]).toEqual(['ref-silva']);

    const corrected = createCitationResolver([{ ...silva, year: '2023' }]);

    expect(toParagraphs(doc, corrected)).toEqual([
      {
        heading: '1. Introdução',
        id: 'p1',
        text: 'Há ganhos (SILVA, 2023) e limites (SILVA, 2023).',
      },
    ]);
  });

  it('mantém como texto a chamada que não corresponde a referência registrada', () => {
    const doc = fromParagraphs([{ id: 'p1', text: 'Outro estudo (ESTEVA, 2017).' }], [silva]);

    expect(citedReferenceIds(doc).size).toBe(0);
  });
});

describe('documento estruturado (RF-EDT-001 RN4)', () => {
  it('preserva a identidade dos parágrafos e deixa a capa fora do texto', () => {
    const paragraphs = [
      { heading: '1. Introdução', id: 'p-intro', text: 'Primeiro parágrafo.' },
      { id: 'p-goal', text: 'Segundo parágrafo.' },
    ];
    const doc = withCover(fromParagraphs(paragraphs, []), 'Título', ['Ana', 'Bruno']);

    expect(toParagraphs(doc, createCitationResolver([]))).toEqual(paragraphs);
  });
});
