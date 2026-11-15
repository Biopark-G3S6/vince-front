import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

/** O curso como a API o entrega (`CourseDtoResponse`). */
export type CourseDto = {
  id: string;
  institutionId: string;
  name: string;
  identification: string;
  active: boolean;
  coordinatorId: string | null;
};

const KEY = ['courses'] as const;

export function useCourses(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => http.all<CourseDto>('/courses'),
    enabled,
  });
}

/** RF-CUR-001 e RF-CUR-002. */
export function useCourseMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });

  return {
    create: useMutation({
      mutationFn: (body: { name: string; identification: string }) =>
        http.post<CourseDto>('/courses', body),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string; name: string; identification: string }) =>
        http.patch<CourseDto>(`/courses/${id}`, body),
      onSuccess: refresh,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => http.post<CourseDto>(`/courses/${id}/deactivation`),
      onSuccess: refresh,
    }),
    assignCoordinator: useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        http.post(`/courses/${id}/coordinator`, { userId }),
      onSuccess: refresh,
    }),
    revokeCoordinator: useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        http.delete(`/courses/${id}/coordinator/${userId}`),
      onSuccess: refresh,
    }),
  };
}

const errorText: Record<string, string> = {
  PERMISSION_DENIED: 'Você não tem permissão para esta operação.',
  RESOURCE_NOT_FOUND: 'Curso ou usuário não encontrado.',
  INSTITUTION_INACTIVE: 'A instituição está desativada.',
  COURSE_INACTIVE: 'O curso está desativado.',
  VALIDATION_FAILED: 'Revise os dados informados.',
  COHORT_ALREADY_EXISTS: 'Já existe turma com esta identificação neste curso.',
  STUDENT_ALREADY_ENROLLED: 'Este aluno já está matriculado na turma.',
  EMAIL_ALREADY_REGISTERED: 'Este e-mail já pertence a outra conta.',
  ADVISOR_NOT_ASSIGNED_TO_EVENT: 'O professor precisa ser orientador do evento.',
  EVENT_SCOPE_NOT_ALLOWED: 'Seu vínculo não permite este escopo de evento.',
  EVENT_TEAM_LIMIT_REACHED: 'O evento atingiu o limite de equipes.',
  TEAM_SIZE_LIMIT_REACHED: 'A equipe atingiu o tamanho máximo.',
  STUDENT_NOT_ELIGIBLE: 'O aluno não é elegível neste evento.',
  STUDENT_ALREADY_IN_TEAM: 'O aluno já integra uma equipe neste evento.',
  MILESTONE_DATE_CONFLICT: 'As datas das etapas precisam ser crescentes.',
  INVITATION_EXPIRED: 'O convite expirou.',
  INVITATION_REVOKED: 'O convite não é mais válido.',
};

export function describeAcademicError(error: unknown, fallback = 'Não foi possível concluir.') {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : '';
  const fields =
    error && typeof error === 'object' && 'meta' in error
      ? ((error as { meta: { errors?: { field: string; code: string }[] } }).meta.errors ?? [])
      : [];
  if (
    code === 'VALIDATION_FAILED' &&
    fields.some((field) => field.code === 'ALREADY_USED' || field.code === 'DUPLICATE')
  ) {
    return 'Já existe um registro com esta identificação.';
  }
  return errorText[code] ?? fallback;
}
