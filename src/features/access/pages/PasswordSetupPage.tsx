import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { ArrowRightIcon, CheckCircleIcon, LockIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

export function PasswordSetupPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saved, setSaved] = useState(false);

  const checks = useMemo(
    () => [
      { label: 'Mínimo de 10 caracteres', valid: password.length >= 10 },
      {
        label: 'Letra maiúscula e minúscula',
        valid: /[A-Z]/.test(password) && /[a-z]/.test(password),
      },
      {
        label: 'Número e caractere especial',
        valid: /\d/.test(password) && /[^A-Za-z0-9]/.test(password),
      },
      {
        label: 'Confirmação igual à senha',
        valid: password.length > 0 && password === confirmation,
      },
    ],
    [confirmation, password],
  );

  const canSubmit = checks.every((check) => check.valid);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaved(true);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(255 255 255 / 0.84), rgb(255 255 255 / 0.68)), url("/assets/landing-library-hero.png")',
      }}
    >
      <section className="w-full max-w-[520px] rounded-lg border border-white/70 bg-white px-5 py-8 shadow-[0_24px_80px_rgb(57_38_43/0.16)] sm:px-10 sm:py-12">
        <BrandMark align="center" className="mb-10" />
        <div className="text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
            <LockIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-vince-text">Definir senha</h1>
          <p className="mt-3 text-vince-muted">
            Experimente a definição de senha no ambiente de demonstração.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vince-muted">Nova senha</span>
            <input
              autoComplete="new-password"
              minLength={10}
              className="h-12 w-full rounded-padrao border border-vince-border px-4 text-lg text-vince-text focus:border-vince-primary"
              onChange={(event) => {
                setPassword(event.target.value);
                setSaved(false);
              }}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vince-muted">
              Confirmar senha
            </span>
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-padrao border border-vince-border px-4 text-lg text-vince-text focus:border-vince-primary"
              onChange={(event) => {
                setConfirmation(event.target.value);
                setSaved(false);
              }}
              required
              type="password"
              value={confirmation}
            />
          </label>

          <div className="space-y-2 rounded-lg border border-vince-border bg-[#fffafa] p-4">
            {checks.map((check) => (
              <p
                className={
                  check.valid
                    ? 'flex items-center gap-2 text-sm font-semibold text-green-800'
                    : 'flex items-center gap-2 text-sm text-vince-muted'
                }
                key={check.label}
              >
                <CheckCircleIcon className="h-4 w-4" />
                {check.label}
              </p>
            ))}
          </div>

          <button
            className="flex h-12 w-full items-center justify-center gap-3 rounded-padrao bg-vince-primary font-bold text-white transition-colors hover:bg-[#571424] disabled:bg-[#b9949c]"
            disabled={!canSubmit}
            type="submit"
          >
            Concluir definição
            <ArrowRightIcon className="h-5 w-5" />
          </button>

          {saved && (
            <p
              role="status"
              className="rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
            >
              Senha validada nesta demonstração. A conta de demonstração mantém a senha vince123.
            </p>
          )}
          <a
            className="block py-2 text-center font-semibold text-vince-primary hover:underline"
            href="/entrar"
          >
            Voltar para o login
          </a>
        </form>
      </section>
    </main>
  );
}
