import '@testing-library/jest-dom/vitest';

/**
 * Preparação do ambiente de teste do frontend (ADR-0024).
 *
 * Testes de componente e de integração residem junto do código que exercitam (§17).
 * Testes ponta a ponta ficam sob `e2e/`, fora da porta de verificação (§28).
 */
