import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';

/**
 * Sessão de edição simultânea (RF-EDT-002).
 *
 * O documento é um CRDT (Yjs): edições concorrentes sobre o mesmo trecho são combinadas
 * sem perda e sem escolha manual, e não existe bloqueio de trecho. O transporte, que no
 * produto é o servidor de colaboração, é aqui um `BroadcastChannel` — liga as abas do
 * mesmo navegador. A técnica de reconciliação é decisão de engenharia (RN4).
 */

export type Collaborator = { color: string; id: string; name: string };

type Message =
  | { type: 'hello' }
  | { type: 'update'; update: Uint8Array }
  | { type: 'awareness'; update: Uint8Array };

const REMOTE = Symbol('remote');

export function encodeState(doc: Y.Doc) {
  const bytes = Y.encodeStateAsUpdate(doc);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return window.btoa(binary);
}

function decodeState(encoded: string) {
  return Uint8Array.from(window.atob(encoded), (character) => character.charCodeAt(0));
}

export type CollabSession = {
  awareness: Awareness;
  destroy: () => void;
  doc: Y.Doc;
  /** Avisa das alterações feitas nesta aba, para que sejam preservadas. */
  onLocalChange: (listener: () => void) => () => void;
  /** Forma esperada pela extensão de cursores do Tiptap. */
  provider: { awareness: Awareness };
};

export function createCollabSession(room: string, storedState: string | null): CollabSession {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  const channel = new BroadcastChannel(`vinceart.editor.${room}`);
  const localListeners = new Set<() => void>();
  let closed = false;
  const post = (message: Message) => {
    if (!closed) {
      channel.postMessage(message);
    }
  };

  if (storedState) {
    Y.applyUpdate(doc, decodeState(storedState), REMOTE);
  }

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE) {
      post({ type: 'update', update });
      localListeners.forEach((listener) => listener());
    }
  });

  awareness.on(
    'update',
    (changes: { added: number[]; removed: number[]; updated: number[] }, origin: unknown) => {
      if (origin !== REMOTE) {
        post({
          type: 'awareness',
          update: encodeAwarenessUpdate(awareness, [
            ...changes.added,
            ...changes.updated,
            ...changes.removed,
          ]),
        });
      }
    },
  );

  channel.onmessage = (event: MessageEvent<Message>) => {
    const message = event.data;

    if (message.type === 'update') {
      Y.applyUpdate(doc, message.update, REMOTE);
    } else if (message.type === 'awareness') {
      applyAwarenessUpdate(awareness, message.update, REMOTE);
    } else {
      // Quem chega recebe o estado corrente e a presença de quem já está no artigo.
      post({ type: 'update', update: Y.encodeStateAsUpdate(doc) });
      post({
        type: 'awareness',
        update: encodeAwarenessUpdate(awareness, [...awareness.getStates().keys()]),
      });
    }
  };

  post({ type: 'hello' });

  const leave = () => removeAwarenessStates(awareness, [doc.clientID], 'leave');

  window.addEventListener('beforeunload', leave);

  return {
    awareness,
    destroy: () => {
      window.removeEventListener('beforeunload', leave);
      leave();
      closed = true;
      channel.close();
      awareness.destroy();
      doc.destroy();
    },
    doc,
    onLocalChange: (listener) => {
      localListeners.add(listener);
      return () => {
        localListeners.delete(listener);
      };
    },
    provider: { awareness },
  };
}

/** Participantes presentes no artigo, sem repetir quem tem mais de uma aba aberta. */
export function listPresent(awareness: Awareness): Collaborator[] {
  const present = new Map<string, Collaborator>();

  awareness.getStates().forEach((state) => {
    const user = state.user as Collaborator | undefined;

    if (user?.id) {
      present.set(user.id, user);
    }
  });

  return [...present.values()];
}
