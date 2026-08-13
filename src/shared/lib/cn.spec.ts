import { describe, expect, it } from 'vitest';

import { cn } from './cn';

// Testes residem junto do código que exercitam (ADR-0024 §17).

describe('cn', () => {
  it('concatena classes', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('resolve conflito entre utilitários da mesma família, mantendo o último', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('descarta valores condicionais falsos', () => {
    const oculto = false;
    expect(cn('flex', oculto && 'hidden', undefined, null)).toBe('flex');
  });

  it('aceita objeto de condicionais', () => {
    expect(cn('flex', { hidden: false, 'gap-2': true })).toBe('flex gap-2');
  });

  it('preserva utilitários de famílias distintas', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });
});
