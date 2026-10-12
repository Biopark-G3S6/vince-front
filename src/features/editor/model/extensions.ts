import { Extension, mergeAttributes, Node, type CommandProps, type Extensions } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';

import { createId } from '@shared/api/mockDb';

import type { Collaborator, CollabSession } from '../lib/collab';

import type { CitationResolver } from './document';

export const INDENT_STEP_CM = 1.25;
const MAX_INDENT = 8;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setLineSpacing: (value: string | null) => ReturnType;
    };
  }
}

/** Recuo (passos de 1,25 cm) e espaçamento entre linhas por bloco, como no Word. */
const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Math.round((parseFloat(el.style.marginLeft) || 0) / INDENT_STEP_CM),
            renderHTML: (attrs) =>
              attrs.indent ? { style: `margin-left: ${attrs.indent * INDENT_STEP_CM}cm` } : {},
          },
          lineSpacing: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineSpacing ? { style: `line-height: ${attrs.lineSpacing}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    const change = (delta: number) => () => (props: CommandProps) => {
      const { state, tr, dispatch } = props;
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const next = Math.min(MAX_INDENT, Math.max(0, (node.attrs.indent ?? 0) + delta));
        if (next !== node.attrs.indent) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
          changed = true;
        }
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };

    return {
      increaseIndent: change(1),
      decreaseIndent: change(-1),
      setLineSpacing:
        (value: string | null) =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { lineSpacing: value }) &&
          commands.updateAttributes('heading', { lineSpacing: value }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) =>
        editor.isActive('listItem')
          ? editor.commands.sinkListItem('listItem')
          : editor.isActive('table')
            ? false
            : editor.commands.increaseIndent(),
      'Shift-Tab': ({ editor }) =>
        editor.isActive('listItem')
          ? editor.commands.liftListItem('listItem')
          : editor.isActive('table')
            ? false
            : editor.commands.decreaseIndent(),
    };
  },
});

type CitationStorage = { resolve: CitationResolver };

declare module '@tiptap/core' {
  interface Storage {
    citation: CitationStorage;
  }
}

/**
 * Citação de referência registrada (RF-EDT-004). O nó guarda o vínculo — a referência
 * e a página —, nunca o texto: a chamada é recalculada a partir do registro.
 */
const Citation = Node.create<Record<string, never>, CitationStorage>({
  name: 'citation',
  atom: true,
  group: 'inline',
  inline: true,
  selectable: true,

  addStorage() {
    return { resolve: () => '(?)' };
  },

  addAttributes() {
    return {
      page: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-page') ?? '',
        renderHTML: (attributes) => ({ 'data-page': attributes.page as string }),
      },
      referenceId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-reference-id') ?? '',
        renderHTML: (attributes) => ({ 'data-reference-id': attributes.referenceId as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'citation', 'data-citation': '' }),
      (this.editor?.storage.citation.resolve ?? this.storage.resolve)(
        node.attrs.referenceId as string,
        node.attrs.page as string,
      ),
    ];
  },

  renderText({ node }) {
    return (this.editor?.storage.citation.resolve ?? this.storage.resolve)(
      node.attrs.referenceId as string,
      node.attrs.page as string,
    );
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');

      dom.className = 'citation';
      dom.dataset.citation = '';
      dom.dataset.referenceId = node.attrs.referenceId as string;
      dom.dataset.page = node.attrs.page as string;
      dom.textContent = this.editor.storage.citation.resolve(
        node.attrs.referenceId as string,
        node.attrs.page as string,
      );

      // O texto da chamada é atualizado de fora, quando a referência muda.
      return { dom, ignoreMutation: () => true };
    };
  },
});

/** Reapresenta as citações depois que as referências mudam (RF-EDT-004 RN1). */
export function refreshCitations(root: HTMLElement, resolve: CitationResolver) {
  root.querySelectorAll<HTMLElement>('span[data-citation]').forEach((element) => {
    element.textContent = resolve(element.dataset.referenceId ?? '', element.dataset.page ?? '');
  });
}

const IDENTIFIED_BLOCKS = [
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'table',
];

/**
 * Identidade estável dos blocos. É pela identidade do bloco
 * que o apontamento se ancora e que as versões são comparadas (RF-EDT-001 RN4).
 */
const BlockIdentity = Extension.create({
  name: 'blockIdentity',

  addGlobalAttributes() {
    return [
      {
        attributes: {
          blockId: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) =>
              attributes.blockId
                ? {
                    'data-block-id': attributes.blockId as string,
                    id: `bloco-${attributes.blockId as string}`,
                  }
                : {},
          },
        },
        types: IDENTIFIED_BLOCKS,
      },
    ];
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('blockIdentity'),
        appendTransaction: (transactions, _oldState, state) => {
          if (!editor.isEditable || !transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const seen = new Set<string>();
          const transaction = state.tr;

          state.doc.forEach((node, offset) => {
            if (!IDENTIFIED_BLOCKS.includes(node.type.name)) {
              return;
            }

            const blockId = node.attrs.blockId as string | null;

            // Bloco novo, ou cópia surgida ao dividir ou colar: recebe identidade própria.
            if (!blockId || seen.has(blockId)) {
              transaction.setNodeAttribute(offset, 'blockId', createId('block'));
            } else {
              seen.add(blockId);
            }
          });

          return transaction.docChanged ? transaction : null;
        },
      }),
    ];
  },
});

type ExtensionOptions = {
  collaboration?: { session: CollabSession; user: Collaborator };
};

/** Extensões do editor do artigo — as mesmas para o artigo e para o template. */
export function createArticleExtensions({ collaboration }: ExtensionOptions = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      // Com edição simultânea, desfazer e refazer são os do documento colaborativo.
      undoRedo: collaboration ? false : {},
    }),
    TextStyleKit.configure({ lineHeight: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight,
    Subscript,
    Superscript,
    Image.configure({ allowBase64: true }),
    TableKit.configure({ table: { resizable: true } }),
    Placeholder.configure({ placeholder: 'Comece a escrever…' }),
    CharacterCount,
    Indent,
    BlockIdentity,
    Citation,
    ...(collaboration
      ? [
          Collaboration.configure({ document: collaboration.session.doc }),
          CollaborationCaret.configure({
            provider: collaboration.session.provider,
            user: collaboration.user,
          }),
        ]
      : []),
  ];
}
