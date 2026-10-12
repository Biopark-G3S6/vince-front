import { useState, type FormEvent, type ReactNode } from 'react';

import { toast } from 'sonner';

import { PersonaSwitch, useCurrentUser } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { cn } from '@shared/lib/cn';
import { ArrowLeftIcon, Button, StatusBadge } from '@shared/ui';

import {
  useArticleTemplate,
  useChangeEventTemplate,
  useCreateEvent,
  useSetTemplateActive,
  useTemplates,
} from '@features/articles';
import { TemplateForm } from '../components/TemplateForm';
import {
  blankTemplate,
  courseName,
  courses,
  currentVersion,
  isAvailableTo,
  type EventScope,
  type StoredTemplate,
  type TemplatePreview,
} from '@features/articles';

import '../article-editor.css';

const scopeLabel: Record<EventScope, string> = {
  class: 'Turma',
  course: 'Curso',
  institution: 'Instituição',
};

/** Mensagens dos códigos devolvidos pela API de templates. */
const errorMessage: Record<string, string> = {
  PERMISSION_DENIED: 'Você não tem permissão para esta ação neste escopo.',
  RESOURCE_NOT_FOUND: 'O template não está disponível ao escopo do evento.',
  TEMPLATE_ALREADY_FIXED:
    'O template é escolhido na criação do evento e não pode ser trocado depois.',
  VALIDATION_FAILED: 'Informe o nome antes de continuar.',
};

const showError = (error: unknown) =>
  toast.error(errorMessage[getErrorCode(error)] ?? 'Não foi possível concluir a ação.');

function Lines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('space-y-[3px]', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          className="h-[2px] rounded bg-[#c9c3c4]"
          key={i}
          style={{ width: i % 4 === 3 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

function Preview({ kind }: { kind: TemplatePreview | 'blank' }) {
  const bg =
    kind === 'official' ? 'bg-[#dcd8d8]' : kind === 'abnt' ? 'bg-[#eceaea]' : 'bg-[#dedcdb]';

  return (
    <div className={cn('flex h-[146px] items-start justify-center overflow-hidden', bg)}>
      {kind === 'blank' && <div className="mt-2 h-[170px] w-[120px] bg-white shadow" />}
      {kind === 'official' && (
        <div className="mt-2 flex h-[170px] w-[120px] flex-col items-center gap-3 bg-white p-3 shadow">
          <div className="h-[3px] w-16 rounded bg-[#999]" />
          <div className="mt-4 w-full space-y-[3px]">
            <div className="mx-auto h-[4px] w-20 rounded bg-[#333]" />
            <div className="mx-auto h-[4px] w-16 rounded bg-[#333]" />
          </div>
          <div className="h-[2px] w-12 rounded bg-[#aaa]" />
          <div className="mt-6 h-[2px] w-16 rounded bg-[#aaa]" />
        </div>
      )}
      {kind === 'abnt' && (
        <div className="mt-2 w-[130px] bg-white p-2 shadow">
          <div className="mx-auto mb-2 h-[3px] w-12 rounded bg-[#999]" />
          <div className="grid grid-cols-2 gap-2">
            <Lines count={14} />
            <Lines count={14} />
          </div>
        </div>
      )}
      {kind === 'academic' && (
        <div className="mt-4 w-[170px] rounded-sm bg-white p-2 shadow">
          <div className="mx-auto mb-2 h-[3px] w-24 rounded bg-vince-secondary" />
          <div className="grid grid-cols-2 gap-2">
            <Lines count={12} />
            <Lines count={12} />
          </div>
        </div>
      )}
    </div>
  );
}

type CardProps = {
  action?: ReactNode;
  badges?: ReactNode;
  description: string;
  highlighted?: boolean;
  preview: TemplatePreview | 'blank';
  title: string;
};

function TemplateCard({ action, badges, description, highlighted, preview, title }: CardProps) {
  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border bg-white',
        highlighted ? 'border-2 border-vince-primary' : 'border-vince-border',
      )}
    >
      <div className="relative">
        {badges && <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">{badges}</div>}
        <Preview kind={preview} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="min-h-[44px] text-sm font-bold leading-snug">{title}</h3>
        <p className="mt-1 min-h-[34px] flex-1 text-[11px] leading-snug text-vince-muted">
          {description}
        </p>
        {action}
      </div>
    </article>
  );
}

function Pill({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'soft' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium',
        tone === 'primary' ? 'bg-vince-primary text-white' : 'bg-[#ff8fa6] text-vince-primary',
      )}
    >
      {children}
    </span>
  );
}

const useButtonClass =
  'mt-4 h-[26px] rounded border border-vince-primary bg-white text-[11px] font-medium text-vince-primary transition-colors hover:bg-vince-tertiary disabled:opacity-50';

/** RF-TPL-001 e RF-TPL-002 — Templates de artigo e a sua seleção pelo evento. */
export function ChooseTemplatePage() {
  const user = useCurrentUser();

  return (
    <div className="min-h-screen bg-vince-surface px-4 text-vince-text">
      <header className="relative mx-auto flex h-[88px] max-w-[1000px] items-center justify-center">
        <a
          className="absolute left-0 flex items-center gap-2 text-xs text-vince-muted hover:text-vince-primary"
          href="/admin/eventos"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Voltar
        </a>
        <p className="text-sm font-semibold text-vince-primary">VinceArt</p>
      </header>

      <main className="mx-auto max-w-[1000px] pb-16">
        <PersonaSwitch
          className="mt-0"
          roles={['institutionAdmin', 'coordinator', 'advisor', 'student']}
        />
        {user.role === 'student' ? <StudentView /> : <CreatorView key={user.id} />}
      </main>
    </div>
  );
}

/** A equipe não escolhe o template: ele vem do evento, definido na sua criação. */
function StudentView() {
  const article = useArticleTemplate();

  if (!article.data) {
    return null;
  }

  const { template, version } = article.data;

  return (
    <>
      <h1 className="mt-10 text-center text-2xl font-bold text-vince-primary">
        Modelo do seu artigo
      </h1>
      <p className="mt-3 text-center text-xs text-vince-muted">
        O modelo é escolhido por quem cria o evento e vale para todas as equipes. Ele é o ponto de
        partida do artigo; o que se verifica ao longo do ciclo é a norma (ABNT).
      </p>
      <div className="mx-auto mt-10 max-w-[320px]">
        <TemplateCard
          action={
            <a
              className={cn(useButtonClass, 'flex items-center justify-center')}
              href="/artigos/editor"
            >
              Abrir o artigo
            </a>
          }
          badges={<Pill>Modelo do evento{version ? ` · versão ${version}` : ''}</Pill>}
          description={template.description}
          highlighted
          preview={template.id === blankTemplate.id ? 'blank' : 'official'}
          title={template.title}
        />
      </div>
    </>
  );
}

function CreatorView() {
  const user = useCurrentUser();
  const { data } = useTemplates();
  const createEvent = useCreateEvent();
  const changeTemplate = useChangeEventTemplate();
  const setActive = useSetTemplateActive();
  const [eventName, setEventName] = useState('');
  const [scope, setScope] = useState<EventScope>();
  const [courseId, setCourseId] = useState(courses[0]!.id);
  const [editing, setEditing] = useState<StoredTemplate | 'new' | null>(null);

  if (!data) {
    return null;
  }

  const { events, scopes, templates } = data;
  const eventScope = scope && scopes.includes(scope) ? scope : scopes[0]!;
  const eventCourseId = eventScope === 'institution' ? null : courseId;
  // O sistema apresenta os templates disponíveis ao escopo do evento e a opção "em branco".
  const available = templates.filter((template) => isAvailableTo(template, eventCourseId));
  const canMaintainAny = user.role !== 'advisor';

  const choose = (templateId: string | null) =>
    createEvent.mutate(
      { courseId: eventCourseId, name: eventName, scope: eventScope, templateId },
      {
        onError: showError,
        onSuccess: () => {
          toast.success('Evento criado. O modelo ficou definido para as equipes do evento.', {
            action: {
              label: 'Criar equipe',
              onClick: () => window.location.assign('/admin/equipes'),
            },
          });
          setEventName('');
        },
      },
    );

  if (editing) {
    return (
      <TemplateForm
        onClose={() => setEditing(null)}
        onError={showError}
        template={editing === 'new' ? null : editing}
      />
    );
  }

  const fieldClass =
    'h-9 rounded border border-vince-border bg-white px-2 text-xs text-vince-text focus:border-vince-primary';

  return (
    <>
      <h1 className="mt-10 text-center text-2xl font-bold text-vince-primary">
        Escolha o modelo do evento
      </h1>
      <p className="mt-3 text-center text-xs text-vince-muted">
        O modelo é escolhido na criação do evento e serve de ponto de partida aos artigos das
        equipes. Depois de criado o evento, a escolha não pode ser trocada.
      </p>

      <form
        className="mt-8 flex flex-wrap items-end justify-center gap-3"
        onSubmit={(event: FormEvent) => event.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-vince-muted">
          Nome do evento
          <input
            className={cn(fieldClass, 'w-64')}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="Simpósio de Pesquisa 2027"
            value={eventName}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-vince-muted">
          Escopo
          <select
            className={fieldClass}
            onChange={(event) => setScope(event.target.value as EventScope)}
            value={eventScope}
          >
            {scopes.map((option) => (
              <option key={option} value={option}>
                {scopeLabel[option]}
              </option>
            ))}
          </select>
        </label>
        {eventScope !== 'institution' && (
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-vince-muted">
            Curso
            <select
              className={fieldClass}
              onChange={(event) => setCourseId(event.target.value)}
              value={courseId}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </form>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {available.map((template) => (
          <TemplateCard
            action={
              <button
                className={useButtonClass}
                disabled={createEvent.isPending}
                onClick={() => choose(template.id)}
                type="button"
              >
                Usar este modelo
              </button>
            }
            badges={
              <>
                {template.recommended && <Pill tone="soft">Recomendado</Pill>}
                <Pill>
                  {template.courseId ? courseName(template.courseId) : 'Instituição'} · v
                  {currentVersion(template).number}
                </Pill>
              </>
            }
            description={template.description}
            key={template.id}
            preview={template.preview}
            title={template.title}
          />
        ))}
        <TemplateCard
          action={
            <button
              className={useButtonClass}
              disabled={createEvent.isPending}
              onClick={() => choose(null)}
              type="button"
            >
              Começar em branco
            </button>
          }
          description={blankTemplate.description}
          preview="blank"
          title={blankTemplate.title}
        />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-vince-text">Eventos e modelos definidos</h2>
          <a className="text-xs font-semibold text-vince-primary underline" href="/admin/equipes">
            Criar equipe em um evento →
          </a>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-vince-border bg-white">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-vince-surface text-vince-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Evento</th>
                <th className="px-4 py-2 font-semibold">Escopo</th>
                <th className="px-4 py-2 font-semibold">Modelo congelado</th>
                <th className="px-4 py-2 font-semibold">Criado por</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-vince-border">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-semibold">{event.name}</td>
                  <td className="px-4 py-3 text-vince-muted">
                    {scopeLabel[event.scope]}
                    {event.courseId ? ` · ${courseName(event.courseId)}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {event.templateTitle}
                    {event.templateVersion ? ` · versão ${event.templateVersion}` : ''}
                  </td>
                  <td className="px-4 py-3 text-vince-muted">{event.createdBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="font-semibold text-vince-primary hover:underline"
                      onClick={() => changeTemplate.mutate(event.id, { onError: showError })}
                      type="button"
                    >
                      Trocar modelo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-vince-text">Templates da instituição</h2>
            <p className="mt-1 text-xs text-vince-muted">
              {canMaintainAny
                ? 'Alterar um template gera versão nova; o evento já criado permanece na versão que selecionou.'
                : 'O professor não mantém templates: apenas seleciona, ao criar evento de turma.'}
            </p>
          </div>
          {canMaintainAny && (
            <Button onClick={() => setEditing('new')} size="sm">
              Novo template
            </Button>
          )}
        </div>

        <ul className="mt-3 divide-y divide-vince-border rounded-lg border border-vince-border bg-white">
          {templates.map((template) => (
            <li className="flex flex-wrap items-center gap-3 px-4 py-3" key={template.id}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{template.title}</p>
                <p className="text-[11px] text-vince-muted">
                  {template.courseId
                    ? `Restrito ao curso de ${courseName(template.courseId)}`
                    : 'Toda a instituição'}
                  {' · '}versão {currentVersion(template).number} de{' '}
                  {currentVersion(template).createdBy}
                </p>
              </div>
              <StatusBadge
                label={template.active ? 'Ativo' : 'Inativo'}
                tone={template.active ? 'success' : 'muted'}
              />
              <Button onClick={() => setEditing(template)} size="sm" variant="outline">
                {template.canMaintain ? 'Alterar' : 'Consultar'}
              </Button>
              {template.canMaintain && (
                <Button
                  disabled={setActive.isPending}
                  onClick={() =>
                    setActive.mutate(
                      { active: !template.active, templateId: template.id },
                      { onError: showError },
                    )
                  }
                  size="sm"
                  variant="ghost"
                >
                  {template.active ? 'Desativar' : 'Reativar'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
