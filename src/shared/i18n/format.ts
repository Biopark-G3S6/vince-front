import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

/**
 * Formatação pelas APIs nativas `Intl`, a partir do idioma selecionado (ADR-0026 §21).
 * O instante trafega em UTC, ISO 8601, e é convertido para o fuso de exibição aqui (§23).
 */

const RELATIVE_STEPS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> =
  [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3_600, divisor: 60, unit: 'minute' },
    { limit: 86_400, divisor: 3_600, unit: 'hour' },
    { limit: 2_592_000, divisor: 86_400, unit: 'day' },
    { limit: 31_536_000, divisor: 2_592_000, unit: 'month' },
    { limit: Infinity, divisor: 31_536_000, unit: 'year' },
  ];

export function createFormatters(language: string) {
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
  const dateTime = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });
  const number = new Intl.NumberFormat(language);
  const decimal = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 });
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const collator = new Intl.Collator(language);

  return {
    formatDate: (iso: string) => date.format(new Date(iso)),
    formatDateTime: (iso: string) => dateTime.format(new Date(iso)),
    formatNumber: (value: number) => number.format(value),
    formatDecimal: (value: number) => decimal.format(value),
    /** Recebe a fração — 0.25 é apresentado como 25%. */
    formatPercent: (fraction: number) => percent.format(fraction),
    formatRelative: (iso: string, now: Date = new Date()) => {
      const seconds = (new Date(iso).getTime() - now.getTime()) / 1000;
      const step =
        RELATIVE_STEPS.find((candidate) => Math.abs(seconds) < candidate.limit) ??
        RELATIVE_STEPS[RELATIVE_STEPS.length - 1]!;

      return relative.format(Math.round(seconds / step.divisor), step.unit);
    },
    compareText: (left: string, right: string) => collator.compare(left, right),
    timeZone: date.resolvedOptions().timeZone,
  };
}

export function useFormatters() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  return useMemo(() => createFormatters(language), [language]);
}
