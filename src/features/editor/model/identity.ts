import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useCurrentUser } from '@features/admin';
import { currentArticle } from '@features/articles';

import type { Collaborator } from '../lib/collab';

/**
 * Integrante que edita nesta aba. A perspectiva de aluno é uma só; para exercitar a
 * edição simultânea entre integrantes, cada aba escolhe quem ela representa.
 */
type IdentityState = {
  memberId: string;
  setMemberId: (memberId: string) => void;
};

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      memberId: currentArticle.members[0]!.id,
      setMemberId: (memberId) => set({ memberId }),
    }),
    { name: 'vinceart.editor.identity', storage: createJSONStorage(() => window.sessionStorage) },
  ),
);

const caretColors = ['#8b2d3f', '#1d6f8a', '#5b6b1f'];

export type Actor = Collaborator & { initials: string; isStudent: boolean };

/** Quem age no editor: o integrante escolhido, na perspectiva de aluno; o perfil, nas demais. */
export function useActor(): Actor {
  const user = useCurrentUser();
  const memberId = useIdentityStore((state) => state.memberId);
  const index = Math.max(
    0,
    currentArticle.members.findIndex((member) => member.id === memberId),
  );
  const member = currentArticle.members[index]!;

  return user.role === 'student'
    ? { ...member, color: caretColors[index % caretColors.length]!, isStudent: true }
    : { color: '#5f4e52', id: user.id, initials: user.initials, isStudent: false, name: user.name };
}
