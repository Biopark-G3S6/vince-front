import { useQuery } from '@tanstack/react-query';

import { http } from './http';

/** Uma pessoa do diretório (`GET /users`). E-mail e papéis só para quem designa. */
export type DirectoryUser = {
  id: string;
  name: string;
  email?: string;
  active?: boolean;
  roleCodes?: string[];
};

/**
 * Os nomes de um conjunto de usuários, resolvidos em lote: as listagens de equipe, turma,
 * evento e curso trazem apenas `userId` (user-directory).
 */
export function useUserNames(ids: readonly (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))].sort();

  const query = useQuery({
    queryKey: ['directory', 'names', unique],
    queryFn: async () => {
      const names = new Map<string, DirectoryUser>();
      for (let index = 0; index < unique.length; index += 100) {
        const chunk = unique.slice(index, index + 100);
        const page = await http.page<DirectoryUser>('/users', { ids: chunk, pageSize: 100 });
        for (const user of page.items) names.set(user.id, user);
      }
      return names;
    },
    enabled: unique.length > 0,
    staleTime: 60_000,
  });

  const names = query.data ?? new Map<string, DirectoryUser>();

  return {
    ...query,
    nameOf: (id: string | null | undefined, fallback = 'Usuário') =>
      (id ? names.get(id)?.name : undefined) ?? fallback,
    userOf: (id: string | null | undefined) => (id ? names.get(id) : undefined),
  };
}

/** A busca para escolher a pessoa de uma designação (precisa de permissão de designação). */
export function useUserSearch(
  filters: { search?: string; role?: string; institutionId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['directory', 'search', filters],
    queryFn: () =>
      http.page<DirectoryUser>('/users', {
        search: filters.search,
        role: filters.role,
        institutionId: filters.institutionId,
        active: 'true',
        pageSize: 50,
      }),
    enabled,
    staleTime: 15_000,
  });
}
