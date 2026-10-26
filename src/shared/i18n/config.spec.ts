import { afterEach, describe, expect, it, vi } from 'vitest';

import { changeLanguage, DEFAULT_LANGUAGE, i18n, resolveInitialLanguage } from './config';
import { createFormatters } from './format';

const catalogs = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

function flattenKeys(value: unknown, prefix = ''): string[] {
  return value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) =>
        flattenKeys(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix];
}

describe('seleção do idioma (RF-INT-001)', () => {
  afterEach(async () => {
    await changeLanguage(DEFAULT_LANGUAGE);
    window.localStorage.clear();
  });

  it('prefere a preferência salva, depois o navegador, depois o padrão', () => {
    expect(resolveInitialLanguage('en-US', ['pt-BR'])).toBe('en-US');
    expect(resolveInitialLanguage(null, ['fr-FR', 'en-GB'])).toBe('en-US');
    expect(resolveInitialLanguage('xx-XX', ['fr-FR'])).toBe(DEFAULT_LANGUAGE);
  });

  it('troca o idioma sem recarregar e persiste a preferência', async () => {
    await i18n.loadNamespaces('admin');
    await changeLanguage('en-US');

    expect(i18n.t('admin:nav.review')).toBe('Review Cycle');
    expect(resolveInitialLanguage(window.localStorage.getItem('vinceart.language'), [])).toBe(
      'en-US',
    );
  });

  it('recai no idioma padrão quando o texto não tem tradução', async () => {
    await i18n.loadNamespaces('admin');
    i18n.addResource('pt-BR', 'admin', 'testFallback', 'Texto disponível apenas em português');
    await changeLanguage('en-US');

    expect(i18n.t('admin:testFallback')).toBe('Texto disponível apenas em português');
  });

  it('exibe a própria chave e registra aviso quando ela não existe em idioma algum', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await i18n.loadNamespaces('admin');

    expect(i18n.t('admin:chave.inexistente')).toBe('chave.inexistente');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('admin:chave.inexistente'));
    warn.mockRestore();
  });

  it('recusa idioma não suportado', async () => {
    await expect(changeLanguage('xx-XX')).rejects.toThrow('LANGUAGE_NOT_SUPPORTED');
  });
});

describe('catálogos de tradução', () => {
  it('não têm chave órfã: toda chave de outro idioma existe no idioma padrão', () => {
    Object.entries(catalogs)
      .filter(([path]) => !path.includes(`/${DEFAULT_LANGUAGE}/`))
      .forEach(([path, catalog]) => {
        const namespace = path.split('/').at(-1);
        const reference = flattenKeys(catalogs[`./locales/${DEFAULT_LANGUAGE}/${namespace}`]);

        expect(reference, path).toEqual(expect.arrayContaining(flattenKeys(catalog)));
      });
  });
});

describe('formatação (ADR-0026 §21)', () => {
  it('segue o idioma selecionado', () => {
    expect(createFormatters('pt-BR').formatNumber(12480.5)).toBe('12.480,5');
    expect(createFormatters('en-US').formatNumber(12480.5)).toBe('12,480.5');
    expect(createFormatters('pt-BR').formatPercent(0.375)).toMatch(/^38\s?%$/);
  });

  it('apresenta o tempo decorrido em relação ao instante informado', () => {
    const now = new Date('2026-10-12T15:00:00.000Z');

    expect(createFormatters('pt-BR').formatRelative('2026-10-09T15:00:00.000Z', now)).toBe(
      'há 3 dias',
    );
  });
});
