import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

export type TeamDto = {
  id: string;
  eventId: string;
  institutionId: string;
  identification: string;
  responsibleAdvisorId: string | null;
  /** Integrantes ativos (`team-vacancies`): as vagas são o tamanho máximo menos este. */
  activeMemberCount: number;
};

export type MemberRole = 'LEADER' | 'AUTHOR' | 'COAUTHOR';

export type MemberDto = {
  id: string;
  teamId: string;
  eventId: string;
  userId: string;
  status: 'ACTIVE' | 'REMOVED';
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
};

export type TeamInvitationDto = {
  id: string;
  teamId: string;
  eventId: string;
  userId: string;
  status: string;
  expiresAt: string;
};

export type ArticleSummaryDto = {
  id: string;
  eventId: string;
  teamId: string;
  /** O nome da equipe (`article-team-name`); `null` em artigo ainda não ressincronizado. */
  teamIdentification: string | null;
  courseId: string | null;
  advisorId: string | null;
  memberIds: string[];
  status: 'STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'FINISHED';
  currentMilestoneId: string | null;
  currentMilestoneOrder: number | null;
  currentMilestoneDeadline: string | null;
  title: string | null;
  updatedAt: string;
};

export function useTeams(eventId: string | undefined) {
  return useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => http.all<TeamDto>(`/events/${eventId}/teams`),
    enabled: Boolean(eventId),
  });
}

export function useMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId, 'members'],
    queryFn: () => http.all<MemberDto>(`/teams/${teamId}/members`),
    enabled: Boolean(teamId),
  });
}

export function useTeamInvitations(teamId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['team', teamId, 'invitations'],
    queryFn: () => http.all<TeamInvitationDto>(`/teams/${teamId}/invitations`),
    enabled: Boolean(teamId) && enabled,
    retry: false,
  });
}

export function useEligibleStudents(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['event', eventId, 'eligible-students'],
    queryFn: () => http.all<{ userId: string }>(`/events/${eventId}/eligible-students`),
    enabled: Boolean(eventId) && enabled,
    retry: false,
  });
}

export function useReceivedInvitations(enabled: boolean) {
  return useQuery({
    queryKey: ['team-invitations', 'received'],
    queryFn: () => http.all<TeamInvitationDto>('/team-invitations'),
    enabled,
  });
}

/** Os artigos das equipes de um evento, numa só consulta (article-listing). */
export function useEventArticles(eventId: string | undefined) {
  return useQuery({
    queryKey: ['articles', { eventId }],
    queryFn: () => http.all<ArticleSummaryDto>('/articles', { eventId }),
    enabled: Boolean(eventId),
  });
}

/** RF-EQP-001 a RF-EQP-006. */
export function useTeamMutations() {
  const client = useQueryClient();
  const refreshAll = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['teams'] }),
      client.invalidateQueries({ queryKey: ['team'] }),
      client.invalidateQueries({ queryKey: ['event'] }),
      client.invalidateQueries({ queryKey: ['articles'] }),
      client.invalidateQueries({ queryKey: ['team-invitations'] }),
    ]);

  return {
    create: useMutation({
      mutationFn: ({
        eventId,
        ...body
      }: {
        eventId: string;
        identification: string;
        articleTitle?: string;
      }) => http.post<TeamDto>(`/events/${eventId}/teams`, body),
      onSuccess: refreshAll,
    }),
    assignMember: useMutation({
      mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
        http.post<MemberDto>(`/teams/${teamId}/members/${userId}`),
      onSuccess: refreshAll,
    }),
    removeMember: useMutation({
      mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
        http.delete(`/teams/${teamId}/members/${userId}`),
      onSuccess: refreshAll,
    }),
    setRole: useMutation({
      mutationFn: ({
        teamId,
        userId,
        role,
      }: {
        teamId: string;
        userId: string;
        role: MemberRole;
      }) => http.patch<MemberDto>(`/teams/${teamId}/members/${userId}`, { role }),
      onSuccess: refreshAll,
    }),
    invite: useMutation({
      mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
        http.post<TeamInvitationDto>(`/teams/${teamId}/invitations`, {
          userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        }),
      onSuccess: refreshAll,
    }),
    accept: useMutation({
      mutationFn: (invitationId: string) =>
        http.post<MemberDto>(`/team-invitations/${invitationId}/acceptance`),
      onSuccess: refreshAll,
    }),
    decline: useMutation({
      mutationFn: (invitationId: string) => http.delete(`/team-invitations/${invitationId}`),
      onSuccess: refreshAll,
    }),
    join: useMutation({
      mutationFn: (teamId: string) => http.post<MemberDto>(`/teams/${teamId}/membership`),
      onSuccess: refreshAll,
    }),
    assignAdvisor: useMutation({
      mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
        http.post(`/teams/${teamId}/advisor/${userId}`),
      onSuccess: refreshAll,
    }),
    revokeAdvisor: useMutation({
      mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
        http.delete(`/teams/${teamId}/advisor/${userId}`),
      onSuccess: refreshAll,
    }),
  };
}
