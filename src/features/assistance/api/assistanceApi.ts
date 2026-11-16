import { currentArticle, DEMO_ARTICLE_ID } from '@features/articles';
import { citationAuthors, getArticleReferences, referenceToText } from '@features/editor';
import { getReviewCycle, latestSubmission } from '@features/review';
import { ApiError } from '@shared/api/apiError';
import { apiRequest, isBackendEnabled, requireUuid } from '@shared/api/client';
import { createMockCollection, respond } from '@shared/api/mockDb';

import {
  buildChangeSummary,
  checkStructureAndReferences,
  type AuthorshipSignals,
  type ChangeSummary,
  type ComplianceFinding,
  type ConsentState,
  type SimilarityResult,
} from '../model/assistance';

/** Backend simulado da assistência automatizada (RF-IAA-001 a 005). */

const ADMIN_ID = 'user-admin';
const advisorId = () => currentArticle.advisor.id;
const memberIds = () => currentArticle.members.map((member) => member.id);
/** Os resultados de exemplo pertencem ao artigo de demonstração. */
const isDemo = () => currentArticle.id === DEMO_ARTICLE_ID;

const DECLARATION_VERSION = '2026.1';

const consentDb = createMockCollection<ConsentState>('assistance.consent', () => ({
  active: true,
  declarationVersion: DECLARATION_VERSION,
  history: [
    {
      action: 'GRANTED',
      at: '2026-08-03T13:00:00.000Z',
      by: 'Admin Geral',
      declarationVersion: DECLARATION_VERSION,
    },
  ],
  institution: 'Faculdade Regional de Tecnologia',
}));

const expectedSections = [
  'Introdução',
  'Referencial teórico',
  'Metodologia',
  'Resultados',
  'Conclusão',
];

const formattingFindings: ComplianceFinding[] = [
  {
    category: 'formatting',
    code: 'LINE_SPACING',
    id: 'formatting-spacing',
    location: '2. Referencial teórico',
    params: { expected: '1,5', found: '1,0' },
  },
  {
    category: 'formatting',
    code: 'LONG_QUOTE_INDENT',
    excerpt: 'Redes neurais convolucionais consolidaram-se como o estado da arte',
    id: 'formatting-quote',
    location: '2. Referencial teórico',
    params: { expected: '4 cm' },
  },
  {
    category: 'formatting',
    code: 'HEADING_STYLE',
    id: 'formatting-heading',
    location: '3. Metodologia',
    params: {},
  },
];

function assertReach(actorId: string) {
  if (actorId !== advisorId() && !memberIds().includes(actorId)) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }
}

function assertAdvisor(actorId: string) {
  if (actorId !== advisorId()) {
    throw new ApiError('PERMISSION_DENIED');
  }
}

export function getConsent() {
  if (isBackendEnabled()) {
    return apiRequest<{
      institutionId: string;
      consented: boolean;
      consentedAt: string | null;
      configuration: Record<string, unknown>;
    }>('/profile').then(async (profile) => {
      if (!profile.institutionId) throw new ApiError('RESOURCE_NOT_FOUND');
      const consent = await apiRequest<{
        institutionId: string;
        consented: boolean;
        consentedAt: string | null;
        revokedAt: string | null;
        configuration: Record<string, unknown>;
      }>(`/institutions/${requireUuid(profile.institutionId)}/ai-consent`);
      const version = String(consent.configuration.declarationVersion ?? '');
      return {
        active: consent.consented,
        declarationVersion: version,
        history: [
          ...(consent.consentedAt
            ? [
                {
                  action: 'GRANTED' as const,
                  at: consent.consentedAt,
                  by: 'Administração institucional',
                  declarationVersion: version,
                },
              ]
            : []),
          ...(consent.revokedAt
            ? [
                {
                  action: 'REVOKED' as const,
                  at: consent.revokedAt,
                  by: 'Administração institucional',
                  declarationVersion: version,
                },
              ]
            : []),
        ],
        institution: consent.institutionId,
      } satisfies ConsentState;
    });
  }
  return respond(() => consentDb.read());
}

/** RF-IAA-005 — Registrar ou revogar o consentimento da instituição. */
export function setConsent(actorId: string, active: boolean) {
  if (isBackendEnabled()) {
    return apiRequest<{ institutionId: string; consented: boolean }>('/profile').then((profile) => {
      if (!profile.institutionId) throw new ApiError('RESOURCE_NOT_FOUND');
      return apiRequest(`/institutions/${requireUuid(profile.institutionId)}/ai-consent`, {
        body: { consented: active },
        method: 'PUT',
      });
    });
  }
  return respond(() => {
    if (actorId !== ADMIN_ID) {
      throw new ApiError('PERMISSION_DENIED');
    }

    consentDb.update((draft) => {
      draft.active = active;
      // O registro é auditável: quem, quando e o que estava declarado (RN4).
      draft.history.push({
        action: active ? 'GRANTED' : 'REVOKED',
        at: new Date().toISOString(),
        by: 'Admin Geral',
        declarationVersion: draft.declarationVersion,
      });
    });
  });
}

/** RF-IAA-001 — Resumir as alterações da entrega. */
export async function getChangeSummary(actorId: string): Promise<ChangeSummary> {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    const response = await apiRequest<{
      result: { summary: string; unchangedRemarks: string[]; unmetRemarks: string[] };
    }>(`/articles/${articleId}/assistance/summary`, { body: {}, method: 'POST' });
    const cycle = await getReviewCycle(actorId);
    const calculated = buildChangeSummary(cycle);
    if (!calculated) throw new ApiError('NO_PREVIOUS_SUBMISSION');
    const unchangedIds = new Set(response.result.unchangedRemarks);
    const unmetIds = new Set(response.result.unmetRemarks);
    return {
      ...calculated,
      aiSummary: response.result.summary,
      unchangedRemarks: cycle.remarks.filter((remark) => unchangedIds.has(remark.id)),
      insufficientRemarks: cycle.remarks.filter((remark) => unmetIds.has(remark.id)),
    };
  }
  assertAdvisor(actorId);

  // Sem consentimento vigente, o conteúdo não é submetido a serviço externo (RF-IAA-005 RN1).
  if (!consentDb.read().active) {
    throw new ApiError('AI_CONSENT_REQUIRED');
  }

  const cycle = await getReviewCycle(actorId);

  if (cycle.status !== 'IN_REVIEW') {
    throw new ApiError('ARTICLE_NOT_IN_REVIEW');
  }

  const summary = buildChangeSummary(cycle);

  if (!summary) {
    throw new ApiError('NO_PREVIOUS_SUBMISSION');
  }

  return summary;
}

/** RF-IAA-002 — Verificar a conformidade do artigo à norma (ABNT). */
export async function runComplianceCheck(actorId: string) {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    const result = await apiRequest<{
      checkedAt: string;
      issues: Array<{
        code: string;
        category: string;
        severity: string;
        path: string | null;
        referenceId?: string;
        evidence?: string;
      }>;
    }>(`/articles/${articleId}/compliance-checks`, { body: {}, method: 'POST' });
    const categories: Record<string, ComplianceFinding['category']> = {
      FORMATTING: 'formatting',
      REFERENCES: 'references',
      STRUCTURE: 'structure',
    };
    return {
      checkedAt: result.checkedAt,
      findings: result.issues.map((issue, index) => ({
        category: categories[issue.category] ?? 'structure',
        code: issue.code,
        excerpt: issue.evidence,
        id: issue.referenceId ?? `${issue.category}-${index}`,
        location: issue.path ?? '',
        params: {},
      })),
    };
  }
  assertReach(actorId);

  const cycle = await getReviewCycle(actorId);
  // A verificação cruzada parte das referências registradas como dado estruturado
  // (RF-EDT-003 RN3).
  const references = (await getArticleReferences()).map((reference) => ({
    author: citationAuthors(reference),
    entry: referenceToText(reference),
    year: reference.year,
  }));
  const paragraphs =
    cycle.status === 'IN_PROGRESS' ? cycle.draft : latestSubmission(cycle)?.paragraphs;

  return {
    checkedAt: new Date().toISOString(),
    findings: [
      ...(isDemo() ? formattingFindings : []),
      ...checkStructureAndReferences(paragraphs ?? cycle.draft, references, expectedSections),
    ],
  };
}

/** RF-IAA-003 — Verificar a similaridade do artigo com o acervo interno. */
export function runSimilarityCheck(actorId: string) {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    return apiRequest<{
      checkedAt: string;
      corpusSize: number;
      insufficientCorpus: boolean;
      matches: Array<{
        text: string;
        sourceArticleId: string | null;
        sourcePath: string | null;
        tokenCount: number;
        percentageOfArticle: number;
      }>;
    }>(`/articles/${articleId}/similarity-checks`, { body: {}, method: 'POST' }).then((result) => ({
      checkedAt: result.checkedAt,
      matches: result.matches.map((match, index) => ({
        excerpt: match.text,
        id: `${match.sourceArticleId ?? 'source'}-${index}`,
        location: match.sourcePath ?? '',
        origin: match.sourceArticleId
          ? { article: match.sourceArticleId, team: '', year: '' }
          : null,
        share: match.percentageOfArticle / 100,
      })),
      totalShare: result.matches.reduce(
        (total, match) => total + match.percentageOfArticle / 100,
        0,
      ),
    }));
  }
  return respond((): SimilarityResult => {
    assertReach(actorId);

    const revealOrigin = actorId === advisorId();
    // Sem trecho coincidente com o acervo, nada é afirmado (E1).
    const matches = !isDemo()
      ? []
      : [
          {
            excerpt: 'O treinamento seguirá validação cruzada estratificada em cinco partições.',
            id: 'match-1',
            location: '3. Metodologia',
            origin: {
              article: 'Classificação de Imagens Dermatológicas com CNNs',
              team: 'Equipe Sigma',
              year: '2025',
            },
            share: 0.06,
          },
          {
            excerpt:
              'redes neurais artificiais, na área da saúde tem demonstrado um potencial transformador',
            id: 'match-2',
            location: '1. Introdução',
            origin: {
              article: 'Aprendizado Profundo no Apoio ao Diagnóstico',
              team: 'Equipe Ômega',
              year: '2024',
            },
            share: 0.04,
          },
        ];

    return {
      checkedAt: new Date().toISOString(),
      matches: matches.map((match) => ({ ...match, origin: revealOrigin ? match.origin : null })),
      totalShare: matches.reduce((sum, match) => sum + match.share, 0),
    };
  });
}

/** RF-IAA-004 — Consultar indícios sobre a autoria do texto. */
export function getAuthorshipSignals(actorId: string) {
  if (isBackendEnabled()) {
    const articleId = requireUuid(currentArticle.id);
    return apiRequest<{
      sufficientHistory: boolean;
      timeline: Array<{ authorId: string | null; createdAt: string; insertedCharacters: number }>;
      largeInsertions: Array<{ authorId: string | null; createdAt: string; characters: number }>;
      sessions: Array<{
        authorId: string | null;
        startedAt: string;
        endedAt: string;
        editCount: number;
      }>;
      authorship: Array<{ authorId: string; share: number }>;
      importMetadata: Array<{ createdAt: string; metadata: unknown }>;
    }>(`/articles/${articleId}/authorship-signals`).then((result) => ({
      authorship: result.authorship.map((member) => ({
        memberId: member.authorId,
        name: member.authorId,
        share: member.share,
      })),
      importMetadata: result.importMetadata.length
        ? {
            application: 'DOCX',
            declaredAuthor: '',
            editingMinutes: 0,
            revisions: result.importMetadata.length,
          }
        : null,
      largeInsertions: result.largeInsertions.map((insertion, index) => ({
        at: insertion.createdAt,
        author: insertion.authorId ?? '',
        characters: insertion.characters,
        id: `${insertion.authorId ?? 'author'}-${index}`,
      })),
      revisedShare: result.authorship.reduce((sum, member) => sum + member.share, 0),
      sessions: result.sessions.map((session, index) => ({
        author: session.authorId ?? '',
        id: `${session.authorId ?? 'author'}-${index}`,
        minutes: Math.max(
          0,
          Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60_000),
        ),
        startedAt: session.startedAt,
      })),
    }));
  }
  return respond((): AuthorshipSignals => {
    // Os indícios não são apresentados à equipe (RN3).
    assertAdvisor(actorId);

    // Histórico insuficiente: o sistema informa e nada afirma (E1).
    if (!isDemo()) {
      return {
        authorship: [],
        importMetadata: null,
        largeInsertions: [],
        revisedShare: 0,
        sessions: [],
      };
    }

    return {
      authorship: [
        { memberId: 'user-joao', name: 'João Pedro Silva', share: 0.46 },
        { memberId: 'user-maria', name: 'Maria Rita Costa', share: 0.41 },
        { memberId: 'user-carlos', name: 'Carlos Santos', share: 0.13 },
      ],
      importMetadata: {
        application: 'Microsoft Word 16.0',
        declaredAuthor: 'João Pedro Silva',
        editingMinutes: 12,
        revisions: 2,
      },
      largeInsertions: [
        {
          at: '2026-10-09T23:41:00.000Z',
          author: 'Carlos Santos',
          characters: 21_480,
          id: 'ins-1',
        },
        {
          at: '2026-09-13T20:12:00.000Z',
          author: 'João Pedro Silva',
          characters: 6_120,
          id: 'ins-2',
        },
      ],
      revisedShare: 0.38,
      sessions: [
        {
          author: 'Maria Rita Costa',
          id: 's-5',
          minutes: 95,
          startedAt: '2026-10-10T19:20:00.000Z',
        },
        { author: 'Carlos Santos', id: 's-4', minutes: 6, startedAt: '2026-10-09T23:38:00.000Z' },
        {
          author: 'João Pedro Silva',
          id: 's-3',
          minutes: 140,
          startedAt: '2026-10-04T13:05:00.000Z',
        },
        {
          author: 'Maria Rita Costa',
          id: 's-2',
          minutes: 72,
          startedAt: '2026-09-21T17:30:00.000Z',
        },
        {
          author: 'João Pedro Silva',
          id: 's-1',
          minutes: 118,
          startedAt: '2026-09-13T19:00:00.000Z',
        },
      ],
    };
  });
}
