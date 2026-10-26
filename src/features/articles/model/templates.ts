import type { JSONContent } from '@tiptap/core';

export type TemplatePreview = 'official' | 'abnt' | 'academic';

/** Formatação aplicada ao corpo do documento. */
export type TemplateFormat = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: 'left' | 'justify';
};

export type ArticleTemplate = TemplateFormat & {
  description: string;
  id: string;
  /** Nome curto exibido na faixa do editor. */
  label: string;
  recommended?: boolean;
  title: string;
};

/** Alterar um template gera versão nova; as anteriores são preservadas (RF-TPL-001 RN4). */
export type TemplateVersion = {
  content: JSONContent;
  format?: TemplateFormat;
  createdAt: string;
  createdBy: string;
  number: number;
};

export type StoredTemplate = ArticleTemplate & {
  active: boolean;
  ownerId?: string;
  visibility?: 'standard' | 'personal' | 'event';
  /** Evento em que o modelo foi publicado. */
  eventId?: string;
  /** Presente quando quem consulta pode manter o template (RF-TPL-001 RN2). */
  canMaintain?: boolean;
  /** Curso ao qual o template fica restrito; `null` quando vale para a instituição. */
  courseId: string | null;
  preview: TemplatePreview;
  versions: TemplateVersion[];
};

export type EventScope = 'institution' | 'course' | 'class';

/** O evento congela a versão do template selecionada na sua criação (RF-TPL-002 RN3). */
export type EventTemplate = {
  /** Permissão derivada para o perfil que consulta o evento. */
  canManage?: boolean;
  kind?: 'official' | 'practice' | 'tcc';
  createdById?: string;
  description?: string;
  registrationOpen?: boolean;
  registrationDeadline?: string | null;
  maxTeamSize?: number;
  courseId: string | null;
  createdBy: string;
  id: string;
  name: string;
  scope: EventScope;
  /** `null` quando o evento optou por documento em branco. */
  templateId: string | null;
  templateTitle: string;
  templateVersion: number | null;
  /** Orientadores do evento: quem pode criar equipes nele (RF-EQP-001). */
  advisorIds: string[];
  maxTeams: number;
  /** Cronograma: as etapas de entrega e os seus prazos. */
  schedule: Array<{ deadline: string; name: string }>;
};

export const courses = [
  { id: 'course-adm', name: 'Administração' },
  { id: 'course-bio', name: 'Ciências Biológicas' },
];

export function courseName(courseId: string | null) {
  return courses.find((course) => course.id === courseId)?.name ?? '';
}

export const defaultFormat: TemplateFormat = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 12,
  lineHeight: 1.5,
  textAlign: 'justify',
};

/** "Em branco" é opção legítima: o artigo nasce vazio e segue a mesma norma (RF-TPL-002 RN2). */
export const blankTemplate: ArticleTemplate = {
  ...defaultFormat,
  description: 'O artigo nasce vazio e segue a mesma norma (ABNT).',
  id: 'blank',
  label: 'Documento em branco',
  title: 'Em branco',
};

export const fontOptions = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
];

/**
 * Template restrito a curso só pode ser selecionado por evento daquele curso ou de
 * turma dele (RF-TPL-001 RN1). Template inativo não é oferecido a evento novo.
 */
export function isAvailableTo(template: StoredTemplate, eventCourseId: string | null) {
  return template.active && (template.courseId === null || template.courseId === eventCourseId);
}

export function currentVersion(template: StoredTemplate) {
  return template.versions[template.versions.length - 1]!;
}

/** Documento inicial de um template: seções com os cabeçalhos já redigidos. */
export function sectionsContent(sections: string[]): JSONContent {
  return {
    content: sections.flatMap((section) => [
      { attrs: { level: 2 }, content: [{ text: section, type: 'text' }], type: 'heading' },
      { type: 'paragraph' },
    ]),
    type: 'doc',
  };
}
