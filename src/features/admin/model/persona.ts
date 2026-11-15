import { useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@shared/api/http';

/**
 * A identidade da sessão, resolvida no servidor (ADR-0013 §20, ADR-0017 §15).
 *
 * O cliente não guarda credencial nem permissão: lê `GET /identity` uma vez por carga e
 * a mantém no cache de consultas. O cookie de sessão é HttpOnly; quem decide o acesso é o
 * servidor, e a tabela de seções serve só à navegação (`accessPolicy.ts`).
 */

/** Perfil de navegação. Deriva dos papéis do servidor (URS §1.4). */
export type Role = 'systemAdmin' | 'institutionAdmin' | 'coordinator' | 'advisor' | 'student';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  initials: string;
  /** Rótulo da instituição de vínculo exibido no cabeçalho. */
  institution: string;
  institutionId: string | null;
  researchArea: string;
  preferredLanguage: string | null;
  /** O perfil principal, para textos e telas que escolhem por papel. */
  role: Role;
  /** Todos os perfis da conta: um coordenador também é professor. */
  roles: Role[];
  /** Os códigos de papel do servidor (`SYSTEM_ADMIN`, `PROFESSOR`, ...). */
  roleCodes: string[];
  /** As permissões efetivas resolvidas no servidor (RF-ACS-001 RN2). */
  permissions: string[];
};

/** Nome mantido por compatibilidade com as telas que ainda usam dados de demonstração. */
export type DemoUser = SessionUser;

type IdentityResponse = {
  userId: string;
  email: string;
  name: string;
  preferredLanguage: string | null;
  roles: string[];
  permissions: string[];
};

export const IDENTITY_KEY = ['identity'] as const;

const ROLE_BY_CODE: Record<string, Role> = {
  SYSTEM_ADMIN: 'systemAdmin',
  INSTITUTION_ADMIN: 'institutionAdmin',
  COORDINATOR: 'coordinator',
  PROFESSOR: 'advisor',
  STUDENT: 'student',
};

/** Ordem de precedência do perfil principal. */
const ROLE_PRECEDENCE: Role[] = [
  'systemAdmin',
  'institutionAdmin',
  'coordinator',
  'advisor',
  'student',
];

export function makeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function toSessionUser(
  identity: IdentityResponse,
  profile?: ProfileResponse | null,
): SessionUser {
  const roles = ROLE_PRECEDENCE.filter((role) =>
    identity.roles.some((code) => ROLE_BY_CODE[code] === role),
  );

  return {
    id: identity.userId,
    email: identity.email,
    name: identity.name,
    initials: makeInitials(identity.name),
    institution: roles.includes('systemAdmin') ? 'Todas as instituições' : '',
    institutionId: profile?.institutionId ?? null,
    researchArea: profile?.expertiseArea ?? '',
    preferredLanguage: identity.preferredLanguage,
    role: roles[0] ?? 'student',
    roles: roles.length > 0 ? roles : ['student'],
    roleCodes: identity.roles,
    permissions: identity.permissions,
  };
}

type ProfileResponse = {
  id: string;
  institutionId: string | null;
  expertiseArea: string | null;
};

/**
 * A identidade corrente. `null` quando não há sessão (401); `undefined` enquanto carrega —
 * e nenhuma rota protegida é desenhada antes de ela ser resolvida (PAD-SEG-020).
 */
export function useIdentity() {
  return useQuery({
    queryKey: IDENTITY_KEY,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        const identity = await http.get<IdentityResponse>('/identity', undefined, {
          silent401: true,
        });
        const profile = await http
          .get<ProfileResponse>('/profile', undefined, { silent401: true })
          .catch(() => null);
        return toSessionUser(identity, profile);
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === 'AUTHENTICATION_FAILED'
        ) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useAuthenticatedUser(): SessionUser | null {
  return useIdentity().data ?? null;
}

export function useCurrentUser(): SessionUser {
  const user = useAuthenticatedUser();

  if (!user) {
    throw new Error('Uma sessão autenticada é necessária para acessar esta tela.');
  }

  return user;
}

export function hasPermission(user: Pick<SessionUser, 'permissions'> | null, permission: string) {
  return user?.permissions.includes(permission) ?? false;
}

/** Encerra a sessão no servidor (RF-ACS-002) e descarta todo o cache do cliente. */
export function useSignOut() {
  const client = useQueryClient();

  return async () => {
    await http.delete('/sessions/current').catch(() => undefined);
    client.setQueryData(IDENTITY_KEY, null);
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== IDENTITY_KEY[0] });
  };
}

/**
 * Pessoas fictícias dos dados de demonstração que ainda alimentam as telas fora da
 * integração (editor, revisão, discussão, assistência). Não autenticam.
 */
export const demoUsers = {
  advisor: { id: 'user-almeida', name: 'Prof. Almeida' },
  coordinator: { id: 'user-ricardo', name: 'Dr. Ricardo Santos' },
  institutionAdmin: { id: 'user-admin', name: 'Admin Geral' },
  student: { id: 'user-joao', name: 'João Pedro Silva' },
} as const;
