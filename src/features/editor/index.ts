import { lazy } from 'react';

export { getArticleReferences } from './api/editorApi';
export { citationAuthors, referenceToText } from './model/references';

// Consumidores dos utilitários do editor não precisam carregar a interface Tiptap.
export const ArticleEditorPage = lazy(async () => ({
  default: (await import('./pages/ArticleEditorPage')).ArticleEditorPage,
}));
export const ChooseTemplatePage = lazy(async () => ({
  default: (await import('./pages/ChooseTemplatePage')).ChooseTemplatePage,
}));
export const PreviewPage = lazy(async () => ({
  default: (await import('./pages/PreviewPage')).PreviewPage,
}));
