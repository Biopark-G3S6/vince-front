import { useState } from 'react';
import type { FormEvent } from 'react';

import { ArrowRightIcon, WarningIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

type LoginPageProps = {
  onAuthenticated: () => void;
};

const authenticationError =
  'O e-mail ou senha fornecidos são inválidos. Por favor, verifique suas credenciais e tente novamente.';

export function LoginPage({ onAuthenticated }: LoginPageProps) {
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

    setErrorMessage(authenticationError);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10"
      style={{ backgroundImage: 'url("/assets/auth-campus-background.png")' }}
    >
      <section className="w-full max-w-[474px] rounded-lg bg-white px-12 py-14 shadow-[0_18px_60px_rgb(57_38_43/0.14)]">
        <BrandMark align="center" className="mb-12" />

        <h1 className="mb-8 text-center text-2xl font-extrabold text-vince-text">
          Entrar na plataforma
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {errorMessage && (
            <div
              className="flex gap-3 border border-red-500 bg-red-100 px-5 py-5 text-red-950"
              role="alert"
            >
              <WarningIcon className="mt-1 h-6 w-6 shrink-0 text-red-700" />
              <div>
                <p className="font-bold">Falha na autenticação</p>
                <p className="mt-1 leading-7">{errorMessage}</p>
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-base font-medium text-vince-muted">E-mail</span>
            <input
              autoComplete="email"
              className="h-12 w-full border border-red-500 bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-base font-medium text-vince-muted">Senha</span>
            <input
              autoComplete="current-password"
              className="h-12 w-full border border-red-500 bg-white px-5 text-lg text-vince-text transition-colors focus:border-vince-primary"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-base text-vince-muted">
              <input
                checked={remember}
                className="h-5 w-5 rounded border-vince-border text-vince-primary"
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              Lembrar de mim
            </label>
            <a className="font-semibold text-vince-primary hover:underline" href="/recuperar-acesso">
              Esqueci minha senha
            </a>
          </div>

          <button
            className="flex h-14 w-full items-center justify-center gap-3 bg-vince-primary text-xl font-bold text-white transition-colors hover:bg-[#571424]"
            type="submit"
          >
            Entrar
            <ArrowRightIcon className="h-6 w-6" />
          </button>
        </form>
      </section>
    </main>
  );
}
