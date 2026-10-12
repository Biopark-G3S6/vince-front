import { useEffect, useMemo, useState } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PersonaSwitch } from '@features/admin';
import { currentArticle } from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { downloadBlob } from '@shared/lib/download';
import {
  ArrowLeftIcon,
  Button,
  DocumentIcon,
  DownloadIcon,
  EmptyState,
  LockIcon,
} from '@shared/ui';

import { useExportData } from '../api/hooks';
import { exportDocx, type ArticleCover } from '../lib/exportDocx';
import { createArticleExtensions } from '../model/extensions';
import { createCitationResolver, withoutCover } from '../model/document';
import { abntNorm, coverDefaults } from '../model/editor';
import { formatReference, sortReferences } from '../model/references';

import '../article-editor.css';

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

/** RF-EDT-007 — Visualização do artigo formatado pela norma e exportação. */
export function PreviewPage() {
  const { t } = useTranslation('editor');
  const { compareText, formatPercent } = useFormatters();
  const exported = useExportData();
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const data = exported.data;
  const references = useMemo(
    () => sortReferences(data?.references ?? [], compareText),
    [compareText, data?.references],
  );
  const resolve = useMemo(() => createCitationResolver(references), [references]);
  const extensions = useMemo(() => createArticleExtensions(), []);

  const editor = useEditor({
    editable: false,
    editorProps: { attributes: { class: 'article-body' } },
    extensions,
  });

  useEffect(() => {
    if (data) {
      editor.storage.citation.resolve = resolve;
      editor.commands.setContent(withoutCover(data.content));
    }
  }, [data, editor, resolve]);

  const cover: ArticleCover = {
    ...coverDefaults,
    advisor: t('preview.advisor', { name: currentArticle.advisor.name }),
    authors: currentArticle.members.map((member) => member.name),
    title: currentArticle.title,
  };

  async function handleDocx() {
    if (!data) {
      return;
    }

    setExporting(true);

    try {
      const blob = await exportDocx({
        content: withoutCover(data.content),
        cover,
        references,
        referencesTitle: t('preview.references'),
        resolveCitation: resolve,
      });

      downloadBlob(blob, `${currentArticle.title}.docx`);
      toast.success(t('preview.exported'));
    } catch {
      toast.error(t('errors.UNKNOWN'));
    } finally {
      setExporting(false);
    }
  }

  const stepZoom = (offset: number) =>
    setZoom(
      (current) =>
        ZOOM_STEPS[
          Math.min(ZOOM_STEPS.length - 1, Math.max(0, ZOOM_STEPS.indexOf(current) + offset))
        ] ?? 1,
    );

  // A exportação segue a norma, qualquer que seja a configuração de página do rascunho.
  const { bottom, left, right, top } = abntNorm.margins;
  const sheetClass =
    'mx-auto mb-8 min-h-[29.7cm] w-[21cm] max-w-full bg-white shadow-xl print:mb-0 print:min-h-0 print:w-auto print:break-after-page print:shadow-none';
  const sheetStyle = {
    '--article-align': abntNorm.textAlign,
    '--article-font': `${abntNorm.fontFamily}, Helvetica, sans-serif`,
    '--article-line': abntNorm.lineHeight,
    '--article-size': abntNorm.fontSize,
    fontFamily: `${abntNorm.fontFamily}, Helvetica, sans-serif`,
    fontSize: abntNorm.fontSize,
    padding: `${top}cm ${right}cm ${bottom}cm ${left}cm`,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-[#2b2b2b] print:bg-white">
      <header className="print-hidden sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-vince-border bg-vince-surface px-6 py-3">
        <a
          className="inline-flex items-center gap-2 text-sm font-semibold text-vince-primary hover:underline"
          href="/admin/editor"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          {t('preview.back')}
        </a>
        <span className="h-6 w-px bg-vince-border" />
        <h1 className="flex-1 text-lg font-bold text-vince-text">{t('preview.title')}</h1>
        <Button disabled={!data || exporting} onClick={() => void handleDocx()} variant="outline">
          <DocumentIcon className="h-5 w-5" />
          {t('preview.docx')}
        </Button>
        <Button disabled={!data} onClick={() => window.print()}>
          <DownloadIcon className="h-5 w-5" />
          {t('preview.pdf')}
        </Button>
      </header>

      <div className="print-hidden bg-vince-surface px-6 pb-3">
        <PersonaSwitch
          className="mt-0 border-0 px-0 py-0"
          roles={['student', 'advisor', 'coordinator']}
        />
      </div>

      {exported.isError ? (
        <div className="mx-auto max-w-xl px-6 py-16">
          <EmptyState
            description={t('page.noAccessBody')}
            icon={<LockIcon className="h-8 w-8" />}
            title={t('page.noAccessTitle')}
          />
        </div>
      ) : (
        <main className="overflow-x-auto px-4 py-8 print:p-0">
          <div className="origin-top print:!transform-none" style={{ transform: `scale(${zoom})` }}>
            <section className={sheetClass} style={sheetStyle}>
              <div className="flex min-h-[23cm] flex-col items-center justify-between text-center">
                <p className="text-xl uppercase tracking-wide text-vince-text">
                  {cover.institution}
                </p>
                <h2 className="text-3xl font-extrabold leading-tight text-vince-text">
                  {cover.title}
                </h2>
                <div>
                  {cover.authors.map((author) => (
                    <p className="font-semibold text-vince-text" key={author}>
                      {author}
                    </p>
                  ))}
                  <p className="mt-3 text-vince-muted">{cover.advisor}</p>
                </div>
                <div className="text-vince-text">
                  <p>{cover.city}</p>
                  <p className="text-sm text-vince-muted">{cover.year}</p>
                </div>
              </div>
            </section>

            <section className={sheetClass} style={sheetStyle}>
              <EditorContent editor={editor} />
            </section>

            <section className={sheetClass} style={sheetStyle}>
              <h2 className="mb-6 text-center font-bold uppercase text-vince-text">
                {t('preview.references')}
              </h2>
              {references.length === 0 && (
                <p className="text-center text-vince-muted">{t('references.empty')}</p>
              )}
              <ol className="space-y-4">
                {references.map((reference) => (
                  <li className="text-left leading-none" key={reference.id}>
                    {formatReference(reference).map((segment, index) =>
                      segment.emphasis ? (
                        <strong key={index}>{segment.text}</strong>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      ),
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </main>
      )}

      <div className="print-hidden fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-vince-border bg-white px-4 py-2 shadow-lg">
        <button
          aria-label={t('preview.zoomOut')}
          className="h-8 w-8 rounded-full text-lg font-bold text-vince-muted hover:bg-vince-tertiary disabled:opacity-40"
          disabled={zoom === ZOOM_STEPS[0]}
          onClick={() => stepZoom(-1)}
          type="button"
        >
          −
        </button>
        <span aria-live="polite" className="w-12 text-center text-sm font-semibold text-vince-text">
          {formatPercent(zoom)}
        </span>
        <button
          aria-label={t('preview.zoomIn')}
          className="h-8 w-8 rounded-full text-lg font-bold text-vince-muted hover:bg-vince-tertiary disabled:opacity-40"
          disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          onClick={() => stepZoom(1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}
