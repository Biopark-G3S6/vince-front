import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { PageScaffold, useCurrentUser, type Role } from '@features/admin';
import { Tabs } from '@shared/ui';

import { ContributionPanel } from '../components/ContributionPanel';
import { ReportPanel } from '../components/ReportPanel';
import { AdvisorTeamsPanel, CoursePanel } from '../components/TeamPanels';

type TabKey = 'teams' | 'course' | 'contribution' | 'report';

/** O que cada perfil alcança compõe a tela; quem autoriza é o backend (ADR-0015 §19). */
const tabsByRole: Record<Role, TabKey[]> = {
  advisor: ['teams', 'contribution'],
  coordinator: ['course', 'report'],
  institutionAdmin: ['report'],
  student: [],
};

export function ProgressPage() {
  const { t } = useTranslation('progress');
  const user = useCurrentUser();
  const [selected, setSelected] = useState<TabKey>('teams');
  const available = tabsByRole[user.role];
  const tab = available.includes(selected) ? selected : available[0];

  return (
    <PageScaffold
      activeSection="progress"
      description={t('page.description')}
      eyebrow={t('page.eyebrow')}
      personaRoles={['advisor', 'coordinator', 'institutionAdmin']}
      title={t('page.title')}
    >
      {tab && (
        <div className="mt-8">
          <Tabs
            idPrefix="progress"
            items={available.map((key) => ({ key, label: t(`tabs.${key}`) }))}
            label={t('page.tabsLabel')}
            onChange={setSelected}
            value={tab}
          />
          <div
            aria-labelledby={`progress-tab-${tab}`}
            className="pt-6"
            id={`progress-panel-${tab}`}
            role="tabpanel"
          >
            <p className="mb-6 text-sm text-vince-muted">{t('page.readOnly')}</p>
            {tab === 'teams' && <AdvisorTeamsPanel />}
            {tab === 'course' && <CoursePanel />}
            {tab === 'contribution' && <ContributionPanel />}
            {tab === 'report' && <ReportPanel />}
          </div>
        </div>
      )}
    </PageScaffold>
  );
}
