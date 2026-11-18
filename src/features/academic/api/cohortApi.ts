import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

/** A turma como a API a entrega (`CohortResponse`). */
export type CohortDto = {
  id: string;
  courseId: string;
  identification: string;
  term: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export type EnrollmentDto = { id: string; cohortId: string; userId: string; status: string };
export type CohortInvitationDto = {
  id: string;
  invitationId: string;
  cohortId: string;
  professorId: string;
  url?: string;
  expiresAt?: string;
  state?: string;
  useCount?: number;
};

export type CohortStatus = 'active' | 'planned' | 'closed';

export function statusOfCohort(cohort: CohortDto, now = new Date()): CohortStatus {
  if (!cohort.active || new Date(cohort.endsAt) < now) return 'closed';
  return new Date(cohort.startsAt) > now ? 'planned' : 'active';
}

const COHORTS_KEY = ['cohorts'] as const;

/** As turmas que o ator lê, numa consulta só (`GET /cohorts`, cohort-listing). */
export function useCohorts(enabled = true) {
  const query = useQuery({
    queryKey: COHORTS_KEY,
    queryFn: () => http.all<CohortDto>('/cohorts'),
    enabled,
  });
  return { cohorts: query.data ?? [], isPending: query.isPending };
}

export function useCohortDetails(cohortId: string | undefined, permissions: string[]) {
  const enabled = Boolean(cohortId);
  const professors = useQuery({
    queryKey: ['cohort', cohortId, 'professors'],
    queryFn: () =>
      http.all<{ cohortId: string; userId: string }>(`/cohorts/${cohortId}/professors`),
    enabled,
  });
  const enrollments = useQuery({
    queryKey: ['cohort', cohortId, 'enrollments'],
    queryFn: () => http.all<EnrollmentDto>(`/cohorts/${cohortId}/enrollments`),
    enabled: enabled && permissions.includes('ENROLLMENT:READ'),
    retry: false,
  });
  const invitations = useQuery({
    queryKey: ['cohort', cohortId, 'invitations'],
    queryFn: () => http.all<CohortInvitationDto>(`/cohorts/${cohortId}/invitations`),
    enabled: enabled && permissions.includes('INVITATION:READ'),
    retry: false,
  });
  return { professors, enrollments, invitations };
}

/** RF-TUR-001 a RF-TUR-004. */
export function useCohortMutations() {
  const client = useQueryClient();
  const refreshCohort = (cohortId: string) =>
    client.invalidateQueries({ queryKey: ['cohort', cohortId] });

  return {
    create: useMutation({
      mutationFn: ({
        courseId,
        ...body
      }: {
        courseId: string;
        identification: string;
        term: string;
        startsAt: string;
        endsAt: string;
      }) => http.post<CohortDto>(`/courses/${courseId}/cohorts`, body),
      onSuccess: () => client.invalidateQueries({ queryKey: COHORTS_KEY }),
    }),
    /** RF-TUR-001: alterar identificação, período e datas. */
    update: useMutation({
      mutationFn: ({
        id,
        ...body
      }: {
        id: string;
        identification: string;
        term: string;
        startsAt: string;
        endsAt: string;
      }) => http.patch<CohortDto>(`/cohorts/${id}`, body),
      onSuccess: () => client.invalidateQueries({ queryKey: COHORTS_KEY }),
    }),
    deactivate: useMutation({
      mutationFn: (cohort: CohortDto) => http.post(`/cohorts/${cohort.id}/deactivation`),
      onSuccess: () => client.invalidateQueries({ queryKey: COHORTS_KEY }),
    }),
    assignProfessor: useMutation({
      mutationFn: ({ cohortId, userId }: { cohortId: string; userId: string }) =>
        http.post(`/cohorts/${cohortId}/professors/${userId}`),
      onSuccess: (_result, { cohortId }) => refreshCohort(cohortId),
    }),
    revokeProfessor: useMutation({
      mutationFn: ({ cohortId, userId }: { cohortId: string; userId: string }) =>
        http.delete(`/cohorts/${cohortId}/professors/${userId}`),
      onSuccess: (_result, { cohortId }) => refreshCohort(cohortId),
    }),
    enroll: useMutation({
      mutationFn: ({ cohortId, ...body }: { cohortId: string; name: string; email: string }) =>
        http.post<EnrollmentDto>(`/cohorts/${cohortId}/enrollments`, body),
      onSuccess: (_result, { cohortId }) => refreshCohort(cohortId),
    }),
    invite: useMutation({
      mutationFn: ({ cohortId, expiresAt }: { cohortId: string; expiresAt: string }) =>
        http.post<CohortInvitationDto>(`/cohorts/${cohortId}/invitations`, { expiresAt }),
      onSuccess: (_result, { cohortId }) => refreshCohort(cohortId),
    }),
    revokeInvitation: useMutation({
      mutationFn: ({ cohortId, invitationId }: { cohortId: string; invitationId: string }) =>
        http.delete(`/cohorts/${cohortId}/invitations/${invitationId}`),
      onSuccess: (_result, { cohortId }) => refreshCohort(cohortId),
    }),
  };
}
