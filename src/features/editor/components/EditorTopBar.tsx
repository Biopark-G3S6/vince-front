import { useState } from 'react';

import type { Editor } from '@tiptap/react';

import { EditorIcon } from './EditorIcons';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from './Menu';

export type TopBarActions = {
  importDocx: () => void;
  openReferences: () => void;
  applyNorm: () => void;
  preview: () => void;
  saveVersion: () => void;
  print: () => void;
  exportWord: () => void;
  exportHtml: () => void;
  exportText: () => void;
  pickImage: () => void;
  imageByUrl: () => void;
  openTable: () => void;
  openLink: () => void;
  showWordCount: () => void;
  showHistory: () => void;
  share: () => void;
  toggleSpellcheck: () => void;
  toggleStructure: () => void;
  setZoom: (zoom: number) => void;
};

type MenuName = 'File' | 'Edit' | 'Insert' | 'Review' | 'View';
const menuNames: MenuName[] = ['File', 'Edit', 'Insert', 'Review', 'View'];
const menuLabels: Record<MenuName, string> = {
  File: 'Arquivo',
  Edit: 'Editar',
  Insert: 'Inserir',
  Review: 'Revisão',
  View: 'Exibir',
};
const zoomLevels = [50, 75, 100, 125, 150];

export function EditorTopBar({
  editor,
  title,
  status,
  team,
  canEdit,
  presence,
  saveLabel,
  zoom,
  spellcheck,
  showStructure,
  actions,
  settingsMenu,
}: {
  editor: Editor;
  title: string;
  /** Situação do artigo, definida pelo ciclo de correção. */
  status: string;
  team: string;
  /** Só integrante da equipe edita, e fora da correção (RF-EDT-001). */
  canEdit: boolean;
  presence: React.ReactNode;
  saveLabel: string;
  zoom: number;
  spellcheck: boolean;
  showStructure: boolean;
  actions: TopBarActions;
  settingsMenu: React.ReactNode;
}) {
  const [active, setActive] = useState<MenuName>('Review');
  const chain = () => editor.chain().focus();

  const items: Record<MenuName, React.ReactNode> = {
    File: (
      <>
        <MenuItem disabled={!canEdit} onSelect={actions.importDocx}>
          Importar documento (.docx)…
        </MenuItem>
        <MenuItem onSelect={actions.preview}>Visualizar artigo</MenuItem>
        <MenuItem disabled={!canEdit} onSelect={actions.saveVersion} shortcut="Ctrl+S">
          Salvar versão
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Exportar</MenuLabel>
        <MenuItem onSelect={actions.print}>PDF / Imprimir…</MenuItem>
        <MenuItem onSelect={actions.exportWord}>Documento Word (.docx)</MenuItem>
        <MenuItem onSelect={actions.exportHtml}>Página web (.html)</MenuItem>
        <MenuItem onSelect={actions.exportText}>Texto simples (.txt)</MenuItem>
      </>
    ),
    Edit: (
      <>
        <MenuItem
          onSelect={() => chain().undo().run()}
          shortcut="Ctrl+Z"
          disabled={!editor.can().undo()}
        >
          Desfazer
        </MenuItem>
        <MenuItem
          onSelect={() => chain().redo().run()}
          shortcut="Ctrl+Shift+Z"
          disabled={!editor.can().redo()}
        >
          Refazer
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => chain().selectAll().run()} shortcut="Ctrl+A">
          Selecionar tudo
        </MenuItem>
        <MenuItem onSelect={() => chain().unsetAllMarks().clearNodes().run()}>
          Limpar formatação
        </MenuItem>
      </>
    ),
    Insert: (
      <>
        <MenuItem onSelect={actions.pickImage}>Imagem do computador…</MenuItem>
        <MenuItem onSelect={actions.imageByUrl}>Imagem por endereço…</MenuItem>
        <MenuItem onSelect={actions.openTable}>Tabela…</MenuItem>
        <MenuItem onSelect={actions.openReferences}>Citação de referência…</MenuItem>
        <MenuItem onSelect={actions.openLink} shortcut="Ctrl+K">
          Link…
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => chain().toggleBlockquote().run()}>Citação</MenuItem>
        <MenuItem onSelect={() => chain().toggleCodeBlock().run()}>Bloco de código</MenuItem>
        <MenuItem onSelect={() => chain().setHorizontalRule().run()}>Linha horizontal</MenuItem>
        <MenuItem onSelect={() => chain().toggleSuperscript().run()}>Sobrescrito</MenuItem>
        <MenuItem onSelect={() => chain().toggleSubscript().run()}>Subscrito</MenuItem>
      </>
    ),
    Review: (
      <>
        <MenuItem onSelect={actions.showWordCount}>Contagem de palavras</MenuItem>
        <MenuItem checked={spellcheck} onSelect={actions.toggleSpellcheck}>
          Verificação ortográfica
        </MenuItem>
        <MenuItem onSelect={actions.showHistory}>Histórico de versões</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={actions.openReferences}>Referências bibliográficas</MenuItem>
        <MenuItem disabled={!canEdit} onSelect={actions.applyNorm}>
          Aplicar formatação ABNT
        </MenuItem>
      </>
    ),
    View: (
      <>
        <MenuLabel>Zoom</MenuLabel>
        {zoomLevels.map((z) => (
          <MenuItem checked={zoom === z} key={z} onSelect={() => actions.setZoom(z)}>
            {z}%
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem checked={showStructure} onSelect={actions.toggleStructure}>
          Painel de estrutura
        </MenuItem>
      </>
    ),
  };

  return (
    <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-vince-border bg-white px-3 py-3 sm:px-5 print:hidden">
      <a
        aria-label="Voltar"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary"
        href="/admin/artigos"
      >
        <EditorIcon className="h-4 w-4" name="arrowLeft" />
      </a>

      <div className="min-w-0 flex-1 basis-[220px] leading-tight">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words px-1 text-base font-bold text-vince-primary">
            {title}
          </h1>
          <span className="rounded-full bg-vince-primary px-2.5 py-1 text-xs font-medium text-white">
            {status}
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 px-1 text-xs text-vince-muted">
          {team} <span>•</span>
          <EditorIcon className="h-3 w-3" name="cloud" /> {saveLabel}
        </p>
      </div>

      <nav
        aria-label="Menu do editor"
        className="order-last flex w-full items-center gap-1 overflow-x-auto text-sm xl:order-none xl:w-auto"
      >
        {menuNames
          .filter((name) => canEdit || (name !== 'Edit' && name !== 'Insert'))
          .map((name) => (
            <Menu key={name} onOpenChange={(open) => open && setActive(name)}>
              <MenuTrigger asChild>
                <button
                  className={
                    active === name
                      ? 'min-h-11 shrink-0 border-b-2 border-vince-primary px-3 py-2 font-bold text-vince-primary'
                      : 'min-h-11 shrink-0 px-3 py-2 text-vince-muted hover:text-vince-primary'
                  }
                  type="button"
                >
                  {menuLabels[name]}
                </button>
              </MenuTrigger>
              <MenuContent>{items[name]}</MenuContent>
            </Menu>
          ))}
      </nav>

      <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
        <button
          aria-label="Histórico de versões"
          className="inline-flex h-11 w-11 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary hover:text-vince-primary"
          onClick={actions.showHistory}
          type="button"
        >
          <EditorIcon className="h-4 w-4" name="history" />
        </button>
        <button
          className="min-h-11 rounded px-2 text-sm text-vince-muted hover:bg-vince-tertiary hover:text-vince-primary"
          onClick={actions.share}
          type="button"
        >
          Compartilhar
        </button>
        <Menu>
          <MenuTrigger asChild>
            <button
              className="min-h-11 rounded bg-vince-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#571424]"
              type="button"
            >
              Exportar
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={actions.print}>PDF / Imprimir…</MenuItem>
            <MenuItem onSelect={actions.exportWord}>Documento Word (.docx)</MenuItem>
            <MenuItem onSelect={actions.exportHtml}>Página web (.html)</MenuItem>
            <MenuItem onSelect={actions.exportText}>Texto simples (.txt)</MenuItem>
          </MenuContent>
        </Menu>
        {presence}
        <Menu>
          <MenuTrigger asChild>
            <button
              aria-label="Configurações"
              className="inline-flex h-11 w-11 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary hover:text-vince-primary"
              type="button"
            >
              <EditorIcon className="h-4 w-4" name="settings" />
            </button>
          </MenuTrigger>
          <MenuContent align="end">{settingsMenu}</MenuContent>
        </Menu>
      </div>
    </header>
  );
}
