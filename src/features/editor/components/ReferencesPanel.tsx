import { useState, type FormEvent } from 'react';

import type { Editor } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ApiError, getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { Button, EditIcon, PlusIcon, TrashIcon, WarningIcon } from '@shared/ui';

import { useDeleteReference, useLookupDoi, useSaveReference } from '../api/hooks';
import { citedReferenceIds } from '../model/document';
import {
  emptyReference,
  formatCitation,
  formatReference,
  isRequired,
  missingFields,
  parsePastedReference,
  referenceFields,
  referenceTypes,
  sortReferences,
  type Reference,
  type ReferenceData,
  type ReferenceField,
} from '../model/references';

type ReferencesPanelProps = {
  editable: boolean;
  editor: Editor;
  references: Reference[];
};

type Draft = { data: ReferenceData; id?: string; lenient: boolean };

/** RF-EDT-003 e RF-EDT-004 — Referências como dado estruturado e a citação vinculada. */
export function ReferencesPanel({ editable, editor, references }: ReferencesPanelProps) {
  const { t } = useTranslation('editor');
  const { compareText } = useFormatters();
  const deleteReference = useDeleteReference();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [citing, setCiting] = useState<{ direct: boolean; id: string; page: string } | null>(null);

  const onError = (error: unknown) =>
    toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') }));

  function insertCitation(event: FormEvent) {
    event.preventDefault();

    if (!citing) {
      return;
    }

    // A página é opcional na citação indireta e exigida na direta (RF-EDT-004 RN2).
    if (citing.direct && !citing.page.trim()) {
      toast.error(t('errors.PAGE_REQUIRED'));
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        attrs: { page: citing.page.trim(), referenceId: citing.id },
        type: 'citation',
      })
      .run();
    setCiting(null);
  }

  if (draft) {
    return <ReferenceForm draft={draft} onClose={() => setDraft(null)} />;
  }

  return (
    <div className="min-w-0 space-y-4 [&_button]:min-h-11">
      <p className="text-sm leading-6 text-vince-muted">{t('references.intro')}</p>

      {editable && (
        <Button
          className="w-full"
          onClick={() => setDraft({ data: emptyReference, lenient: false })}
          size="sm"
          variant="outline"
        >
          <PlusIcon className="h-4 w-4" />
          {t('references.add')}
        </Button>
      )}

      {references.length === 0 && (
        <p className="text-sm text-vince-muted">{t('references.empty')}</p>
      )}

      <ol className="space-y-3">
        {sortReferences(references, compareText).map((reference) => {
          const missing = missingFields(reference);

          return (
            <li className="rounded-lg border border-vince-border bg-white p-3" key={reference.id}>
              <p className="break-words text-sm leading-6 text-vince-text [overflow-wrap:anywhere]">
                {formatReference(reference).map((segment, index) =>
                  segment.emphasis ? (
                    <strong key={index}>{segment.text}</strong>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </p>
              <p className="mt-1 text-xs font-semibold text-vince-muted">
                {t(`references.types.${reference.type}`)} · {formatCitation(reference)}
              </p>

              {missing.length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-[#7a5415]">
                  <WarningIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('references.missing', {
                    fields: missing.map((field) => t(`references.fields.${field}`)).join(', '),
                  })}
                </p>
              )}

              {editable && citing?.id === reference.id ? (
                <form className="mt-3 space-y-2" onSubmit={insertCitation}>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-vince-muted">
                      {t('references.page')}
                    </span>
                    <input
                      autoFocus
                      className="h-11 min-w-0 w-full rounded-padrao border border-vince-border px-3 text-base focus:border-vince-primary"
                      onChange={(event) => setCiting({ ...citing, page: event.target.value })}
                      value={citing.page}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-vince-text">
                    <input
                      checked={citing.direct}
                      className="h-4 w-4 accent-vince-primary"
                      onChange={(event) => setCiting({ ...citing, direct: event.target.checked })}
                      type="checkbox"
                    />
                    {t('references.direct')}
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => setCiting(null)} size="sm" variant="ghost">
                      {t('common.cancel')}
                    </Button>
                    <Button size="sm" type="submit">
                      {t('references.insert')}
                    </Button>
                  </div>
                </form>
              ) : (
                editable && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      onClick={() => setCiting({ direct: false, id: reference.id, page: '' })}
                      size="sm"
                      variant="secondary"
                    >
                      {t('references.cite')}
                    </Button>
                    <Button
                      aria-label={t('references.edit')}
                      onClick={() =>
                        setDraft({ data: reference, id: reference.id, lenient: false })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={t('references.remove')}
                      disabled={deleteReference.isPending}
                      onClick={() =>
                        deleteReference.mutate(
                          {
                            citedInEditor: [...citedReferenceIds(editor.getJSON())],
                            referenceId: reference.id,
                          },
                          {
                            onError,
                            onSuccess: () => toast.success(t('references.removed')),
                          },
                        )
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const inputClass =
  'h-11 min-w-0 w-full rounded-padrao border border-vince-border px-3 text-base text-vince-text focus:border-vince-primary';

function ReferenceForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useTranslation('editor');
  const saveReference = useSaveReference();
  const lookupDoi = useLookupDoi();
  const [data, setData] = useState(draft.data);
  const [lenient, setLenient] = useState(draft.lenient);
  const [invalid, setInvalid] = useState<ReferenceField[]>([]);
  const [pasted, setPasted] = useState('');
  const [doi, setDoi] = useState('');

  // O que o sistema reconheceu é registrado mesmo incompleto; o que faltar é assinalado.
  function fill(recognized: ReferenceData) {
    setData(recognized);
    setLenient(true);
    setInvalid(missingFields(recognized));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    saveReference.mutate(
      { data, id: draft.id, lenient },
      {
        onError: (error) => {
          setInvalid(
            error instanceof ApiError ? ((error.meta.fields as ReferenceField[]) ?? []) : [],
          );
          toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') }));
        },
        onSuccess: () => {
          toast.success(t('references.saved'));
          onClose();
        },
      },
    );
  }

  return (
    <form className="min-w-0 space-y-4 [&_button]:min-h-11" onSubmit={handleSubmit}>
      <h3 className="font-extrabold text-vince-text">
        {draft.id ? t('references.editTitle') : t('references.addTitle')}
      </h3>

      {!draft.id && (
        <div className="space-y-2 rounded-lg border border-dashed border-vince-border p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-vince-muted">
              {t('references.byDoi')}
            </span>
            <span className="flex min-w-0 flex-wrap gap-2">
              <input
                className={inputClass}
                onChange={(event) => setDoi(event.target.value)}
                placeholder="10.1038/nature21056"
                value={doi}
              />
              <Button
                disabled={!doi.trim() || lookupDoi.isPending}
                onClick={() => lookupDoi.mutate(doi, { onSuccess: fill })}
                size="sm"
                variant="outline"
              >
                {t('references.lookup')}
              </Button>
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-vince-muted">
              {t('references.byPaste')}
            </span>
            <textarea
              className="min-h-24 w-full rounded-padrao border border-vince-border p-3 text-base focus:border-vince-primary"
              onChange={(event) => setPasted(event.target.value)}
              value={pasted}
            />
          </label>
          <Button
            disabled={!pasted.trim()}
            onClick={() => fill(parsePastedReference(pasted))}
            size="sm"
            variant="outline"
          >
            {t('references.interpret')}
          </Button>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-vince-muted">
          {t('references.type')}
        </span>
        <select
          className={inputClass}
          onChange={(event) =>
            setData({ ...data, type: event.target.value as ReferenceData['type'] })
          }
          value={data.type}
        >
          {referenceTypes.map((type) => (
            <option key={type} value={type}>
              {t(`references.types.${type}`)}
            </option>
          ))}
        </select>
      </label>

      {referenceFields.map((field) => {
        const required = isRequired(data.type, field);
        const flagged = invalid.includes(field);
        const label = `${t(`references.fields.${field}`)}${required ? ' *' : ''}`;

        return (
          <label className="block" key={field}>
            <span
              className={
                flagged
                  ? 'mb-1 block text-xs font-bold text-red-800'
                  : 'mb-1 block text-xs font-semibold text-vince-muted'
              }
            >
              {label}
              {flagged && ` — ${t('references.fieldMissing')}`}
            </span>
            {field === 'authors' ? (
              <textarea
                aria-invalid={flagged}
                className="min-h-24 w-full rounded-padrao border border-vince-border p-3 text-base focus:border-vince-primary"
                onChange={(event) =>
                  setData({
                    ...data,
                    authors: event.target.value.split('\n').map((author) => author.trimStart()),
                  })
                }
                placeholder={t('references.authorsHint')}
                value={data.authors.join('\n')}
              />
            ) : (
              <input
                aria-invalid={flagged}
                className={inputClass}
                onChange={(event) => setData({ ...data, [field]: event.target.value })}
                value={data[field]}
              />
            )}
          </label>
        );
      })}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onClose} size="sm" variant="ghost">
          {t('common.cancel')}
        </Button>
        <Button disabled={saveReference.isPending} size="sm" type="submit">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
