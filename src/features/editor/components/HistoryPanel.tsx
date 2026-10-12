import { useState } from 'react';

import type { Editor } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { currentArticle } from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import { Button, ConfirmDialog, HistoryIcon, StatusBadge } from '@shared/ui';

import { useAuthorizeRestore, useHistory, useRegisterCheckpoint } from '../api/hooks';
import { fromParagraphs, withCover } from '../model/document';
import type { HistoryEntry } from '../model/editor';
import type { Reference } from '../model/references';

type HistoryPanelProps = {
  editable: boolean;
  editor: Editor;
  references: Reference[];
};

/** RF-EDT-008 — Sucessão de estados do artigo, autoria por trecho e restauração. */
export function HistoryPanel({ editable, editor, references }: HistoryPanelProps) {
  const { t } = useTranslation('editor');
  const { formatDateTime } = useFormatters();
  const history = useHistory(true);
  const authorize = useAuthorizeRestore();
  const registerCheckpoint = useRegisterCheckpoint();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const entries = history.data ?? [];
  const selected = entries.find((entry) => entry.id === selectedId);

  function restore(entry: HistoryEntry) {
    authorize.mutate(undefined, {
      onError: (error) =>
        toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') })),
      onSettled: () => setConfirming(false),
      onSuccess: () => {
        // A restauração cria estado novo; o histórico não é apagado (RN3).
        editor.commands.setContent(
          entry.content ??
            // A entrega guarda os parágrafos; título e autoria voltam com a capa.
            withCover(
              fromParagraphs(entry.paragraphs, references),
              currentArticle.title,
              currentArticle.members.map((member) => member.name),
            ),
        );
        registerCheckpoint.mutate({ content: editor.getJSON(), kind: 'restore' });
        toast.success(t('history.restored'));
        setSelectedId(null);
      },
    });
  }

  if (history.isError) {
    return <p className="text-sm text-vince-muted">{t('history.restricted')}</p>;
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm font-semibold text-vince-primary underline"
          onClick={() => setSelectedId(null)}
          type="button"
        >
          {t('history.back')}
        </button>
        <div>
          <p className="font-bold text-vince-text">{entryTitle(t, selected)}</p>
          <p className="text-sm text-vince-muted">
            {formatDateTime(selected.at)}
            {selected.authorName && ` · ${selected.authorName}`}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-vince-border bg-white p-3">
          {selected.paragraphs.map((paragraph) => {
            const author = currentArticle.members.find(
              (member) => member.id === selected.authors[paragraph.id],
            );

            return (
              <div key={paragraph.id}>
                {paragraph.heading && (
                  <p className="text-xs font-extrabold uppercase text-vince-primary">
                    {paragraph.heading}
                  </p>
                )}
                <p className="text-sm leading-6 text-vince-text">{paragraph.text}</p>
                {author && paragraph.text && (
                  <p className="mt-0.5 text-xs font-semibold text-vince-muted">
                    {t('history.writtenBy', { name: author.name })}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {editable && (
          <Button className="w-full" onClick={() => setConfirming(true)} size="sm">
            <HistoryIcon className="h-4 w-4" />
            {t('history.restore')}
          </Button>
        )}

        <ConfirmDialog
          cancelLabel={t('common.cancel')}
          confirmLabel={t('history.restore')}
          description={t('history.restoreBody')}
          onConfirm={() => restore(selected)}
          onOpenChange={setConfirming}
          open={confirming}
          pending={authorize.isPending}
          title={t('history.restoreTitle')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-vince-muted">{t('history.intro')}</p>
      {entries.length === 0 && <p className="text-sm text-vince-muted">{t('history.empty')}</p>}
      <ol className="space-y-2 border-l-2 border-vince-border pl-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              className={cn(
                'w-full rounded-lg border bg-white p-3 text-left transition-colors hover:bg-vince-tertiary',
                entry.kind === 'delivery' ? 'border-vince-primary' : 'border-vince-border',
              )}
              onClick={() => setSelectedId(entry.id)}
              type="button"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-vince-text">{entryTitle(t, entry)}</span>
                {entry.automatic && <StatusBadge label={t('history.automatic')} tone="danger" />}
              </span>
              <span className="mt-1 block text-sm text-vince-muted">
                {formatDateTime(entry.at)}
                {entry.authorName && ` · ${entry.authorName}`}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function entryTitle(
  t: (key: string, options?: Record<string, string>) => string,
  entry: HistoryEntry,
) {
  return entry.kind === 'delivery'
    ? t('history.kind.delivery', { milestone: entry.milestone })
    : t(`history.kind.${entry.kind}`);
}
