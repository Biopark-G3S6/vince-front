import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compõe classes utilitárias resolvendo conflitos (ADR-0016 §15).
 *
 * `clsx` monta a lista a partir de condicionais; `tailwind-merge` resolve
 * conflitos entre utilitários da mesma família, mantendo o último declarado.
 *
 * Sem isso, `cn('px-2', 'px-4')` produziria as duas classes e o resultado
 * dependeria da ordem no CSS gerado, não da ordem no código.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
