/**
 * Comparação entre versões no nível da palavra, dentro do parágrafo
 * (RF-REV-010 RN2). Funções puras: não conhecem entrega nem apontamento.
 */

export type DiffSegment = {
  kind: 'equal' | 'insert' | 'delete';
  text: string;
};

export type DiffParagraphInput = {
  heading?: string;
  id: string;
  text: string;
};

export type ParagraphDiff = {
  after: string | null;
  before: string | null;
  change: 'equal' | 'changed' | 'added' | 'removed';
  heading?: string;
  id: string;
  segments: DiffSegment[];
};

function tokenize(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

function pushSegment(segments: DiffSegment[], kind: DiffSegment['kind'], text: string) {
  const last = segments[segments.length - 1];

  if (last && last.kind === kind) {
    last.text += text;
  } else {
    segments.push({ kind, text });
  }
}

/** Maior subsequência comum entre as palavras das duas versões. */
export function diffWords(before: string, after: string): DiffSegment[] {
  const left = tokenize(before);
  const right = tokenize(after);
  const rows = left.length + 1;
  const columns = right.length + 1;
  const lengths = new Uint32Array(rows * columns);

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i * columns + j] =
        left[i] === right[j]
          ? lengths[(i + 1) * columns + j + 1]! + 1
          : Math.max(lengths[(i + 1) * columns + j]!, lengths[i * columns + j + 1]!);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      pushSegment(segments, 'equal', left[i]!);
      i += 1;
      j += 1;
    } else if (lengths[(i + 1) * columns + j]! >= lengths[i * columns + j + 1]!) {
      pushSegment(segments, 'delete', left[i]!);
      i += 1;
    } else {
      pushSegment(segments, 'insert', right[j]!);
      j += 1;
    }
  }

  while (i < left.length) {
    pushSegment(segments, 'delete', left[i]!);
    i += 1;
  }

  while (j < right.length) {
    pushSegment(segments, 'insert', right[j]!);
    j += 1;
  }

  return segments;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function countChangedWords(segments: DiffSegment[]) {
  return segments.reduce(
    (totals, segment) => {
      if (segment.kind === 'insert') {
        totals.inserted += countWords(segment.text);
      } else if (segment.kind === 'delete') {
        totals.deleted += countWords(segment.text);
      }

      return totals;
    },
    { deleted: 0, inserted: 0 },
  );
}

/** Confronta duas versões parágrafo a parágrafo, pela identidade do parágrafo. */
export function diffParagraphs(
  before: DiffParagraphInput[],
  after: DiffParagraphInput[],
): ParagraphDiff[] {
  const beforeById = new Map(before.map((paragraph) => [paragraph.id, paragraph]));
  const afterIds = new Set(after.map((paragraph) => paragraph.id));

  // O parágrafo removido é apresentado depois do último que o precedia e permaneceu.
  const removedAfter = new Map<string | null, DiffParagraphInput[]>();
  let lastSurvivor: string | null = null;

  before.forEach((paragraph) => {
    if (afterIds.has(paragraph.id)) {
      lastSurvivor = paragraph.id;
    } else {
      removedAfter.set(lastSurvivor, [...(removedAfter.get(lastSurvivor) ?? []), paragraph]);
    }
  });

  const asRemoved = (paragraph: DiffParagraphInput): ParagraphDiff => ({
    after: null,
    before: paragraph.text,
    change: 'removed',
    heading: paragraph.heading,
    id: paragraph.id,
    segments: [{ kind: 'delete', text: paragraph.text }],
  });

  const result: ParagraphDiff[] = (removedAfter.get(null) ?? []).map(asRemoved);

  after.forEach((paragraph) => {
    const previous = beforeById.get(paragraph.id);

    if (!previous) {
      result.push({
        after: paragraph.text,
        before: null,
        change: 'added',
        heading: paragraph.heading,
        id: paragraph.id,
        segments: [{ kind: 'insert', text: paragraph.text }],
      });
    } else {
      result.push({
        after: paragraph.text,
        before: previous.text,
        change: previous.text === paragraph.text ? 'equal' : 'changed',
        heading: paragraph.heading,
        id: paragraph.id,
        segments: diffWords(previous.text, paragraph.text),
      });
    }

    result.push(...(removedAfter.get(paragraph.id) ?? []).map(asRemoved));
  });

  return result;
}
