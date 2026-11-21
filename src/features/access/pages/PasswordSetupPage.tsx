import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { getErrorCode } from '@shared/api/apiError';
import { http } from '@shared/api/http';
import { ArrowRightIcon, CheckCircleIcon, LockIcon } from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

/** A política de senha do servidor (RF-ACS-004): de 12 a 128 caracteres. */
const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

type InvitationDetails = {
  id: string;
  roleCode: string;
  institutionId: string;
  institutionName: string;
  targetEmail?: string;
};

const roleLabel: Record<string, string> = {
  INSTITUTION_ADMIN: 'Administrador institucional',
  COORDINATOR: 'Coordenador',
  PROFESSOR: 'Professor',
  STUDENT: 'Aluno',
};

const errorText: Record<string, string> = {
  INVITATION_EXPIRED: 'Este link expirou. Solicite um novo.',
  INVITATION_REVOKED: 'Este link não é mais válido.',
  INVITATION_LIMIT_REACHED: 'Este convite já atingiu o limite de usos.',
  EMAIL_ALREADY_REGISTERED: 'Já existe uma conta com este e-mail. Entre com a sua senha.',
  RESOURCE_NOT_FOUND: 'Link inválido.',
  VALIDATION_FAILED: 'Revise os campos informados.',
};

/**
 * A definição de senha, por dois caminhos:
 * - `/password/reset?token=…` (ou `/definir-senha?token=…`): redefinição ou primeira senha
 *   de conta criada internamente (RF-ACS-003, RF-ACS-004);
 * - `/invitations/<token>`: aceite de convite, que cria a conta (RF-ACS-009, RF-TUR-005).
 */
function readLink(): { kind: 'invitation' | 'reset' | 'none'; token: string } {
  const invitation = /^\/invitations\/([^/]+)$/.exec(window.location.pathname);
  if (invitation?.[1]) return { kind: 'invitation', token: decodeURIComponent(invitation[1]) };
  const token = new URLSearchParams(window.location.search).get('token');
  return token ? { kind: 'reset', token } : { kind: 'none', token: '' };
}

export function PasswordSetupPage() {
  const link = useMemo(readLink, []);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [linkError, setLinkError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (link.kind !== 'invitation') return;
    http
      .get<InvitationDetails>(`/invitations/${encodeURIComponent(link.token)}`)
      .then((details) => {
        setInvitation(details);
        if (details.targetEmail) setEmail(details.targetEmail);
      })
      .catch((cause: unknown) => setLinkError(errorText[getErrorCode(cause)] ?? 'Link inválido.'));
  }, [link]);

  const checks = useMemo(
    () => [
      {
        label: `Entre ${MIN_LENGTH} e ${MAX_LENGTH} caracteres`,
        valid: password.length >= MIN_LENGTH && password.length <= MAX_LENGTH,
      },
      {
        label: 'Confirmação igual à senha',
        valid: password.length > 0 && password === confirmation,
      },
      ...(link.kind === 'invitation'
        ? [{ label: 'Nome informado', valid: name.trim().length > 0 }]
        : []),
    ],
    [confirmation, link.kind, name, password],
  );

  const canSubmit = link.kind !== 'none' && !linkError && checks.every((check) => check.valid);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      if (link.kind === 'invitation') {
        await http.post(`/invitations/${encodeURIComponent(link.token)}/acceptance`, {
          name: name.trim(),
          ...(invitation?.targetEmail ? {} : { email: email.trim() }),
          password,
        });
      } else {
        await http.post('/password/reset', { token: link.token, password });
      }
      setSaved(true);
    } catch (cause) {
      setError(errorText[getErrorCode(cause)] ?? 'Não foi possível concluir. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'h-12 w-full rounded-padrao border border-vince-border px-4 text-lg text-vince-text focus:border-vince-primary';

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
          <h1 className="mt-5 text-3xl font-extrabold text-vince-text">
            {link.kind === 'invitation' ? 'Aceitar convite' : 'Definir senha'}
          </h1>
          <p className="mt-3 text-vince-muted">
            {link.kind === 'invitation'
              ? invitation
                ? `Você foi convidado como ${roleLabel[invitation.roleCode] ?? invitation.roleCode} em ${invitation.institutionName}.`
                : 'Carregando o convite…'
              : link.kind === 'reset'
                ? 'Escolha a nova senha da sua conta.'
                : 'Abra o link recebido por e-mail para definir a sua senha.'}
          </p>
        </div>

        {linkError && (
          <p
            className="mt-6 rounded-padrao border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            {linkError}
          </p>
        )}

        {saved ? (
          <div className="mt-8 space-y-4">
            <p
              role="status"
              className="rounded-padrao border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
            >
              {link.kind === 'invitation'
                ? 'Conta criada. Você já pode entrar com o seu e-mail e a senha definida.'
                : 'Senha definida. Você já pode entrar com a nova senha.'}
            </p>
            <a
              className="flex h-12 w-full items-center justify-center rounded-padrao bg-vince-primary font-bold text-white"
              href="/entrar"
            >
              Ir para o login
            </a>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            {link.kind === 'invitation' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">
                    Nome completo
                  </span>
                  <input
                    autoComplete="name"
                    className={inputClass}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">E-mail</span>
                  <input
                    autoComplete="email"
                    className={inputClass}
                    disabled={Boolean(invitation?.targetEmail)}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Nova senha</span>
              <input
                autoComplete="new-password"
                className={inputClass}
                maxLength={MAX_LENGTH}
                onChange={(event) => setPassword(event.target.value)}
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
                className={inputClass}
                onChange={(event) => setConfirmation(event.target.value)}
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

            {error && (
              <p
                className="rounded-padrao border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-padrao bg-vince-primary font-bold text-white transition-colors hover:bg-[#571424] disabled:bg-[#b9949c]"
              disabled={!canSubmit || submitting}
              type="submit"
            >
              {link.kind === 'invitation' ? 'Criar conta' : 'Concluir definição'}
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <a
              className="block py-2 text-center font-semibold text-vince-primary hover:underline"
              href="/entrar"
            >
              Voltar para o login
            </a>
          </form>
        )}
      </section>
    </main>
  );
}
