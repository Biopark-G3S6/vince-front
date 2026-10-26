import type { ReactNode } from 'react';

import { useEditorState, type Editor } from '@tiptap/react';

import { cn } from '@shared/lib/cn';
import type { ArticleTemplate } from '@features/articles';
import { EditorIcon, type EditorIconName } from './EditorIcons';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './Menu';

export type InsertActions = {
  pickImage: () => void;
  imageByUrl: () => void;
  openTable: () => void;
  openLink: () => void;
};

const fonts = [
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

const spacings = ['1', '1.15', '1.5', '2'];
const MIN_SIZE = 6;
const MAX_SIZE = 96;

function fontLabel(value: string | null, fallback: string) {
  const match = fonts.find((f) => f.value === (value ?? fallback));
  return match?.label ?? (value ?? fallback).split(',')[0]!.replace(/"/g, '');
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 min-w-11 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary disabled:opacity-35 disabled:hover:bg-transparent',
        active && 'bg-vince-primary text-white hover:bg-vince-primary',
      )}
      disabled={disabled}
      // Mantém a seleção do editor ao clicar nos botões.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({
  icon,
  ...rest
}: {
  icon: EditorIconName;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ToolButton {...rest}>
      <EditorIcon className="h-3.5 w-3.5" name={icon} />
    </ToolButton>
  );
}

function SelectButton({ label, width }: { label: string; width?: string }) {
  return (
    <MenuTrigger asChild>
      <button
        className={cn(
          'flex h-11 items-center justify-between gap-2 rounded bg-vince-tertiary px-3 text-sm text-vince-text',
          width,
        )}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <span className="truncate">{label}</span>
        <span className="text-[8px]">▾</span>
      </button>
    </MenuTrigger>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-l border-vince-border pl-2">
      {children}
    </div>
  );
}

export function EditorToolbar({
  editor,
  template,
  insert,
}: {
  editor: Editor;
  template: ArticleTemplate;
  insert: InsertActions;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const style = e.getAttributes('textStyle') as {
        fontFamily?: string;
        fontSize?: string;
        color?: string;
      };
      const block = e.isActive('heading')
        ? e.getAttributes('heading')
        : e.getAttributes('paragraph');
      return {
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        highlight: e.isActive('highlight'),
        link: e.isActive('link'),
        quote: e.isActive('blockquote'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        inTable: e.isActive('table'),
        align:
          (['left', 'center', 'right', 'justify'] as const).find((a) =>
            e.isActive({ textAlign: a }),
          ) ?? null,
        block: e.isActive('heading', { level: 1 })
          ? 'Título 1'
          : e.isActive('heading', { level: 2 })
            ? 'Título 2'
            : e.isActive('heading', { level: 3 })
              ? 'Título 3'
              : e.isActive('blockquote')
                ? 'Citação'
                : e.isActive('codeBlock')
                  ? 'Código'
                  : 'Texto Normal',
        fontFamily: style.fontFamily ?? null,
        fontSize: style.fontSize ? parseFloat(style.fontSize) : null,
        color: style.color ?? '#222222',
        spacing: (block.lineSpacing as string | null) ?? null,
      };
    },
  });

  const chain = () => editor.chain().focus();
  const size = s.fontSize ?? template.fontSize;
  const setSize = (n: number) => {
    const next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n) || template.fontSize));
    chain().setFontSize(`${next}pt`).run();
  };

  const alignments: {
    value: 'left' | 'center' | 'right' | 'justify';
    icon: EditorIconName;
    label: string;
  }[] = [
    { value: 'left', icon: 'alignLeft', label: 'Alinhar à esquerda' },
    { value: 'center', icon: 'alignCenter', label: 'Centralizar' },
    { value: 'right', icon: 'alignRight', label: 'Alinhar à direita' },
    { value: 'justify', icon: 'alignJustify', label: 'Justificar' },
  ];

  return (
    <div
      aria-label="Formatação do artigo"
      className="flex max-w-full flex-nowrap items-center gap-x-2 gap-y-1 overflow-x-auto border-b border-vince-border bg-white px-3 py-2 lg:flex-wrap lg:px-5 [&>*]:shrink-0 print:hidden"
    >
      <div className="flex gap-1">
        <IconButton
          disabled={!s.canUndo}
          icon="undo"
          label="Desfazer (Ctrl+Z)"
          onClick={() => chain().undo().run()}
        />
        <IconButton
          disabled={!s.canRedo}
          icon="redo"
          label="Refazer (Ctrl+Shift+Z)"
          onClick={() => chain().redo().run()}
        />
      </div>

      <Menu>
        <SelectButton label={s.block} width="w-[136px]" />
        <MenuContent>
          <MenuItem
            checked={s.block === 'Texto Normal'}
            onSelect={() => chain().setParagraph().run()}
          >
            Texto Normal
          </MenuItem>
          {([1, 2, 3] as const).map((level) => (
            <MenuItem
              checked={s.block === `Título ${level}`}
              key={level}
              onSelect={() => chain().setHeading({ level }).run()}
              shortcut={`Ctrl+Alt+${level}`}
            >
              Título {level}
            </MenuItem>
          ))}
          <MenuItem
            checked={s.block === 'Citação'}
            onSelect={() => chain().toggleBlockquote().run()}
          >
            Citação
          </MenuItem>
          <MenuItem checked={s.block === 'Código'} onSelect={() => chain().toggleCodeBlock().run()}>
            Bloco de código
          </MenuItem>
        </MenuContent>
      </Menu>

      <Menu>
        <SelectButton label={fontLabel(s.fontFamily, template.fontFamily)} width="w-[136px]" />
        <MenuContent>
          <MenuItem onSelect={() => chain().unsetFontFamily().run()}>Padrão do modelo</MenuItem>
          <MenuSeparator />
          {fonts.map((f) => (
            <MenuItem
              checked={s.fontFamily === f.value}
              key={f.label}
              onSelect={() => chain().setFontFamily(f.value).run()}
            >
              <span style={{ fontFamily: f.value }}>{f.label}</span>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>

      <div className="flex h-11 items-center rounded bg-vince-tertiary text-sm">
        <button
          aria-label="Diminuir fonte"
          className="inline-flex h-11 w-9 items-center justify-center"
          onClick={() => setSize(size - 1)}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <EditorIcon className="h-3 w-3" name="minus" />
        </button>
        <input
          aria-label="Tamanho da fonte"
          className="h-11 w-9 bg-transparent text-center outline-none"
          key={size}
          defaultValue={size}
          onBlur={(e) => setSize(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setSize(Number(e.currentTarget.value));
            }
          }}
        />
        <button
          aria-label="Aumentar fonte"
          className="inline-flex h-11 w-9 items-center justify-center"
          onClick={() => setSize(size + 1)}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <EditorIcon className="h-3 w-3" name="plus" />
        </button>
      </div>

      <Group>
        <ToolButton
          active={s.bold}
          label="Negrito (Ctrl+B)"
          onClick={() => chain().toggleBold().run()}
        >
          <span className="text-xs font-bold">B</span>
        </ToolButton>
        <ToolButton
          active={s.italic}
          label="Itálico (Ctrl+I)"
          onClick={() => chain().toggleItalic().run()}
        >
          <span className="font-serif text-xs italic">I</span>
        </ToolButton>
        <ToolButton
          active={s.underline}
          label="Sublinhado (Ctrl+U)"
          onClick={() => chain().toggleUnderline().run()}
        >
          <span className="text-xs underline">U</span>
        </ToolButton>
        <ToolButton active={s.strike} label="Tachado" onClick={() => chain().toggleStrike().run()}>
          <span className="text-xs line-through">S</span>
        </ToolButton>
        <label
          className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded hover:bg-vince-tertiary"
          title="Cor do texto"
        >
          <span className="text-xs font-bold" style={{ color: s.color }}>
            A
          </span>
          <span
            className="absolute bottom-[3px] h-[2px] w-3 rounded"
            style={{ background: s.color }}
          />
          <input
            aria-label="Cor do texto"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => chain().setColor(e.target.value).run()}
            type="color"
            value={s.color.startsWith('#') && s.color.length === 7 ? s.color : '#222222'}
          />
        </label>
        <IconButton
          active={s.highlight}
          icon="bookmark"
          label="Realçar texto"
          onClick={() => chain().toggleHighlight().run()}
        />
      </Group>

      <Group>
        {alignments.map((a) => (
          <IconButton
            active={s.align === a.value}
            icon={a.icon}
            key={a.value}
            label={a.label}
            onClick={() => chain().setTextAlign(a.value).run()}
          />
        ))}
      </Group>

      <Group>
        <IconButton
          active={s.bullet}
          icon="listBullet"
          label="Lista com marcadores"
          onClick={() => chain().toggleBulletList().run()}
        />
        <IconButton
          active={s.ordered}
          icon="listNumber"
          label="Lista numerada"
          onClick={() => chain().toggleOrderedList().run()}
        />
        <IconButton
          icon="outdent"
          label="Diminuir recuo (Shift+Tab)"
          onClick={() =>
            editor.isActive('listItem')
              ? chain().liftListItem('listItem').run()
              : chain().decreaseIndent().run()
          }
        />
        <IconButton
          icon="indent"
          label="Aumentar recuo (Tab)"
          onClick={() =>
            editor.isActive('listItem')
              ? chain().sinkListItem('listItem').run()
              : chain().increaseIndent().run()
          }
        />
        <Menu>
          <MenuTrigger asChild>
            <button
              aria-label="Espaçamento entre linhas"
              className="inline-flex h-11 w-11 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary"
              onMouseDown={(e) => e.preventDefault()}
              title="Espaçamento entre linhas"
              type="button"
            >
              <EditorIcon className="h-3.5 w-3.5" name="lineHeight" />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              checked={s.spacing === null}
              onSelect={() => chain().setLineSpacing(null).run()}
            >
              Padrão do modelo
            </MenuItem>
            {spacings.map((v) => (
              <MenuItem
                checked={s.spacing === v}
                key={v}
                onSelect={() => chain().setLineSpacing(v).run()}
              >
                {v.replace('.', ',')}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </Group>

      <Group>
        <Menu>
          <MenuTrigger asChild>
            <button
              aria-label="Inserir imagem"
              className="inline-flex h-11 w-11 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary"
              onMouseDown={(e) => e.preventDefault()}
              title="Inserir imagem"
              type="button"
            >
              <EditorIcon className="h-3.5 w-3.5" name="image" />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={insert.pickImage}>Do computador…</MenuItem>
            <MenuItem onSelect={insert.imageByUrl}>Por endereço (URL)…</MenuItem>
          </MenuContent>
        </Menu>
        <IconButton icon="table" label="Inserir tabela" onClick={insert.openTable} />
        <IconButton active={s.link} icon="link" label="Link (Ctrl+K)" onClick={insert.openLink} />
        <IconButton
          active={s.quote}
          icon="quote"
          label="Citação"
          onClick={() => chain().toggleBlockquote().run()}
        />
      </Group>

      {s.inTable && (
        <Group>
          <Menu>
            <SelectButton label="Tabela" width="w-[70px]" />
            <MenuContent>
              <MenuItem onSelect={() => chain().addRowBefore().run()}>Inserir linha acima</MenuItem>
              <MenuItem onSelect={() => chain().addRowAfter().run()}>Inserir linha abaixo</MenuItem>
              <MenuItem onSelect={() => chain().addColumnBefore().run()}>
                Inserir coluna à esquerda
              </MenuItem>
              <MenuItem onSelect={() => chain().addColumnAfter().run()}>
                Inserir coluna à direita
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => chain().deleteRow().run()}>Excluir linha</MenuItem>
              <MenuItem onSelect={() => chain().deleteColumn().run()}>Excluir coluna</MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => chain().mergeOrSplit().run()}>
                Mesclar / dividir células
              </MenuItem>
              <MenuItem onSelect={() => chain().toggleHeaderRow().run()}>
                Linha de cabeçalho
              </MenuItem>
              <MenuItem onSelect={() => chain().deleteTable().run()}>Excluir tabela</MenuItem>
            </MenuContent>
          </Menu>
        </Group>
      )}
    </div>
  );
}
