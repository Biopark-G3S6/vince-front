import { useState, type FormEvent, type ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 print:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-5 shadow-xl sm:p-6 print:hidden"
        >
          <Dialog.Title className="text-lg font-extrabold text-vince-primary">{title}</Dialog.Title>
          <div className="mt-4 text-sm">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass =
  'h-11 min-w-0 w-full rounded border border-vince-border px-3 text-base outline-none focus:border-vince-primary';
const primaryBtn =
  'min-h-11 rounded bg-vince-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#571424]';
const ghostBtn =
  'min-h-11 rounded border border-vince-border px-4 py-2 text-sm text-vince-muted hover:bg-vince-tertiary';

export function LinkDialog({
  open,
  initialUrl,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialUrl: string;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  return (
    <Modal onOpenChange={(o) => !o && onClose()} open={open} title="Inserir link">
      {/* Remonta o formulário a cada abertura, reiniciando o campo. */}
      {open && <LinkForm initialUrl={initialUrl} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function LinkForm({
  initialUrl,
  onClose,
  onSubmit,
}: {
  initialUrl: string;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(url.trim());
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-1">
        <span className="text-xs text-vince-muted">Endereço (deixe vazio para remover o link)</span>
        <input
          autoFocus
          className={inputClass}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemplo.com"
          value={url}
        />
      </label>
      <div className="flex justify-end gap-2">
        <button className={ghostBtn} onClick={onClose} type="button">
          Cancelar
        </button>
        <button className={primaryBtn} type="submit">
          Aplicar
        </button>
      </div>
    </form>
  );
}

export function ImageUrlDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  return (
    <Modal onOpenChange={(o) => !o && onClose()} open={open} title="Imagem por endereço">
      {open && <ImageUrlForm onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function ImageUrlForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim());
      }}
    >
      <input
        autoFocus
        className={inputClass}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://exemplo.com/imagem.png"
        value={url}
      />
      <div className="flex justify-end gap-2">
        <button className={ghostBtn} onClick={onClose} type="button">
          Cancelar
        </button>
        <button className={primaryBtn} type="submit">
          Inserir
        </button>
      </div>
    </form>
  );
}

export function TableDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rows: number, cols: number) => void;
}) {
  return (
    <Modal onOpenChange={(o) => !o && onClose()} open={open} title="Inserir tabela">
      {open && <TableForm onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function TableForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (r: number, c: number) => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const clamp = (n: number) => Math.min(20, Math.max(1, n || 1));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(clamp(rows), clamp(cols));
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-vince-muted">Linhas</span>
          <input
            className={inputClass}
            max={20}
            min={1}
            onChange={(e) => setRows(+e.target.value)}
            type="number"
            value={rows}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-vince-muted">Colunas</span>
          <input
            className={inputClass}
            max={20}
            min={1}
            onChange={(e) => setCols(+e.target.value)}
            type="number"
            value={cols}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button className={ghostBtn} onClick={onClose} type="button">
          Cancelar
        </button>
        <button className={primaryBtn} type="submit">
          Inserir
        </button>
      </div>
    </form>
  );
}

export function InfoDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal onOpenChange={(o) => !o && onClose()} open={open} title={title}>
      {children}
      <div className="mt-5 flex justify-end">
        <button className={primaryBtn} onClick={onClose} type="button">
          Fechar
        </button>
      </div>
    </Modal>
  );
}
