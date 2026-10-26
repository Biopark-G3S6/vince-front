import { useState, type FormEvent } from 'react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { Button, ChartIcon, DownloadIcon, EmptyState, Notice, SectionPanel } from '@shared/ui';

import { useGenerateReport, useReportCourses } from '../api/hooks';
import { isEmptyReport, reportPeriods, toCsv, type CourseReport } from '../model/progress';
import { QueryFeedback } from './QueryFeedback';

/** RF-ACP-005 e RF-ACP-006 — Relatório de produção do curso e a sua exportação. */
export function ReportPanel() {
  const { t } = useTranslation('progress');
  const coursesQuery = useReportCourses();
  const courses = coursesQuery.data ?? [];
  const generate = useGenerateReport();
  const [selectedCourse, setSelectedCourse] = useState<string>();
  const [period, setPeriod] = useState(reportPeriods[0]!);
  const courseId = courses.some((course) => course.id === selectedCourse)
    ? selectedCourse
    : courses[0]?.id;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (courseId) {
      generate.mutate(
        { courseId, period },
        {
          onError: (error) =>
            toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') })),
        },
      );
    }
  }

  if (!coursesQuery.data)
    return (
      <QueryFeedback
        error={coursesQuery.error}
        onRetry={() => {
          void coursesQuery.refetch();
        }}
      />
    );
  if (courses.length === 0)
    return (
      <EmptyState
        title={t('report.noCourses', {
          defaultValue: 'Nenhum curso disponível para gerar relatórios.',
        })}
      />
    );

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-4 rounded-lg border border-vince-border bg-white p-5 shadow-sm print:hidden"
        onSubmit={handleSubmit}
      >
        <label className="block min-w-0 flex-1 sm:flex-none">
          <span className="mb-1 block text-sm font-semibold text-vince-muted">
            {t('report.course')}
          </span>
          <select
            className="h-11 w-full min-w-0 rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary sm:w-64"
            onChange={(event) => {
              setSelectedCourse(event.target.value);
              generate.reset();
            }}
            value={courseId}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-semibold text-vince-muted">
            {t('report.period')}
          </span>
          <select
            className="h-11 rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary"
            onChange={(event) => {
              setPeriod(event.target.value);
              generate.reset();
            }}
            value={period}
          >
            {reportPeriods.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={generate.isPending || !courseId} type="submit">
          <ChartIcon className="h-5 w-5" />
          {generate.isPending ? t('report.generating') : t('report.generate')}
        </Button>
      </form>

      {generate.data && <ReportView report={generate.data} />}
    </div>
  );
}

function ReportView({ report }: { report: CourseReport }) {
  const { t } = useTranslation('progress');
  const { formatDateTime, formatDecimal, formatNumber } = useFormatters();
  const title = t('report.title', { course: report.course, period: report.period });
  const totalTeams = report.events.reduce((sum, event) => sum + event.teams, 0);
  const grade = (value: number | null) =>
    value === null ? t('report.noGrade') : formatDecimal(value);

  // As mesmas linhas alimentam a tela e o arquivo: o exportado reproduz o apresentado.
  const answers = [
    { label: t('report.concluded'), value: formatNumber(report.concluded) },
    { label: t('report.notConcluded'), value: formatNumber(report.notConcluded) },
    { label: t('report.students'), value: formatNumber(report.students) },
    { label: t('report.articleGrade'), value: grade(report.articleGradeAverage) },
    { label: t('report.individualGrade'), value: grade(report.individualGradeAverage) },
    { label: t('report.publications'), value: formatNumber(report.externalPublications) },
  ];

  function handleExport() {
    const rows = [
      [title],
      [t('report.generatedAt', { date: formatDateTime(report.generatedAt) })],
      [],
      [t('report.teamsByEvent')],
      [t('report.event'), t('report.teams')],
      ...report.events.map((event) => [event.name, String(event.teams)]),
      [t('report.total'), String(totalTeams)],
      [],
      ...answers.map((answer) => [answer.label, answer.value]),
      [],
      [t('report.lagging')],
      [t('report.team'), t('report.event'), t('report.milestone')],
      ...report.lagging.map((item) => [item.team, item.event, item.milestone]),
    ];
    // O BOM faz as planilhas reconhecerem a acentuação do arquivo.
    const blob = new Blob([String.fromCharCode(0xfeff) + toCsv(rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `relatorio-${report.course}-${report.period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('report.exported'));
  }

  return (
    <article className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-vince-text">{title}</h2>
          <p className="mt-1 text-sm text-vince-muted">
            {t('report.generatedAt', { date: formatDateTime(report.generatedAt) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 print:hidden">
          <Button onClick={handleExport} variant="outline">
            <DownloadIcon className="h-5 w-5" />
            {t('report.export')}
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            {t('report.print')}
          </Button>
        </div>
      </header>

      {isEmptyReport(report) ? (
        <EmptyState
          description={t('report.emptyBody', { period: report.period })}
          icon={<ChartIcon className="h-8 w-8" />}
          title={t('report.emptyTitle')}
        />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {answers.map((answer) => (
              <div
                className="rounded-lg border border-vince-border bg-white p-5 shadow-sm"
                key={answer.label}
              >
                <dt className="text-vince-muted">{answer.label}</dt>
                <dd className="mt-1 text-3xl font-black text-vince-primary">{answer.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionPanel title={t('report.teamsByEvent')}>
              <div
                aria-label={t('report.teamsByEvent')}
                className="overflow-x-auto"
                role="region"
                tabIndex={0}
              >
                <table className="w-full text-left">
                  <caption className="sr-only">{t('report.teamsByEvent')}</caption>
                  <thead className="text-sm text-vince-muted">
                    <tr>
                      <th className="pb-2 font-semibold">{t('report.event')}</th>
                      <th className="pb-2 text-right font-semibold">{t('report.teams')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vince-border">
                    {report.events.map((event) => (
                      <tr key={event.name}>
                        <td className="py-3 text-vince-text">{event.name}</td>
                        <td className="py-3 text-right font-bold text-vince-text">
                          {formatNumber(event.teams)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-vince-border">
                    <tr>
                      <td className="pt-3 font-bold text-vince-text">{t('report.total')}</td>
                      <td className="pt-3 text-right font-black text-vince-primary">
                        {formatNumber(totalTeams)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionPanel>

            <SectionPanel title={t('report.lagging')}>
              <p className="mb-3 text-sm text-vince-muted">{t('report.laggingHint')}</p>
              {report.lagging.length === 0 ? (
                <p className="text-vince-muted">{t('report.laggingNone')}</p>
              ) : (
                <div
                  aria-label={t('report.lagging')}
                  className="overflow-x-auto"
                  role="region"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[400px] text-left">
                    <caption className="sr-only">{t('report.lagging')}</caption>
                    <thead className="text-sm text-vince-muted">
                      <tr>
                        <th className="pb-2 font-semibold">{t('report.team')}</th>
                        <th className="pb-2 font-semibold">{t('report.event')}</th>
                        <th className="pb-2 font-semibold">{t('report.milestone')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vince-border">
                      {report.lagging.map((item) => (
                        <tr key={item.team}>
                          <td className="py-3 font-semibold text-vince-text">{item.team}</td>
                          <td className="py-3 text-vince-text">{item.event}</td>
                          <td className="py-3 text-vince-text">{item.milestone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionPanel>
          </div>
        </>
      )}

      <Notice>{t('report.factual')}</Notice>
    </article>
  );
}
