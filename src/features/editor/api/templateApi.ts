import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSONContent } from '@tiptap/react';

import { defaultFormat, type StoredTemplate, type TemplateFormat } from '@features/articles';
import { http } from '@shared/api/http';

/** O template como a API o entrega (`article-templates`, `article-integration-reads`). */
type TemplateDto = {
  id: string;
  courseId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  currentVersionNumber: number;
  currentVersionId: string;
  content: JSONContent;
  versions?: Array<{
    id: string;
    versionNumber: number;
    content: JSONContent;
    createdBy: string;
    createdAt: string;
  }>;
};

export type TemplateInput = {
  content: JSONContent;
  courseId: string | null;
  description: string;
  format: TemplateFormat;
  id?: string;
  title: string;
};

const KEY = ['article-templates'] as const;

/** A formatação do modelo viaja dentro do conteúdo, em `attrs.vinceFormat`. */
export function templateFormat(content: JSONContent): TemplateFormat {
  const attrs = content.attrs;
  const value = attrs && typeof attrs === 'object' ? attrs.vinceFormat : undefined;
  if (!value || typeof value !== 'object') return { ...defaultFormat };
  const format = value as Record<string, unknown>;
  return {
    fontFamily:
      typeof format.fontFamily === 'string' ? format.fontFamily : defaultFormat.fontFamily,
    fontSize: typeof format.fontSize === 'number' ? format.fontSize : defaultFormat.fontSize,
    lineHeight:
      typeof format.lineHeight === 'number' ? format.lineHeight : defaultFormat.lineHeight,
    textAlign: format.textAlign === 'left' ? 'left' : defaultFormat.textAlign,
  };
}

function toTemplate(dto: TemplateDto): StoredTemplate {
  const versions = (
    dto.versions?.length
      ? [...dto.versions]
      : [
          {
            id: dto.currentVersionId,
            versionNumber: dto.currentVersionNumber,
            content: dto.content,
            createdAt: '',
            createdBy: '',
          },
        ]
  ).sort((left, right) => left.versionNumber - right.versionNumber);
  const current =
    versions.find((version) => version.versionNumber === dto.currentVersionNumber) ??
    versions[versions.length - 1]!;

  return {
    ...templateFormat(current.content),
    active: dto.active,
    courseId: dto.courseId,
    description: dto.description ?? '',
    id: dto.id,
    label: dto.name,
    preview: dto.courseId ? 'abnt' : 'official',
    title: dto.name,
    versions: versions.map((version) => ({
      content: version.content,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      number: version.versionNumber,
      format: templateFormat(version.content),
    })),
    visibility: 'standard',
  };
}

/**
 * Os templates da instituição do ator (RF-TPL-001). Quem mantém templates também vê os
 * desativados, para conferir o que deixou de ser oferecido aos eventos.
 */
export function useTemplateLibrary(includeInactive: boolean, enabled = true) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () =>
      (
        await http.all<TemplateDto>('/article-templates', {
          includeInactive: includeInactive ? 'true' : undefined,
        })
      ).map(toTemplate),
    enabled,
  });
}

/** Os cursos que o ator pode associar a um template restrito. */
export function useTemplateCourses(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'courses'],
    queryFn: () => http.all<{ id: string; name: string; coordinatorId: string | null }>('/courses'),
    enabled,
  });
}

/** RF-TPL-001: criar, alterar (gera versão nova, RN4) e desativar. */
export function useTemplateMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });

  return {
    save: useMutation({
      mutationFn: (input: TemplateInput) => {
        const body = {
          name: input.title.trim(),
          description: input.description.trim() || null,
          courseId: input.courseId,
          content: {
            ...input.content,
            attrs: { ...input.content.attrs, vinceFormat: input.format },
          },
        };
        return input.id
          ? http.patch(`/article-templates/${input.id}`, body)
          : http.post('/article-templates', body);
      },
      onSuccess: refresh,
    }),
    deactivate: useMutation({
      mutationFn: (templateId: string) =>
        http.post(`/article-templates/${templateId}/deactivation`),
      onSuccess: refresh,
    }),
  };
}
