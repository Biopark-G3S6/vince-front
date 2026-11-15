import { ApiError } from './apiError';
import type { components } from './schema';

/**
 * Cliente HTTP da API (ADR-0017, ADR-0025).
 *
 * - Sob a mesma origem: em desenvolvimento o Vite faz proxy de `/api`, de modo que o cookie
 *   de sessão (HttpOnly, `Path=/api/v1`) trafega sem CORS (ADR-0013 §8, ADR-0017 §9).
 * - `credentials: 'include'` em toda requisição; a sessão nunca é guardada no cliente.
 * - Mutação leva o token anti-CSRF lido do cookie `vince_csrf` em `X-CSRF-Token`.
 * - O envelope `{ data, status, pagination?, errors? }` é desembrulhado aqui; a falha vira
 *   `ApiError` com o código estável, que a interface traduz (ADR-0026 §13).
 * - 401 encerra a sessão no cliente; 403 não (ADR-0017 §16, §17).
 */

export const API_PREFIX = '/api/v1';
const CSRF_COOKIE = 'vince_csrf';

/** Os tipos de corpo gerados do OpenAPI (`pnpm run api:types`). */
export type Schema<K extends keyof components['schemas']> = components['schemas'][K];

export type Pagination = {
  page: number;
  pageSize: number;
  hasNext: boolean;
  totalItems?: number;
  totalPages?: number;
};

export type PageResult<T> = { items: T[]; pagination: Pagination };

type Envelope<T> = {
  data: T;
  status: { code: string; severity: string };
  pagination?: Pagination;
  errors?: { field: string; code: string; meta?: Record<string, unknown> }[];
};

type Query = Record<string, string | number | boolean | readonly string[] | null | undefined>;

let onUnauthorized: (() => void) | null = null;

/** Registrado pela aplicação: o que fazer quando a sessão deixa de valer (401). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

function toSearch(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

function correlationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function send<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Query; silent401?: boolean } = {},
): Promise<{ data: T; pagination?: Pagination }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-Id': correlationId(),
  };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  if (method !== 'GET') {
    const token = readCookie(CSRF_COOKIE);
    if (token) headers['X-CSRF-Token'] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}${toSearch(options.query)}`, {
      method,
      credentials: 'include',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }

  if (response.status === 204) return { data: undefined as T };

  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok) {
    if (response.status === 401 && !options.silent401) onUnauthorized?.();
    throw new ApiError(envelope?.status?.code ?? `HTTP_${response.status}`, {
      httpStatus: response.status,
      errors: envelope?.errors ?? [],
    });
  }

  return { data: (envelope?.data ?? null) as T, pagination: envelope?.pagination };
}

export const http = {
  get: async <T>(path: string, query?: Query, options: { silent401?: boolean } = {}) =>
    (await send<T>('GET', path, { query, ...options })).data,
  page: async <T>(path: string, query?: Query): Promise<PageResult<T>> => {
    const result = await send<T[]>('GET', path, { query });
    return {
      items: result.data ?? [],
      pagination: result.pagination ?? { page: 1, pageSize: 0, hasNext: false },
    };
  },
  /** Todas as páginas de uma listagem (para seletores e telas pequenas). */
  all: async <T>(path: string, query?: Query): Promise<T[]> => {
    const items: T[] = [];
    for (let page = 1; page <= 50; page += 1) {
      const result = await send<T[]>('GET', path, { query: { ...query, page, pageSize: 100 } });
      items.push(...(result.data ?? []));
      if (!result.pagination?.hasNext) break;
    }
    return items;
  },
  post: async <T>(path: string, body?: unknown, options: { silent401?: boolean } = {}) =>
    (await send<T>('POST', path, { body, ...options })).data,
  put: async <T>(path: string, body?: unknown) => (await send<T>('PUT', path, { body })).data,
  patch: async <T>(path: string, body?: unknown) => (await send<T>('PATCH', path, { body })).data,
  delete: async <T = void>(path: string) => (await send<T>('DELETE', path)).data,
};

/** Os campos inválidos de uma falha de validação (ADR-0025 §16, §17). */
export function fieldErrorsOf(error: unknown): { field: string; code: string }[] {
  if (!(error instanceof ApiError)) return [];
  const errors = error.meta.errors;
  return Array.isArray(errors) ? (errors as { field: string; code: string }[]) : [];
}
