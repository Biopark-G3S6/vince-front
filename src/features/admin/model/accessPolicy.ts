import type { Role } from './persona';

type UserAccess = { role: Role; permissions?: string[] };

export type AdminSection =
  | 'dashboard'
  | 'institutions'
  | 'courses'
  | 'classes'
  | 'events'
  | 'people'
  | 'teams'
  | 'articles'
  | 'editor'
  | 'templates'
  | 'review'
  | 'discussion'
  | 'notifications'
  | 'assistance'
  | 'progress'
  | 'language'
  | 'access'
  | 'settings';

const allowedSections: Record<Role, readonly AdminSection[]> = {
  advisor: [
    'dashboard',
    'events',
    'teams',
    'articles',
    'editor',
    'templates',
    'review',
    'discussion',
    'notifications',
    'assistance',
    'progress',
    'language',
    'access',
  ],
  coordinator: [
    'dashboard',
    'courses',
    'classes',
    'events',
    'people',
    'articles',
    'templates',
    'editor',
    'notifications',
    'progress',
    'language',
    'access',
  ],
  institutionAdmin: [
    'dashboard',
    'institutions',
    'courses',
    'classes',
    'events',
    'articles',
    'templates',
    'editor',
    'notifications',
    'progress',
    'language',
    'access',
  ],
  student: [
    'dashboard',
    'events',
    'articles',
    'editor',
    'templates',
    'review',
    'discussion',
    'notifications',
    'assistance',
    'language',
    'access',
  ],
};

const sectionPermissions: Partial<Record<AdminSection, readonly string[]>> = {
  institutions: ['INSTITUTION:READ'],
  courses: ['COURSE:READ'],
  classes: ['COHORT:READ'],
  events: ['EVENT:READ'],
  people: ['INVITATION:READ'],
  teams: ['TEAM:READ'],
  articles: ['ARTICLE:READ'],
  editor: ['ARTICLE:EDIT', 'ARTICLE:READ'],
  templates: ['TEMPLATE:READ'],
  review: ['SUBMISSION:READ', 'REMARK:READ'],
  discussion: ['MESSAGE:READ'],
  notifications: ['NOTIFICATION:READ'],
  assistance: [
    'AI_SUMMARY:READ',
    'COMPLIANCE_CHECK:REQUEST',
    'SIMILARITY_CHECK:REQUEST',
    'INSTITUTION:CONSENT_AI',
  ],
  progress: ['PROGRESS:READ', 'REPORT:GENERATE', 'REPORT:READ'],
};

export function canAccessSection(role: Role, section: AdminSection): boolean {
  return allowedSections[role].includes(section);
}

/** Mantém a matriz de demonstração por perfil e aplica as permissões da sessão real. */
export function canAccessUserSection(user: UserAccess, section: AdminSection): boolean {
  if (!canAccessSection(user.role, section)) return false;
  const required = sectionPermissions[section];
  if (!required || user.permissions === undefined) return true;
  return required.some((permission) => user.permissions?.includes(permission));
}

export function sectionsForRole(role: Role): readonly AdminSection[] {
  return allowedSections[role];
}
