import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';

import {
  getAuthorshipSignals,
  getChangeSummary,
  getConsent,
  runComplianceCheck,
  runSimilarityCheck,
  setConsent,
} from './assistanceApi';

export function useConsent() {
  return useQuery({ queryFn: getConsent, queryKey: ['assistance', 'consent'] });
}

export function useSetConsent() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (active: boolean) => setConsent(user.id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assistance'] }),
  });
}

export function useChangeSummary() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => getChangeSummary(user.id),
    queryKey: ['assistance', 'summary', user.id],
    retry: false,
  });
}

export function useAuthorshipSignals() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => getAuthorshipSignals(user.id),
    queryKey: ['assistance', 'authorship', user.id],
    retry: false,
  });
}

/** A verificação é acionada pelo ator; o resultado é o retorno da própria chamada. */
export function useComplianceCheck() {
  const user = useCurrentUser();

  return useMutation({ mutationFn: () => runComplianceCheck(user.id) });
}

export function useSimilarityCheck() {
  const user = useCurrentUser();

  return useMutation({ mutationFn: () => runSimilarityCheck(user.id) });
}
