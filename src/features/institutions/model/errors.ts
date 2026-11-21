import { getErrorCode } from '@shared/api/apiError';
import { fieldErrorsOf } from '@shared/api/http';

const fieldLabel: Record<string, string> = {
  name: 'nome',
  code: 'sigla',
  cnpj: 'CNPJ',
  website: 'domínio',
  contactEmail: 'e-mail de suporte',
  city: 'cidade',
  state: 'UF',
  targetEmail: 'e-mail do administrador',
};

/** O código da API traduzido para a tela (ADR-0026 §13). */
export function describeInstitutionError(error: unknown): string {
  const code = getErrorCode(error);
  if (code === 'VALIDATION_FAILED') {
    const fields = fieldErrorsOf(error);
    const duplicated = fields.find(
      (item) => item.code === 'DUPLICATE' || item.code === 'ALREADY_USED',
    );
    if (duplicated)
      return `Já existe instituição com este ${fieldLabel[duplicated.field] ?? duplicated.field}.`;
    const names = fields.map((item) => fieldLabel[item.field] ?? item.field);
    return names.length > 0 ? `Revise: ${names.join(', ')}.` : 'Revise os dados informados.';
  }
  if (code === 'EMAIL_ALREADY_REGISTERED')
    return 'Este e-mail já pertence a uma conta de outra instituição; ela não pode ser convidada aqui.';
  if (code === 'PERMISSION_DENIED') return 'Você não tem permissão para esta operação.';
  if (code === 'INSTITUTION_INACTIVE') return 'A instituição está desativada.';
  if (code === 'RESOURCE_NOT_FOUND') return 'Registro não encontrado.';
  return 'Não foi possível concluir a operação.';
}
