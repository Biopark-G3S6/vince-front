import { useState, type FormEvent, type ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';

import { PageScaffold, useCurrentUser } from '@features/admin';
import {
  articleHref,
  currentVersion,
  useCreateArticle,
  useEventRegistrations,
  useTemplates,
  type EventTemplate,
  type StoredTemplate,
  type TemplatePreview,
} from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import { cn } from '@shared/lib/cn';
import { Button, Notice, UploadIcon } from '@shared/ui';

import { TemplateForm } from '../components/TemplateForm';

import '../article-editor.css';

const errorMessage: Record<string, string> = {
  PERMISSION_DENIED: 'Você não tem permissão para esta ação.',
  RESOURCE_NOT_FOUND: 'O modelo ou evento não está mais disponível.',
  EVENT_REGISTRATION_REQUIRED: 'Inscreva-se no evento antes de criar o artigo.',
  EVENT_TEAM_LIMIT_REACHED: 'O evento atingiu o limite de artigos e equipes.',
  VALIDATION_FAILED: 'Confira o título do artigo e o modelo selecionado.',
};

const showError = (error: unknown) =>
  toast.error(errorMessage[getErrorCode(error)] ?? 'Não foi possível concluir a ação.');

const fieldClass =
  'h-11 min-w-0 w-full rounded-lg border border-vince-border bg-white px-3 text-base text-vince-text focus:border-vince-primary';

function Lines({ count }: { count: number }) {
  return (
    <div className="space-y-[3px]">
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
  return (
    <div className="flex h-40 items-start justify-center overflow-hidden bg-[#eceaea]">
      <div className="mt-3 min-h-40 w-32 bg-white p-3 shadow">
        {kind !== 'blank' && (
          <>
            <div className="mx-auto mb-4 mt-3 h-[4px] w-20 rounded bg-vince-primary" />
            <div className={cn('gap-2', kind === 'abnt' && 'grid grid-cols-2')}>
              <Lines count={13} />
              {kind === 'abnt' && <Lines count={13} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-vince-tertiary px-3 py-1 text-xs font-semibold text-vince-primary">
      {children}
    </span>
  );
}

type TemplateCardProps = {
  template: StoredTemplate;
  event?: EventTemplate;
  onChoose: () => void;
  onEdit: () => void;
};

function TemplateCard({ template, event, onChoose, onEdit }: TemplateCardProps) {
  const version =
    event?.templateId === template.id
      ? (event.templateVersion ?? currentVersion(template).number)
      : currentVersion(template).number;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm">
      <Preview kind={template.preview} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill>
            {event
              ? `Versão ${version}`
              : template.visibility === 'standard'
                ? 'Padrão'
                : 'Pessoal'}
          </Pill>
          {event && (
            <Pill>
              {event.kind === 'practice' ? 'Teste' : event.kind === 'tcc' ? 'TCC' : 'Oficial'}
            </Pill>
          )}
        </div>
        <h3 className="text-lg font-extrabold leading-snug">{template.title}</h3>
        {event && <p className="mt-1 text-sm font-semibold text-vince-primary">{event.name}</p>}
        <p className="mt-2 flex-1 text-sm leading-6 text-vince-muted">{template.description}</p>
        <Button className="mt-5 w-full" onClick={onChoose} variant="outline">
          Usar este modelo
        </Button>
        {template.canMaintain && template.visibility !== 'standard' && (
          <Button className="mt-2" onClick={onEdit} size="sm" variant="ghost">
            Editar modelo
          </Button>
        )}
      </div>
    </article>
  );
}

type Selection = { template: StoredTemplate | null; eventId?: string };

export function ChooseTemplatePage() {
  const user = useCurrentUser();

  return (
    <PageScaffold
      activeSection="templates"
      title="Modelos de artigo"
      eyebrow="Biblioteca de modelos"
      description="Escolha um modelo padrão, use o modelo de um evento ou importe o seu para começar um novo artigo."
      personaRoles={['institutionAdmin', 'coordinator', 'advisor', 'student']}
      actions={
        <a
          className="inline-flex min-h-11 items-center rounded-lg border border-vince-border bg-white px-4 py-2 text-sm font-semibold text-vince-primary hover:bg-vince-tertiary"
          href="/admin/eventos"
        >
          Eventos e inscrições
        </a>
      }
    >
      <TemplateLibrary key={user.id} />
    </PageScaffold>
  );
}

function TemplateLibrary() {
  const user = useCurrentUser();
  const query = useTemplates();
  const registrations = useEventRegistrations();
  const [editing, setEditing] = useState<StoredTemplate | 'new' | 'import' | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const contextId = new URLSearchParams(window.location.search).get('evento') ?? undefined;

  if (query.isError) {
    return (
      <Notice className="mt-6" tone="danger">
        Não foi possível carregar os modelos.{' '}
        <Button onClick={() => void query.refetch()} variant="outline">
          Tentar novamente
        </Button>
      </Notice>
    );
  }
  if (!query.data)
    return (
      <p className="mt-6 text-vince-muted" role="status">
        Carregando modelos e eventos…
      </p>
    );

  const { events, templates } = query.data;
  const contextEvent = events.find((event) => event.id === contextId);
  const standard = templates.filter(
    (template) => template.active && template.visibility === 'standard',
  );
  const personal = templates.filter(
    (template) => template.visibility === 'personal' && template.ownerId === user.id,
  );
  const eventModels = events.flatMap((event) =>
    templates
      .filter(
        (template) =>
          (template.active || template.id === event.templateId) &&
          (template.visibility === 'event'
            ? template.eventId === event.id
            : template.id === event.templateId),
      )
      .map((template) => ({ event, template })),
  );
  const official = eventModels.filter(({ event }) => !event.kind || event.kind === 'official');
  const independent = eventModels.filter(
    ({ event }) => event.kind === 'practice' || event.kind === 'tcc',
  );
  const editableEvents = events.filter((event) => event.canManage);
  const contextRegistered = registrations.data?.some(
    (entry) => entry.eventId === contextId && entry.studentId === user.id,
  );

  if (editing) {
    return (
      <TemplateForm
        events={editableEvents}
        importMode={editing === 'import'}
        initialEventId={
          contextEvent && editableEvents.some((event) => event.id === contextId)
            ? contextId
            : undefined
        }
        onClose={() => setEditing(null)}
        onError={showError}
        template={typeof editing === 'string' ? null : editing}
      />
    );
  }

  function cards(items: Array<{ template: StoredTemplate; event?: EventTemplate }>) {
    return (
      <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {items.map(({ template, event }) => (
          <TemplateCard
            event={event}
            key={`${event?.id ?? 'personal'}-${template.id}`}
            onChoose={() => setSelection({ eventId: event?.id ?? contextEvent?.id, template })}
            onEdit={() => setEditing(template)}
            template={template}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10 py-6">
      {contextEvent && (
        <Notice tone={user.role === 'student' && !contextRegistered ? 'warning' : 'info'}>
          <p className="font-bold">Artigo para {contextEvent.name}</p>
          <p className="mt-1">
            {user.role === 'student' && !contextRegistered
              ? 'Faça sua inscrição no evento para criar e vincular um artigo.'
              : 'O novo artigo será vinculado a este evento.'}{' '}
            <a className="font-semibold underline" href="/admin/eventos">
              Ver evento e inscrição
            </a>
          </p>
        </Notice>
      )}
      {contextId && !contextEvent && (
        <Notice tone="warning">
          O evento informado não está disponível para o seu perfil. Consulte os eventos e
          inscrições.
        </Notice>
      )}
      <section aria-labelledby="standard-models-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-vince-text" id="standard-models-title">
              Modelos padrão
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-vince-muted">
              Comece um artigo científico ou resumo expandido com as seções iniciais prontas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setEditing('new')} variant="outline">
              Criar modelo
            </Button>
            <Button onClick={() => setEditing('import')}>
              <UploadIcon className="h-4 w-4" />
              Importar modelo
            </Button>
          </div>
        </div>
        {cards(standard.map((template) => ({ template })))}
      </section>
      <section aria-labelledby="event-models-title">
        <h2 className="text-xl font-extrabold text-vince-text" id="event-models-title">
          Modelos oficiais dos eventos
        </h2>
        <p className="mt-2 text-sm leading-6 text-vince-muted">
          Modelos publicados por professores e coordenadores. Ao escolher, o artigo fica vinculado
          ao evento correspondente.
        </p>
        {official.length ? (
          cards(official)
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-vince-border p-5 text-sm text-vince-muted">
            Nenhum modelo oficial foi publicado para os eventos disponíveis.
          </p>
        )}
      </section>
      {independent.length > 0 && (
        <section aria-labelledby="independent-models-title">
          <h2 className="text-xl font-extrabold text-vince-text" id="independent-models-title">
            Modelos de teste e TCC
          </h2>
          <p className="mt-2 text-sm leading-6 text-vince-muted">
            Modelos dos espaços independentes organizados pelos professores.
          </p>
          {cards(independent)}
        </section>
      )}
      <section aria-labelledby="personal-models-title">
        <h2 className="text-xl font-extrabold text-vince-text" id="personal-models-title">
          Meus modelos
        </h2>
        <p className="mt-2 text-sm leading-6 text-vince-muted">
          Os modelos que você criou ou importou ficam disponíveis para reutilizar em novos artigos.
        </p>
        {personal.length ? (
          cards(personal.map((template) => ({ template })))
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-vince-border bg-white p-5">
            <p className="text-sm leading-6 text-vince-muted">
              Você ainda não tem modelos pessoais. Importe um arquivo Word (.docx) de até 10 MB ou
              crie um modelo no editor.
            </p>
            <Button
              className="mt-3"
              onClick={() => setEditing('import')}
              size="sm"
              variant="outline"
            >
              Importar meu primeiro modelo
            </Button>
          </div>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-vince-border bg-white p-5">
        <div>
          <h2 className="font-bold text-vince-text">Prefere começar em branco?</h2>
          <p className="mt-1 text-sm text-vince-muted">
            Crie um documento vazio e organize o conteúdo no editor.
          </p>
        </div>
        <Button
          onClick={() => setSelection({ eventId: contextEvent?.id, template: null })}
          variant="outline"
        >
          Começar em branco
        </Button>
      </div>
      {selection && (
        <CreateArticleDialog
          events={events}
          onClose={() => setSelection(null)}
          registrationEventIds={
            registrations.data
              ?.filter((entry) => entry.studentId === user.id)
              .map((entry) => entry.eventId) ?? []
          }
          registrationsLoading={registrations.isPending}
          registrationsError={registrations.isError}
          selection={selection}
        />
      )}
    </div>
  );
}

function CreateArticleDialog({
  events,
  onClose,
  registrationEventIds,
  registrationsLoading,
  registrationsError,
  selection,
}: {
  events: EventTemplate[];
  onClose: () => void;
  registrationEventIds: string[];
  registrationsLoading: boolean;
  registrationsError: boolean;
  selection: Selection;
}) {
  const user = useCurrentUser();
  const createArticle = useCreateArticle();
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState(selection.eventId ?? '');
  const isEventModel =
    selection.template?.visibility === 'event' ||
    Boolean(
      selection.eventId &&
      events.some(
        (event) => event.id === selection.eventId && event.templateId === selection.template?.id,
      ),
    );
  const needsRegistration =
    user.role === 'student' && Boolean(eventId) && !registrationEventIds.includes(eventId);
  const checkingRegistration =
    user.role === 'student' && Boolean(eventId) && (registrationsLoading || registrationsError);
  const cannotManageEvent =
    user.role !== 'student' &&
    Boolean(eventId) &&
    !events.find((event) => event.id === eventId)?.canManage;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (needsRegistration || checkingRegistration || cannotManageEvent || createArticle.isPending)
      return;
    createArticle.mutate(
      {
        eventId: eventId || undefined,
        templateId: selection.template?.id ?? null,
        title: title.trim(),
      },
      {
        onError: showError,
        onSuccess: (article) => {
          toast.success('Artigo criado com o modelo escolhido.');
          window.location.assign(articleHref('/artigos/editor', article.id));
        },
      },
    );
  }

  return (
    <Dialog.Root onOpenChange={(open) => !open && !createArticle.isPending && onClose()} open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-6 shadow-2xl sm:p-8">
          <Dialog.Title className="text-2xl font-extrabold text-vince-text">
            Novo artigo
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-vince-muted">
            Modelo escolhido: {selection.template?.title ?? 'Documento em branco'}. Dê um título
            para abrir seu novo artigo no editor.
          </Dialog.Description>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-vince-muted">
              Título do artigo
              <input
                autoFocus
                className={fieldClass}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Digite o título do seu artigo"
                required
                value={title}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-vince-muted">
              Evento
              <select
                className={fieldClass}
                disabled={isEventModel}
                onChange={(event) => setEventId(event.target.value)}
                value={eventId}
              >
                <option value="">Artigo independente (sem evento)</option>
                {events.map((event) => (
                  <option
                    disabled={user.role !== 'student' && !event.canManage}
                    key={event.id}
                    value={event.id}
                  >
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            {needsRegistration && !registrationsLoading && !registrationsError && (
              <Notice tone="warning">
                Você precisa se inscrever neste evento antes de criar o artigo.{' '}
                <a className="font-semibold underline" href="/admin/eventos">
                  Ir para eventos e inscrições
                </a>
              </Notice>
            )}
            {checkingRegistration && (
              <Notice tone={registrationsError ? 'danger' : 'info'}>
                {registrationsError
                  ? 'Não foi possível verificar sua inscrição. Atualize a página para tentar novamente.'
                  : 'Verificando sua inscrição no evento…'}
              </Notice>
            )}
            {cannotManageEvent && (
              <Notice tone="warning">
                Apenas professores vinculados e responsáveis pelo evento podem criar artigos neste
                contexto. Escolha um evento que você organiza para continuar.
              </Notice>
            )}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button disabled={createArticle.isPending} onClick={onClose} variant="outline">
                Cancelar
              </Button>
              <Button
                disabled={
                  !title.trim() ||
                  needsRegistration ||
                  checkingRegistration ||
                  cannotManageEvent ||
                  createArticle.isPending
                }
                type="submit"
              >
                {createArticle.isPending ? 'Criando…' : 'Criar artigo'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
