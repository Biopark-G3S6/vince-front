import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Button, ConfirmDialog, TrashIcon } from '@shared/ui';

import {
  useInstitutionAdmins,
  useInstitutionInvitations,
  useInstitutionMutations,
  type InstitutionInput,
} from '../api/institutionApi';
import { describeInstitutionError } from '../model/errors';
import {
  validateInstitution,
  type Institution,
  type InstitutionInvitation,
} from '../model/institution';

const invitationState: Record<
  InstitutionInvitation['state'],
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Pendente', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  EXHAUSTED: { label: 'Aceito', className: 'bg-green-50 text-green-800 border-green-200' },
  EXPIRED: { label: 'Expirado', className: 'bg-[#f8eeee] text-vince-muted border-vince-border' },
  REVOKED: { label: 'Revogado', className: 'bg-[#f8eeee] text-vince-muted border-vince-border' },
};

const roleLabel: Record<string, string> = {
  INSTITUTION_ADMIN: 'Administrador institucional',
  COORDINATOR: 'Coordenador',
  PROFESSOR: 'Professor',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

type InstitutionDetailsDialogProps = {
  institution: Institution | null;
  onClose: () => void;
  onDeactivate: (institutionId: string) => void;
  onUpdate: (institutionId: string, input: InstitutionInput) => void;
};

type InstitutionForm = Pick<
  Institution,
  'name' | 'acronym' | 'legalId' | 'domain' | 'supportEmail' | 'city' | 'state'
>;

const emptyForm: InstitutionForm = {
  name: '',
  acronym: '',
  legalId: '',
  domain: '',
  supportEmail: '',
  city: '',
  state: '',
};

export function InstitutionDetailsDialog({
  institution,
  onClose,
  onDeactivate,
  onUpdate,
}: InstitutionDetailsDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [form, setForm] = useState<InstitutionForm>(emptyForm);
  const [adminEmail, setAdminEmail] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [validDays, setValidDays] = useState(7);
  const admins = useInstitutionAdmins(institution?.id ?? null).data ?? [];
  const invitations = useInstitutionInvitations(institution?.id ?? null);
  const mutations = useInstitutionMutations();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const loadedInstitutionId = useRef<string | null>(null);

  useEffect(() => {
    if (!institution) {
      loadedInstitutionId.current = null;
      return;
    }
    if (loadedInstitutionId.current === institution.id) return;
    loadedInstitutionId.current = institution.id;

    setForm({
      name: institution.name,
      acronym: institution.acronym,
      legalId: institution.legalId,
      domain: institution.domain,
      supportEmail: institution.supportEmail,
      city: institution.city,
      state: institution.state,
    });
    setAdminEmail('');
    setInvitationUrl('');
    setConfirmDeactivate(false);
  }, [institution]);

  if (!institution) {
    return null;
  }

  const currentInstitution = institution;

  function updateForm<K extends keyof InstitutionForm>(key: K, value: InstitutionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateInstitution(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    onUpdate(currentInstitution.id, form);
  }

  async function assignAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminEmail.trim()) return;

    try {
      const result = await mutations.assignAdmin.mutateAsync({
        institutionId: currentInstitution.id,
        email: adminEmail,
        validDays,
      });
      setAdminEmail('');
      if (result.kind === 'invited') {
        setInvitationUrl(`${window.location.origin}${result.url}`);
        toast.success('Sem conta na instituição: convite de administrador emitido.');
      } else {
        setInvitationUrl('');
        toast.success('Administrador designado.');
      }
    } catch (error) {
      toast.error(describeInstitutionError(error));
    }
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar; selecione o link e copie manualmente.');
    }
  }

  async function revokeInvitation(invitationId: string) {
    try {
      await mutations.revokeInvitation.mutateAsync({
        institutionId: currentInstitution.id,
        invitationId,
      });
      toast.success('Convite revogado.');
    } catch (error) {
      toast.error(describeInstitutionError(error));
    }
  }

  async function revokeAdmin(adminId: string) {
    try {
      await mutations.revokeAdmin.mutateAsync({
        institutionId: currentInstitution.id,
        userId: adminId,
      });
      toast.success('Vínculo do administrador revogado.');
    } catch (error) {
      toast.error(describeInstitutionError(error));
    }
  }

  const inactive = currentInstitution.status === 'inactive';

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="fixed right-0 top-0 z-50 h-dvh w-[min(100vw,760px)] overflow-y-auto border-l border-vince-border bg-white p-5 shadow-2xl sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Dialog.Title className="text-2xl font-extrabold text-vince-text" id={titleId}>
                {currentInstitution.name}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-vince-muted" id={descriptionId}>
                Manutenção institucional, administradores e configurações gerais.
              </Dialog.Description>
            </div>
            <span
              className={
                inactive
                  ? 'inline-flex rounded-full border border-vince-border bg-[#f8eeee] px-3 py-1 text-sm font-semibold text-vince-muted'
                  : 'inline-flex rounded-full border border-green-200 bg-green-100 px-3 py-1 text-sm font-semibold text-green-800'
              }
            >
              {inactive ? 'Inativa' : 'Ativa'}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <SummaryMetric label="Sigla" value={currentInstitution.acronym} />
            <SummaryMetric label="Administradores" value={String(admins.length)} />
            <SummaryMetric label="Domínio" value={currentInstitution.domain || '—'} />
          </div>

          <form
            className="mt-8 space-y-5 rounded-lg border border-vince-border p-5"
            onSubmit={saveInstitution}
          >
            <p className="font-bold text-vince-text">Dados de identificação</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field
                label="Nome"
                onChange={(value) => updateForm('name', value)}
                required
                value={form.name}
              />
              <Field
                label="Sigla"
                maxLength={20}
                onChange={(value) => updateForm('acronym', value)}
                required
                value={form.acronym}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="CNPJ / identificador"
                onChange={(value) => updateForm('legalId', value)}
                value={form.legalId}
              />
              <Field
                label="E-mail de suporte"
                onChange={(value) => updateForm('supportEmail', value)}
                type="email"
                value={form.supportEmail}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_86px]">
              <Field
                label="Domínio"
                onChange={(value) => updateForm('domain', value)}
                value={form.domain}
              />
              <Field
                label="Cidade"
                onChange={(value) => updateForm('city', value)}
                value={form.city}
              />
              <Field
                label="UF"
                maxLength={2}
                onChange={(value) => updateForm('state', value)}
                value={form.state}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>

          <section className="mt-6 rounded-lg border border-vince-border p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-vince-text">Administradores institucionais</h3>
                <p className="mt-1 text-sm text-vince-muted">
                  O papel é global; o escopo é definido pelo vínculo com esta instituição.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <div
                    className="flex flex-col gap-3 rounded-lg border border-[#ead9dd] bg-[#fffafa] p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={admin.id}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vince-primary text-sm font-bold text-white">
                        {admin.initials}
                      </span>
                      <div className="min-w-0 break-words">
                        <p className="font-semibold text-vince-text">{admin.name}</p>
                        <p className="text-sm text-vince-muted">{admin.email}</p>
                      </div>
                    </div>
                    <Button
                      aria-label={`Revogar administrador ${admin.name}`}
                      onClick={() => void revokeAdmin(admin.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Revogar
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-vince-border p-4 text-sm text-vince-muted">
                  Nenhum administrador ativo designado.
                </p>
              )}
            </div>

            <form
              className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_auto]"
              onSubmit={(event) => void assignAdmin(event)}
            >
              <Field
                label="E-mail do administrador"
                onChange={setAdminEmail}
                required
                type="email"
                value={adminEmail}
              />
              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Validade do convite
                </span>
                <select
                  className="h-11 w-full rounded-padrao border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary"
                  onChange={(event) => setValidDays(Number(event.target.value))}
                  value={validDays}
                >
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                </select>
              </label>
              <Button className="self-end" disabled={mutations.assignAdmin.isPending} type="submit">
                Designar ou convidar
              </Button>
            </form>
            <p className="mt-2 text-sm text-vince-muted">
              Quem já tem conta na instituição é designado na hora; os demais recebem um convite e
              passam a administrar a instituição ao aceitá-lo.
            </p>
            {invitationUrl && (
              <div
                className="mt-3 flex flex-col gap-3 rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 sm:flex-row sm:items-center sm:justify-between"
                role="status"
              >
                <p className="break-all">
                  Link do convite: <span className="font-semibold">{invitationUrl}</span>
                </p>
                <Button
                  onClick={() => void copyInvitation()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Copiar link
                </Button>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-lg border border-vince-border p-5">
            <h3 className="font-bold text-vince-text">Convites</h3>
            <p className="mt-1 text-sm text-vince-muted">
              Convites de ingresso emitidos para esta instituição. O link só é exibido na emissão;
              um convite pendente pode ser revogado a qualquer momento.
            </p>
            <div className="mt-4 space-y-3">
              {invitations.isPending && (
                <p className="text-sm text-vince-muted" role="status">
                  Carregando convites…
                </p>
              )}
              {invitations.data?.length === 0 && (
                <p className="rounded-lg border border-dashed border-vince-border p-4 text-sm text-vince-muted">
                  Nenhum convite emitido.
                </p>
              )}
              {(invitations.data ?? []).map((invitation) => {
                const state =
                  invitation.state === 'EXHAUSTED' && invitation.form === 'OPEN'
                    ? { ...invitationState.EXHAUSTED, label: 'Esgotado' }
                    : invitationState[invitation.state];
                const label = invitation.targetEmail ?? 'Convite aberto';
                return (
                  <article
                    className="flex flex-col gap-3 rounded-lg border border-[#ead9dd] bg-[#fffafa] p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={invitation.id}
                  >
                    <div className="min-w-0 break-words">
                      <p className="font-semibold text-vince-text">{label}</p>
                      <p className="text-sm text-vince-muted">
                        {roleLabel[invitation.roleCode] ?? invitation.roleCode} · válido até{' '}
                        {formatDate(invitation.expiresAt)}
                        {invitation.form === 'OPEN' &&
                          ` · ${invitation.useCount}${invitation.maxUses ? `/${invitation.maxUses}` : ''} usos`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${state.className}`}
                      >
                        {state.label}
                      </span>
                      {invitation.state === 'ACTIVE' && (
                        <Button
                          aria-label={`Revogar convite de ${label}`}
                          disabled={mutations.revokeInvitation.isPending}
                          onClick={() => void revokeInvitation(invitation.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Revogar
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-vince-border bg-[#fffafa] p-5">
            <h3 className="font-bold text-vince-text">Controle de acesso</h3>
            <p className="mt-2 text-sm leading-6 text-vince-muted">
              Instituição desativada impede a autenticação dos seus usuários, preservando a
              fronteira de isolamento dos dados.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  if (!inactive) {
                    setConfirmDeactivate(true);
                    return;
                  }
                  onDeactivate(currentInstitution.id);
                }}
                type="button"
                variant={inactive ? 'primary' : 'outline'}
              >
                {inactive ? 'Reativar instituição' : 'Desativar instituição'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Fechar
                </Button>
              </Dialog.Close>
            </div>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desativar instituição"
        description="A desativação impede o acesso dos usuários vinculados a esta instituição. Os dados serão preservados."
        onConfirm={() => {
          onDeactivate(currentInstitution.id);
          setConfirmDeactivate(false);
        }}
        onOpenChange={setConfirmDeactivate}
        open={confirmDeactivate}
        title="Desativar instituição?"
      />
    </Dialog.Root>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
};

function SummaryMetric({ label, value }: SummaryMetricProps) {
  return (
    <div className="rounded-lg border border-vince-border bg-[#fffafa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-muted">{label}</p>
      <p className="mt-2 break-words text-xl font-extrabold text-vince-text">{value}</p>
    </div>
  );
}

type FieldProps = {
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'email' | 'text';
  value: string;
};

function Field({ label, maxLength, onChange, required = false, type = 'text', value }: FieldProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-vince-muted">{label}</span>
      <input
        className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
