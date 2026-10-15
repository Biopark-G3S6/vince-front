/**
 * Persistência do backend simulado.
 *
 * Enquanto a API real não é integrada, a camada `api/` de cada feature lê e grava
 * coleções aqui. O armazenamento é o `localStorage`: sobrevive à troca de página e é
 * compartilhado entre abas, o que permite exercitar os fluxos entre dois perfis.
 * Nenhuma regra de negócio reside neste arquivo (ADR-0015 §7).
 */

const PREFIX = 'vinceart.mock.v1.';

type Listener = () => void;

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      notify();
    }
  });
}

export type MockCollection<T> = {
  read: () => T;
  update: (mutate: (draft: T) => void) => T;
};

export function createMockCollection<T>(key: string, seed: () => T): MockCollection<T> {
  const storageKey = PREFIX + key;

  function read(): T {
    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        // Conteúdo corrompido: recai na semente.
      }
    }

    return seed();
  }

  function update(mutate: (draft: T) => void): T {
    const draft = read();
    mutate(draft);
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
    return draft;
  }

  return { read, update };
}

/** Avisa quando outra aba altera os dados simulados. */
export function subscribeMockDb(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Descarta todas as coleções e devolve o backend simulado à semente. */
export function resetMockDb() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
  notify();
}

let sequence = 0;

export function createId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}${sequence.toString(36)}`;
}

/** Executa o trabalho de forma assíncrona, como uma chamada de rede faria. */
export function respond<T>(work: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    queueMicrotask(() => {
      try {
        resolve(work());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
