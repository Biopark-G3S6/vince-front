import { useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import { Button, Notice, UploadIcon, WarningIcon } from '@shared/ui';

import { useRecordImport, useRegisterCheckpoint } from '../api/hooks';
import { createArticleExtensions } from '../model/extensions';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type Converted = { file: File; html: string; messages: string[] };

type ImportDialogProps = {
  editor: Editor;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

/** RF-EDT-006 — Importar documento `.docx` como conteúdo do artigo. */
export function ImportDialog({ editor, onOpenChange, open }: ImportDialogProps) {
  const { t } = useTranslation('editor');
  const recordImport = useRecordImport();
  const registerCheckpoint = useRegisterCheckpoint();
  const [converted, setConverted] = useState<Converted | null>(null);
  const [converting, setConverting] = useState(false);
  const hasContent = !editor.isEmpty;

  async function convert(file: File) {
    setConverting(true);

    try {
      // O conversor só é carregado quando alguém de fato importa.
      const mammoth = await import('mammoth/mammoth.browser.js');
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });

      setConverted({
        file,
        html: result.value,
        messages: [...new Set(result.messages.map((message) => message.message))],
      });
    } catch {
      toast.error(t('errors.FILE_FORMAT_NOT_SUPPORTED'));
    } finally {
      setConverting(false);
    }
  }

  const dropzone = useDropzone({
    accept: { [DOCX_TYPE]: ['.docx'] },
    disabled: converting,
    maxSize: MAX_FILE_BYTES,
    multiple: false,
    onDropAccepted: (files) => void convert(files[0]!),
    onDropRejected: (rejections) => {
      const tooLarge = rejections[0]?.errors.some((error) => error.code === 'file-too-large');
      toast.error(t(tooLarge ? 'errors.FILE_TOO_LARGE' : 'errors.FILE_FORMAT_NOT_SUPPORTED'));
    },
  });

  function close(next: boolean) {
    if (!next) {
      setConverted(null);
    }

    onOpenChange(next);
  }

  function confirm() {
    if (!converted) {
      return;
    }

    recordImport.mutate(
      {
        fileName: converted.file.name,
        lastModified: new Date(converted.file.lastModified).toISOString(),
        sizeInBytes: converted.file.size,
      },
      {
        onError: () => toast.error(t('errors.ARTICLE_LOCKED_FOR_REVIEW')),
        onSuccess: () => {
          // A importação substitui o conteúdo do artigo; não o mescla (RN1).
          editor.commands.setContent(converted.html);
          registerCheckpoint.mutate({ content: editor.getJSON(), kind: 'import' });
          toast.success(t('import.done'));
          close(false);
        },
      },
    );
  }

  return (
    <Dialog.Root onOpenChange={close} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-8 shadow-2xl">
          <Dialog.Title className="text-2xl font-extrabold text-vince-text">
            {t('import.title')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 leading-7 text-vince-muted">
            {t('import.description')}
          </Dialog.Description>

          {!converted ? (
            <div
              {...dropzone.getRootProps()}
              className={cn(
                'mt-6 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                dropzone.isDragActive
                  ? 'border-vince-primary bg-vince-tertiary'
                  : 'border-vince-border hover:bg-vince-surface',
              )}
            >
              <input {...dropzone.getInputProps()} aria-label={t('import.choose')} />
              <UploadIcon className="h-8 w-8 text-vince-muted" />
              <p className="mt-3 font-semibold text-vince-text">
                {converting ? t('import.converting') : t('import.choose')}
              </p>
              <p className="mt-1 text-sm text-vince-muted">{t('import.limits')}</p>
            </div>
          ) : (
            <ImportPreview converted={converted} />
          )}

          {converted && hasContent && (
            <Notice className="mt-4" icon={<WarningIcon className="h-5 w-5" />} tone="warning">
              {t('import.replaceWarning')}
            </Notice>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline">
                {converted ? t('import.discard') : t('common.cancel')}
              </Button>
            </Dialog.Close>
            {converted && (
              <Button disabled={recordImport.isPending} onClick={confirm}>
                {hasContent ? t('import.replace') : t('import.confirm')}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImportPreview({ converted }: { converted: Converted }) {
  const { t } = useTranslation('editor');
  const { formatNumber } = useFormatters();
  // O resultado passa pelo mesmo esquema do editor: só entra o que ele reconhece.
  const preview = useEditor({
    content: converted.html,
    editable: false,
    editorProps: { attributes: { class: 'article-body' } },
    extensions: createArticleExtensions(),
  });
  const counts = { heading: 0, image: 0, list: 0, paragraph: 0, table: 0 };

  preview.state.doc.descendants((node) => {
    const name = node.type.name;

    if (name === 'bulletList' || name === 'orderedList') {
      counts.list += 1;
    } else if (name in counts) {
      counts[name as keyof typeof counts] += 1;
    }
  });

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm font-semibold text-vince-muted">
        {converted.file.name} · {formatNumber(Math.ceil(converted.file.size / 1024))} KB
      </p>

      <dl className="grid grid-cols-5 gap-2 text-center">
        {(Object.keys(counts) as Array<keyof typeof counts>).map((key) => (
          <div className="rounded-lg border border-vince-border px-2 py-2" key={key}>
            <dd className="text-xl font-black text-vince-primary">{formatNumber(counts[key])}</dd>
            <dt className="text-xs text-vince-muted">{t(`import.counts.${key}`)}</dt>
          </div>
        ))}
      </dl>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-vince-border bg-vince-surface p-4">
        <EditorContent editor={preview} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-vince-text">{t('import.notConverted')}</h3>
        {converted.messages.length === 0 ? (
          <p className="text-sm text-vince-muted">{t('import.allConverted')}</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-vince-muted">
            {converted.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
