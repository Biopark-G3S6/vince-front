import { hasPermission, type SessionUser } from '@features/admin';

import { useCohorts } from './cohortApi';
import { useCourses } from './courseApi';
import type { EventDto, EventScopeType } from './eventApi';

/**
 * Quem é dono de qual escopo de evento — o mesmo critério do backend (`EventScope.owns`,
 * ADR-0032): a propriedade desce a hierarquia. O administrador é dono de tudo na
 * instituição; o coordenador, de tudo no seu curso; o professor designado, da sua turma.
 */
export function useEventOwnership(user: SessionUser) {
  const courses = useCourses(hasPermission(user, 'COURSE:READ')).data ?? [];
  const { cohorts } = useCohorts(hasPermission(user, 'COHORT:READ'));

  const administers = user.roles.includes('institutionAdmin') && Boolean(user.institutionId);
  const coordinatedCourseIds = new Set(
    courses.filter((course) => course.coordinatorId === user.id).map((course) => course.id),
  );
  const ownCourses = courses.filter(
    (course) => course.active && (administers || coordinatedCourseIds.has(course.id)),
  );
  const ownCohorts = cohorts.filter(
    (cohort) =>
      cohort.active &&
      (coordinatedCourseIds.has(cohort.courseId) ||
        (user.roles.includes('advisor') && !user.roles.includes('student'))),
  );
  const allowedScopes: EventScopeType[] = [
    ...(ownCohorts.length > 0 ? (['COHORT'] as const) : []),
    ...(ownCourses.length > 0 ? (['COURSE'] as const) : []),
    ...(administers ? (['INSTITUTION'] as const) : []),
  ];

  const ownsEvent = (event: EventDto) =>
    event.ownerId === user.id ||
    (administers && event.institutionId === user.institutionId) ||
    (event.scopeType !== 'INSTITUTION' &&
      event.courseId !== null &&
      coordinatedCourseIds.has(event.courseId)) ||
    (event.scopeType === 'COHORT' && ownCohorts.some((cohort) => cohort.id === event.scopeId));

  return { courses, cohorts, ownCourses, ownCohorts, allowedScopes, ownsEvent };
}
