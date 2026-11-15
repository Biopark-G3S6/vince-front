import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DirectoryUser } from '@shared/api/directory';
import { http } from '@shared/api/http';

import { makeInitials, type Institution, type InstitutionAdmin } from '../model/institution';

/** O recurso como a API o entrega (`InstitutionDtoResponse`, institution-location). */
type InstitutionDto = {
  id: string;
  name: string;
  code: string;
  cnpj: string | null;
  website: string | null;
  contactEmail: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
};

export type InstitutionInput = Pick<
  Institution,
  'name' | 'acronym' | 'legalId' | 'domain' | 'supportEmail' | 'city' | 'state'
>;

const KEY = ['institutions'] as const;
const tones: InstitutionAdmin['tone'][] = ['primary', 'light', 'dark'];

/** O domínio é o que a tela mostra; a API guarda o sítio com protocolo. */
function toWebsite(domain: string) {
  const value = domain.trim().toLowerCase();
  if (!value) return null;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

function toDomain(website: string | null) {
  return (website ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function formatCnpj(digits: string | null) {
  if (!digits || digits.length !== 14) return digits ?? '';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function toInstitution(dto: InstitutionDto): Institution {
  return {
    id: dto.id,
    name: dto.name,
    acronym: dto.code,
    legalId: formatCnpj(dto.cnpj),
    domain: toDomain(dto.website),
    supportEmail: dto.contactEmail ?? '',
    city: dto.city ?? '',
    state: dto.state ?? '',
    status: dto.active ? 'active' : 'inactive',
    // A API não expõe data de cadastro nem contagem de cursos (triagem (d)).
    createdAt: '',
    coursesActive: 0,
    admins: [],
  };
}

function toBody(input: InstitutionInput) {
  return {
    name: input.name.trim(),
    code: input.acronym.trim().toUpperCase(),
    cnpj: input.legalId.trim() || null,
    website: toWebsite(input.domain),
    contactEmail: input.supportEmail.trim().toLowerCase() || null,
    city: input.city.trim() || null,
    state: input.state.trim().toUpperCase() || null,
  };
}

export function useInstitutions() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await http.all<InstitutionDto>('/institutions')).map(toInstitution),
  });
}

/** Os administradores vinculados: as contas com o papel na instituição (user-directory). */
export function useInstitutionAdmins(institutionId: string | null) {
  return useQuery({
    queryKey: ['institutions', institutionId, 'admins'],
    queryFn: async () => {
      const page = await http.page<DirectoryUser>('/users', {
        institutionId,
        role: 'INSTITUTION_ADMIN',
        pageSize: 100,
      });
      return page.items.map((user, index): InstitutionAdmin => ({
        id: user.id,
        name: user.name,
        email: user.email ?? '',
        initials: makeInitials(user.name),
        tone: tones[index % tones.length] ?? 'primary',
      }));
    },
    enabled: Boolean(institutionId),
  });
}

export function useInstitutionMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });

  return {
    create: useMutation({
      mutationFn: async (input: InstitutionInput & { active: boolean }) => {
        const created = await http.post<InstitutionDto>('/institutions', toBody(input));
        if (!input.active) await http.post(`/institutions/${created.id}/deactivation`);
        return toInstitution(created);
      },
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: InstitutionInput }) =>
        http.patch<InstitutionDto>(`/institutions/${id}`, toBody(input)),
      onSuccess: refresh,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        http.post(`/institutions/${id}/${active ? 'activation' : 'deactivation'}`),
      onSuccess: refresh,
    }),
    /**
     * RF-INS-002: designa quem já tem conta na instituição; sem conta, emite convite
     * dirigido de administrador institucional (RF-ACS-009) e devolve o link.
     */
    assignAdmin: useMutation({
      mutationFn: async ({ institutionId, email }: { institutionId: string; email: string }) => {
        const normalized = email.trim().toLowerCase();
        const found = await http.page<DirectoryUser>('/users', {
          institutionId,
          search: normalized,
          pageSize: 20,
        });
        const user = found.items.find((item) => item.email?.toLowerCase() === normalized);
        if (user) {
          await http.post(`/institutions/${institutionId}/admins`, { userId: user.id });
          return { kind: 'assigned' as const };
        }
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        const issued = await http.post<{ id: string; url: string }>(
          `/institutions/${institutionId}/invitations`,
          { roleCode: 'INSTITUTION_ADMIN', targetEmail: normalized, expiresAt },
        );
        return { kind: 'invited' as const, url: issued.url };
      },
      onSuccess: (_result, { institutionId }) =>
        client.invalidateQueries({ queryKey: ['institutions', institutionId, 'admins'] }),
    }),
    revokeAdmin: useMutation({
      mutationFn: ({ institutionId, userId }: { institutionId: string; userId: string }) =>
        http.delete(`/institutions/${institutionId}/admins/${userId}`),
      onSuccess: (_result, { institutionId }) =>
        client.invalidateQueries({ queryKey: ['institutions', institutionId, 'admins'] }),
    }),
  };
}
