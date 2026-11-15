import { useState } from 'react';
import type { FormEvent } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { IDENTITY_KEY } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { http } from '@shared/api/http';
import { ArrowRightIcon, LockIcon, WarningIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

type LoginPageProps = {
  onAuthenticated: () => void;
};

const authenticationError =
  'O e-mail ou senha fornecidos são inválidos. Por favor, verifique suas credenciais e tente novamente.';

const inactiveInstitutionError =
  'A instituição vinculada a esta conta está desativada. Entre em contato com o suporte institucional.';

const unavailableError = 'Não foi possível entrar agora. Tente novamente em instantes.';

/** RF-ACS-001: autenticação por sessão opaca em cookie (ADR-0013). */
export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await http.post('/sessions', { email: email.trim(), password }, { silent401: true });
      setErrorMessage('');
      window.sessionStorage.removeItem('vinceart.article');
      window.sessionStorage.removeItem('vinceart.editor.identity');
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== IDENTITY_KEY[0] });
      await queryClient.refetchQueries({ queryKey: IDENTITY_KEY });
      onAuthenticated();
    } catch (error) {
      const code = getErrorCode(error);
      setErrorMessage(
        code === 'INSTITUTION_INACTIVE'
          ? inactiveInstitutionError
          : code === 'AUTHENTICATION_FAILED' || code === 'VALIDATION_FAILED'
            ? authenticationError
            : unavailableError,
      );
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="mt-5 text-4xl font-black leading-tight">
            Um espaço para criar, colaborar e compartilhar conhecimento.
          </h2>
          <div className="mt-10 space-y-4 text-sm leading-6 text-white/78">
            <p>Organize seus artigos e acompanhe cada etapa da pesquisa.</p>
            <p>Converse com sua equipe e receba orientações em um só lugar.</p>
            <p>Prepare seu trabalho para os eventos da instituição.</p>
          </div>
        </aside>

        <div className="px-5 py-8 sm:px-10 lg:py-12">
          <BrandMark align="center" className="mb-10" />

          <div className="text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
              <LockIcon className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-vince-text">Entrar na plataforma</h1>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
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
                aria-invalid={Boolean(errorMessage)}
                className="h-12 w-full rounded-padrao border border-vince-border bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage('');
                }}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Senha</span>
              <input
                autoComplete="current-password"
                aria-invalid={Boolean(errorMessage)}
                className="h-12 w-full rounded-padrao border border-vince-border bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage('');
                }}
                required
                type="password"
                value={password}
              />
            </label>

            <div className="flex justify-end">
              <a
                className="font-semibold text-vince-primary hover:underline"
                href="/recuperar-acesso"
              >
                Esqueci minha senha
              </a>
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-padrao bg-vince-primary text-lg font-bold text-white transition-colors hover:bg-[#571424] disabled:opacity-60"
              disabled={submitting}
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
