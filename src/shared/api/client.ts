import { ApiError } from './apiError';

type ApiEnvelope<T> = {
  data: T;
  status: { code: string; message?: string };
  errors?: Array<{ field?: string; code: string; meta?: Record<string, unknown> }>;
  pagination?: { page: number; pageSize: number; total?: number };
};

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown;
  method?: string;
  retryCsrf?: boolean;
};

const API_PREFIX = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'vince_csrf';

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

export function isBackendEnabled() {
  return import.meta.env.VITE_USE_BACKEND === 'true';
}

export function apiUrl(path: string) {
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

export function requireUuid(value: string, resource = 'ARTICLE_ID_REQUIRED') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(resource);
  }
  return value;
}

function correlationId() {
  return globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';
}

function cookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function notifyUnauthenticated() {
  window.dispatchEvent(new CustomEvent('vince:authentication-failed'));
}

function asApiError(response: Response, payload: ApiEnvelope<unknown> | null, requestId: string) {
  const code = payload?.status?.code ?? 'INTERNAL_ERROR';
  const fieldErrors = payload?.errors ?? [];
  const meta = Object.fromEntries(
    fieldErrors.map((entry) => [entry.field ?? 'form', { code: entry.code, ...entry.meta }]),
  );
  return new ApiError(code, Object.keys(meta).length ? meta : {}, {
    correlationId: response.headers.get('X-Correlation-Id') ?? requestId,
    httpStatus: response.status,
  });
}

async function send<T>(path: string, options: RequestOptions, csrfRetried = false): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const requestId = correlationId();
  const headers = new Headers(options.headers);
  headers.set('X-Correlation-Id', requestId);

  if (options.body !== undefined && !isFormData(options.body)) {
    headers.set('Content-Type', 'application/json');
  }

  if (MUTATING_METHODS.has(method)) {
    const csrf = cookie(CSRF_COOKIE_NAME);
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    body:
      options.body === undefined
        ? undefined
        : isFormData(options.body)
          ? options.body
          : JSON.stringify(options.body),
    credentials: 'include',
    headers,
    method,
  });

  if (response.status === 204) return undefined as T;

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (response.ok) return undefined as T;
  }

  if (!response.ok || payload?.status?.code !== 'SUCCESS') {
    const error = asApiError(response, payload, requestId);
    if (error.httpStatus === 401) notifyUnauthenticated();

    // Uma só recuperação para rotação do segredo CSRF; uma segunda recusa é final.
    if (
      error.httpStatus === 403 &&
      error.code === 'PERMISSION_DENIED' &&
      MUTATING_METHODS.has(method) &&
      !csrfRetried &&
      options.retryCsrf !== false &&
      !path.endsWith('/identity')
    ) {
      await send('/identity', { method: 'GET', retryCsrf: false }, true);
      return send<T>(path, options, true);
    }

    throw error;
  }

  return payload.data;
}

export function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return send<T>(path, options);
}

export async function apiPagedRequest<T>(
  path: string,
  options: RequestOptions = {},
  csrfRetried = false,
) {
  const method = (options.method ?? 'GET').toUpperCase();
  const requestId = correlationId();
  const headers = new Headers(options.headers);
  headers.set('X-Correlation-Id', requestId);
  if (MUTATING_METHODS.has(method)) {
    const csrf = cookie(CSRF_COOKIE_NAME);
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  const response = await fetch(apiUrl(path), {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
    headers,
    method,
  });
  let payload: ApiEnvelope<readonly T[]> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<readonly T[]>;
  } catch {
    // The shared error path below carries the HTTP status and correlation id.
  }
  if (!response.ok || payload?.status?.code !== 'SUCCESS') {
    const error = asApiError(response, payload, requestId);
    if (error.httpStatus === 401) notifyUnauthenticated();
    if (
      error.httpStatus === 403 &&
      error.code === 'PERMISSION_DENIED' &&
      MUTATING_METHODS.has(method) &&
      !csrfRetried &&
      options.retryCsrf !== false &&
      !path.endsWith('/identity')
    ) {
      await send('/identity', { method: 'GET', retryCsrf: false }, true);
      return apiPagedRequest<T>(path, options, true);
    }
    throw error;
  }
  return { data: payload.data, pagination: payload.pagination };
}

export async function apiFileRequest(path: string) {
  const requestId = correlationId();
  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: { 'X-Correlation-Id': requestId },
  });
  if (!response.ok) {
    let payload: ApiEnvelope<unknown> | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<unknown>;
    } catch {
      // Some infrastructure errors do not have a body.
    }
    const error = asApiError(response, payload, requestId);
    if (error.httpStatus === 401) notifyUnauthenticated();
    throw error;
  }
  return {
    body: await response.blob(),
    contentDisposition: response.headers.get('Content-Disposition'),
    contentType: response.headers.get('Content-Type') ?? 'application/octet-stream',
  };
}

export type { ApiEnvelope };
