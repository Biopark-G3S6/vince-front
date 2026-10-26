import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetMockDb } from '@shared/api/mockDb';

import { courses } from '../model/academic';

import { readAcademicData, useAcademicCollection } from './academicStore';

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}
beforeEach(() => {
  localStorage.clear();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  queryClient.clear();
});

describe('academic demonstration persistence', () => {
  it('preserves edits after remounting and keeps independent collections', () => {
    const courseHook = renderHook(() => useAcademicCollection('courses'), { wrapper });
    const teamHook = renderHook(() => useAcademicCollection('teams'), { wrapper });
    act(() => {
      courseHook.result.current[1]((current) =>
        current.map((course, index) =>
          index === 0 ? { ...course, name: 'Curso atualizado' } : course,
        ),
      );
      teamHook.result.current[1]((current) =>
        current.map((team, index) =>
          index === 0 ? { ...team, responsibleAdvisor: 'Dra. Helena Torres' } : team,
        ),
      );
    });
    expect(readAcademicData().courses[0]?.name).toBe('Curso atualizado');
    expect(readAcademicData().teams[0]?.responsibleAdvisor).toBe('Dra. Helena Torres');
    courseHook.unmount();
    const restored = renderHook(() => useAcademicCollection('courses'), { wrapper });
    expect(restored.result.current[0][0]?.name).toBe('Curso atualizado');
  });

  it('restores the seed when the app invalidates queries after resetting the demonstration', async () => {
    const hook = renderHook(() => useAcademicCollection('courses'), { wrapper });
    act(() =>
      hook.result.current[1]((current) => {
        current[0]!.name = 'Alterado';
        return current;
      }),
    );
    expect(courses[0]?.name).toBe('Administração');
    await act(async () => {
      resetMockDb();
      await queryClient.invalidateQueries();
    });
    await waitFor(() => expect(hook.result.current[0][0]?.name).toBe('Administração'));
  });

  it('recovers the seed if the stored JSON is malformed', () => {
    localStorage.setItem('vinceart.mock.v1.academic-management', '{invalid');
    expect(readAcademicData().courses[0]?.name).toBe('Administração');
  });
});
