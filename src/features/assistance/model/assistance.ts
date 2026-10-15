import {
  countChangedWords,
  diffParagraphs,
  isPending,
  latestSubmission,
  previousSubmission,
  type Remark,
  type ReviewCycle,
} from '@features/review';

/** Resumo das alterações entre duas entregas (RF-IAA-001). */
export type ChangeSummary = {
  highlights: Array<{
    change: 'changed' | 'added' | 'removed';
    deleted: number;
    heading?: string;
    id: string;
    inserted: number;
  }>;
  /** Apontamentos pendentes cuja alteração aparenta não atender ao que foi pedido. */
  insufficientRemarks: Remark[];
  totals: { added: number; changed: number; deleted: number; inserted: number; removed: number };
  /** Apontamentos pendentes cujo trecho não sofreu alteração. */
  unchangedRemarks: Remark[];
};

/**
 * Monta o resumo a partir da comparação entre entregas (RF-REV-010) e dos apontamentos
 * pendentes. É subsídio ao orientador: não valida, não reabre e não encerra
 * apontamento (RF-IAA-001 RN1, RN2).
 *
 * A análise de atendimento é feita, no produto, por serviço externo de inteligência
 * artificial. Aqui ela é simulada por um critério determinístico: a alteração
 * "aparenta não atender" quando o parágrafo mudou, mas o trecho apontado permaneceu
 * literalmente igual.
 */
export function buildChangeSummary(cycle: ReviewCycle): ChangeSummary | null {
  const latest = latestSubmission(cycle);
  const previous = latest ? previousSubmission(cycle, latest.id) : undefined;

  if (!latest || !previous) {
    return null;
  }

  const diffs = diffParagraphs(previous.paragraphs, latest.paragraphs).filter(
    (diff) => diff.change !== 'equal',
  );
  const summary: ChangeSummary = {
    highlights: [],
    insufficientRemarks: [],
    totals: { added: 0, changed: 0, deleted: 0, inserted: 0, removed: 0 },
    unchangedRemarks: [],
  };

  diffs.forEach((diff) => {
    const words = countChangedWords(diff.segments);

    if (diff.change !== 'equal') {
      summary.totals[diff.change] += 1;
      summary.highlights.push({
        change: diff.change,
        deleted: words.deleted,
        heading: diff.heading,
        id: diff.id,
        inserted: words.inserted,
      });
    }

    summary.totals.inserted += words.inserted;
    summary.totals.deleted += words.deleted;
  });

  cycle.remarks
    .filter((remark) => isPending(remark) && remark.published)
    .forEach((remark) => {
      const origin = cycle.submissions
        .find((submission) => submission.id === remark.submissionId)
        ?.paragraphs.find((paragraph) => paragraph.id === remark.paragraphId);
      const current = latest.paragraphs.find((paragraph) => paragraph.id === remark.paragraphId);

      if (!origin || !current) {
        return;
      }

      if (origin.text === current.text) {
        summary.unchangedRemarks.push(remark);
      } else if (current.text.includes(remark.quote)) {
        summary.insufficientRemarks.push(remark);
      }
    });

  return summary;
}

export type ComplianceCategory = 'formatting' | 'structure' | 'references';

/** Divergência em relação à norma, ligada ao ponto do texto (RF-IAA-002). */
export type ComplianceFinding = {
  category: ComplianceCategory;
  /** Código da divergência; o texto é traduzido no cliente. */
  code: string;
  excerpt?: string;
  id: string;
  /** Seção do artigo em que a divergência ocorre. */
  location: string;
  params: Record<string, string>;
};

export type Reference = {
  author: string;
  entry: string;
  year: string;
};

type ComplianceParagraph = { heading?: string; id: string; text: string };

const CITATION_PATTERN = /\(([A-ZÀ-Ú][A-ZÀ-Ú\s.;&]+(?: et al\.)?), (\d{4})[^)]*\)/g;

function sectionOf(paragraphs: ComplianceParagraph[], index: number) {
  for (let i = index; i >= 0; i -= 1) {
    const heading = paragraphs[i]?.heading;

    if (heading) {
      return heading;
    }
  }

  return '';
}

/**
 * Verificação cruzada de citações e referências e das seções esperadas
 * (RF-IAA-002 RN1). Aponta; não corrige e não bloqueia a entrega (RN2).
 */
export function checkStructureAndReferences(
  paragraphs: ComplianceParagraph[],
  references: Reference[],
  expectedSections: string[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const cited = new Set<string>();

  paragraphs.forEach((paragraph, index) => {
    for (const match of paragraph.text.matchAll(CITATION_PATTERN)) {
      const author = match[1]!.trim();
      const year = match[2]!;
      const key = `${author}|${year}`;

      cited.add(key);

      if (!references.some((reference) => reference.author === author && reference.year === year)) {
        findings.push({
          category: 'references',
          code: 'CITED_NOT_REFERENCED',
          excerpt: match[0],
          id: `cited-${paragraph.id}-${key}`,
          location: sectionOf(paragraphs, index),
          params: { author, year },
        });
      }
    }
  });

  references
    .filter((reference) => !cited.has(`${reference.author}|${reference.year}`))
    .forEach((reference) => {
      findings.push({
        category: 'references',
        code: 'REFERENCED_NOT_CITED',
        excerpt: reference.entry,
        id: `uncited-${reference.author}-${reference.year}`,
        location: '',
        params: { author: reference.author, year: reference.year },
      });
    });

  const headings = paragraphs.map((paragraph) => paragraph.heading?.toLocaleLowerCase() ?? '');

  expectedSections
    .filter((section) => !headings.some((heading) => heading.includes(section.toLocaleLowerCase())))
    .forEach((section) => {
      findings.push({
        category: 'structure',
        code: 'SECTION_MISSING',
        id: `section-${section}`,
        location: '',
        params: { section },
      });
    });

  return findings;
}

/** Trecho coincidente com o acervo interno (RF-IAA-003). */
export type SimilarityMatch = {
  excerpt: string;
  id: string;
  location: string;
  /** Ao aluno a origem não é identificada (RN5). */
  origin: { article: string; team: string; year: string } | null;
  /** Proporção do texto que o trecho representa. */
  share: number;
};

export type SimilarityResult = {
  checkedAt: string;
  matches: SimilarityMatch[];
  totalShare: number;
};

/** Fatos registrados sobre a produção do texto (RF-IAA-004). Não são julgamento. */
export type AuthorshipSignals = {
  authorship: Array<{ memberId: string; name: string; share: number }>;
  importMetadata: {
    application: string;
    declaredAuthor: string;
    editingMinutes: number;
    revisions: number;
  } | null;
  largeInsertions: Array<{ at: string; author: string; characters: number; id: string }>;
  revisedShare: number;
  sessions: Array<{ author: string; id: string; minutes: number; startedAt: string }>;
};

export type ConsentRecord = {
  action: 'GRANTED' | 'REVOKED';
  at: string;
  by: string;
  /** Versão da declaração apresentada no momento do registro (RF-IAA-005 RN4). */
  declarationVersion: string;
};

export type ConsentState = {
  active: boolean;
  declarationVersion: string;
  history: ConsentRecord[];
  institution: string;
};
