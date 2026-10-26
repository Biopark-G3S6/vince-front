import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

import { Button, ConfirmDialog, TrashIcon } from '@shared/ui';

import {
  makeInitials,
  validateInstitution,
  type Institution,
  type InstitutionAdmin,
} from '../model/institution';

type InstitutionDetailsDialogProps = {
  institution: Institution | null;
  onClose: () => void;
  onDeactivate: (institutionId: string) => void;
  onUpdate: (institution: Institution) => void;
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
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
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
    setAdminName('');
    setAdminEmail('');
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

    onUpdate({
      ...currentInstitution,
      name: form.name.trim(),
      acronym: form.acronym.trim().toUpperCase(),
      legalId: form.legalId.trim(),
      domain: form.domain.trim().toLowerCase(),
      supportEmail: form.supportEmail.trim().toLowerCase(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
    });
    toast.success('Dados da instituição atualizados.');
  }

  function assignAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminName.trim() || !adminEmail.trim()) {
      toast.error('Informe o nome e o e-mail do administrador.');
      return;
    }

    const email = adminEmail.trim().toLowerCase();
    const exists = currentInstitution.admins.some((admin) => admin.email.toLowerCase() === email);

    if (exists) {
      toast.error('Este administrador já está vinculado à instituição.');
      return;
    }

    const newAdmin: InstitutionAdmin = {
      id: crypto.randomUUID(),
      initials: makeInitials(adminName),
      name: adminName.trim(),
      email,
      tone: 'primary',
    };

    onUpdate({ ...currentInstitution, admins: [...currentInstitution.admins, newAdmin] });
    setAdminName('');
    setAdminEmail('');
    toast.success('Administrador designado.');
  }

  function revokeAdmin(adminId: string) {
    onUpdate({
      ...currentInstitution,
      admins: currentInstitution.admins.filter((admin) => admin.id !== adminId),
    });
    toast.success('Vínculo do administrador revogado.');
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
            <SummaryMetric label="Cursos ativos" value={String(currentInstitution.coursesActive)} />
            <SummaryMetric
              label="Administradores"
              value={String(currentInstitution.admins.length)}
            />
            <SummaryMetric label="Domínio" value={currentInstitution.domain} />
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
                maxLength={8}
                onChange={(value) => updateForm('acronym', value)}
                required
                value={form.acronym}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="CNPJ / identificador"
                onChange={(value) => updateForm('legalId', value)}
                required
                value={form.legalId}
              />
              <Field
                label="E-mail de suporte"
                onChange={(value) => updateForm('supportEmail', value)}
                required
                type="email"
                value={form.supportEmail}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_86px]">
              <Field
                label="Domínio"
                onChange={(value) => updateForm('domain', value)}
                required
                value={form.domain}
              />
              <Field
                label="Cidade"
                onChange={(value) => updateForm('city', value)}
                required
                value={form.city}
              />
              <Field
                label="UF"
                maxLength={2}
                onChange={(value) => updateForm('state', value)}
                required
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
              {currentInstitution.admins.length > 0 ? (
                currentInstitution.admins.map((admin) => (
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
                      onClick={() => revokeAdmin(admin.id)}
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
              className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              onSubmit={assignAdmin}
            >
              <Field
                label="Nome do administrador"
                onChange={setAdminName}
                required
                value={adminName}
              />
              <Field
                label="E-mail do administrador"
                onChange={setAdminEmail}
                required
                type="email"
                value={adminEmail}
              />
              <Button className="self-end" type="submit">
                Designar
              </Button>
            </form>
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
                  toast.success('Instituição reativada.');
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
          toast.success('Instituição desativada.');
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
