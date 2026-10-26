import type { Role } from './persona';

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

export function canAccessSection(role: Role, section: AdminSection): boolean {
  return allowedSections[role].includes(section);
}

export function sectionsForRole(role: Role): readonly AdminSection[] {
  return allowedSections[role];
}
