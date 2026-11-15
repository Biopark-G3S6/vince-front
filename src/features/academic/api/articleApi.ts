import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

import type { ArticleSummaryDto, TeamDto } from './teamApi';

export type AssessmentDto = {
  id: string;
  articleId: string;
  memberId: string | null;
  score: number;
  feedback: string | null;
  evaluatedBy: string;
  createdAt: string;
};

export type PublicationDto = {
  id: string;
  articleId: string;
  venueName: string;
  kind: 'CONFERENCE' | 'JOURNAL' | 'OTHER';
  publicationDate: string;
  url: string;
};

export function useArticles() {
  return useQuery({
    queryKey: ['articles', 'all'],
    queryFn: () => http.all<ArticleSummaryDto>('/articles'),
  });
}

/** O nome de cada equipe, uma listagem por evento dos artigos visíveis. */
export function useTeamNames(eventIds: string[]) {
  const unique = [...new Set(eventIds)];
  const results = useQueries({
    queries: unique.map((eventId) => ({
      queryKey: ['teams', eventId],
      queryFn: () => http.all<TeamDto>(`/events/${eventId}/teams`),
    })),
  });
  const names = new Map<string, string>();
  for (const result of results)
    for (const team of result.data ?? []) names.set(team.id, team.identification);
  return names;
}

export function useAssessments(articleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['article', articleId, 'assessments'],
    queryFn: () => http.get<AssessmentDto[]>(`/articles/${articleId}/assessments`),
    enabled: Boolean(articleId) && enabled,
    retry: false,
  });
}

export function usePublications(articleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['article', articleId, 'publications'],
    queryFn: () => http.get<PublicationDto[]>(`/articles/${articleId}/publications`),
    enabled: Boolean(articleId) && enabled,
    retry: false,
  });
}

/** RF-ART-001 a RF-ART-004. */
export function useArticleMutations() {
  const client = useQueryClient();
  const refresh = (articleId: string) =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['article', articleId] }),
      client.invalidateQueries({ queryKey: ['articles'] }),
    ]);

  return {
    rename: useMutation({
      mutationFn: ({ articleId, title }: { articleId: string; title: string | null }) =>
        http.patch(`/articles/${articleId}`, { title }),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
    grade: useMutation({
      mutationFn: ({
        articleId,
        score,
        feedback,
      }: {
        articleId: string;
        score: number;
        feedback: string;
      }) =>
        http.post<AssessmentDto>(`/articles/${articleId}/assessments`, {
          score,
          feedback: feedback || null,
        }),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
    gradeMembers: useMutation({
      mutationFn: async ({
        articleId,
        scores,
      }: {
        articleId: string;
        scores: { memberId: string; score: number }[];
      }) => {
        for (const item of scores) {
          await http.post(`/articles/${articleId}/member-assessments`, item);
        }
      },
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
    publish: useMutation({
      mutationFn: ({ articleId, ...body }: Omit<PublicationDto, 'id'>) =>
        http.post<PublicationDto>(`/articles/${articleId}/publications`, body),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
    unpublish: useMutation({
      mutationFn: ({ articleId, publicationId }: { articleId: string; publicationId: string }) =>
        http.delete(`/articles/${articleId}/publications/${publicationId}`),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
  };
}
