import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { JSONContent } from '@tiptap/core';
import * as Dialog from '@radix-ui/react-dialog';
import { EditorContent, useEditor, useEditorState as useTiptapState } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { currentArticle } from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { downloadBlob } from '@shared/lib/download';
import { Button, EmptyState, LockIcon, Notice } from '@shared/ui';

import {
  useCollabSession,
  useEditorState,
  useExportData,
  usePersistDocument,
  useReferences,
  useRegisterCheckpoint,
  useSetMargins,
} from '../api/hooks';
import { useArticleTemplate } from '@features/articles';
import { InfoDialog, ImageUrlDialog, LinkDialog, TableDialog } from '../components/Dialogs';
import { EditorIcon } from '../components/EditorIcons';
import { EditorToolbar } from '../components/EditorToolbar';
import { EditorTopBar, type TopBarActions } from '../components/EditorTopBar';
import { HistoryPanel } from '../components/HistoryPanel';
import { ImportDialog } from '../components/ImportDialog';
import { MenuItem } from '../components/Menu';
import { ReferencesPanel } from '../components/ReferencesPanel';
import { StructureSidebar } from '../components/StructureSidebar';
import { encodeState, listPresent, type Collaborator, type CollabSession } from '../lib/collab';
import { exportDocx } from '../lib/exportDocx';
import { applyNorm, hasChanges } from '../lib/norm';
import { createCitationResolver, withoutCover } from '../model/document';
import { abntNorm, coverDefaults, sameMargins, type EditorState } from '../model/editor';
import { createArticleExtensions, refreshCitations } from '../model/extensions';
import { exportHtml, exportText } from '../model/exporters';
import { useActor, type Actor } from '../model/identity';
import { sortReferences, type Reference } from '../model/references';
import { blankTemplate } from '@features/articles';

import '../article-editor.css';

type DialogName = 'link' | 'imageUrl' | 'table' | 'help' | 'count' | null;
type Panel = 'references' | 'history' | null;
type SaveState = { at?: string; code?: string; status: 'saved' | 'saving' | 'error' };

const PAGE_HEIGHT = 1123;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const AUTOSAVE_MS = 800;

const shortcuts: [string, string][] = [
  ['Negrito / Itálico / Sublinhado', 'Ctrl+B / I / U'],
  ['Desfazer / Refazer', 'Ctrl+Z / Ctrl+Shift+Z'],
  ['Inserir link', 'Ctrl+K'],
  ['Salvar versão', 'Ctrl+S'],
  ['Imprimir / PDF', 'Ctrl+P'],
  ['Aumentar / diminuir recuo', 'Tab / Shift+Tab'],
  ['Título 1, 2 ou 3', 'Ctrl+Alt+1, 2 ou 3'],
  ['Lista com marcadores', 'Ctrl+Shift+8'],
  ['Lista numerada', 'Ctrl+Shift+7'],
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('A imagem excede 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function EditorLoading({ failed = false, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  return (
    <main className="min-h-dvh bg-vince-surface px-4 py-8 sm:px-6">
      <a
        className="inline-flex min-h-11 items-center text-sm font-semibold text-vince-primary hover:underline"
        href="/admin/artigos"
      >
        ← Voltar aos artigos
      </a>
      <div
        className="mx-auto mt-6 max-w-3xl rounded-lg border border-vince-border bg-white p-6 sm:p-10"
        role={failed ? 'alert' : 'status'}
      >
        <h1 className="text-2xl font-extrabold text-vince-text">
          {failed ? 'Não foi possível abrir o artigo' : 'Carregando artigo…'}
        </h1>
        <p className="mt-3 text-base leading-7 text-vince-muted">
          {failed
            ? 'Tente novamente para recuperar o documento.'
            : 'Preparando o documento e suas referências.'}
        </p>
        {failed && onRetry && (
          <Button className="mt-5" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    </main>
  );
}

/** RF-EDT-001 a 008 — Edição do artigo. */
export function ArticleEditorPage() {
  const { t } = useTranslation('editor');
  const actor = useActor();
  const state = useEditorState();
  const references = useReferences();

  // Ator sem vínculo com a equipe não alcança o artigo (RF-EDT-001 E3).
  if (state.isError) {
    return (
      <div className="min-h-screen bg-vince-surface px-6 py-10">
        <a className="font-semibold text-vince-primary hover:underline" href="/admin/artigos">
          ← Voltar aos artigos
        </a>
        <div className="mt-8">
          <EmptyState
            description={t('page.noAccessBody')}
            icon={<LockIcon className="h-8 w-8" />}
            title={t('page.noAccessTitle')}
          />
        </div>
      </div>
    );
  }

  if (references.isError) {
    return <EditorLoading failed onRetry={() => void references.refetch()} />;
  }

  if (!state.data || !references.data) {
    return <EditorLoading />;
  }

  // Só integrante da equipe edita, e fora da correção; nos demais casos, leitura.
  return state.data.editable ? (
    <LiveEditor actor={actor} key={actor.id} references={references.data} state={state.data} />
  ) : (
    <ReadOnlyEditor actor={actor} references={references.data} state={state.data} />
  );
}

type EditorProps = { actor: Actor; references: Reference[]; state: EditorState };

function LiveEditor(props: EditorProps) {
  const { error, opened, retry } = useCollabSession(props.actor.id);

  if (error) return <EditorLoading failed onRetry={retry} />;

  return opened ? (
    <Workspace {...props} isNew={opened.isNew} seed={opened.seed} session={opened.session} />
  ) : (
    <EditorLoading />
  );
}

function ReadOnlyEditor(props: EditorProps) {
  const exported = useExportData();

  if (exported.isError) return <EditorLoading failed onRetry={() => void exported.refetch()} />;

  return exported.data ? <Workspace {...props} seed={exported.data.content} /> : <EditorLoading />;
}

type WorkspaceProps = EditorProps & { isNew?: boolean; seed: JSONContent; session?: CollabSession };

function Workspace({ actor, isNew = false, references, seed, session, state }: WorkspaceProps) {
  const { t } = useTranslation('editor');
  const { compareText, formatDateTime } = useFormatters();
  const persistDocument = usePersistDocument();
  const registerCheckpoint = useRegisterCheckpoint();
  const setMargins = useSetMargins();
  const canEdit = state.editable && session !== undefined;
  const title = currentArticle.title;
  const articleTemplate = useArticleTemplate();
  const template = articleTemplate.data?.template ?? blankTemplate;
  const templateVersion = articleTemplate.data?.version;
  const [save, setSave] = useState<SaveState>({ status: 'saved' });
  const [present, setPresent] = useState<Collaborator[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [importing, setImporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [spellcheck, setSpellcheck] = useState(true);
  const [showStructure, setShowStructure] = useState(true);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [pages, setPages] = useState(1);

  const fileInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const referencesRef = useRef(references);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const insertImageFile = useCallback(
    async (file: File, view?: import('@tiptap/pm/view').EditorView) => {
      try {
        const src = await readFileAsDataUrl(file);
        if (view) {
          const node = view.state.schema.nodes.image!.create({ src, alt: file.name });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        } else {
          editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha ao inserir a imagem.');
      }
    },
    [],
  );

  const extensions = useMemo(
    () =>
      createArticleExtensions(session ? { collaboration: { session, user: actor } } : undefined),
    // A identidade do ator é fixa durante a sessão: trocá-la remonta o editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session],
  );

  const editor = useEditor(
    {
      editable: canEdit,
      extensions,
      // Em edição simultânea o conteúdo vem do documento colaborativo.
      content: session ? undefined : seed,
      editorProps: {
        attributes: {
          class: 'article-body',
          spellcheck: 'true',
          'aria-label': 'Corpo do artigo',
          tabindex: '0',
        },
        handlePaste: (view, event) => {
          const file = [...(event.clipboardData?.files ?? [])].find((f) =>
            f.type.startsWith('image/'),
          );
          if (!file || !view.editable) return false;
          void insertImageFile(file, view);
          return true;
        },
        handleDrop: (view, event) => {
          const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
            f.type.startsWith('image/'),
          );
          if (!file || !view.editable) return false;
          event.preventDefault();
          void insertImageFile(file, view);
          return true;
        },
      },
      onBeforeCreate: ({ editor: created }) => {
        created.storage.citation.resolve = createCitationResolver(referencesRef.current);
      },
    },
    [extensions],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const stats = useTiptapState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || e.isDestroyed) return { words: 0, chars: 0, sections: 0 };
      let sections = 0;
      e.state.doc.descendants((n) => {
        if (n.type.name === 'heading' && n.attrs.level === 2) sections += 1;
      });
      return {
        words: e.storage.characterCount.words(),
        chars: e.storage.characterCount.characters(),
        sections,
      };
    },
  });

  const seeded = useRef(false);
  const persistRef = useRef(persistDocument.mutate);

  useEffect(() => {
    persistRef.current = persistDocument.mutate;
  });

  // Preservação contínua, sem ação de salvar (RF-EDT-001 RN3), e edição simultânea (RF-EDT-002).
  useEffect(() => {
    if (!session || !editor || editor.isDestroyed) return;

    let timer: number | undefined;

    const saveNow = () => {
      timer = undefined;
      if (editor.isDestroyed) return;
      persistRef.current(
        { snapshot: editor.getJSON(), ydoc: encodeState(session.doc) },
        {
          onError: (error) => setSave({ code: getErrorCode(error), status: 'error' }),
          onSuccess: () => setSave({ at: new Date().toISOString(), status: 'saved' }),
        },
      );
    };

    // Quem abre o artigo primeiro parte do conteúdo corrente e o preserva de imediato.
    if (isNew && !seeded.current) {
      seeded.current = true;
      editor.commands.setContent(seed);
      saveNow();
    }

    const stopListening = session.onLocalChange(() => {
      setSave({ status: 'saving' });
      window.clearTimeout(timer);
      timer = window.setTimeout(saveNow, AUTOSAVE_MS);
    });

    return () => {
      stopListening();

      // Nada do que foi digitado se perde ao sair da tela.
      if (timer !== undefined) {
        window.clearTimeout(timer);
        saveNow();
      }
    };
  }, [editor, isNew, seed, session]);

  // Em modo de leitura, o texto acompanha o que a equipe preserva.
  useEffect(() => {
    if (!session && editor && !editor.isDestroyed) {
      editor.commands.setContent(seed);
    }
  }, [editor, seed, session]);

  useEffect(() => {
    if (!session) return;

    const update = () => setPresent(listPresent(session.awareness));

    update();
    session.awareness.on('change', update);

    return () => session.awareness.off('change', update);
  }, [session]);

  // A citação é vínculo: mudou a referência, mudam as suas chamadas no texto (RF-EDT-004 RN1).
  useEffect(() => {
    referencesRef.current = references;

    if (editor && !editor.isDestroyed) {
      const resolve = createCitationResolver(references);

      editor.storage.citation.resolve = resolve;
      refreshCitations(editor.view.dom, resolve);
    }
  }, [editor, references]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.view.dom.setAttribute('spellcheck', String(spellcheck));
    }
  }, [editor, spellcheck]);

  // Número de páginas A4 estimado pela altura do conteúdo.
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setPages(Math.max(1, Math.ceil(el.offsetHeight / PAGE_HEIGHT))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor]);

  // O atalho vindo da correção leva ao trecho apontado.
  useEffect(() => {
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'center' });
    }
  }, [editor]);

  const saveVersion = useCallback(() => {
    if (!canEdit || !editor) return;
    registerCheckpoint.mutate(
      { content: editor.getJSON(), kind: 'manual' },
      {
        onError: () => toast.error(t('errors.UNKNOWN')),
        onSuccess: () => toast.success('Versão salva.'),
      },
    );
  }, [canEdit, editor, registerCheckpoint, t]);

  const openLink = useCallback(() => setDialog('link'), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key === 's') {
        e.preventDefault();
        saveVersion();
      } else if (e.key === 'k' && canEdit) {
        e.preventDefault();
        openLink();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, saveVersion, openLink]);

  const marginsOffNorm = !sameMargins(state.margins, abntNorm.margins);

  // RF-EDT-005 — Formatação da norma, por ação explícita, ao trecho ou ao documento.
  const handleApplyNorm = useCallback(() => {
    if (!editor || !canEdit) return;

    const scope = editor.state.selection.empty ? 'document' : 'selection';
    const report = applyNorm(editor, scope, template);
    const fixMargins = scope === 'document' && marginsOffNorm;

    if (fixMargins) {
      setMargins.mutate(abntNorm.margins);
    }

    if (!hasChanges(report) && !fixMargins) {
      toast.info(t('norm.none'));
      return;
    }

    toast.success(t(scope === 'document' ? 'norm.appliedDocument' : 'norm.appliedSelection'), {
      description: [
        report.alignment > 0 && t('norm.alignment', { count: report.alignment }),
        report.lineSpacing > 0 && t('norm.lineSpacing', { count: report.lineSpacing }),
        report.font > 0 && t('norm.font', { count: report.font }),
        fixMargins && t('norm.margins'),
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }, [canEdit, editor, marginsOffNorm, setMargins, t, template]);

  // RF-EDT-007 — O .docx sai com a formatação da norma e a lista de referências gerada.
  const handleExportDocx = useCallback(async () => {
    if (!editor) return;

    try {
      const sorted = sortReferences(references, compareText);
      const blob = await exportDocx({
        content: withoutCover(editor.getJSON()),
        cover: {
          ...coverDefaults,
          advisor: t('preview.advisor', { name: currentArticle.advisor.name }),
          authors: currentArticle.members.map((member) => member.name),
          title,
        },
        references: sorted,
        referencesTitle: t('preview.references'),
        resolveCitation: createCitationResolver(references),
      });

      downloadBlob(blob, `${title}.docx`);
    } catch {
      toast.error(t('errors.UNKNOWN'));
    }
  }, [compareText, editor, references, t, title]);

  const actions: TopBarActions = useMemo(
    () => ({
      importDocx: () => setImporting(true),
      openReferences: () => setPanel('references'),
      applyNorm: handleApplyNorm,
      preview: () => window.location.assign('/artigos/visualizar'),
      saveVersion,
      print: () => window.print(),
      exportWord: () => void handleExportDocx(),
      exportHtml: () => editor && exportHtml(title, editor.getHTML(), template),
      exportText: () => editor && exportText(title, editor.getText({ blockSeparator: '\n\n' })),
      pickImage: () => fileInput.current?.click(),
      imageByUrl: () => setDialog('imageUrl'),
      openTable: () => setDialog('table'),
      openLink,
      showWordCount: () => setDialog('count'),
      showHistory: () => setPanel('history'),
      share: () => {
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => toast.success('Link copiado para a área de transferência.'))
          .catch(() => toast.error('Não foi possível copiar o link.'));
      },
      toggleSpellcheck: () => setSpellcheck((v) => !v),
      toggleStructure: () => setShowStructure((v) => !v),
      setZoom,
    }),
    [editor, handleApplyNorm, handleExportDocx, openLink, saveVersion, template, title],
  );

  const settingsMenu = (
    <>
      <MenuItem checked={spellcheck} onSelect={() => setSpellcheck((v) => !v)}>
        Verificação ortográfica
      </MenuItem>
      <MenuItem checked={showStructure} onSelect={() => setShowStructure((v) => !v)}>
        Painel de estrutura
      </MenuItem>
    </>
  );

  if (!editor || editor.isDestroyed) return <EditorLoading />;

  const saveLabel = !canEdit
    ? t('save.readOnly')
    : save.status === 'saving'
      ? t('save.saving')
      : save.status === 'error'
        ? t('save.error', {
            reason: t(`errors.${save.code}`, { defaultValue: t('errors.UNKNOWN') }),
          })
        : save.at
          ? t('save.savedAt', { date: formatDateTime(save.at) })
          : t('save.saved');

  const pageStyle = {
    '--article-font': template.fontFamily,
    '--article-size': `${template.fontSize}pt`,
    '--article-line': template.lineHeight,
    '--article-align': template.textAlign,
    '--editor-zoom': zoom / 100,
    '--page-padding': `${state.margins.top}cm ${state.margins.right}cm ${state.margins.bottom}cm ${state.margins.left}cm`,
  } as React.CSSProperties;

  const presence = (
    <ul aria-label={t('presence.label')} className="flex -space-x-1.5">
      {(present.length > 0 ? present : [actor]).map((person) => (
        <li
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-[9px] font-bold text-white"
          key={person.id}
          style={{ backgroundColor: person.color }}
          title={
            person.id === actor.id
              ? t('presence.you', { name: person.name })
              : t('presence.editing', { name: person.name })
          }
        >
          {person.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-white text-vince-text lg:h-dvh print:block print:h-auto print:min-w-0">
      <EditorTopBar
        actions={actions}
        canEdit={canEdit}
        editor={editor}
        presence={presence}
        saveLabel={saveLabel}
        settingsMenu={settingsMenu}
        showStructure={showStructure}
        spellcheck={spellcheck}
        status={t(`status.${state.status}`)}
        team={currentArticle.team}
        title={title}
        zoom={zoom}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vince-border bg-white px-4 py-2 sm:px-5 print:hidden">
        <p className="flex min-w-0 items-center gap-2 text-sm text-vince-muted">
          <EditorIcon className="h-3.5 w-3.5" name="page" />
          {template.label}
          {templateVersion ? ` · versão ${templateVersion}, definida na criação do evento` : ''}
        </p>
        <a
          className="inline-flex min-h-11 shrink-0 items-center rounded border border-vince-primary px-3 py-2 text-sm font-medium text-vince-primary hover:bg-vince-tertiary"
          href="/artigos/modelo"
        >
          Modelo do evento
        </a>
      </div>

      {canEdit ? (
        <EditorToolbar
          editor={editor}
          insert={{
            pickImage: actions.pickImage,
            imageByUrl: actions.imageByUrl,
            openTable: actions.openTable,
            openLink,
          }}
          template={template}
        />
      ) : (
        <Notice
          className="rounded-none border-x-0 border-t-0 print:hidden"
          icon={<LockIcon className="h-5 w-5" />}
          tone="warning"
        >
          {t(`lock.${state.lockCode ?? 'READ_ONLY_ROLE'}`)}
        </Notice>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row print:block">
        {showStructure && (
          <StructureSidebar
            editor={editor}
            onOpenHelp={() => setDialog('help')}
            settingsMenu={settingsMenu}
          />
        )}

        <main
          aria-label="Documento do artigo"
          className="min-w-0 flex-1 bg-[#f0eeee] px-3 py-5 sm:px-6 sm:py-8 lg:overflow-auto print:overflow-visible print:bg-white print:p-0"
          onMouseDown={(e) => {
            // Clicar na "mesa" fora da folha leva o cursor ao fim do documento.
            if (e.target === e.currentTarget && canEdit) {
              e.preventDefault();
              editor.commands.focus('end');
            }
          }}
        >
          <div className="editor-document mx-auto" style={pageStyle}>
            <div className="article-page" ref={pageRef}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>
      </div>

      <Dialog.Root onOpenChange={(open) => !open && setPanel(null)} open={panel !== null}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 print:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-vince-border bg-vince-surface shadow-xl print:hidden"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              editor.view.dom.focus();
            }}
          >
            <div className="flex items-center justify-between border-b border-vince-border bg-white px-4 py-2">
              <Dialog.Title className="text-lg font-extrabold text-vince-text">
                {t(`panels.${panel ?? 'references'}`)}
              </Dialog.Title>
              <Dialog.Close
                aria-label={t('panels.close')}
                className="inline-flex h-11 w-11 items-center justify-center rounded text-2xl text-vince-muted hover:bg-vince-tertiary"
                type="button"
              >
                ×
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Consulte as referências ou versões do artigo. Feche o painel para voltar ao documento.
            </Dialog.Description>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {panel === 'references' ? (
                <ReferencesPanel editable={canEdit} editor={editor} references={references} />
              ) : (
                <HistoryPanel editable={canEdit} editor={editor} references={references} />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-vince-border bg-white px-4 py-3 text-xs text-vince-muted sm:px-5 print:hidden">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Palavras: {stats.words.toLocaleString('pt-BR')}</span>
          <span>Páginas: {pages}</span>
          <span>Seções: {stats.sections}</span>
          <span>{t('statusBar.references', { count: references.length })}</span>
          <span className={marginsOffNorm ? 'font-semibold text-[#7a5415]' : undefined}>
            {t('statusBar.margins', state.margins)}
          </span>
        </p>
        <span>{saveLabel}</span>
      </footer>

      <input
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImageFile(file);
          e.target.value = '';
        }}
        ref={fileInput}
        type="file"
      />

      <LinkDialog
        initialUrl={(editor.getAttributes('link').href as string | undefined) ?? ''}
        onClose={() => setDialog(null)}
        onSubmit={(url) => {
          const c = editor.chain().focus().extendMarkRange('link');
          if (url)
            c.setLink({ href: /^(https?:|mailto:|#)/i.test(url) ? url : `https://${url}` }).run();
          else c.unsetLink().run();
          setDialog(null);
        }}
        open={dialog === 'link'}
      />
      <ImageUrlDialog
        onClose={() => setDialog(null)}
        onSubmit={(src) => {
          editor.chain().focus().setImage({ src }).run();
          setDialog(null);
        }}
        open={dialog === 'imageUrl'}
      />
      <TableDialog
        onClose={() => setDialog(null)}
        onSubmit={(rows, cols) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
          setDialog(null);
        }}
        open={dialog === 'table'}
      />

      <InfoDialog
        onClose={() => setDialog(null)}
        open={dialog === 'count'}
        title="Contagem de palavras"
      >
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-vince-muted">Palavras</dt>
          <dd className="text-right font-semibold">{stats.words.toLocaleString('pt-BR')}</dd>
          <dt className="text-vince-muted">Caracteres</dt>
          <dd className="text-right font-semibold">{stats.chars.toLocaleString('pt-BR')}</dd>
          <dt className="text-vince-muted">Páginas (A4)</dt>
          <dd className="text-right font-semibold">{pages}</dd>
          <dt className="text-vince-muted">Seções</dt>
          <dd className="text-right font-semibold">{stats.sections}</dd>
        </dl>
      </InfoDialog>

      <InfoDialog
        onClose={() => setDialog(null)}
        open={dialog === 'help'}
        title="Atalhos de teclado"
      >
        <dl className="space-y-2">
          {shortcuts.map(([name, keys]) => (
            <div className="flex justify-between gap-4" key={name}>
              <dt className="text-vince-muted">{name}</dt>
              <dd className="font-medium">{keys}</dd>
            </div>
          ))}
        </dl>
      </InfoDialog>

      {canEdit && <ImportDialog editor={editor} onOpenChange={setImporting} open={importing} />}
    </div>
  );
}
