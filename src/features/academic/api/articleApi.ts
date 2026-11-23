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

export type ArticleFilters = { eventId?: string; status?: ArticleSummaryDto['status'] };

/** Os artigos que o ator alcança, com os filtros de `GET /articles` (RF-ART-001). */
export function useArticles(filters: ArticleFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['articles', 'list', filters],
    queryFn: () =>
      http.all<ArticleSummaryDto>('/articles', {
        eventId: filters.eventId || undefined,
        status: filters.status || undefined,
      }),
    enabled,
  });
}

/**
 * O nome de cada equipe. O artigo já o traz (`article-team-name`); só o artigo anterior à
 * sincronização do nome consulta a equipe por identificador.
 */
export function useTeamNames(articles: ArticleSummaryDto[]) {
  const missing = [
    ...new Set(articles.filter((item) => !item.teamIdentification).map((item) => item.teamId)),
  ];
  const results = useQueries({
    queries: missing.map((teamId) => ({
      queryKey: ['team', teamId],
      queryFn: () => http.get<TeamDto>(`/teams/${teamId}`),
    })),
  });
  const names = new Map<string, string>();
  for (const article of articles)
    if (article.teamIdentification) names.set(article.teamId, article.teamIdentification);
  for (const result of results)
    if (result.data) names.set(result.data.id, result.data.identification);
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
    /** RF-ART-004: consulta, altera ou remove. */
    updatePublication: useMutation({
      mutationFn: ({
        articleId,
        publicationId,
        ...body
      }: Omit<PublicationDto, 'id'> & { publicationId: string }) =>
        http.patch<PublicationDto>(`/articles/${articleId}/publications/${publicationId}`, body),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
    unpublish: useMutation({
      mutationFn: ({ articleId, publicationId }: { articleId: string; publicationId: string }) =>
        http.delete(`/articles/${articleId}/publications/${publicationId}`),
      onSuccess: (_result, { articleId }) => refresh(articleId),
    }),
  };
}
