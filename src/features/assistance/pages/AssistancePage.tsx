import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { PageScaffold, useCurrentUser, type Role } from '@features/admin';
import { currentArticle } from '@features/articles';
import { Tabs } from '@shared/ui';

import { AuthorshipPanel } from '../components/AuthorshipPanel';
import { CompliancePanel, SimilarityPanel } from '../components/CheckPanels';
import { ConsentPanel } from '../components/ConsentPanel';
import { SummaryPanel } from '../components/SummaryPanel';

type TabKey = 'summary' | 'compliance' | 'similarity' | 'authorship' | 'consent';

/** O que cada perfil alcança compõe a tela; quem autoriza é o backend (ADR-0015 §19). */
const tabsByRole: Record<Role, TabKey[]> = {
  advisor: ['summary', 'compliance', 'similarity', 'authorship', 'consent'],
  coordinator: [],
  institutionAdmin: ['consent'],
  student: ['compliance', 'similarity'],
};

export function AssistancePage() {
  const { t } = useTranslation('assistance');
  const user = useCurrentUser();
  const [selected, setSelected] = useState<TabKey>('summary');
  const available = tabsByRole[user.role];
  const tab = available.includes(selected) ? selected : available[0];

  return (
    <PageScaffold
      activeSection="assistance"
      description={t('page.description')}
      eyebrow={t('page.eyebrow')}
      personaRoles={['advisor', 'student', 'institutionAdmin']}
      title={t('page.title')}
    >
      {tab && (
        <>
          {user.role !== 'institutionAdmin' && (
            <p className="mt-8 text-vince-muted">
              {t('page.article')}:{' '}
              <strong className="text-vince-text">{currentArticle.title}</strong> ·{' '}
              {currentArticle.team}
            </p>
          )}

          <div className="mt-6">
            <Tabs
              idPrefix="assistance"
              items={available.map((key) => ({ key, label: t(`tabs.${key}`) }))}
              label={t('page.tabsLabel')}
              onChange={setSelected}
              value={tab}
            />
            <div
              aria-labelledby={`assistance-tab-${tab}`}
              className="pt-6"
              id={`assistance-panel-${tab}`}
              role="tabpanel"
            >
              {tab === 'summary' && <SummaryPanel />}
              {tab === 'compliance' && <CompliancePanel />}
              {tab === 'similarity' && <SimilarityPanel />}
              {tab === 'authorship' && <AuthorshipPanel />}
              {tab === 'consent' && <ConsentPanel />}
            </div>
          </div>
        </>
      )}
    </PageScaffold>
  );
}
