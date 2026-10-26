import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@shared/ui';

export const academicFieldClass =
  'h-11 w-full min-w-0 rounded-lg border border-vince-border bg-white px-4 text-vince-text focus:border-vince-primary';

export function AcademicActionDialog({
  children,
  description,
  onOpenChange,
  onSubmit,
  open,
  submitLabel = 'Salvar',
  title,
}: {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  submitLabel?: string;
  title: string;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(94vw,600px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-2xl font-extrabold text-vince-text">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-vince-muted">{description}</Dialog.Description>
          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            {children}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit">{submitLabel}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AcademicField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold text-vince-muted">{label}</span>
      <input className={academicFieldClass} {...props} />
    </label>
  );
}
