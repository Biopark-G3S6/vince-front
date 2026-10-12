import type { ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import { Button } from './button';

type ConfirmDialogProps = {
  cancelLabel: string;
  children?: ReactNode;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending?: boolean;
  title: string;
};

/** Confirmação de ato de efeito relevante. Foco e teclado vêm da primitiva do Radix. */
export function ConfirmDialog({
  cancelLabel,
  children,
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  pending = false,
  title,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-8 shadow-2xl">
          <Dialog.Title className="text-2xl font-extrabold text-vince-text">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 leading-7 text-vince-muted">
            {description}
          </Dialog.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-8 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </Dialog.Close>
            <Button disabled={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
