import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';

import { currentArticle } from '@features/articles';
import { cn } from '@shared/lib/cn';
import { Button, ChatIcon, EditIcon } from '@shared/ui';

import type { Paragraph, Remark } from '../model/review';

export type RemarkDraft = {
  paragraphId: string;
  quote: string;
};

type DocumentViewProps = {
  canAnnotate: boolean;
  canEdit: boolean;
  onAnnotate: (draft: RemarkDraft) => void;
  onSelectRemark: (remarkId: string) => void;
  paragraphs: Paragraph[];
  remarks: Remark[];
  selectedRemark: Remark | undefined;
};

function closestParagraphId(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('[data-paragraph-id]')?.dataset.paragraphId;
}

function highlightQuote(text: string, quote: string): ReactNode {
  const index = text.indexOf(quote);

  if (index < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#ffd9df] px-0.5 text-vince-text">{quote}</mark>
      {text.slice(index + quote.length)}
    </>
  );
}

export function DocumentView({
  canAnnotate,
  canEdit,
  onAnnotate,
  onSelectRemark,
  paragraphs,
  remarks,
  selectedRemark,
}: DocumentViewProps) {
  const { t } = useTranslation('review');

  // O apontamento se ancora a um trecho de um único parágrafo da versão entregue.
  function handleSelection() {
    if (!canAnnotate) {
      return;
    }

    const selection = window.getSelection();
    const quote = selection?.toString().trim();
    const paragraphId = closestParagraphId(selection?.anchorNode ?? null);

    if (quote && paragraphId && paragraphId === closestParagraphId(selection?.focusNode ?? null)) {
      onAnnotate({ paragraphId, quote });
    }
  }

  return (
    <article
      className="rounded-lg border border-vince-border bg-white px-6 py-10 shadow-sm sm:px-12"
      onMouseUp={handleSelection}
    >
      <header className="border-b border-vince-border pb-6 text-center">
        <h3 className="text-2xl font-extrabold uppercase text-vince-text">
          {currentArticle.title}
        </h3>
        <p className="mt-2 font-semibold text-vince-muted">
          {currentArticle.members.map((member) => member.name).join(', ')}
        </p>
      </header>

      <div className="mt-6 space-y-5">
        {paragraphs.map((paragraph) => {
          const paragraphRemarks = remarks.filter((remark) => remark.paragraphId === paragraph.id);
          const selectedHere = selectedRemark?.paragraphId === paragraph.id;

          return (
            <section
              className={cn(
                'rounded-lg p-2 transition-colors',
                selectedHere && 'bg-vince-surface outline outline-2 outline-vince-border',
              )}
              id={`paragrafo-${paragraph.id}`}
              key={paragraph.id}
            >
              {paragraph.heading && (
                <h4 className="mb-2 text-lg font-extrabold uppercase text-vince-primary">
                  {paragraph.heading}
                </h4>
              )}

              <p
                className="indent-8 text-justify leading-8 text-vince-text"
                data-paragraph-id={paragraph.id}
              >
                {selectedHere && selectedRemark
                  ? highlightQuote(paragraph.text, selectedRemark.quote)
                  : paragraph.text}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {paragraphRemarks.length > 0 && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-vince-tertiary px-3 py-1 text-sm font-semibold text-vince-primary hover:bg-[#ead8dc]"
                    onClick={() => onSelectRemark(paragraphRemarks[0]!.id)}
                    type="button"
                  >
                    <ChatIcon className="h-4 w-4" />
                    {t('document.remarkCount', { count: paragraphRemarks.length })}
                  </button>
                )}
                {canAnnotate && (
                  <Button
                    onClick={() =>
                      onAnnotate({ paragraphId: paragraph.id, quote: paragraph.text.slice(0, 120) })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    <EditIcon className="h-4 w-4" />
                    {t('document.annotate')}
                  </Button>
                )}
                {canEdit && (
                  <a
                    className="inline-flex h-9 items-center gap-2 rounded-padrao px-3 text-sm font-semibold text-vince-muted hover:bg-vince-tertiary"
                    href={`/admin/editor#bloco-${paragraph.id}`}
                  >
                    <EditIcon className="h-4 w-4" />
                    {t('document.edit')}
                  </a>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
