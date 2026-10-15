import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  concludeArticle,
  createRemark,
  decideRemark,
  deliverMilestone,
  getReviewCycle,
  replyToRemark,
  returnArticle,
  saveDraft,
  setRemarkAddressed,
  undoDelivery,
  updateRemark,
} from './reviewApi';

const ADVISOR = 'user-almeida';
const STUDENT = 'user-joao';

// A semente parte de um artigo em edição; a equipe entrega a segunda de três etapas.
beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T15:00:00.000Z'));
  await deliverMilestone(STUDENT);
});

afterEach(() => {
  vi.useRealTimers();
});

const newRemark = { paragraphId: 'p-theory', quote: 'estado da arte', text: 'Citem a fonte.' };

describe('apontamento (RF-REV-004 a 006)', () => {
  it('permanece invisível à equipe até a devolução, que publica todos de uma vez', async () => {
    await createRemark(ADVISOR, newRemark);

    expect((await getReviewCycle(ADVISOR)).remarks).toHaveLength(4);
    expect((await getReviewCycle(STUDENT)).remarks).toHaveLength(3);

    await returnArticle(ADVISOR);
    const cycle = await getReviewCycle(STUDENT);

    expect(cycle.remarks).toHaveLength(4);
    expect(cycle.status).toBe('IN_PROGRESS');
    expect(cycle.currentMilestoneId).toBe('milestone-3');
  });

  it('só é registrado pelo orientador responsável e durante a correção', async () => {
    await expect(createRemark(STUDENT, newRemark)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });

    await returnArticle(ADVISOR);

    await expect(createRemark(ADVISOR, newRemark)).rejects.toMatchObject({
      code: 'ARTICLE_NOT_IN_REVIEW',
    });
  });

  it('preserva o texto anterior ao ser alterado, sem mudar o estado', async () => {
    await updateRemark(ADVISOR, 'remark-2', 'Descrevam a harmonização e a anonimização.');
    const remark = (await getReviewCycle(ADVISOR)).remarks.find((item) => item.id === 'remark-2');

    expect(remark?.state).toBe('OPEN');
    expect(remark?.history.at(-1)?.text).toContain('harmonizados antes do treinamento');
  });
});

describe('entrega (RF-REV-001 e 002)', () => {
  it('é desfeita antes do prazo e do primeiro apontamento', async () => {
    await undoDelivery(STUDENT);
    const cycle = await getReviewCycle(STUDENT);

    expect(cycle.status).toBe('IN_PROGRESS');
    expect(cycle.submissions).toHaveLength(1);
  });

  it('não é desfeita depois de iniciada a correção', async () => {
    await createRemark(ADVISOR, newRemark);

    await expect(undoDelivery(STUDENT)).rejects.toMatchObject({ code: 'REVIEW_ALREADY_STARTED' });
  });

  it('congela o artigo: a equipe não altera o texto nem entrega de novo', async () => {
    await expect(
      saveDraft(STUDENT, [{ id: 'p-method', text: 'Novo texto.' }]),
    ).rejects.toMatchObject({
      code: 'ARTICLE_LOCKED_FOR_REVIEW',
    });
    await expect(deliverMilestone(STUDENT)).rejects.toMatchObject({
      code: 'ARTICLE_LOCKED_FOR_REVIEW',
    });
  });
});

describe('encerramento no vencimento do prazo (RF-REV-003)', () => {
  it('entrega automaticamente o artigo de quem não entregou e assinala a entrega', async () => {
    await undoDelivery(STUDENT);
    vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));

    const cycle = await getReviewCycle(ADVISOR);

    expect(cycle.status).toBe('IN_REVIEW');
    expect(cycle.submissions.at(-1)).toMatchObject({ automatic: true, submittedBy: null });
  });
});

describe('rascunho (RF-EDT-001)', () => {
  it('é alterado por integrante da equipe, nunca pelo orientador', async () => {
    await returnArticle(ADVISOR);
    await saveDraft(STUDENT, [{ id: 'p-method', text: 'Novo texto.' }]);

    expect((await getReviewCycle(STUDENT)).draft).toEqual([
      { id: 'p-method', text: 'Novo texto.' },
    ]);
    await expect(saveDraft(ADVISOR, [])).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('atendimento e decisão (RF-REV-007 e 008)', () => {
  it('marcar como corrigido só ocorre com o artigo em edição e não encerra o apontamento', async () => {
    await expect(setRemarkAddressed(STUDENT, 'remark-2', true)).rejects.toMatchObject({
      code: 'ARTICLE_LOCKED_FOR_REVIEW',
    });

    await returnArticle(ADVISOR);
    await setRemarkAddressed(STUDENT, 'remark-2', true);

    const addressed = (await getReviewCycle(STUDENT)).remarks.find((r) => r.id === 'remark-2');
    expect(addressed?.state).toBe('ADDRESSED');

    await setRemarkAddressed(STUDENT, 'remark-2', false);
    const reopened = (await getReviewCycle(STUDENT)).remarks.find((r) => r.id === 'remark-2');
    expect(reopened?.state).toBe('OPEN');
  });

  it('registra a decisão do orientador e recusa nova decisão sobre apontamento encerrado', async () => {
    await decideRemark(ADVISOR, 'remark-1', 'DISMISSED');
    const remark = (await getReviewCycle(ADVISOR)).remarks.find((item) => item.id === 'remark-1');

    expect(remark).toMatchObject({
      decision: { by: ADVISOR, kind: 'DISMISSED' },
      state: 'DISMISSED',
    });
    await expect(decideRemark(ADVISOR, 'remark-1', 'RESOLVED')).rejects.toMatchObject({
      code: 'REMARK_ALREADY_CLOSED',
    });
  });

  it('devolve o apontamento reaberto a aberto', async () => {
    await decideRemark(ADVISOR, 'remark-3', 'REOPENED');
    const remark = (await getReviewCycle(ADVISOR)).remarks.find((item) => item.id === 'remark-3');

    expect(remark?.state).toBe('OPEN');
  });
});

describe('conclusão (RF-REV-011)', () => {
  it('é recusada com etapas pendentes no cronograma', async () => {
    await expect(concludeArticle(ADVISOR)).rejects.toMatchObject({ code: 'MILESTONE_PENDING' });
  });

  it('é recusada com apontamento pendente e aceita depois de todos encerrados', async () => {
    await returnArticle(ADVISOR);
    await deliverMilestone(STUDENT);

    await expect(concludeArticle(ADVISOR)).rejects.toMatchObject({ code: 'REMARK_PENDING' });

    for (const remarkId of ['remark-1', 'remark-2', 'remark-3']) {
      await decideRemark(ADVISOR, remarkId, 'RESOLVED');
    }

    await concludeArticle(ADVISOR);
    const cycle = await getReviewCycle(STUDENT);

    expect(cycle.status).toBe('FINISHED');
    await expect(
      saveDraft(STUDENT, [{ id: 'p-method', text: 'Novo texto.' }]),
    ).rejects.toMatchObject({
      code: 'ARTICLE_ALREADY_FINISHED',
    });
  });
});

describe('resposta a apontamento (RF-DSC-003)', () => {
  it('vira mensagem da discussão, referenciada, sem alterar o estado', async () => {
    await replyToRemark(STUDENT, 'remark-2', 'Vamos detalhar a harmonização.');
    const remark = (await getReviewCycle(STUDENT)).remarks.find((item) => item.id === 'remark-2');

    expect(remark?.state).toBe('OPEN');
    expect(remark?.replyMessageIds).toHaveLength(1);
  });
});
