import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetMockDb } from '@shared/api/mockDb';

import { initialInstitutions } from '../model/institution';

import { readInstitutions, useInstitutions } from './institutionStore';

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

describe('institution demonstration persistence', () => {
  it('restores an institution update after remounting the screen', () => {
    const hook = renderHook(useInstitutions, { wrapper });
    act(() =>
      hook.result.current[1]((current) =>
        current.map((institution, index) =>
          index === 0
            ? { ...institution, name: 'Instituição atualizada', status: 'inactive' }
            : institution,
        ),
      ),
    );
    expect(readInstitutions()[0]?.status).toBe('inactive');
    hook.unmount();
    const restored = renderHook(useInstitutions, { wrapper });
    expect(restored.result.current[0][0]?.name).toBe('Instituição atualizada');
  });

  it('resets persisted changes without mutating the original seed', async () => {
    const hook = renderHook(useInstitutions, { wrapper });
    act(() => hook.result.current[1]([]));
    expect(readInstitutions()).toHaveLength(0);
    await act(async () => {
      resetMockDb();
      await queryClient.invalidateQueries();
    });
    await waitFor(() => expect(hook.result.current[0]).toHaveLength(initialInstitutions.length));
  });
});
