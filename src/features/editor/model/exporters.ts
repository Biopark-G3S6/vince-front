import type { ArticleTemplate } from '@features/articles';

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(title: string) {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'artigo'
  );
}

function wrapHtml(title: string, html: string, t: ArticleTemplate, extraHead = '') {
  const escaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaped}</title>${extraHead}<style>body{font-family:${t.fontFamily};font-size:${t.fontSize}pt;line-height:${t.lineHeight};max-width:21cm;margin:2cm auto}p{text-align:${t.textAlign}}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 8px}img{max-width:100%}</style></head><body>${html}</body></html>`;
}

export function exportHtml(title: string, html: string, t: ArticleTemplate) {
  download(wrapHtml(title, html, t), `${slug(title)}.html`, 'text/html;charset=utf-8');
}

/** O Word abre HTML com este cabeçalho como documento editável. */
export function exportWord(title: string, html: string, t: ArticleTemplate) {
  const head = '<xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml>';
  download(wrapHtml(title, html, t, head), `${slug(title)}.doc`, 'application/msword');
}

export function exportText(title: string, text: string) {
  download(text, `${slug(title)}.txt`, 'text/plain;charset=utf-8');
}
