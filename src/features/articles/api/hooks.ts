import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';
import { isBackendEnabled } from '@shared/api/client';

import {
  allowedScopes,
  canReadArticle,
  changeEventTemplate,
  createArticle,
  createEvent,
  createTeam,
  getArticleTemplate,
  listArticles,
  listEvents,
  listEventRegistrations,
  listTemplates,
  listTemplateCourses,
  saveTemplate,
  registerForEvent,
  setEventRegistrationOpen,
  setTemplateActive,
  type CreateEventInput,
  type SaveTemplateInput,
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

export function useTemplates() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: async () => ({
      events: isBackendEnabled() ? [] : await listEvents(user.id),
      scopes: isBackendEnabled() ? [] : allowedScopes(user.id),
      templates:
        isBackendEnabled() && !user.permissions?.includes('TEMPLATE:READ')
          ? []
          : await listTemplates(user.id, user.permissions),
    }),
    queryKey: ['registry', 'templates', user.id],
    retry: false,
  });
}

export function useTemplateCourses() {
  const user = useCurrentUser();
  return useQuery({
    enabled: isBackendEnabled() && user.permissions?.includes('TEMPLATE:CREATE') === true,
    queryFn: listTemplateCourses,
    queryKey: ['registry', 'template-courses', user.id],
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

export const useChangeEventTemplate = () => useRegistryMutation<string, void>(changeEventTemplate);

export const useCreateTeam = () => useRegistryMutation(createTeam);

export const useCreateArticle = () => useRegistryMutation(createArticle);

export function useEventRegistrations() {
  const user = useCurrentUser();
  return useQuery({
    queryFn: () => (isBackendEnabled() ? Promise.resolve([]) : listEventRegistrations(user.id)),
    queryKey: ['registry', 'registrations', user.id],
  });
}

export const useRegisterForEvent = () => useRegistryMutation(registerForEvent);

export const useSetEventRegistrationOpen = () => useRegistryMutation(setEventRegistrationOpen);
