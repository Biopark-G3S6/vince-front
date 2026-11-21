import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

export type EventScopeType = 'INSTITUTION' | 'COURSE' | 'COHORT';

/** O evento como a API o entrega (`EventResponse`). */
export type EventDto = {
  id: string;
  institutionId: string;
  courseId: string | null;
  scopeType: EventScopeType;
  scopeId: string;
  ownerId: string;
  title: string;
  theme: string;
  researchProblem: string;
  objectives: string;
  maxTeams: number;
  maxTeamSize: number;
  status: 'ACTIVE' | 'CANCELLED';
};

export type MilestoneDto = {
  id: string;
  eventId: string;
  name: string;
  order: number;
  dueAt: string;
};
export type TemplateDto = { id: string; name: string; courseId: string | null; active: boolean };

export type EventInput = {
  title: string;
  theme: string;
  researchProblem: string;
  objectives: string;
  maxTeams: number;
  maxTeamSize: number;
};

const KEY = ['events'] as const;

export function useEvents() {
  return useQuery({ queryKey: KEY, queryFn: () => http.all<EventDto>('/events') });
}

export function useEventDetails(eventId: string | undefined) {
  const milestones = useQuery({
    queryKey: ['event', eventId, 'milestones'],
    queryFn: async () =>
      (await http.all<MilestoneDto>(`/events/${eventId}/milestones`)).sort(
        (a, b) => a.order - b.order,
      ),
    enabled: Boolean(eventId),
  });
  const advisors = useQuery({
    queryKey: ['event', eventId, 'advisors'],
    queryFn: () => http.all<{ eventId: string; userId: string }>(`/events/${eventId}/advisors`),
    enabled: Boolean(eventId),
  });
  return { milestones, advisors };
}

export function useTemplates(enabled: boolean) {
  return useQuery({
    queryKey: ['article-templates'],
    queryFn: () => http.all<TemplateDto>('/article-templates'),
    enabled,
    retry: false,
  });
}

/** RF-EVT-001 a RF-EVT-003. */
export function useEventMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });
  const refreshEvent = (eventId: string) =>
    client.invalidateQueries({ queryKey: ['event', eventId] });

  return {
    create: useMutation({
      mutationFn: async (
        input: EventInput & { scopeType: EventScopeType; scopeId: string; templateId?: string },
      ) => {
        const { templateId, ...body } = input;
        const created = await http.post<EventDto>('/events', body);
        if (templateId) {
          await http.post('/article-template-selections', { eventId: created.id, templateId });
        }
        return created;
      },
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: EventInput & { id: string }) =>
        http.patch<EventDto>(`/events/${id}`, body),
      onSuccess: refresh,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => http.post<EventDto>(`/events/${id}/cancellation`),
      onSuccess: refresh,
    }),
    addMilestone: useMutation({
      mutationFn: ({
        eventId,
        ...body
      }: {
        eventId: string;
        name: string;
        order: number;
        dueAt: string;
      }) => http.post<MilestoneDto>(`/events/${eventId}/milestones`, body),
      onSuccess: (_result, { eventId }) => refreshEvent(eventId),
    }),
    updateMilestone: useMutation({
      mutationFn: ({
        eventId,
        milestoneId,
        ...body
      }: {
        eventId: string;
        milestoneId: string;
        name?: string;
        dueAt?: string;
      }) => http.patch<MilestoneDto>(`/events/${eventId}/milestones/${milestoneId}`, body),
      onSuccess: (_result, { eventId }) => refreshEvent(eventId),
    }),
    removeMilestone: useMutation({
      mutationFn: ({ eventId, milestoneId }: { eventId: string; milestoneId: string }) =>
        http.delete(`/events/${eventId}/milestones/${milestoneId}`),
      onSuccess: (_result, { eventId }) => refreshEvent(eventId),
    }),
    assignAdvisor: useMutation({
      mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
        http.post(`/events/${eventId}/advisors/${userId}`),
      onSuccess: (_result, { eventId }) => refreshEvent(eventId),
    }),
    revokeAdvisor: useMutation({
      mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
        http.delete(`/events/${eventId}/advisors/${userId}`),
      onSuccess: (_result, { eventId }) => refreshEvent(eventId),
    }),
  };
}
