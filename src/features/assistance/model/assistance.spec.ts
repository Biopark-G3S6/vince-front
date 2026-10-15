import { beforeEach, describe, expect, it } from 'vitest';

import { deliverMilestone, getReviewCycle } from '@features/review';

import { buildChangeSummary, checkStructureAndReferences } from './assistance';

describe('checkStructureAndReferences (RF-IAA-002)', () => {
  const paragraphs = [
    { heading: '1. Introdução', id: 'a', text: 'Como aponta o estudo (SILVA, 2022), há ganhos.' },
    { id: 'b', text: 'Outros resultados divergem (ESTEVA, 2017).' },
  ];
  const references = [
    { author: 'SILVA', entry: 'SILVA, C. 2022.', year: '2022' },
    { author: 'TOPOL', entry: 'TOPOL, E. 2019.', year: '2019' },
  ];

  const findings = checkStructureAndReferences(paragraphs, references, [
    'Introdução',
    'Metodologia',
  ]);

  it('aponta a obra citada e não referenciada, com o ponto do texto em que ocorre', () => {
    expect(findings).toContainEqual(
      expect.objectContaining({
        code: 'CITED_NOT_REFERENCED',
        excerpt: '(ESTEVA, 2017)',
        location: '1. Introdução',
        params: { author: 'ESTEVA', year: '2017' },
      }),
    );
  });

  it('aponta a obra referenciada e não citada, e a seção esperada ausente', () => {
    expect(findings.map((finding) => [finding.code, finding.params])).toEqual(
      expect.arrayContaining([
        ['REFERENCED_NOT_CITED', { author: 'TOPOL', year: '2019' }],
        ['SECTION_MISSING', { section: 'Metodologia' }],
      ]),
    );
  });

  it('não aponta a citação devidamente referenciada nem a seção presente', () => {
    expect(findings).toHaveLength(3);
  });
});

describe('buildChangeSummary (RF-IAA-001)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await deliverMilestone('user-joao');
  });

  it('separa os apontamentos cujo trecho não mudou dos que aparentam não atender', async () => {
    const summary = buildChangeSummary(await getReviewCycle('user-almeida'));

    expect(summary?.unchangedRemarks.map((remark) => remark.id)).toEqual(['remark-2']);
    expect(summary?.insufficientRemarks.map((remark) => remark.id)).toEqual(['remark-3']);
    expect(summary?.totals).toMatchObject({ added: 1, changed: 2, removed: 1 });
  });

  it('não produz resumo sem entrega anterior', async () => {
    const cycle = await getReviewCycle('user-almeida');

    expect(buildChangeSummary({ ...cycle, submissions: cycle.submissions.slice(0, 1) })).toBeNull();
  });
});
