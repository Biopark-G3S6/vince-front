/// <reference types="vite/client" />
import i18n, { type BackendModule, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Mecanismo de tradução do frontend (ADR-0026 §28 a §30, RF-INT-001).
 *
 * - Os catálogos residem em `locales/<idioma>/<namespace>.json` e são carregados sob
 *   demanda por namespace (§29). Acrescentar idioma é trabalho de catálogo (§4).
 * - Chave ausente recai no idioma padrão; ausente também nele, exibe a própria chave
 *   e registra aviso (§11).
 */

export const DEFAULT_LANGUAGE = 'pt-BR';

export type LanguageOption = {
  code: string;
  /** Nome do idioma no próprio idioma; não é traduzido. */
  nativeName: string;
  /** Catálogo parcial, exposto apenas em desenvolvimento para exercitar a troca. */
  preview?: boolean;
};

const languages: LanguageOption[] = [
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
  { code: 'en-US', nativeName: 'English (United States)', preview: true },
];

/** O português do Brasil é o único idioma publicado no lançamento (RF-INT-001 RN1). */
export const supportedLanguages = languages.filter(
  (language) => !language.preview || import.meta.env.DEV,
);

const STORAGE_KEY = 'vinceart.language';

const catalogs = import.meta.glob<{ default: ResourceKey }>('./locales/*/*.json');

const lazyCatalogBackend: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, namespace, callback) {
    const load = catalogs[`./locales/${language}/${namespace}.json`];

    if (!load) {
      // Catálogo inexistente neste idioma: o recuo para o idioma padrão resolve.
      callback(null, {});
      return;
    }

    load().then(
      (module) => callback(null, module.default),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null),
    );
  },
};

export function isSupportedLanguage(code: string) {
  return supportedLanguages.some((language) => language.code === code);
}

/**
 * Preferência salva; na ausência, o idioma do navegador; sem correspondência, o
 * padrão (ADR-0026 §26).
 */
export function resolveInitialLanguage(
  stored: string | null,
  browserLanguages: readonly string[],
): string {
  if (stored && isSupportedLanguage(stored)) {
    return stored;
  }

  for (const candidate of browserLanguages) {
    const exact = supportedLanguages.find((language) => language.code === candidate);
    const sameBase = supportedLanguages.find(
      (language) => language.code.split('-')[0] === candidate.split('-')[0],
    );
    const match = exact ?? sameBase;

    if (match) {
      return match.code;
    }
  }

  return DEFAULT_LANGUAGE;
}

function readStoredLanguage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

void i18n
  .use(lazyCatalogBackend)
  .use(initReactI18next)
  .init({
    lng: resolveInitialLanguage(readStoredLanguage(), navigator.languages),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: languages.map((language) => language.code),
    load: 'currentOnly',
    ns: [],
    defaultNS: 'admin',
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: true,
    missingKeyHandler: (_languages, namespace, key) => {
      console.warn(`[i18n] chave sem tradução: ${namespace}:${key}`);
    },
  });

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

/**
 * Troca o idioma sem recarregar a aplicação (ADR-0026 §27) e persiste a preferência.
 *
 * A preferência pertence ao perfil do usuário (§25). Enquanto o endpoint de perfil não
 * é integrado, ela é guardada neste navegador.
 */
export async function changeLanguage(code: string) {
  if (!isSupportedLanguage(code)) {
    throw new Error('LANGUAGE_NOT_SUPPORTED');
  }

  await i18n.changeLanguage(code);

  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Sem armazenamento disponível a troca vale apenas para esta sessão.
  }
}

export { i18n };
