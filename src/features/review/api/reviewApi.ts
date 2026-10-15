import {
  articleHref,
  currentArticle,
  DEMO_ARTICLE_ID,
  readArticles,
  type Article,
} from '@features/articles';
import { notify, postMessage } from '@features/discussion';
import { ApiError } from '@shared/api/apiError';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  findMilestone,
  isLastMilestone,
  isPending,
  latestSubmission,
  type Paragraph,
  type Remark,
  type RemarkDecision,
  type ReviewCycle,
} from '../model/review';

/**
 * Backend simulado do ciclo de correção (RF-REV-001 a 011). As regras ficam aqui, do
 * lado que representa o servidor: a tela oculta ou desabilita por experiência de uso,
 * mas quem recusa é a API, pelos códigos de erro da URS (ADR-0015 §19, §20).
 */

const introV1 =
  'A aplicação de inteligência artificial, especificamente redes neurais artificiais, na área da saúde tem demonstrado um potencial transformador nas últimas décadas. Este documento apresenta uma análise das arquiteturas utilizadas no diagnóstico precoce de patologias complexas.';
const introV2 =
  'A aplicação de inteligência artificial, especificamente redes neurais artificiais, na área da saúde tem demonstrado um potencial transformador nas últimas décadas. Este documento apresenta uma análise detalhada das arquiteturas contemporâneas utilizadas no diagnóstico precoce de patologias complexas, avaliando sua eficácia comparativa em relação aos métodos tradicionais de triagem.';
const goalV1 =
  'O objetivo primário deste estudo é investigar a robustez de modelos convolucionais profundos quando treinados com bases de dados heterogêneas.';
const goalV2 =
  'O objetivo primário deste estudo é investigar a robustez de modelos convolucionais profundos (Deep CNNs) quando treinados com bases de dados heterogêneas oriundas de múltiplos centros hospitalares. A hipótese central postula que a federação de dados, combinada com técnicas de transfer learning, pode mitigar os vieses inerentes a conjuntos de dados regionalizados (SILVA, 2022).';
const theory =
  'Redes neurais convolucionais consolidaram-se como o estado da arte na análise de imagens médicas (LECUN, 2015). Estudos recentes indicam ganhos de sensibilidade no rastreamento de retinopatia diabética (GULSHAN, 2016) e na classificação de lesões cutâneas (ESTEVA, 2017).';
const method =
  'Serão utilizados dados de três centros hospitalares, anonimizados na origem. O treinamento seguirá validação cruzada estratificada em cinco partições.';
const timeline = 'O levantamento bibliográfico ocorrerá em agosto e a coleta de dados em setembro.';

function demoSeed(article: Article): ReviewCycle {
  const secondDelivery: Paragraph[] = [
    { heading: '1. Introdução', id: 'p-intro', text: introV2 },
    { id: 'p-goal', text: goalV2 },
    { heading: '2. Referencial teórico', id: 'p-theory', text: theory },
    { heading: '3. Metodologia', id: 'p-method', text: method },
  ];

  return {
    currentMilestoneId: 'milestone-2',
    draft: secondDelivery,
    lastEditedAt: '2026-10-10T20:58:00.000Z',
    milestones: article.milestones,
    remarks: [
      {
        authorId: article.advisor.id,
        createdAt: '2026-09-17T14:20:00.000Z',
        decision: null,
        history: [],
        id: 'remark-1',
        milestoneId: 'milestone-1',
        paragraphId: 'p-goal',
        published: true,
        quote: 'quando treinados com bases de dados heterogêneas.',
        replyMessageIds: ['message-2'],
        state: 'ADDRESSED',
        submissionId: 'submission-1',
        text: 'Explicitem a hipótese central já neste parágrafo e indiquem de onde vêm as bases de dados.',
      },
      {
        authorId: article.advisor.id,
        createdAt: '2026-09-17T14:32:00.000Z',
        decision: null,
        history: [],
        id: 'remark-2',
        milestoneId: 'milestone-1',
        paragraphId: 'p-method',
        published: true,
        quote: 'dados de três centros hospitalares',
        replyMessageIds: [],
        state: 'OPEN',
        submissionId: 'submission-1',
        text: 'Descrevam como os dados dos centros serão harmonizados antes do treinamento.',
      },
      {
        authorId: article.advisor.id,
        createdAt: '2026-09-17T14:41:00.000Z',
        decision: null,
        history: [
          {
            changedAt: '2026-09-17T14:41:00.000Z',
            text: 'Afirmação sem fonte.',
          },
        ],
        id: 'remark-3',
        milestoneId: 'milestone-1',
        paragraphId: 'p-intro',
        published: true,
        quote: 'tem demonstrado um potencial transformador nas últimas décadas',
        replyMessageIds: [],
        state: 'ADDRESSED',
        submissionId: 'submission-1',
        text: 'Afirmação sem fonte. Citem ao menos dois estudos que sustentem esse potencial.',
      },
    ],
    status: 'IN_PROGRESS',
    submissions: [
      {
        automatic: false,
        id: 'submission-1',
        milestoneId: 'milestone-1',
        paragraphs: [
          { heading: '1. Introdução', id: 'p-intro', text: introV1 },
          { id: 'p-goal', text: goalV1 },
          { heading: '3. Metodologia', id: 'p-method', text: method },
          { heading: '4. Cronograma', id: 'p-timeline', text: timeline },
        ],
        returnedAt: '2026-09-18T13:05:00.000Z',
        submittedAt: '2026-09-14T22:40:00.000Z',
        submittedBy: 'user-joao',
      },
    ],
  };
}

/** O artigo recém-criado: em `STARTED`, sem texto, sem entrega e sem apontamento. */
function blankSeed(article: Article): ReviewCycle {
  // A equipe formada com o cronograma em andamento começa na primeira etapa ainda aberta.
  const open =
    article.milestones.find((milestone) => milestone.deadline > article.createdAt) ??
    article.milestones[article.milestones.length - 1];

  return {
    currentMilestoneId: open?.id ?? '',
    draft: [],
    lastEditedAt: article.createdAt,
    milestones: article.milestones,
    remarks: [],
    status: 'STARTED',
    submissions: [],
  };
}

/** Cada artigo tem o seu ciclo de correção. */
function db(articleId: string = currentArticle.id) {
  return createMockCollection<ReviewCycle>(`review.${articleId}`, () => {
    const article = readArticles().find((candidate) => candidate.id === articleId);

    if (!article) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    return articleId === DEMO_ARTICLE_ID ? demoSeed(article) : blankSeed(article);
  });
}

const memberIds = () => currentArticle.members.map((member) => member.id);
const advisorId = () => currentArticle.advisor.id;

function isMember(actorId: string) {
  return memberIds().includes(actorId);
}

function actorName(actorId: string) {
  return (
    [currentArticle.advisor, ...currentArticle.members].find((person) => person.id === actorId)
      ?.name ?? ''
  );
}

function assertAdvisor(actorId: string) {
  if (actorId !== advisorId()) {
    throw new ApiError('PERMISSION_DENIED');
  }
}

function assertMember(actorId: string) {
  if (!isMember(actorId)) {
    throw new ApiError('PERMISSION_DENIED');
  }
}

function notificationParams(cycle: ReviewCycle, actorId?: string) {
  return {
    actor: actorId ? actorName(actorId) : '',
    article: currentArticle.title,
    milestone: findMilestone(cycle, cycle.currentMilestoneId)?.name ?? '',
    team: currentArticle.team,
  };
}

function findRemark(cycle: ReviewCycle, remarkId: string) {
  const remark = cycle.remarks.find((candidate) => candidate.id === remarkId);

  if (!remark) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }

  return remark;
}

function assertNotClosed(remark: Remark) {
  if (!isPending(remark)) {
    throw new ApiError('REMARK_ALREADY_CLOSED');
  }
}

/**
 * No vencimento do prazo, o sistema entrega o estado corrente do artigo de quem não
 * entregou e assinala a entrega como não espontânea (RF-REV-003).
 */
function closeExpiredMilestone(now: Date) {
  const cycle = db().read();
  const milestone = findMilestone(cycle, cycle.currentMilestoneId);
  const alreadyDelivered = cycle.submissions.some(
    (submission) => submission.milestoneId === cycle.currentMilestoneId,
  );

  if (
    !milestone ||
    alreadyDelivered ||
    (cycle.status !== 'IN_PROGRESS' && cycle.status !== 'STARTED') ||
    now.getTime() <= new Date(milestone.deadline).getTime()
  ) {
    return;
  }

  const updated = db().update((draft) => {
    draft.submissions.push({
      automatic: true,
      id: createId('submission'),
      milestoneId: milestone.id,
      paragraphs: draft.draft,
      returnedAt: null,
      submittedAt: milestone.deadline,
      submittedBy: null,
    });
    draft.status = 'IN_REVIEW';
  });

  void notify({
    href: articleHref('/admin/correcao'),
    params: notificationParams(updated),
    recipientIds: [advisorId(), ...memberIds()],
    type: 'SUBMISSION_AUTO_CLOSED',
  });
}

export function getReviewCycle(actorId: string) {
  return respond((): ReviewCycle => {
    if (actorId !== advisorId() && !isMember(actorId)) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    closeExpiredMilestone(new Date());

    const cycle = db().read();

    return isMember(actorId)
      ? // Antes da devolução, nenhum apontamento da etapa é visível à equipe (RF-REV-006 RN2).
        { ...cycle, remarks: cycle.remarks.filter((remark) => remark.published) }
      : cycle;
  });
}

/** RF-REV-001 — Entregar a versão da etapa. */
export function deliverMilestone(actorId: string) {
  return respond(() => {
    assertMember(actorId);

    const updated = db().update((draft) => {
      if (draft.status === 'FINISHED') {
        throw new ApiError('ARTICLE_ALREADY_FINISHED');
      }

      if (draft.status === 'IN_REVIEW') {
        throw new ApiError('ARTICLE_LOCKED_FOR_REVIEW');
      }

      if (!findMilestone(draft, draft.currentMilestoneId)) {
        throw new ApiError('MILESTONE_NOT_OPEN');
      }

      draft.submissions.push({
        automatic: false,
        id: createId('submission'),
        milestoneId: draft.currentMilestoneId,
        paragraphs: draft.draft,
        returnedAt: null,
        submittedAt: new Date().toISOString(),
        submittedBy: actorId,
      });
      draft.status = 'IN_REVIEW';
    });

    return notify({
      actorId,
      href: articleHref('/admin/correcao'),
      params: notificationParams(updated, actorId),
      recipientIds: [advisorId()],
      type: 'SUBMISSION_DELIVERED',
    });
  });
}

/** RF-REV-002 — Desfazer a entrega. */
export function undoDelivery(actorId: string) {
  return respond(() => {
    assertMember(actorId);

    db().update((draft) => {
      const submission = latestSubmission(draft);

      if (draft.status !== 'IN_REVIEW' || !submission) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      const milestone = findMilestone(draft, submission.milestoneId);

      if (
        submission.automatic ||
        (milestone && Date.now() > new Date(milestone.deadline).getTime())
      ) {
        throw new ApiError('MILESTONE_DEADLINE_PASSED');
      }

      const reviewStarted =
        draft.remarks.some((remark) => remark.submissionId === submission.id) ||
        draft.remarks.some(
          (remark) => remark.decision && remark.decision.at > submission.submittedAt,
        );

      if (reviewStarted) {
        throw new ApiError('REVIEW_ALREADY_STARTED');
      }

      // A entrega desfeita é descartada e não permanece no histórico (RN2).
      draft.submissions.pop();
      draft.status = 'IN_PROGRESS';
    });
  });
}

export type CreateRemarkInput = {
  paragraphId: string;
  quote: string;
  text: string;
};

/** RF-REV-004 — Registrar apontamento no texto entregue. */
export function createRemark(actorId: string, input: CreateRemarkInput) {
  return respond(() => {
    assertAdvisor(actorId);

    if (!input.text.trim()) {
      throw new ApiError('VALIDATION_FAILED');
    }

    db().update((draft) => {
      const submission = latestSubmission(draft);

      if (draft.status !== 'IN_REVIEW' || !submission) {
        throw new ApiError('ARTICLE_NOT_IN_REVIEW');
      }

      draft.remarks.push({
        authorId: actorId,
        createdAt: new Date().toISOString(),
        decision: null,
        history: [],
        id: createId('remark'),
        milestoneId: submission.milestoneId,
        paragraphId: input.paragraphId,
        published: false,
        quote: input.quote.trim(),
        replyMessageIds: [],
        state: 'OPEN',
        submissionId: submission.id,
        text: input.text.trim(),
      });
    });
  });
}

/** RF-REV-005 — Alterar ou complementar apontamento. */
export function updateRemark(actorId: string, remarkId: string, text: string) {
  return respond(() => {
    if (!text.trim()) {
      throw new ApiError('VALIDATION_FAILED');
    }

    let published = false;

    const updated = db().update((draft) => {
      const remark = findRemark(draft, remarkId);

      if (remark.authorId !== actorId) {
        throw new ApiError('PERMISSION_DENIED');
      }

      assertNotClosed(remark);

      // O texto anterior é preservado; o estado não muda (RN3, RN4).
      remark.history.push({ changedAt: new Date().toISOString(), text: remark.text });
      remark.text = text.trim();
      published = remark.published;
    });

    return published
      ? notify({
          actorId,
          href: articleHref(`/admin/correcao?apontamento=${remarkId}`),
          params: notificationParams(updated, actorId),
          recipientIds: memberIds(),
          type: 'REMARK_UPDATED',
        })
      : undefined;
  });
}

/** RF-REV-006 — Devolver o artigo à equipe, em ato único. */
export function returnArticle(actorId: string) {
  return respond(() => {
    assertAdvisor(actorId);

    let params: Record<string, string> = {};

    db().update((draft) => {
      const submission = latestSubmission(draft);

      if (draft.status !== 'IN_REVIEW' || !submission) {
        throw new ApiError('ARTICLE_NOT_IN_REVIEW');
      }

      params = notificationParams(draft, actorId);

      const now = new Date().toISOString();
      submission.returnedAt = now;
      draft.remarks.forEach((remark) => {
        remark.published = true;
      });
      draft.status = 'IN_PROGRESS';

      // Devolvida a etapa, abre-se a seguinte. A última permanece corrente: a equipe
      // volta a entregá-la até que o orientador conclua o artigo (RF-REV-011 RN1).
      const next = draft.milestones.find(
        (milestone) => milestone.order > (findMilestone(draft, submission.milestoneId)?.order ?? 0),
      );

      if (next) {
        draft.currentMilestoneId = next.id;
      }
    });

    return notify({
      actorId,
      href: articleHref('/admin/correcao'),
      params,
      recipientIds: memberIds(),
      type: 'ARTICLE_RETURNED',
    });
  });
}

/** RF-REV-007 — Marcar apontamento como corrigido, ou desmarcar. */
export function setRemarkAddressed(actorId: string, remarkId: string, addressed: boolean) {
  return respond(() => {
    assertMember(actorId);

    db().update((draft) => {
      const remark = findRemark(draft, remarkId);

      if (!remark.published) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      assertNotClosed(remark);

      if (draft.status !== 'IN_PROGRESS') {
        throw new ApiError('ARTICLE_LOCKED_FOR_REVIEW');
      }

      // Marcar como corrigido não encerra o apontamento (RN1).
      remark.state = addressed ? 'ADDRESSED' : 'OPEN';
    });
  });
}

/** RF-REV-008 — Validar, reabrir ou dispensar apontamento. */
export function decideRemark(actorId: string, remarkId: string, decision: RemarkDecision) {
  return respond(() => {
    assertAdvisor(actorId);

    const updated = db().update((draft) => {
      if (draft.status !== 'IN_REVIEW') {
        throw new ApiError('ARTICLE_NOT_IN_REVIEW');
      }

      const remark = findRemark(draft, remarkId);

      assertNotClosed(remark);

      remark.state = decision === 'REOPENED' ? 'OPEN' : decision;
      remark.decision = { at: new Date().toISOString(), by: actorId, kind: decision };
    });

    return notify({
      actorId,
      href: articleHref(`/admin/correcao?apontamento=${remarkId}`),
      params: notificationParams(updated, actorId),
      recipientIds: memberIds(),
      type: 'REMARK_DECIDED',
    });
  });
}

/** RF-REV-011 — Concluir o artigo. */
export function concludeArticle(actorId: string) {
  return respond(() => {
    assertAdvisor(actorId);

    const updated = db().update((draft) => {
      if (draft.status !== 'IN_REVIEW') {
        throw new ApiError('ARTICLE_NOT_IN_REVIEW');
      }

      if (!isLastMilestone(draft)) {
        throw new ApiError('MILESTONE_PENDING');
      }

      if (draft.remarks.some(isPending)) {
        throw new ApiError('REMARK_PENDING');
      }

      const submission = latestSubmission(draft);

      if (submission) {
        submission.returnedAt = new Date().toISOString();
      }

      draft.remarks.forEach((remark) => {
        remark.published = true;
      });
      draft.status = 'FINISHED';
    });

    return notify({
      actorId,
      href: articleHref('/admin/correcao'),
      params: notificationParams(updated, actorId),
      recipientIds: memberIds(),
      type: 'ARTICLE_CONCLUDED',
    });
  });
}

/** RF-DSC-003 — A resposta ao apontamento é mensagem da discussão, com referência a ele. */
export async function replyToRemark(actorId: string, remarkId: string, body: string) {
  const remark = await respond(() => {
    assertMember(actorId);

    const found = findRemark(db().read(), remarkId);

    if (!found.published) {
      throw new ApiError('RESOURCE_NOT_FOUND');
    }

    return found;
  });

  const message = await postMessage({
    actorId,
    body,
    remarkRef: { excerpt: remark.quote, id: remark.id },
  });

  // Responder não altera o estado do apontamento (RN3).
  db().update((draft) => {
    findRemark(draft, remarkId).replyMessageIds.push(message.id);
  });
}

/**
 * Substitui o rascunho do artigo pelo conteúdo corrente do editor (RF-EDT-001). O
 * artigo só é editável por integrante da equipe e fora da correção (RN1, RN2).
 */
export function saveDraft(actorId: string, paragraphs: Paragraph[]) {
  return respond(() => {
    // O orientador não altera o texto do artigo (RE-15).
    assertMember(actorId);

    db().update((draft) => {
      if (draft.status === 'FINISHED') {
        throw new ApiError('ARTICLE_ALREADY_FINISHED');
      }

      if (draft.status === 'IN_REVIEW') {
        throw new ApiError('ARTICLE_LOCKED_FOR_REVIEW');
      }

      draft.draft = paragraphs;
      draft.lastEditedAt = new Date().toISOString();

      // A primeira alteração do texto tira o artigo de `STARTED`.
      if (draft.status === 'STARTED') {
        draft.status = 'IN_PROGRESS';
      }
    });
  });
}

/** Ciclo de um artigo qualquer do cadastro — para as listas e o acompanhamento. */
export function readCycleOf(articleId: string) {
  return db(articleId).read();
}
