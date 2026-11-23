import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';
import { isBackendEnabled } from '@shared/api/client';

import {
  canReadArticle,
  createArticle,
  createTeam,
  getArticleTemplate,
  listArticles,
  listEvents,
} from './registryApi';

export function useArticleTemplate() {
  return useQuery({ queryFn: getArticleTemplate, queryKey: ['registry', 'article-template'] });
}

export function useArticles() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: async () => {
      const articles = await listArticles(user.role);
      return isBackendEnabled()
        ? articles
        : articles.filter((article) => canReadArticle(user.id, article));
    },
    enabled: !isBackendEnabled() || user.permissions?.includes('ARTICLE:READ') === true,
    queryKey: ['registry', 'articles', user.id],
  });
}

/** Eventos cadastrados e as suas equipes — o que a tela de eventos e a de equipes listam. */
export function useEventDirectory() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: async () => ({
      articles: isBackendEnabled()
        ? user.permissions?.includes('ARTICLE:READ')
          ? await listArticles(user.role)
          : []
        : (await listArticles()).filter((article) => canReadArticle(user.id, article)),
      events: await listEvents(user.id),
    }),
    queryKey: ['registry', 'directory', user.id],
    retry: false,
  });
}

function useRegistryMutation<Input, Output>(
  mutationFn: (actorId: string, input: Input) => Promise<Output>,
) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => mutationFn(user.id, input),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const useCreateTeam = () => useRegistryMutation(createTeam);

export const useCreateArticle = () => useRegistryMutation(createArticle);
