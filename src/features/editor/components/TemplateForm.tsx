import { useMemo, useState, type FormEvent } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import { toast } from 'sonner';

import { useFormatters } from '@shared/i18n';
import { Button } from '@shared/ui';

import { useSaveTemplate } from '@features/articles';
import { createArticleExtensions } from '../model/extensions';
import {
  courses,
  currentVersion,
  defaultFormat,
  fontOptions,
  sectionsContent,
  type StoredTemplate,
  type TemplateFormat,
} from '@features/articles';

import { EditorToolbar } from './EditorToolbar';

type TemplateFormProps = {
  onClose: () => void;
  onError: (error: unknown) => void;
  /** `null` ao criar um template novo. */
  template: StoredTemplate | null;
};

const fieldClass =
  'h-9 w-full rounded border border-vince-border bg-white px-2 text-xs text-vince-text focus:border-vince-primary';
const labelClass = 'flex flex-col gap-1 text-[11px] font-semibold text-vince-muted';

/**
 * RF-TPL-001 — Manter template de artigo. O conteúdo inicial é composto no mesmo editor
 * do artigo, e salvar registra uma versão nova, preservando as anteriores.
 */
export function TemplateForm({ onClose, onError, template }: TemplateFormProps) {
  const { formatDateTime } = useFormatters();
  const saveTemplate = useSaveTemplate();
  const readOnly = template !== null && !template.canMaintain;
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [courseId, setCourseId] = useState(template?.courseId ?? '');
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
  const extensions = useMemo(() => createArticleExtensions(), []);
  const editor = useEditor({
    content: template
      ? currentVersion(template).content
      : sectionsContent(['1. Introdução', '2. Desenvolvimento', '3. Conclusão']),
    editable: !readOnly,
    editorProps: {
      attributes: { 'aria-label': 'Conteúdo inicial do template', class: 'article-body' },
    },
    extensions,
  });
  const formatAsTemplate = { ...format, description, id: 'draft', label: title, title };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    saveTemplate.mutate(
      {
        content: editor.getJSON(),
        courseId: courseId || null,
        description,
        format,
        id: template?.id,
        title,
      },
      {
        onError,
        onSuccess: () => {
          toast.success(
            template ? 'Template alterado: versão nova registrada.' : 'Template criado.',
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
  } as React.CSSProperties;

  return (
    <form className="mt-10" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-bold text-vince-primary">
        {template ? (readOnly ? 'Consultar template' : 'Alterar template') : 'Novo template'}
      </h1>
      <p className="mt-2 text-xs text-vince-muted">
        O template é semente: define o documento inicial do artigo e não impõe verificação
        posterior. O que se verifica ao longo do ciclo é a conformidade à norma.
      </p>

      <fieldset className="mt-6 grid gap-4 md:grid-cols-2" disabled={readOnly}>
        <label className={labelClass}>
          Nome *
          <input className={fieldClass} onChange={(e) => setTitle(e.target.value)} value={title} />
        </label>
        <label className={labelClass}>
          Restrição
          <select
            className={fieldClass}
            onChange={(e) => setCourseId(e.target.value)}
            value={courseId}
          >
            <option value="">Toda a instituição</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                Restrito ao curso de {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Descrição
          <input
            className={fieldClass}
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </label>
        <label className={labelClass}>
          Fonte
          <select
            className={fieldClass}
            onChange={(e) => setFormat({ ...format, fontFamily: e.target.value })}
            value={format.fontFamily}
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Tamanho
            <input
              className={fieldClass}
              max={18}
              min={8}
              onChange={(e) => setFormat({ ...format, fontSize: Number(e.target.value) || 12 })}
              type="number"
              value={format.fontSize}
            />
          </label>
          <label className={labelClass}>
            Entrelinha
            <select
              className={fieldClass}
              onChange={(e) => setFormat({ ...format, lineHeight: Number(e.target.value) })}
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
              onChange={(e) =>
                setFormat({ ...format, textAlign: e.target.value as TemplateFormat['textAlign'] })
              }
              value={format.textAlign}
            >
              <option value="justify">Justificado</option>
              <option value="left">À esquerda</option>
            </select>
          </label>
        </div>
      </fieldset>

      <h2 className="mt-8 text-sm font-bold text-vince-text">Conteúdo inicial</h2>
      <p className="mt-1 text-[11px] text-vince-muted">
        Seções e cabeçalhos com que cada artigo do evento nasce — composto no mesmo editor do
        artigo.
      </p>
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
        <div className="max-h-[420px] overflow-y-auto bg-[#f0eeee] p-6">
          <div className="article-page mx-auto" style={{ ...pageStyle, minHeight: 320 }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {template && (
        <>
          <h2 className="mt-8 text-sm font-bold text-vince-text">Versões</h2>
          <ol className="mt-2 space-y-1 text-xs text-vince-muted">
            {[...template.versions].reverse().map((version) => (
              <li key={version.number}>
                Versão {version.number} — {version.createdBy}, {formatDateTime(version.createdAt)}
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button onClick={onClose} size="sm" variant="outline">
          {readOnly ? 'Voltar' : 'Cancelar'}
        </Button>
        {!readOnly && (
          <Button disabled={saveTemplate.isPending} size="sm" type="submit">
            {template ? 'Salvar como nova versão' : 'Criar template'}
          </Button>
        )}
      </div>
    </form>
  );
}
