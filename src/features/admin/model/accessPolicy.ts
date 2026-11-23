import type { Role, SessionUser } from './persona';

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

/**
 * A navegação por perfil. Serve só para mostrar o que faz sentido a cada um: a
 * autorização é do servidor, que recusa com 403 o que não for permitido (ADR-0014 §11).
 */
const allowedSections: Record<Role, readonly AdminSection[]> = {
  systemAdmin: ['dashboard', 'institutions', 'notifications', 'language', 'access'],
  advisor: [
    'dashboard',
    'classes',
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
    'teams',
    'articles',
    'templates',
    'editor',
    'notifications',
    'progress',
    'language',
    'access',
  ],
  // Sem `TEAM:READ` nem `ARTICLE:READ` (URS §2.3.1): a administração não acompanha equipes e
  // artigos — RF-ART-001 tem por atores o aluno, o orientador e o coordenador.
  institutionAdmin: [
    'dashboard',
    'courses',
    'people',
    'events',
    'templates',
    'notifications',
    'progress',
    'language',
    'access',
  ],
  student: [
    'dashboard',
    'events',
    'teams',
    'articles',
    'editor',
    'review',
    'discussion',
    'notifications',
    'assistance',
    'language',
    'access',
  ],
};

/** Aceita o perfil ou o usuário: o usuário com vários papéis vê a união das seções. */
export function canAccessSection(
  who: Role | Pick<SessionUser, 'roles'>,
  section: AdminSection,
): boolean {
  const roles = typeof who === 'string' ? [who] : who.roles;
  return roles.some((role) => allowedSections[role].includes(section));
}

export function sectionsForRole(role: Role): readonly AdminSection[] {
  return allowedSections[role];
}
