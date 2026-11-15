import { useState } from 'react';
import type { FormEvent } from 'react';

import { http } from '@shared/api/http';
import { ArrowLeftIcon, CheckCircleIcon, MailIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

export function RecoverAccessPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * RF-ACS-003: a resposta é a mesma exista ou não a conta — o servidor não revela quem
   * está cadastrado (204 em ambos os casos).
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFailed(false);
    try {
      await http.post('/password/recovery', { email: email.trim() });
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
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
            Informe o e-mail da sua conta. Se ele estiver cadastrado, você receberá as instruções
            para definir uma nova senha.
          </p>
        </div>

        <form className="mt-9 space-y-7" onSubmit={(event) => void handleSubmit(event)}>
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
            className="h-12 w-full rounded-padrao bg-vince-primary text-base font-bold text-white transition-colors hover:bg-[#571424] disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            Enviar instruções
          </button>

          {sent && (
            <div
              role="status"
              className="rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900"
            >
              <p className="flex items-start gap-2">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Solicitação registrada. Se o e-mail estiver cadastrado, as instruções chegarão em
                instantes.
              </p>
            </div>
          )}
          {failed && (
            <p
              className="rounded-padrao border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              Não foi possível registrar a solicitação. Verifique o e-mail e tente novamente.
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
