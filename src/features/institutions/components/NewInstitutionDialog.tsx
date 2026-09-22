import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@shared/ui';

import type { Institution, InstitutionStatus } from '../model/institution';

type NewInstitutionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (institution: Institution) => void;
};

type FormState = {
  name: string;
  city: string;
  state: string;
  status: InstitutionStatus;
  admin: string;
};

const initialForm: FormState = {
  name: '',
  city: '',
  state: '',
  status: 'active',
  admin: '',
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
      admins: form.admin.trim()
        ? [
            {
              initials: form.admin
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join(''),
              name: form.admin.trim(),
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45" />
        <Dialog.Content
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-vince-border bg-white p-7 shadow-2xl"
        >
          <Dialog.Title className="text-2xl font-extrabold text-vince-text" id={titleId}>
            Nova instituição
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-vince-muted" id={descriptionId}>
            Cadastre uma instituição para administração no portal acadêmico.
          </Dialog.Description>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Nome</span>
              <input
                className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                onChange={(event) => updateForm('name', event.target.value)}
                required
                value={form.name}
              />
            </label>

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
                  className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                  maxLength={2}
                  onChange={(event) => updateForm('state', event.target.value)}
                  required
                  value={form.state}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Administrador responsável
              </span>
              <input
                className="h-11 w-full rounded-padrao border border-vince-border px-4 text-vince-text focus:border-vince-primary"
                onChange={(event) => updateForm('admin', event.target.value)}
                placeholder="Nome completo"
                value={form.admin}
              />
            </label>

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
