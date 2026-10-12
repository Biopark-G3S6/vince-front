import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Perspectiva de demonstração.
 *
 * A identidade do usuário virá do endpoint de identidade (ADR-0015 §18). Enquanto ele
 * não é integrado, as telas que dependem do perfil usam esta perspectiva, escolhida na
 * própria interface. É estado de cliente, por aba — não é controle de acesso
 * (ADR-0015 §19, §20).
 */
export type Role = 'advisor' | 'student' | 'coordinator' | 'institutionAdmin';

export type DemoUser = {
  id: string;
  initials: string;
  name: string;
  role: Role;
};

export const demoUsers: Record<Role, DemoUser> = {
  advisor: { id: 'user-almeida', initials: 'PA', name: 'Prof. Almeida', role: 'advisor' },
  coordinator: {
    id: 'user-ricardo',
    initials: 'RS',
    name: 'Dr. Ricardo Santos',
    role: 'coordinator',
  },
  institutionAdmin: {
    id: 'user-admin',
    initials: 'AG',
    name: 'Admin Geral',
    role: 'institutionAdmin',
  },
  student: { id: 'user-joao', initials: 'JP', name: 'João Pedro Silva', role: 'student' },
};

type PersonaState = {
  role: Role;
  setRole: (role: Role) => void;
};

const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      role: 'institutionAdmin',
      setRole: (role) => set({ role }),
    }),
    { name: 'vinceart.persona', storage: createJSONStorage(() => window.sessionStorage) },
  ),
);

export function useCurrentUser(): DemoUser {
  return demoUsers[usePersonaStore((state) => state.role)];
}

export function useSetRole() {
  return usePersonaStore((state) => state.setRole);
}
