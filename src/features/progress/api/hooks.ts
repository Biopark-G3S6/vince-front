import { useMutation, useQuery } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';

import {
  generateReport,
  getContribution,
  listAdvisorTeams,
  listCourseEvents,
  listReportCourses,
} from './progressApi';

export function useAdvisorTeams() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => listAdvisorTeams(user.id),
    queryKey: ['progress', 'teams', user.id],
  });
}

export function useCourseEvents() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => listCourseEvents(user.id),
    queryKey: ['progress', 'events', user.id],
    retry: false,
  });
}

export function useContribution(teamId: string | undefined) {
  const user = useCurrentUser();

  return useQuery({
    enabled: teamId !== undefined,
    queryFn: () => getContribution(user.id, teamId!),
    queryKey: ['progress', 'contribution', user.id, teamId],
    retry: false,
  });
}

export function useReportCourses() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => listReportCourses(user.id),
    queryKey: ['progress', 'report-courses', user.id],
    retry: false,
  });
}

/** O relatório é gerado a pedido do ator, para o curso e o período escolhidos. */
export function useGenerateReport() {
  const user = useCurrentUser();

  return useMutation({
    mutationFn: ({ courseId, period }: { courseId: string; period: string }) =>
      generateReport(user.id, courseId, period),
  });
}
