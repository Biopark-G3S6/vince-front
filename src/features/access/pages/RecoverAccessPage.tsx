import { useState } from 'react';
import type { FormEvent } from 'react';

import { ArrowLeftIcon, MailIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

export function RecoverAccessPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-4 py-0 text-vince-text">
      <BrandMark compact className="mb-14 mt-0 text-center" />

      <section className="w-full max-w-[510px] rounded-lg border border-[#d9d0d2] bg-white px-12 py-14 shadow-[0_18px_50px_rgb(57_38_43/0.08)]">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Recuperar acesso</h1>
          <p className="mt-3 text-xl leading-7 text-vince-muted">
            Informe o e-mail associado à sua conta para receber as instruções de redefinição.
          </p>
        </div>

        <form className="mt-9 space-y-8" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-base font-semibold">E-mail</span>
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
            className="h-11 w-full rounded-padrao bg-vince-primary text-base font-bold text-white transition-colors hover:bg-[#571424]"
            type="submit"
          >
            Enviar instruções
          </button>

          {sent && (
            <p className="rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Instruções enviadas para o e-mail informado.
            </p>
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
