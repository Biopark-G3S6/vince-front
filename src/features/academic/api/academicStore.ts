import { useCallback, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createMockCollection } from '@shared/api/mockDb';

import {
  academicEvents,
  articles,
  classGroups,
  courses,
  eligibleStudents,
  eventEvaluators,
  teams,
} from '../model/academic';

type AcademicData = {
  academicEvents: typeof academicEvents;
  articles: typeof articles;
  classGroups: typeof classGroups;
  courses: typeof courses;
  eligibleStudents: typeof eligibleStudents;
  eventEvaluators: typeof eventEvaluators;
  pendingInvitations: Array<{ student: string; teamId: string }>;
  registeredStudents: Record<string, string[]>;
  teams: typeof teams;
};

const seedAcademicData = (): AcademicData =>
  structuredClone({
    academicEvents,
    articles,
    classGroups,
    courses,
    eligibleStudents,
    eventEvaluators,
    teams,
    pendingInvitations: [],
    registeredStudents: {},
  });

const store = createMockCollection<AcademicData>('academic-management', seedAcademicData);

function normalizeAcademicData(data: AcademicData): AcademicData {
  const seed = seedAcademicData();
  return {
    ...seed,
    ...data,
    eventEvaluators: data.eventEvaluators ?? seed.eventEvaluators,
    pendingInvitations: data.pendingInvitations ?? [],
    registeredStudents: data.registeredStudents ?? {},
  };
}

export const readAcademicData = () => normalizeAcademicData(store.read());

export function useAcademicData() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['academic-management'],
    queryFn: readAcademicData,
    initialData: readAcademicData,
    staleTime: Infinity,
  });
  const update = useCallback(
    (mutate: (draft: AcademicData) => void) => {
      queryClient.setQueryData(
        ['academic-management'],
        normalizeAcademicData(
          store.update((draft) => {
            Object.assign(draft, normalizeAcademicData(draft));
            mutate(draft);
          }),
        ),
      );
    },
    [queryClient],
  );
  return { data, update };
}

export function useAcademicCollection<Key extends keyof AcademicData>(key: Key) {
  const { data, update } = useAcademicData();
  const setCollection = useCallback(
    (next: SetStateAction<AcademicData[Key]>) => {
      update((draft) => {
        draft[key] =
          typeof next === 'function'
            ? (next as (current: AcademicData[Key]) => AcademicData[Key])(draft[key])
            : next;
      });
    },
    [key, update],
  );
  return [data[key], setCollection] as const;
}
