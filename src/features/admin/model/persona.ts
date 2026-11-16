import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Role = 'advisor' | 'student' | 'coordinator' | 'institutionAdmin';

export type DemoUser = {
  email: string;
  expertiseArea?: string | null;
  id: string;
  initials: string;
  institution: string;
  name: string;
  permissions?: string[];
  preferredLanguage?: string | null;
  researchArea: string;
  role: Role;
};

export type BackendIdentity = {
  userId: string;
  email: string;
  name: string;
  preferredLanguage: string | null;
  roles: string[];
  permissions: string[];
};

export const demoUsers: Record<Role, DemoUser> = {
  advisor: {
    email: 'professor@vinceart.edu.br',
    id: 'user-almeida',
    initials: 'PA',
    institution: 'Faculdade de Referência Tecnológica',
    name: 'Prof. Almeida',
    researchArea: 'Inteligência artificial aplicada à saúde',
    role: 'advisor',
  },
  coordinator: {
    email: 'coordenador@vinceart.edu.br',
    id: 'user-ricardo',
    initials: 'RS',
    institution: 'Faculdade de Referência Tecnológica',
    name: 'Dr. Ricardo Santos',
    researchArea: 'Coordenação de pesquisa e extensão',
    role: 'coordinator',
  },
  institutionAdmin: {
    email: 'admin@vinceart.edu.br',
    id: 'user-admin',
    initials: 'AG',
    institution: 'Todas as instituições',
    name: 'Admin Geral',
    researchArea: 'Gestão acadêmica e governança institucional',
    role: 'institutionAdmin',
  },
  student: {
    email: 'aluno@vinceart.edu.br',
    id: 'user-joao',
    initials: 'JP',
    institution: 'Faculdade de Referência Tecnológica',
    name: 'João Pedro Silva',
    researchArea: 'Ciência da computação',
    role: 'student',
  },
};

const usersById = Object.fromEntries(
  Object.values(demoUsers).map((user) => [user.id, user]),
) as Record<string, DemoUser>;

export const demoAccounts = [
  { email: demoUsers.institutionAdmin.email, label: 'Administrador', role: 'institutionAdmin' },
  { email: demoUsers.coordinator.email, label: 'Coordenador', role: 'coordinator' },
  { email: demoUsers.advisor.email, label: 'Professor', role: 'advisor' },
  { email: demoUsers.student.email, label: 'Aluno', role: 'student' },
] as const;

const DEMO_PASSWORD = 'vince123';

type SessionState = {
  signIn: (user: DemoUser | string) => void;
  signOut: () => void;
  user: DemoUser | null;
};

const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      signIn: (user) => set({ user: typeof user === 'string' ? (usersById[user] ?? null) : user }),
      signOut: () => set({ user: null }),
      user: null,
    }),
    {
      name: 'vinceart.session',
      partialize: (state) => ({ user: state.user }),
      storage: createJSONStorage(() => window.sessionStorage),
    },
  ),
);

export function authenticateDemoUser(email: string, password: string): DemoUser | null {
  if (password !== DEMO_PASSWORD) return null;

  const normalizedEmail = email.trim().toLocaleLowerCase();
  return Object.values(demoUsers).find((user) => user.email === normalizedEmail) ?? null;
}

export function useAuthenticatedUser(): DemoUser | null {
  return useSessionStore((state) => state.user);
}

export function identityToUser(identity: BackendIdentity): DemoUser {
  const roleCode = identity.roles.find((role) =>
    ['SYSTEM_ADMIN', 'INSTITUTION_ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'].includes(role),
  );
  const role: Role =
    roleCode === 'SYSTEM_ADMIN' || roleCode === 'INSTITUTION_ADMIN'
      ? 'institutionAdmin'
      : roleCode === 'COORDINATOR'
        ? 'coordinator'
        : roleCode === 'PROFESSOR'
          ? 'advisor'
          : 'student';

  return {
    email: identity.email,
    id: identity.userId,
    initials: identity.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase() ?? '')
      .join(''),
    institution: '',
    name: identity.name,
    permissions: identity.permissions,
    preferredLanguage: identity.preferredLanguage,
    researchArea: '',
    role,
  };
}

export function useCurrentUser(): DemoUser {
  const user = useAuthenticatedUser();

  if (!user) {
    throw new Error('Uma sessão autenticada é necessária para acessar esta tela.');
  }

  return user;
}

export function useSignIn() {
  return useSessionStore((state) => state.signIn);
}

export function useSignOut() {
  return useSessionStore((state) => state.signOut);
}
