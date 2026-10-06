import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@shared/ui';

import { makeInitials, type Institution, type InstitutionStatus } from '../model/institution';

type NewInstitutionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (institution: Institution) => void;
};

type FormState = {
  name: string;
  acronym: string;
  legalId: string;
  domain: string;
  supportEmail: string;
  city: string;
  state: string;
  status: InstitutionStatus;
  adminName: string;
  adminEmail: string;
};

const initialForm: FormState = {
  name: '',
  acronym: '',
  legalId: '',
  domain: '',
  supportEmail: '',
  city: '',
  state: '',
  status: 'active',
  adminName: '',
  adminEmail: '',
};

export function NewInstitutionDialog({ open, onCreate, onOpenChange }: NewInstitutionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [form, setForm] = useState<FormState>(initialForm);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onCreate({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      acronym: form.acronym.trim().toUpperCase(),
      legalId: form.legalId.trim(),
      domain: form.domain.trim().toLowerCase(),
      supportEmail: form.supportEmail.trim().toLowerCase(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      status: form.status,
      createdAt: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
        .format(new Date())
        .replace('.', ''),
      coursesActive: 0,
      admins:
        form.adminName.trim() && form.adminEmail.trim()
          ? [
              {
                id: crypto.randomUUID(),
                initials: makeInitials(form.adminName),
                name: form.adminName.trim(),
                email: form.adminEmail.trim().toLowerCase(),
                tone: 'primary',
              },
            ]
          : [],
    });

    setForm(initialForm);
    onOpenChange(false);
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(94vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-8 shadow-2xl"
        >
          <Dialog.Title className="text-2xl font-extrabold text-vince-text" id={titleId}>
            Nova instituição
          </Dialog.Title>
          <Dialog.Description className="mt-2 max-w-2xl text-vince-muted" id={descriptionId}>
            Registre a fronteira institucional de dados, suporte e administradores iniciais.
          </Dialog.Description>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Nome institucional
                </span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => updateForm('name', event.target.value)}
                  required
                  value={form.name}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">Sigla</span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 uppercase text-vince-text focus:border-vince-primary"
                  maxLength={8}
                  onChange={(event) => updateForm('acronym', event.target.value)}
                  required
                  value={form.acronym}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  CNPJ / identificador
                </span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => updateForm('legalId', event.target.value)}
                  required
                  value={form.legalId}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Domínio institucional
                </span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => updateForm('domain', event.target.value)}
                  placeholder="instituicao.edu.br"
                  required
                  value={form.domain}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_96px]">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">Cidade</span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                  onChange={(event) => updateForm('city', event.target.value)}
                  required
                  value={form.city}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">UF</span>
                <input
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 uppercase text-vince-text focus:border-vince-primary"
                  maxLength={2}
                  onChange={(event) => updateForm('state', event.target.value)}
                  required
                  value={form.state}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                E-mail de suporte
              </span>
              <input
                className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                onChange={(event) => updateForm('supportEmail', event.target.value)}
                required
                type="email"
                value={form.supportEmail}
              />
            </label>

            <div className="rounded-lg border border-vince-border bg-[#fffafa] p-5">
              <p className="font-bold text-vince-text">Administrador institucional inicial</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">Nome</span>
                  <input
                    className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                    onChange={(event) => updateForm('adminName', event.target.value)}
                    value={form.adminName}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">E-mail</span>
                  <input
                    className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                    onChange={(event) => updateForm('adminEmail', event.target.value)}
                    type="email"
                    value={form.adminEmail}
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Status</span>
              <select
                className="h-11 w-full rounded-padrao border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary"
                onChange={(event) => updateForm('status', event.target.value as InstitutionStatus)}
                value={form.status}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>

            <div className="flex justify-end gap-3 pt-3">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit">Salvar instituição</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
