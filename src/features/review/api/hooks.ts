import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';

import type { RemarkDecision } from '../model/review';

import {
  concludeArticle,
  createRemark,
  decideRemark,
  deliverMilestone,
  getReviewCycle,
  replyToRemark,
  returnArticle,
  setRemarkAddressed,
  undoDelivery,
  updateRemark,
  type CreateRemarkInput,
} from './reviewApi';

export function useReviewCycle() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => getReviewCycle(user.id),
    queryKey: ['review', 'cycle', user.id],
    retry: false,
  });
}

/**
 * Toda ação do ciclo altera dado de servidor e gera notificação; as consultas
 * afetadas são invalidadas (ADR-0015 §14).
 */
function useReviewMutation<Input>(mutationFn: (actorId: string, input: Input) => Promise<unknown>) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => mutationFn(user.id, input),
    onSuccess: () =>
      Promise.all(
        ['review', 'assistance', 'discussion', 'notifications'].map((scope) =>
          queryClient.invalidateQueries({ queryKey: [scope] }),
        ),
      ),
  });
}

export const useDeliverMilestone = () => useReviewMutation<void>(deliverMilestone);

export const useUndoDelivery = () => useReviewMutation<void>(undoDelivery);

export const useReturnArticle = () => useReviewMutation<void>(returnArticle);

export const useConcludeArticle = () => useReviewMutation<void>(concludeArticle);

export const useCreateRemark = () => useReviewMutation<CreateRemarkInput>(createRemark);

export const useUpdateRemark = () =>
  useReviewMutation<{ remarkId: string; text: string }>((actorId, { remarkId, text }) =>
    updateRemark(actorId, remarkId, text),
  );

export const useSetRemarkAddressed = () =>
  useReviewMutation<{ addressed: boolean; remarkId: string }>((actorId, { addressed, remarkId }) =>
    setRemarkAddressed(actorId, remarkId, addressed),
  );

export const useDecideRemark = () =>
  useReviewMutation<{ decision: RemarkDecision; remarkId: string }>(
    (actorId, { decision, remarkId }) => decideRemark(actorId, remarkId, decision),
  );

export const useReplyToRemark = () =>
  useReviewMutation<{ body: string; remarkId: string }>((actorId, { body, remarkId }) =>
    replyToRemark(actorId, remarkId, body),
  );
