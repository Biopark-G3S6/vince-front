import { useState, type FormEvent } from 'react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageScaffold } from '@features/admin';
import {
  changeLanguage,
  createFormatters,
  DEFAULT_LANGUAGE,
  supportedLanguages,
} from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import { Button, GlobeIcon, Notice, SectionPanel } from '@shared/ui';

/** Instante e valores fixos, para que a amostra mostre apenas o efeito do idioma. */
const SAMPLE_INSTANT = '2026-11-05T17:30:00.000Z';
const SAMPLE_NUMBER = 12_480.5;

/** RF-INT-001 — Selecionar o idioma da interface. */
export function LanguageSettingsPage() {
  const { i18n, t } = useTranslation('settings');
  const current = i18n.resolvedLanguage ?? i18n.language;
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  // A amostra acompanha a opção marcada, antes mesmo de aplicá-la.
  const sample = createFormatters(selected);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      // A troca não exige recarregar a aplicação (ADR-0026 §27).
      await changeLanguage(selected);
      toast.success(i18n.t('settings:language.saved'));
    } catch {
      toast.error(t('errors.LANGUAGE_NOT_SUPPORTED'));
    } finally {
      setSaving(false);
    }
  }

  const samples = [
    { label: t('preview.date'), value: sample.formatDate(SAMPLE_INSTANT) },
    { label: t('preview.dateTime'), value: sample.formatDateTime(SAMPLE_INSTANT) },
    { label: t('preview.number'), value: sample.formatNumber(SAMPLE_NUMBER) },
    { label: t('preview.percent'), value: sample.formatPercent(0.375) },
    {
      label: t('preview.relative'),
      value: sample.formatRelative('2026-11-02T17:30:00.000Z', new Date(SAMPLE_INSTANT)),
    },
    { label: t('preview.timeZone'), value: sample.timeZone },
  ];

  return (
    <PageScaffold
      activeSection="language"
      description={t('page.description')}
      eyebrow={t('page.eyebrow')}
      title={t('page.title')}
    >
      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <SectionPanel title={t('language.title')}>
          <form onSubmit={(event) => void handleSubmit(event)}>
            <fieldset className="space-y-3">
              <legend className="sr-only">{t('language.title')}</legend>
              {supportedLanguages.map((language) => {
                const checked = language.code === selected;

                return (
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-4 transition-colors',
                      checked
                        ? 'border-vince-primary bg-vince-tertiary'
                        : 'border-vince-border hover:bg-vince-surface',
                    )}
                    key={language.code}
                  >
                    <input
                      checked={checked}
                      className="h-5 w-5 accent-vince-primary"
                      name="language"
                      onChange={() => setSelected(language.code)}
                      type="radio"
                      value={language.code}
                    />
                    <GlobeIcon className="h-6 w-6 text-vince-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-vince-text" lang={language.code}>
                        {language.nativeName}
                      </span>
                      <span className="text-sm text-vince-muted">{language.code}</span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-2 text-xs font-bold uppercase text-vince-primary">
                      {language.code === current && <span>{t('language.current')}</span>}
                      {language.code === DEFAULT_LANGUAGE && <span>{t('language.default')}</span>}
                      {language.preview && <span>{t('language.preview')}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {supportedLanguages.some((language) => language.preview) && (
              <p className="mt-3 text-sm text-vince-muted">{t('language.previewHint')}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
              {selected === current && (
                <span className="text-sm text-vince-muted">{t('language.unchanged')}</span>
              )}
              <Button disabled={saving || selected === current} type="submit">
                {t('language.save')}
              </Button>
            </div>
          </form>
        </SectionPanel>

        <div className="space-y-8">
          <SectionPanel title={t('preview.title')}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {samples.map((item) => (
                <div key={item.label}>
                  <dt className="text-sm text-vince-muted">{item.label}</dt>
                  <dd className="font-bold text-vince-text">{item.value}</dd>
                </div>
              ))}
            </dl>
          </SectionPanel>

          <Notice title={t('notes.title')}>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>{t('notes.interface')}</li>
              <li>{t('notes.content')}</li>
              <li>{t('notes.persistence')}</li>
              <li>{t('notes.fallback')}</li>
            </ul>
          </Notice>
        </div>
      </section>
    </PageScaffold>
  );
}
