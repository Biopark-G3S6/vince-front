/**
 * Referência bibliográfica como dado estruturado (RF-EDT-003). É a estrutura que
 * permite gerar a lista no formato da norma, manter a citação como vínculo
 * (RF-EDT-004) e fazer a verificação cruzada de RF-IAA-002.
 */

export const referenceTypes = ['article', 'book', 'chapter', 'thesis', 'website'] as const;

export type ReferenceType = (typeof referenceTypes)[number];

export const referenceFields = [
  'authors',
  'title',
  'year',
  'vehicle',
  'edition',
  'place',
  'publisher',
  'pages',
  'doi',
  'url',
] as const;

export type ReferenceField = (typeof referenceFields)[number];

export type ReferenceData = {
  /** Um autor por item, na forma "Sobrenome, Nome". */
  authors: string[];
  doi: string;
  edition: string;
  pages: string;
  place: string;
  publisher: string;
  title: string;
  type: ReferenceType;
  url: string;
  /** Periódico, obra coletiva ou sítio em que o trabalho foi publicado. */
  vehicle: string;
  year: string;
};

export type Reference = ReferenceData & { id: string };

export const emptyReference: ReferenceData = {
  authors: [],
  doi: '',
  edition: '',
  pages: '',
  place: '',
  publisher: '',
  title: '',
  type: 'article',
  url: '',
  vehicle: '',
  year: '',
};

const requiredFields: Record<ReferenceType, ReferenceField[]> = {
  article: ['authors', 'title', 'year', 'vehicle'],
  book: ['authors', 'title', 'year', 'place', 'publisher'],
  chapter: ['authors', 'title', 'year', 'vehicle', 'publisher'],
  thesis: ['authors', 'title', 'year', 'publisher'],
  website: ['title', 'year', 'url'],
};

/** Campos obrigatórios do tipo que estão sem valor. */
export function missingFields(reference: ReferenceData): ReferenceField[] {
  return requiredFields[reference.type].filter((field) => {
    const value = reference[field];
    return Array.isArray(value) ? value.length === 0 : !value.trim();
  });
}

export function isRequired(type: ReferenceType, field: ReferenceField) {
  return requiredFields[type].includes(field);
}

function surname(author: string) {
  return (author.split(',')[0] ?? author).trim();
}

function formatAuthor(author: string) {
  const [last, ...rest] = author.split(',');
  const given = rest.join(',').trim();

  return given
    ? `${surname(last ?? '').toLocaleUpperCase()}, ${given}`
    : surname(author).toLocaleUpperCase();
}

/** Autoria na lista de referências: até três autores; acima disso, o primeiro e "et al.". */
export function formatAuthors(authors: string[]) {
  if (authors.length > 3) {
    return `${formatAuthor(authors[0]!)} et al.`;
  }

  return authors.map(formatAuthor).join('; ');
}

export type ReferenceSegment = { emphasis?: boolean; text: string };

function sentence(value: string) {
  const text = value.trim();
  return !text || /[.?!]$/.test(text) ? text : `${text}.`;
}

/**
 * Entrada da lista de referências no formato da ABNT. O destaque recai no título da
 * obra ou, em artigo e capítulo, no veículo de publicação.
 */
export function formatReference(reference: ReferenceData): ReferenceSegment[] {
  const segments: ReferenceSegment[] = [];
  const push = (text: string, emphasis = false) => {
    if (text.trim()) {
      segments.push(emphasis ? { emphasis, text } : { text });
    }
  };
  const { doi, edition, pages, place, publisher, title, type, url, vehicle, year } = reference;
  const authors = formatAuthors(reference.authors);
  const imprint = [place, publisher].filter(Boolean).join(': ');

  push(authors ? `${sentence(authors)} ` : '');

  if (type === 'article') {
    push(`${sentence(title)} `);
    push(vehicle, true);
    push(
      `${[place, pages && `p. ${pages}`, year]
        .filter(Boolean)
        .map((part) => `, ${part}`)
        .join('')}. `,
    );
  } else if (type === 'chapter') {
    push(`${sentence(title)} In: `);
    push(vehicle, true);
    push(`. ${[imprint, year].filter(Boolean).join(', ')}.${pages ? ` p. ${pages}.` : ''} `);
  } else if (type === 'website') {
    push(sentence(title).slice(0, -1), true);
    push(`. ${[vehicle, year].filter(Boolean).join(', ')}. `);
  } else {
    push(sentence(title).slice(0, -1), true);
    push(`. ${edition ? `${edition}. ed. ` : ''}${[imprint, year].filter(Boolean).join(', ')}. `);
  }

  push(doi ? `DOI: ${doi}. ` : '');
  push(url ? `Disponível em: ${url}. ` : '');

  const last = segments[segments.length - 1];

  if (last) {
    last.text = last.text.trimEnd();
  }

  return segments;
}

export function referenceToText(reference: ReferenceData) {
  return formatReference(reference)
    .map((segment) => segment.text)
    .join('');
}

/** Chave de ordenação da lista: autoria e, na falta dela, o título. */
export function referenceSortKey(reference: ReferenceData) {
  return `${formatAuthors(reference.authors) || reference.title} ${reference.year} ${reference.title}`;
}

export function sortReferences<T extends ReferenceData>(
  references: T[],
  compare: (left: string, right: string) => number,
) {
  return [...references].sort((a, b) => compare(referenceSortKey(a), referenceSortKey(b)));
}

/** Autoria na chamada da citação: um, dois ou três sobrenomes; acima disso, "et al.". */
export function citationAuthors(reference: ReferenceData) {
  if (reference.authors.length === 0) {
    return (reference.title.split(/\s+/)[0] ?? '').toLocaleUpperCase();
  }

  const surnames = reference.authors.map((author) => surname(author).toLocaleUpperCase());

  return surnames.length > 3 ? `${surnames[0]} et al.` : surnames.join('; ');
}

/**
 * Citação no formato da norma. A citação é vínculo, não texto: é recalculada a partir
 * da referência sempre que apresentada (RF-EDT-004 RN1).
 */
export function formatCitation(reference: ReferenceData | undefined, page = '') {
  if (!reference) {
    return '(?)';
  }

  return `(${[citationAuthors(reference), reference.year, page.trim() && `p. ${page.trim()}`]
    .filter(Boolean)
    .join(', ')})`;
}

const DOI_PATTERN = /\b10\.\d{4,9}\/[^\s,;]+/;
const URL_PATTERN = /https?:\/\/[^\s>]+/;

/**
 * Interpretação de melhor esforço de uma referência colada como texto. O que não for
 * reconhecido fica em branco e é assinalado como faltante; o registro não é recusado
 * (RF-EDT-003 E2).
 */
export function parsePastedReference(text: string): ReferenceData {
  const source = text.replace(/\s+/g, ' ').trim();
  const doi = source.match(DOI_PATTERN)?.[0].replace(/[.)]+$/, '') ?? '';
  const url = source.match(URL_PATTERN)?.[0].replace(/[.)]+$/, '') ?? '';
  const years = source.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const body = source
    .replace(/DOI:?\s*\S+/i, '')
    .replace(/Dispon[íi]vel em:?\s*\S+/i, '')
    .trim();
  // Autoria em caixa alta até o primeiro ponto seguido de palavra capitalizada.
  const authorsMatch = body.match(
    /^((?:[A-ZÀ-Ú][A-ZÀ-Ú'-]+,[^.;]*(?:\.\s?[A-Z]\.)*;?\s*)+)\.\s+(.*)$/,
  );
  const authors = authorsMatch
    ? authorsMatch[1]!
        .split(';')
        .map((author) => author.trim().replace(/\.$/, ''))
        .filter(Boolean)
        .map((author) => {
          const [last, ...rest] = author.split(',');
          const lower = (last ?? '').toLocaleLowerCase();
          return `${lower.charAt(0).toLocaleUpperCase()}${lower.slice(1)}, ${rest.join(',').trim()}`;
        })
    : [];
  const rest = (authorsMatch ? authorsMatch[2]! : body).split(/\.\s+/);

  return {
    ...emptyReference,
    authors,
    doi,
    title: (rest[0] ?? '').trim(),
    type: url && !doi ? 'website' : 'article',
    url,
    vehicle: (rest[1] ?? '').split(',')[0]?.trim() ?? '',
    year: years[years.length - 1] ?? '',
  };
}
