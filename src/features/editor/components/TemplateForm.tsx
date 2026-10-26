import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import { toast } from 'sonner';

import { useCurrentUser } from '@features/admin';
import {
  useSaveTemplate,
  currentVersion,
  defaultFormat,
  fontOptions,
  sectionsContent,
  type EventTemplate,
  type StoredTemplate,
  type TemplateFormat,
} from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { Button, Notice, UploadIcon } from '@shared/ui';

import { createArticleExtensions } from '../model/extensions';

import { EditorToolbar } from './EditorToolbar';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const fieldClass =
  'h-11 min-w-0 w-full rounded-lg border border-vince-border bg-white px-3 text-base text-vince-text focus:border-vince-primary';
const labelClass = 'flex min-w-0 flex-col gap-2 text-sm font-semibold text-vince-muted';

type TemplateFormProps = {
  events?: EventTemplate[];
  importMode?: boolean;
  initialEventId?: string;
  onClose: () => void;
  onError: (error: unknown) => void;
  template: StoredTemplate | null;
};

/** A mesma composição de conteúdo e formatação serve para modelos pessoais e de eventos. */
export function TemplateForm({
  events = [],
  importMode = false,
  initialEventId,
  onClose,
  onError,
  template,
}: TemplateFormProps) {
  const user = useCurrentUser();
  const { formatDateTime } = useFormatters();
  const saveTemplate = useSaveTemplate();
  const readOnly = template !== null && !template.canMaintain;
  const relatedEventId =
    template?.eventId ?? events.find((event) => event.templateId === template?.id)?.id;
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [visibility, setVisibility] = useState<'personal' | 'event'>(
    template?.visibility === 'event' ||
      (template !== null && template.visibility === undefined && Boolean(relatedEventId))
      ? 'event'
      : 'personal',
  );
  const [eventId, setEventId] = useState(relatedEventId ?? initialEventId ?? events[0]?.id ?? '');
  const [format, setFormat] = useState<TemplateFormat>(
    template
      ? {
          fontFamily: template.fontFamily,
          fontSize: template.fontSize,
          lineHeight: template.lineHeight,
          textAlign: template.textAlign,
        }
      : defaultFormat,
  );
  const [converting, setConverting] = useState(false);
  const [imported, setImported] = useState<{ fileName: string; messages: string[] } | null>(null);
  const extensions = useMemo(() => createArticleExtensions(), []);
  const editor = useEditor({
    content: template
      ? currentVersion(template).content
      : importMode
        ? ''
        : sectionsContent(['1. Introdução', '2. Desenvolvimento', '3. Conclusão']),
    editable: !readOnly,
    editorProps: {
      attributes: { 'aria-label': 'Conteúdo inicial do modelo', class: 'article-body' },
    },
    extensions,
  });
  const formatAsTemplate = { ...format, description, id: 'draft', label: title, title };
  const canPublish = user.role !== 'student' && events.length > 0;

  async function importFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Selecione um arquivo Word no formato .docx.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('O arquivo deve ter até 10 MB.');
      return;
    }
    setConverting(true);
    try {
      const mammoth = await import('mammoth/mammoth.browser.js');
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      // O esquema do editor filtra o HTML e o conteúdo salvo é JSON estruturado.
      setImported(null);
      editor.commands.setContent(result.value);
      if (editor.isEmpty) {
        toast.error('O arquivo não contém conteúdo que possa ser usado como modelo.');
        return;
      }
      setTitle((current) => current || file.name.replace(/\.docx$/i, ''));
      setImported({
        fileName: file.name,
        messages: [...new Set(result.messages.map((message) => message.message))],
      });
      toast.success('Modelo importado. Confira a prévia antes de salvar.');
    } catch {
      toast.error('Não foi possível ler este arquivo. Confira se ele é um documento .docx válido.');
    } finally {
      setConverting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (
      readOnly ||
      converting ||
      saveTemplate.isPending ||
      !title.trim() ||
      (importMode && !imported)
    )
      return;
    const selectedEvent =
      visibility === 'event' ? events.find((event) => event.id === eventId) : undefined;
    if (visibility === 'event' && (!canPublish || !selectedEvent)) return;
    saveTemplate.mutate(
      {
        content: editor.getJSON(),
        courseId: selectedEvent?.courseId ?? null,
        description: description.trim(),
        eventId: visibility === 'event' ? eventId : undefined,
        format,
        id: template?.id,
        ownerId: user.id,
        title: title.trim(),
        visibility,
      },
      {
        onError,
        onSuccess: () => {
          toast.success(
            template
              ? 'Modelo atualizado com uma nova versão.'
              : visibility === 'event'
                ? 'Modelo publicado no evento.'
                : 'Modelo salvo em Meus modelos.',
          );
          onClose();
        },
      },
    );
  }

  const pageStyle = {
    '--article-align': format.textAlign,
    '--article-font': format.fontFamily,
    '--article-line': format.lineHeight,
    '--article-size': `${format.fontSize}pt`,
  } as CSSProperties;

  return (
    <form className="mt-6 min-w-0 pb-8" onSubmit={handleSubmit}>
      <Button onClick={onClose} size="sm" variant="ghost">
        ← Voltar aos modelos
      </Button>
      <h2 className="mt-4 text-2xl font-extrabold text-vince-text">
        {template
          ? readOnly
            ? 'Consultar modelo'
            : 'Editar modelo'
          : importMode
            ? 'Importar modelo'
            : 'Criar modelo'}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-vince-muted">
        Salve um documento inicial para reutilizar em novos artigos.{' '}
        {canPublish
          ? 'Você pode guardar o modelo como pessoal ou disponibilizá-lo aos participantes de um evento.'
          : 'O modelo ficará disponível na sua biblioteca pessoal.'}
      </p>

      {importMode && (
        <div className="mt-6 rounded-lg border border-dashed border-vince-border bg-white p-5">
          <label className={labelClass}>
            <span className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Arquivo do modelo
            </span>
            <input
              accept={`${DOCX_TYPE},.docx`}
              className="block max-w-full rounded-lg border border-vince-border p-3 text-sm file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-vince-tertiary file:px-3 file:py-2 file:font-semibold file:text-vince-primary"
              disabled={converting || saveTemplate.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importFile(file);
              }}
              type="file"
            />
          </label>
          <p className="mt-2 text-sm text-vince-muted">
            Word (.docx), até 10 MB. O conteúdo será convertido para revisão no editor abaixo.
          </p>
          {converting && (
            <p className="mt-3 font-semibold text-vince-primary" role="status">
              Convertendo modelo…
            </p>
          )}
          {imported && (
            <p className="mt-3 break-words text-sm font-semibold text-vince-primary" role="status">
              Arquivo importado: {imported.fileName}
            </p>
          )}
        </div>
      )}

      <fieldset
        className="mt-6 grid gap-4 md:grid-cols-2"
        disabled={readOnly || converting || saveTemplate.isPending}
      >
        <label className={labelClass}>
          Nome do modelo
          <input
            className={fieldClass}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Resumo expandido do simpósio"
            required
            value={title}
          />
        </label>
        <label className={labelClass}>
          Disponibilidade
          <select
            className={fieldClass}
            onChange={(event) => setVisibility(event.target.value as 'personal' | 'event')}
            value={visibility}
          >
            <option value="personal">Meus modelos (pessoal)</option>
            {canPublish && <option value="event">Modelo do evento</option>}
          </select>
        </label>
        {visibility === 'event' && (
          <label className={`${labelClass} md:col-span-2`}>
            Evento
            <select
              className={fieldClass}
              onChange={(event) => setEventId(event.target.value)}
              required
              value={eventId}
            >
              <option value="" disabled>
                Selecione o evento
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                  {event.kind === 'practice'
                    ? ' (teste)'
                    : event.kind === 'tcc'
                      ? ' (TCC)'
                      : ' (oficial)'}
                </option>
              ))}
            </select>
            <span className="font-normal">
              Os participantes do evento poderão escolher este modelo ao criar um artigo.
            </span>
          </label>
        )}
        <label className={`${labelClass} md:col-span-2`}>
          Descrição
          <input
            className={fieldClass}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descreva a finalidade e as orientações do modelo"
            value={description}
          />
        </label>
        <label className={labelClass}>
          Fonte
          <select
            className={fieldClass}
            onChange={(event) => setFormat({ ...format, fontFamily: event.target.value })}
            value={format.fontFamily}
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            Tamanho
            <input
              className={fieldClass}
              max={18}
              min={8}
              onChange={(event) =>
                setFormat({ ...format, fontSize: Number(event.target.value) || 12 })
              }
              type="number"
              value={format.fontSize}
            />
          </label>
          <label className={labelClass}>
            Entrelinha
            <select
              className={fieldClass}
              onChange={(event) => setFormat({ ...format, lineHeight: Number(event.target.value) })}
              value={format.lineHeight}
            >
              {[1, 1.15, 1.5, 1.6, 2].map((value) => (
                <option key={value} value={value}>
                  {String(value).replace('.', ',')}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Alinhamento
            <select
              className={fieldClass}
              onChange={(event) =>
                setFormat({
                  ...format,
                  textAlign: event.target.value as TemplateFormat['textAlign'],
                })
              }
              value={format.textAlign}
            >
              <option value="justify">Justificado</option>
              <option value="left">À esquerda</option>
            </select>
          </label>
        </div>
      </fieldset>

      <h3 className="mt-8 text-lg font-extrabold text-vince-text">
        {importMode ? 'Prévia do modelo' : 'Conteúdo inicial'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-vince-muted">
        {importMode
          ? 'Confira as seções e ajuste o conteúdo importado antes de salvar. Fontes, margens e outros detalhes do Word podem precisar de ajustes.'
          : 'Escreva as seções, os cabeçalhos e as instruções que aparecerão no novo artigo.'}
      </p>
      {imported && imported.messages.length > 0 && (
        <Notice className="mt-4" tone="warning">
          <p className="font-semibold">Alguns elementos do Word precisam de revisão:</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {imported.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="mt-3 overflow-hidden rounded-lg border border-vince-border bg-white">
        {!readOnly && (
          <EditorToolbar
            editor={editor}
            insert={{
              imageByUrl: () => undefined,
              openLink: () => undefined,
              openTable: () =>
                editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run(),
              pickImage: () => undefined,
            }}
            template={formatAsTemplate}
          />
        )}
        <div className="max-h-[60vh] overflow-auto bg-[#f0eeee] p-3 sm:p-6">
          <div className="article-page mx-auto" style={{ ...pageStyle, minHeight: 320 }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      {template && (
        <div className="mt-6">
          <h3 className="text-lg font-extrabold text-vince-text">Versões</h3>
          <ol className="mt-2 space-y-2 text-sm text-vince-muted">
            {[...template.versions].reverse().map((version) => (
              <li key={version.number}>
                Versão {version.number} — {version.createdBy}, {formatDateTime(version.createdAt)}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Button disabled={saveTemplate.isPending} onClick={onClose} variant="outline">
          {readOnly ? 'Voltar' : 'Cancelar'}
        </Button>
        {!readOnly && (
          <Button
            disabled={
              saveTemplate.isPending ||
              converting ||
              !title.trim() ||
              (importMode && !imported) ||
              (visibility === 'event' && !eventId)
            }
            type="submit"
          >
            {saveTemplate.isPending
              ? 'Salvando…'
              : template
                ? 'Salvar nova versão'
                : 'Salvar modelo'}
          </Button>
        )}
      </div>
    </form>
  );
}
