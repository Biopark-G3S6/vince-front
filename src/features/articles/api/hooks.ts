import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';

import {
  allowedScopes,
  changeEventTemplate,
  createEvent,
  createTeam,
  getArticleTemplate,
  listArticles,
  listEvents,
  listTemplates,
  saveTemplate,
  setTemplateActive,
  type CreateEventInput,
  type SaveTemplateInput,
} from './registryApi';

export function useArticleTemplate() {
  return useQuery({ queryFn: getArticleTemplate, queryKey: ['registry', 'article-template'] });
}

export function useArticles() {
  return useQuery({ queryFn: listArticles, queryKey: ['registry', 'articles'] });
}

/** Eventos cadastrados e as suas equipes — o que a tela de eventos e a de equipes listam. */
export function useEventDirectory() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: async () => ({ articles: await listArticles(), events: await listEvents(user.id) }),
    queryKey: ['registry', 'directory', user.id],
    retry: false,
  });
}

export function useTemplates() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: async () => ({
      events: await listEvents(user.id),
      scopes: allowedScopes(user.id),
      templates: await listTemplates(user.id),
    }),
    queryKey: ['registry', 'templates', user.id],
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

export const useSaveTemplate = () => useRegistryMutation<SaveTemplateInput, void>(saveTemplate);

export const useSetTemplateActive = () =>
  useRegistryMutation<{ active: boolean; templateId: string }, void>(
    (actorId, { active, templateId }) => setTemplateActive(actorId, templateId, active),
  );

export const useCreateEvent = () => useRegistryMutation<CreateEventInput, void>(createEvent);

export const useChangeEventTemplate = () => useRegistryMutation<string, never>(changeEventTemplate);

export const useCreateTeam = () => useRegistryMutation(createTeam);
