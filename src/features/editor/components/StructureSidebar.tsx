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
    <aside className="flex w-[212px] shrink-0 flex-col border-r border-vince-border bg-[#faf6f6] print:hidden">
      <div className="px-3 pb-3 pt-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <EditorIcon className="h-4 w-4" name="list" /> Structure
        </h2>
        <p className="mt-1 text-[10px] text-vince-muted">Manuscript v1.2</p>
        {editor.isEditable && (
          <button
            className="mt-3 h-7 w-full rounded border border-vince-primary bg-white text-[11px] font-medium text-vince-primary hover:bg-vince-tertiary"
            onClick={addSection}
            type="button"
          >
            + Add Section
          </button>
        )}
      </div>

      <nav
        aria-label="Estrutura do artigo"
        className="min-h-0 flex-1 overflow-y-auto border-t border-vince-border py-3"
      >
        {headings.length === 0 && (
          <p className="px-3 text-[11px] text-vince-muted">
            Use estilos de título para montar a estrutura.
          </p>
        )}
        {headings.map((h) => (
          <button
            className={cn(
              'flex min-h-[26px] w-full items-center gap-3 px-3 text-left text-[11px] text-vince-muted hover:bg-vince-tertiary',
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

      <div className="space-y-1 border-t border-vince-border px-2 py-3 text-[11px] text-vince-muted">
        <Menu>
          <MenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 rounded px-2 py-1.5 hover:bg-vince-tertiary"
              type="button"
            >
              <EditorIcon className="h-4 w-4" name="settings" /> Settings
            </button>
          </MenuTrigger>
          <MenuContent>{settingsMenu}</MenuContent>
        </Menu>
        <button
          className="flex w-full items-center gap-3 rounded px-2 py-1.5 hover:bg-vince-tertiary"
          onClick={onOpenHelp}
          type="button"
        >
          <EditorIcon className="h-4 w-4" name="help" /> Help
        </button>
      </div>
    </aside>
  );
}
