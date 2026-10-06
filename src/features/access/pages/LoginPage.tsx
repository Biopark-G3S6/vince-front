import { useState } from 'react';
import type { FormEvent } from 'react';

import { ArrowRightIcon, LockIcon, WarningIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

type LoginPageProps = {
  onAuthenticated: () => void;
  onPasswordSetup: () => void;
};

const authenticationError =
  'O e-mail ou senha fornecidos são inválidos. Por favor, verifique suas credenciais e tente novamente.';

const inactiveInstitutionError =
  'A instituição vinculada a esta conta está desativada. Entre em contato com o suporte institucional.';

export function LoginPage({ onAuthenticated, onPasswordSetup }: LoginPageProps) {
  const [email, setEmail] = useState('usuario@instituicao.edu.br');
  const [password, setPassword] = useState('senha123');
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState(authenticationError);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim() === 'admin@vinceart.edu.br' && password === 'vince123') {
      setErrorMessage('');
      onAuthenticated();
      return;
    }

    if (email.trim() === 'convite@vinceart.edu.br') {
      setErrorMessage('');
      onPasswordSetup();
      return;
    }

    if (email.trim() === 'inativo@vinceart.edu.br') {
      setErrorMessage(inactiveInstitutionError);
      return;
    }

    setErrorMessage(authenticationError);
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center px-4 py-10"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgb(255 255 255 / 0.88), rgb(255 255 255 / 0.62)), url("/assets/landing-library-hero.png")',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.78),transparent_36%),linear-gradient(120deg,rgb(107_30_46/0.06),transparent_48%)]" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_24px_90px_rgb(57_38_43/0.18)] lg:grid-cols-[0.9fr_1fr]">
        <aside className="hidden bg-vince-primary px-10 py-12 text-white lg:block">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
            Academic Portal
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight">
            Acesso institucional com fronteiras claras de permissão.
          </h1>
          <div className="mt-10 space-y-4 text-sm leading-6 text-white/78">
            <p>Credenciais inválidas e contas inexistentes recebem a mesma resposta.</p>
            <p>Instituições inativas bloqueiam autenticação imediatamente.</p>
            <p>Permissões efetivas são resolvidas pelo servidor a cada requisição.</p>
          </div>
        </aside>

        <div className="px-8 py-10 sm:px-12 lg:px-14 lg:py-12">
          <BrandMark align="center" className="mb-10" />

          <div className="text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
              <LockIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold text-vince-text">Entrar na plataforma</h2>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div
                className="flex gap-3 rounded-padrao border border-red-300 bg-red-50 px-5 py-4 text-red-950"
                role="alert"
              >
                <WarningIcon className="mt-1 h-5 w-5 shrink-0 text-red-700" />
                <div>
                  <p className="font-bold">Falha na autenticação</p>
                  <p className="mt-1 text-sm leading-6">{errorMessage}</p>
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">E-mail</span>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-padrao border border-vince-border bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Senha</span>
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-padrao border border-vince-border bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm font-medium text-vince-muted">
                <input
                  checked={remember}
                  className="h-5 w-5 rounded border-vince-border text-vince-primary"
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                Lembrar de mim
              </label>
              <a
                className="font-semibold text-vince-primary hover:underline"
                href="/recuperar-acesso"
              >
                Esqueci minha senha
              </a>
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-padrao bg-vince-primary text-lg font-bold text-white transition-colors hover:bg-[#571424]"
              type="submit"
            >
              Entrar
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
