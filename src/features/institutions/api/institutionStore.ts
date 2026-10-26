import { useCallback, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createMockCollection } from '@shared/api/mockDb';

import { initialInstitutions, type Institution } from '../model/institution';

const store = createMockCollection<Institution[]>('institutions', () =>
  structuredClone(initialInstitutions),
);
export const readInstitutions = store.read;

export function useInstitutions() {
  const queryClient = useQueryClient();
  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: readInstitutions,
    initialData: readInstitutions,
    staleTime: Infinity,
  });
  const update = useCallback(
    (next: SetStateAction<Institution[]>) => {
      const institutions = store.read();
      const updated = typeof next === 'function' ? next(institutions) : next;
      store.update((draft) => {
        draft.splice(0, draft.length, ...updated);
      });
      queryClient.setQueryData(['institutions'], updated);
    },
    [queryClient],
  );
  return [institutions, update] as const;
}
