/**
 * Erro de API identificado por código (ADR-0025). A interface traduz o código no
 * cliente; a API não devolve texto destinado à exibição (ADR-0026 §13, §14).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly meta: Record<string, unknown>;

  constructor(code: string, meta: Record<string, unknown> = {}) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.meta = meta;
  }
}

export function getErrorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : 'UNKNOWN';
}
