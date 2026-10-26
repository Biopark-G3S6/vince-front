import { useState } from 'react';

import { useEditorState, type Editor } from '@tiptap/react';

import { cn } from '@shared/lib/cn';
import { EditorIcon, type EditorIconName } from './EditorIcons';
import { Menu, MenuContent, MenuTrigger } from './Menu';

type Heading = { level: number; text: string; pos: number };

function iconFor(text: string, level: number): EditorIconName {
  const t = text.toLowerCase();
  if (level === 1) return 'page';
  if (/resumo|abstract/.test(t)) return 'page';
  if (/metodolog/.test(t)) return 'flask';
  if (/resultado/.test(t)) return 'chart';
  if (/discuss/.test(t)) return 'message';
  if (/conclus/.test(t)) return 'checks';
  return 'list';
}

export function StructureSidebar({
  editor,
  onOpenHelp,
  settingsMenu,
}: {
  editor: Editor;
  onOpenHelp: () => void;
  settingsMenu: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const { headings, activePos } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const list: Heading[] = [];
      e.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          list.push({
            level: node.attrs.level as number,
            text: node.textContent.trim() || 'Sem título',
            pos,
          });
        }
      });
      const from = e.state.selection.from;
      const active = [...list].reverse().find((h) => h.pos <= from);
      return { headings: list, activePos: active?.pos ?? null };
    },
  });

  function goTo(pos: number) {
    editor
      .chain()
      .focus()
      .setTextSelection(pos + 1)
      .scrollIntoView()
      .run();
  }

  function addSection() {
    const end = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(end, [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Nova seção' }] },
        { type: 'paragraph' },
      ])
      .run();
    // Seleciona o título recém-criado para o autor já poder renomeá-lo.
    const last = editor.state.doc.childCount - 2;
    let pos = 0;
    editor.state.doc.forEach((_node, offset, index) => {
      if (index === last) pos = offset;
    });
    editor
      .chain()
      .setTextSelection({ from: pos + 1, to: pos + 1 + 'Nova seção'.length })
      .scrollIntoView()
      .run();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-vince-border bg-[#faf6f6] lg:w-[212px] lg:border-b-0 lg:border-r print:hidden">
      <div className="px-3 pb-3 pt-5">
        <h2 className="hidden items-center gap-2 text-sm font-semibold lg:flex">
          <EditorIcon className="h-4 w-4" name="list" /> Estrutura
        </h2>
        <button
          aria-expanded={expanded}
          aria-controls="article-structure"
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-sm font-semibold text-vince-primary hover:bg-vince-tertiary lg:hidden"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <EditorIcon className="h-4 w-4" name="list" /> Estrutura do artigo
          </span>
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
        {editor.isEditable && (
          <button
            className={cn(
              'mt-3 min-h-11 w-full rounded border border-vince-primary bg-white px-3 py-2 text-sm font-medium text-vince-primary hover:bg-vince-tertiary lg:block',
              !expanded && 'hidden',
            )}
            onClick={addSection}
            type="button"
          >
            + Adicionar seção
          </button>
        )}
      </div>

      <nav
        aria-label="Estrutura do artigo"
        id="article-structure"
        className={cn(
          'min-h-0 flex-1 overflow-y-auto border-t border-vince-border py-3 lg:block',
          !expanded && 'hidden',
        )}
      >
        {headings.length === 0 && (
          <p className="px-3 text-[11px] text-vince-muted">
            Use estilos de título para montar a estrutura.
          </p>
        )}
        {headings.map((h) => (
          <button
            className={cn(
              'flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm text-vince-muted hover:bg-vince-tertiary',
              h.level === 3 && 'pl-6',
              activePos === h.pos &&
                'border-l-2 border-vince-primary bg-[#fadde3] font-medium text-vince-primary',
            )}
            key={h.pos}
            onClick={() => goTo(h.pos)}
            type="button"
          >
            <EditorIcon className="h-3.5 w-3.5 shrink-0" name={iconFor(h.text, h.level)} />
            <span className="truncate">{h.text}</span>
          </button>
        ))}
      </nav>

      <div
        className={cn(
          'space-y-1 border-t border-vince-border px-2 py-3 text-sm text-vince-muted lg:block',
          !expanded && 'hidden',
        )}
      >
        <Menu>
          <MenuTrigger asChild>
            <button
              className="flex min-h-11 w-full items-center gap-3 rounded px-2 py-2 hover:bg-vince-tertiary"
              type="button"
            >
              <EditorIcon className="h-4 w-4" name="settings" /> Configurações
            </button>
          </MenuTrigger>
          <MenuContent>{settingsMenu}</MenuContent>
        </Menu>
        <button
          className="flex min-h-11 w-full items-center gap-3 rounded px-2 py-2 hover:bg-vince-tertiary"
          onClick={onOpenHelp}
          type="button"
        >
          <EditorIcon className="h-4 w-4" name="help" /> Ajuda
        </button>
      </div>
    </aside>
  );
}
