export type InstitutionStatus = 'active' | 'inactive';

export type InstitutionAdmin = {
  id: string;
  email: string;
  initials: string;
  name: string;
  tone: 'light' | 'primary' | 'dark';
};

/** Um convite de ingresso da instituição (`GET /institutions/:id/invitations`). */
export type InstitutionInvitation = {
  id: string;
  form: 'DIRECTED' | 'OPEN';
  targetEmail: string | null;
  roleCode: string;
  state: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED';
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
};

export type Institution = {
  id: string;
  name: string;
  acronym: string;
  legalId: string;
  domain: string;
  supportEmail: string;
  city: string;
  state: string;
  status: InstitutionStatus;
};

export function makeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Regras do contrato (`institution-location`): nome e sigla obrigatórios; os demais, opcionais. */
export function validateInstitution(
  institution: Pick<
    Institution,
    'name' | 'acronym' | 'legalId' | 'domain' | 'supportEmail' | 'city' | 'state'
  >,
) {
  if (!institution.name.trim() || !institution.acronym.trim()) {
    return 'Informe o nome e a sigla da instituição.';
  }
  if (institution.state.trim() && !/^[a-z]{2}$/i.test(institution.state.trim())) {
    return 'Informe a UF com duas letras.';
  }
  if (
    institution.domain.trim() &&
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(institution.domain.trim())
  ) {
    return 'Informe apenas o domínio institucional, como instituicao.edu.br.';
  }
  if (institution.legalId.trim() && institution.legalId.replace(/\D/g, '').length !== 14) {
    return 'O CNPJ deve ter 14 dígitos.';
  }
  return null;
}
