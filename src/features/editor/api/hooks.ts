import { useEffect, useState } from 'react';

import type { JSONContent } from '@tiptap/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { currentArticle } from '@features/articles';

import { createCollabSession, type CollabSession } from '../lib/collab';
import { useActor } from '../model/identity';

import {
  assertCanRestore,
  deleteReference,
  getEditorState,
  getExportData,
  listHistory,
  listReferences,
  loadDocument,
  lookupDoi,
  persistDocument,
  recordImport,
  registerCheckpoint,
  saveReference,
  setMargins,
  type SaveReferenceInput,
} from './editorApi';

/** O rascunho é compartilhado com a correção, a assistência e o acompanhamento. */
const AFFECTED_SCOPES = ['editor', 'review', 'assistance', 'progress'];

function useInvalidate() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all(
      AFFECTED_SCOPES.map((scope) => queryClient.invalidateQueries({ queryKey: [scope] })),
    );
}

export function useEditorState() {
  const actor = useActor();

  return useQuery({
    queryFn: () => getEditorState(actor.id),
    queryKey: ['editor', 'state', actor.id],
    retry: false,
  });
}

/**
 * Abre a sessão de edição simultânea do artigo: carrega o estado preservado e liga esta
 * aba às demais. Enquanto não há sessão, devolve `null`.
 */
export function useCollabSession(actorId: string) {
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [opened, setOpened] = useState<{
    /** Não há estado preservado: esta aba parte do conteúdo corrente do artigo. */
    isNew: boolean;
    seed: JSONContent;
    session: CollabSession;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let session: CollabSession | undefined;
    setError(null);

    void loadDocument(actorId)
      .then((stored) => {
        if (!cancelled) {
          session = createCollabSession(currentArticle.id, stored.ydoc);
          setOpened({ isNew: stored.ydoc === null, seed: stored.seed, session });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason);
      });

    return () => {
      cancelled = true;
      session?.destroy();
      setOpened(null);
    };
  }, [actorId, attempt]);

  return { error, opened, retry: () => setAttempt((current) => current + 1) };
}

export function usePersistDocument() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (document: { snapshot: JSONContent; ydoc: string }) =>
      persistDocument(actor.id, document),
    // Recusado o salvamento — entrega feita em outra aba, por exemplo —, o estado é relido.
    onSettled: invalidate,
  });
}

export function useReferences() {
  const actor = useActor();

  return useQuery({
    queryFn: () => listReferences(actor.id),
    queryKey: ['editor', 'references', actor.id],
  });
}

export function useSaveReference() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (input: SaveReferenceInput) => saveReference(actor.id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteReference() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({
      citedInEditor,
      referenceId,
    }: {
      citedInEditor: string[];
      referenceId: string;
    }) => deleteReference(actor.id, referenceId, citedInEditor),
    onSuccess: invalidate,
  });
}

export function useLookupDoi() {
  return useMutation({ mutationFn: lookupDoi });
}

export function useHistory(enabled: boolean) {
  const actor = useActor();

  return useQuery({
    enabled,
    queryFn: () => listHistory(actor.id),
    queryKey: ['editor', 'history', actor.id],
    retry: false,
  });
}

/** Confere se o artigo aceita a restauração antes de o editor trocar o conteúdo. */
export function useAuthorizeRestore() {
  const actor = useActor();

  return useMutation({ mutationFn: () => assertCanRestore(actor.id) });
}

export function useRegisterCheckpoint() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({
      content,
      kind,
    }: {
      content: JSONContent;
      kind: 'restore' | 'import' | 'manual';
    }) => registerCheckpoint(actor.id, kind, content),
    onSuccess: invalidate,
  });
}

export function useSetMargins() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (margins: Parameters<typeof setMargins>[1]) => setMargins(actor.id, margins),
    onSuccess: invalidate,
  });
}

export function useRecordImport() {
  const actor = useActor();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (file: Parameters<typeof recordImport>[1]) => recordImport(actor.id, file),
    onSuccess: invalidate,
  });
}

export function useExportData() {
  const actor = useActor();

  return useQuery({
    queryFn: () => getExportData(actor.id),
    queryKey: ['editor', 'export', actor.id],
    retry: false,
  });
}
