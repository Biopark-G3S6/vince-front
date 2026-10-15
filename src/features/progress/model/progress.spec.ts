import { describe, expect, it } from 'vitest';

import { evaluateRiskSignals, toCsv, type TeamProgress } from './progress';

const now = new Date('2026-10-12T15:00:00.000Z');

const healthy: TeamProgress = {
  advisor: 'Prof. Almeida',
  advisorId: 'user-almeida',
  articleStatus: 'IN_PROGRESS',
  articleTitle: 'Artigo',
  consecutiveAutomaticDeliveries: 0,
  delivery: 'pending',
  event: 'Congresso 2026',
  eventId: 'event-congress',
  id: 'team',
  lastEditedAt: '2026-10-11T15:00:00.000Z',
  lastReturnedAt: '2026-09-18T12:00:00.000Z',
  members: [{ everEdited: true, name: 'Ana' }],
  milestone: { deadline: '2026-10-21T02:59:00.000Z', name: 'Referencial teórico' },
  name: 'Equipe',
  pendingRemarks: 0,
  unaddressedRemarks: 0,
};

describe('evaluateRiskSignals (RF-ACP-003)', () => {
  it('não sinaliza equipe em dia', () => {
    expect(evaluateRiskSignals(healthy, now)).toEqual([]);
  });

  it('sinaliza artigo sem edição por período prolongado, e o sinal cessa com a retomada', () => {
    const idle = { ...healthy, lastEditedAt: '2026-10-01T15:00:00.000Z' };

    expect(evaluateRiskSignals(idle, now)).toEqual(['NO_RECENT_EDIT']);
    expect(evaluateRiskSignals({ ...idle, lastEditedAt: '2026-10-12T14:00:00.000Z' }, now)).toEqual(
      [],
    );
  });

  it('não trata como parada a equipe que aguarda a correção', () => {
    const waiting: TeamProgress = {
      ...healthy,
      articleStatus: 'IN_REVIEW',
      delivery: 'spontaneous',
      lastEditedAt: '2026-10-01T15:00:00.000Z',
    };

    expect(evaluateRiskSignals(waiting, now)).toEqual([]);
  });

  it('sinaliza entrega automática em duas etapas seguidas, mas não em uma', () => {
    expect(evaluateRiskSignals({ ...healthy, consecutiveAutomaticDeliveries: 1 }, now)).toEqual([]);
    expect(evaluateRiskSignals({ ...healthy, consecutiveAutomaticDeliveries: 2 }, now)).toEqual([
      'REPEATED_AUTOMATIC_DELIVERY',
    ]);
  });

  it('sinaliza apontamentos acumulados e integrante que nunca editou', () => {
    const team: TeamProgress = {
      ...healthy,
      members: [...healthy.members, { everEdited: false, name: 'Caio' }],
      unaddressedRemarks: 3,
    };

    expect(evaluateRiskSignals(team, now)).toEqual(['REMARKS_ACCUMULATED', 'MEMBER_NEVER_EDITED']);
  });

  it('sinaliza prazo próximo sem alteração desde a devolução anterior', () => {
    const team: TeamProgress = {
      ...healthy,
      lastEditedAt: '2026-10-08T10:00:00.000Z',
      lastReturnedAt: '2026-10-09T12:00:00.000Z',
      milestone: { deadline: '2026-10-14T02:59:00.000Z', name: 'Relatório parcial' },
    };

    expect(evaluateRiskSignals(team, now)).toEqual(['DEADLINE_NEAR_WITHOUT_CHANGE']);
    expect(evaluateRiskSignals({ ...team, lastEditedAt: '2026-10-10T10:00:00.000Z' }, now)).toEqual(
      [],
    );
  });

  it('não sinaliza artigo concluído', () => {
    const finished: TeamProgress = {
      ...healthy,
      articleStatus: 'FINISHED',
      consecutiveAutomaticDeliveries: 3,
    };

    expect(evaluateRiskSignals(finished, now)).toEqual([]);
  });
});

describe('toCsv (RF-ACP-006)', () => {
  it('separa por ponto e vírgula e protege o campo que contém o separador ou aspas', () => {
    expect(
      toCsv([
        ['Evento', 'Equipes'],
        ['Congresso; edição "2026"', '4'],
      ]),
    ).toBe('Evento;Equipes\r\n"Congresso; edição ""2026""";4');
  });
});
