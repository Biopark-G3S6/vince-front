import { useState } from 'react';
import type { FormEvent } from 'react';

import { ArrowLeftIcon, CheckCircleIcon, MailIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

export function RecoverAccessPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#fffafa] px-4 py-8 text-vince-text">
      <BrandMark compact className="mb-12 text-center" />

      <section className="w-full max-w-[540px] rounded-lg border border-vince-border bg-white px-8 py-10 shadow-[0_18px_50px_rgb(57_38_43/0.08)] sm:px-12 sm:py-14">
        <div className="text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
            <MailIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">Recuperar acesso</h1>
          <p className="mt-3 text-lg leading-7 text-vince-muted">
            Informe seu e-mail para receber o meio de redefinição com prazo de validade.
          </p>
        </div>

        <form className="mt-9 space-y-7" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vince-muted">E-mail</span>
            <span className="relative block">
              <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9f8b90]" />
              <input
                autoComplete="email"
                className="h-12 w-full rounded-padrao border border-vince-border bg-white pl-12 pr-4 text-lg text-vince-text transition-colors placeholder:text-[#a89b9e] focus:border-vince-primary"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSent(false);
                }}
                placeholder="exemplo@instituicao.edu.br"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <button
            className="h-12 w-full rounded-padrao bg-vince-primary text-base font-bold text-white transition-colors hover:bg-[#571424]"
            type="submit"
          >
            Enviar instruções
          </button>

          {sent && (
            <div className="rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
              <p className="flex items-start gap-2">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Se houver uma conta para esse e-mail, as instruções serão enviadas.
              </p>
              <a
                className="mt-3 inline-flex font-bold text-green-900 underline"
                href="/definir-senha"
              >
                Abrir fluxo de redefinição
              </a>
            </div>
          )}
        </form>

        <div className="mt-12 border-t border-[#e5dfe1] pt-9 text-center">
          <a
            className="inline-flex items-center gap-2 text-lg font-medium text-vince-muted hover:text-vince-primary"
            href="/entrar"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Voltar para o login
          </a>
        </div>
      </section>
    </main>
  );
}
