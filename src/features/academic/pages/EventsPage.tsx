import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { demoUsers, useCurrentUser } from '@features/admin';
import {
  courses,
  courseName,
  isAvailableTo,
  useCreateEvent,
  useEventDirectory,
  useEventRegistrations,
  useRegisterForEvent,
  useSetEventRegistrationOpen,
  useTemplates,
  type EventScope,
  type EventTemplate,
} from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import {
  Button,
  CalendarIcon,
  DocumentIcon,
  EmptyState,
  GraduationCapIcon,
  MailIcon,
  Notice,
  PlusIcon,
  UserIcon,
} from '@shared/ui';

import { useAcademicCollection } from '../api/academicStore';
import {
  AcademicActionDialog,
  AcademicField,
  academicFieldClass,
} from '../components/AcademicActionDialog';
import {
  FilterChip,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';

const scopeLabels: Record<EventScope, string> = {
  class: 'Turma',
  course: 'Curso',
  institution: 'Instituição',
};
const errors: Record<string, string> = {
  EVENT_REGISTRATION_CLOSED: 'As inscrições deste evento estão encerradas.',
  REGISTRATION_CLOSED: 'As inscrições deste evento estão encerradas.',
  EVENT_REGISTRATION_DEADLINE: 'O prazo de inscrição deste evento terminou.',
  EVENT_REGISTRATION_DEADLINE_PASSED: 'O prazo de inscrição deste evento terminou.',
  EVENT_REGISTRATION_LIMIT_REACHED: 'O evento atingiu o limite de inscrições.',
  EVENT_TEAM_LIMIT_REACHED: 'O evento atingiu o limite de equipes.',
  EVENT_ALREADY_REGISTERED: 'Você já está inscrito neste evento.',
  ALREADY_REGISTERED: 'Você já está inscrito neste evento.',
  PERMISSION_DENIED: 'Seu perfil não pode realizar esta ação neste evento.',
  RESOURCE_NOT_FOUND: 'O evento ou modelo não está mais disponível. Atualize a página.',
  VALIDATION_FAILED: 'Confira os dados, os limites de equipes e as datas informadas.',
};
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const showError = (error: unknown) =>
  toast.error(errors[getErrorCode(error)] ?? 'Não foi possível concluir. Tente novamente.');
const eventKind = (event: EventTemplate) => event.kind ?? 'official';
const modelsHref = (eventId: string) => `/artigos/modelo?evento=${encodeURIComponent(eventId)}`;
const isOpen = (event: EventTemplate) =>
  event.registrationOpen === true &&
  (!event.registrationDeadline || Date.parse(event.registrationDeadline) >= Date.now());
const deadlinePassed = (event: EventTemplate) =>
  !!event.registrationDeadline && Date.parse(event.registrationDeadline) < Date.now();
function displayDate(value: string | null | undefined) {
  return !value
    ? 'Sem prazo definido'
    : Number.isNaN(Date.parse(value))
      ? 'Data a definir'
      : dateFormatter.format(new Date(value));
}

export function EventsPage() {
  const user = useCurrentUser();
  const student = user.role === 'student';
  const professor = user.role === 'advisor';
  const directory = useEventDirectory();
  const templates = useTemplates();
  const registrations = useEventRegistrations();
  const createEvent = useCreateEvent();
  const registerForEvent = useRegisterForEvent();
  const setRegistrationOpen = useSetEventRegistrationOpen();
  const [eventEvaluators, setEventEvaluators] = useAcademicCollection('eventEvaluators');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'registered'>('all');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [action, setAction] = useState<'event' | 'register' | 'evaluator' | 'invite' | null>(null);
  const [courseId, setCourseId] = useState('course-adm');
  const [scope, setScope] = useState<EventScope>(professor ? 'class' : 'course');
  const registeredIds = new Set(
    (registrations.data ?? [])
      .filter((entry) => entry.studentId === user.id)
      .map((entry) => entry.eventId),
  );
  const allEvents = [...(directory.data?.events ?? [])].reverse().filter((event) => {
    if (student) return true;
    if (professor)
      return eventKind(event) === 'official'
        ? event.advisorIds.includes(user.id)
        : event.createdById === user.id;
    return eventKind(event) === 'official';
  });
  const visibleEvents = allEvents.filter(
    (event) =>
      filter === 'all' ||
      (filter === 'open'
        ? isOpen(event)
        : filter === 'closed'
          ? !isOpen(event)
          : registeredIds.has(event.id)),
  );
  const officialEvents = visibleEvents.filter((event) => eventKind(event) === 'official');
  const independentEvents = visibleEvents.filter((event) => eventKind(event) !== 'official');
  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) ?? visibleEvents[0];
  const selectedEvaluators = eventEvaluators.filter(
    (evaluator) => evaluator.eventId === selectedEvent?.id,
  );
  const canManage = (event: EventTemplate) => !student && event.canManage === true;
  const canManageRegistrations = (event: EventTemplate) =>
    canManage(event) && (!professor || eventKind(event) !== 'official');
  const eventCourseId = scope === 'institution' ? null : courseId;
  const availableTemplates = (templates.data?.templates ?? []).filter(
    (template) =>
      template.visibility !== 'event' &&
      (template.visibility !== 'personal' || template.ownerId === user.id) &&
      isAvailableTo(template, eventCourseId),
  );
  const createLabel = professor ? 'Criar evento independente' : 'Cadastrar evento';

  function openRegistration(event: EventTemplate) {
    setSelectedEventId(event.id);
    setAction('register');
  }

  function handleAction(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const form = new FormData(submitEvent.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    if (action === 'event') {
      if (createEvent.isPending) return;
      const startDate = text('startDate');
      const endDate = text('endDate');
      const registrationDate = text('registrationDeadline') || startDate;
      const toDeadline = (date: string) => new Date(`${date}T23:59:00`).toISOString();
      if (
        !startDate ||
        !endDate ||
        Number.isNaN(Date.parse(startDate)) ||
        Number.isNaN(Date.parse(endDate)) ||
        Number.isNaN(Date.parse(registrationDate)) ||
        endDate < startDate ||
        registrationDate > endDate
      ) {
        toast.error('A data final deve ser posterior à inicial e ao prazo de inscrição.');
        return;
      }
      const schedule: EventTemplate['schedule'] = [];
      let lastDate = startDate;
      for (let index = 1; index <= 2; index += 1) {
        const name = text(`stageName${index}`);
        const date = text(`stageDate${index}`);
        if (!name && !date) continue;
        if (!name || !date || date < lastDate || date > endDate) {
          toast.error('Preencha nome e data das etapas, em ordem, dentro do período do evento.');
          return;
        }
        schedule.push({ name, deadline: toDeadline(date) });
        lastDate = date;
      }
      schedule.push({ name: 'Submissão final', deadline: toDeadline(endDate) });
      createEvent.mutate(
        {
          courseId: eventCourseId,
          description: text('theme'),
          kind: professor ? (text('kind') as 'practice' | 'tcc') : 'official',
          maxTeams: Number(text('maxTeams')),
          maxTeamSize: Number(text('maxTeamSize')),
          name: text('name'),
          registrationDeadline: toDeadline(registrationDate),
          registrationOpen: professor && form.get('registrationOpen') === 'on',
          schedule,
          scope,
          templateId: text('templateId') || null,
        },
        {
          onError: showError,
          onSuccess: () => {
            setAction(null);
            setSelectedEventId('');
            setFilter('all');
            toast.success(
              professor
                ? 'Evento independente criado. Você pode gerenciar modelos e inscrições.'
                : 'Evento oficial criado. Abra as inscrições para disponibilizá-lo aos alunos.',
            );
          },
        },
      );
      return;
    }
    if (!selectedEvent) return;
    if (action === 'register') {
      if (!student || registerForEvent.isPending) return;
      registerForEvent.mutate(selectedEvent.id, {
        onError: showError,
        onSuccess: () => {
          setAction(null);
          toast.success('Inscrição confirmada! Agora escolha o modelo e crie seu artigo.');
        },
      });
      return;
    }
    if (!canManage(selectedEvent)) {
      toast.error('Somente o responsável pode gerenciar avaliadores neste evento.');
      return;
    }
    const email = text('email').toLocaleLowerCase();
    if (
      eventEvaluators.some(
        (evaluator) =>
          evaluator.eventId === selectedEvent.id && evaluator.email.toLocaleLowerCase() === email,
      )
    ) {
      toast.error('Este avaliador já está vinculado ao evento.');
      return;
    }
    setEventEvaluators((current) => [
      ...current,
      {
        email,
        eventId: selectedEvent.id,
        expertise: text('expertise'),
        id: crypto.randomUUID(),
        name: text('name'),
        status: action === 'invite' ? 'invited' : 'active',
      },
    ]);
    toast.success(
      action === 'invite'
        ? 'Convite registrado nesta demonstração. Nenhum e-mail foi enviado.'
        : 'Avaliador cadastrado no evento.',
    );
    setAction(null);
  }

  const card = (event: EventTemplate) => (
    <EventCard
      event={event}
      key={event.id}
      onRegister={() => openRegistration(event)}
      onSelect={() => setSelectedEventId(event.id)}
      registered={registeredIds.has(event.id)}
      selected={event.id === selectedEvent?.id}
      student={student}
      teams={
        (directory.data?.articles ?? []).filter((article) => article.eventId === event.id).length
      }
    />
  );

  return (
    <PageScaffold
      actions={
        !student && (
          <Button disabled={templates.isLoading} onClick={() => setAction('event')}>
            <PlusIcon className="h-5 w-5" />
            {createLabel}
          </Button>
        )
      }
      activeSection="events"
      description={
        student
          ? 'Encontre o evento disponibilizado pela coordenação, confirme sua inscrição e escolha um modelo para começar seu artigo.'
          : professor
            ? 'Acompanhe os eventos oficiais em que orienta e crie seus próprios eventos de teste ou TCC, com gestão independente da coordenação.'
            : 'Disponibilize eventos oficiais aos alunos, defina o modelo e o cronograma e abra as inscrições quando estiver tudo pronto.'
      }
      eyebrow="Eventos"
      personaRoles={['institutionAdmin', 'coordinator', 'advisor', 'student']}
      title={student ? 'Eventos e inscrições' : professor ? 'Meus eventos' : 'Eventos oficiais'}
    >
      <AcademicActionDialog
        description={
          action === 'event'
            ? professor
              ? 'Seu evento de teste ou TCC é gerenciado por você e não depende da abertura ou do acompanhamento da coordenação.'
              : 'Defina o modelo e os prazos. Depois, abra as inscrições para publicar o evento no catálogo dos alunos.'
            : action === 'register'
              ? 'Confirme sua participação. Depois da inscrição, escolha o modelo e crie seu artigo neste evento.'
              : `Evento: ${selectedEvent?.name ?? ''}. Informe os dados do avaliador.`
        }
        onOpenChange={(open) => {
          if (!open && !createEvent.isPending && !registerForEvent.isPending) setAction(null);
        }}
        onSubmit={handleAction}
        open={action !== null}
        submitLabel={
          action === 'event'
            ? createEvent.isPending
              ? 'Criando…'
              : createLabel
            : action === 'register'
              ? registerForEvent.isPending
                ? 'Confirmando…'
                : 'Confirmar inscrição'
              : action === 'invite'
                ? 'Enviar convite'
                : 'Cadastrar avaliador'
        }
        title={
          action === 'event'
            ? createLabel
            : action === 'register'
              ? 'Inscrever-me no evento'
              : action === 'invite'
                ? 'Convidar avaliador'
                : 'Cadastrar avaliador'
        }
      >
        {action === 'event' ? (
          <fieldset className="space-y-5" disabled={createEvent.isPending}>
            <AcademicField label="Nome do evento" maxLength={160} name="name" required />
            <AcademicField label="Tema" maxLength={500} name="theme" required />
            {professor && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">
                  Tipo de evento
                </span>
                <select
                  aria-label="Tipo de evento"
                  className={academicFieldClass}
                  name="kind"
                  required
                >
                  <option value="practice">Teste e prática</option>
                  <option value="tcc">Artigos de TCC</option>
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-vince-muted">Escopo</span>
                <select
                  className={academicFieldClass}
                  name="scope"
                  onChange={(event) => setScope(event.target.value as EventScope)}
                  value={scope}
                >
                  {(templates.data?.scopes ?? []).map((option) => (
                    <option key={option} value={option}>
                      {scopeLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              {scope !== 'institution' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-vince-muted">Curso</span>
                  <select
                    className={academicFieldClass}
                    name="courseId"
                    onChange={(event) => setCourseId(event.target.value)}
                    value={courseId}
                  >
                    {courses
                      .filter(
                        (course) => user.role === 'institutionAdmin' || course.id === 'course-adm',
                      )
                      .map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Modelo do evento
              </span>
              <select
                aria-label="Modelo do evento"
                aria-describedby="event-template-help"
                className={academicFieldClass}
                key={eventCourseId}
                name="templateId"
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
                <option value="">Documento em branco</option>
              </select>
              <span
                id="event-template-help"
                className="mt-2 block text-sm leading-6 text-vince-muted"
              >
                Para usar um arquivo próprio, importe-o em{' '}
                <a className="font-semibold text-vince-primary underline" href="/artigos/modelo">
                  Modelos de artigos
                </a>{' '}
                antes de criar o evento.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <AcademicField label="Data inicial" name="startDate" required type="date" />
              <AcademicField label="Data final" name="endDate" required type="date" />
              <AcademicField
                defaultValue="10"
                label="Máximo de equipes"
                min="1"
                name="maxTeams"
                required
                step="1"
                type="number"
              />
              <AcademicField
                defaultValue="6"
                label="Integrantes por equipe"
                min="1"
                name="maxTeamSize"
                required
                step="1"
                type="number"
              />
            </div>
            <div>
              <AcademicField label="Prazo de inscrição" name="registrationDeadline" type="date" />
              <p className="mt-2 text-sm text-vince-muted">
                Se não informar, as inscrições terminam na data inicial do evento.
              </p>
            </div>
            <details className="rounded-lg border border-vince-border p-4">
              <summary className="cursor-pointer font-bold text-vince-text">
                Personalizar cronograma de entregas
              </summary>
              <p className="mt-3 text-sm leading-6 text-vince-muted">
                A submissão final usa a data final acima. Adicione até duas etapas intermediárias,
                em ordem.
              </p>
              <div className="mt-4 space-y-4">
                {[1, 2].map((index) => (
                  <div className="grid gap-3 sm:grid-cols-2" key={index}>
                    <AcademicField
                      label={`Etapa intermediária ${index}`}
                      name={`stageName${index}`}
                      placeholder="Ex.: Projeto de pesquisa"
                    />
                    <AcademicField
                      label={`Prazo da etapa ${index}`}
                      name={`stageDate${index}`}
                      type="date"
                    />
                  </div>
                ))}
              </div>
            </details>
            {professor && (
              <label className="flex items-start gap-3 text-sm leading-6 text-vince-muted">
                <input
                  className="mt-1 h-4 w-4 accent-vince-primary"
                  defaultChecked
                  name="registrationOpen"
                  type="checkbox"
                />
                Abrir as inscrições e disponibilizar o evento aos alunos agora.
              </label>
            )}
          </fieldset>
        ) : action === 'register' ? (
          selectedEvent && (
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-vince-text">{selectedEvent.name}</h3>
              <p className="text-sm leading-6 text-vince-muted">{selectedEvent.description}</p>
              <Info
                label="Prazo de inscrição"
                value={displayDate(selectedEvent.registrationDeadline)}
              />
              <Info label="Modelo disponibilizado" value={selectedEvent.templateTitle} />
              <Notice>
                A inscrição vincula você ao evento. Você poderá criar seu artigo na próxima etapa.
              </Notice>
            </div>
          )
        ) : (
          <>
            <AcademicField label="Nome do avaliador" name="name" required />
            <AcademicField label="E-mail do avaliador" name="email" required type="email" />
            <AcademicField label="Área de especialidade" name="expertise" required />
          </>
        )}
      </AcademicActionDialog>

      {student && (
        <ol aria-label="Como participar de um evento" className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            [
              'Encontre o evento',
              'Consulte os eventos oficiais disponibilizados pela coordenação e confira os prazos.',
            ],
            [
              'Confirme sua inscrição',
              'Clique em Inscrever-me no evento escolhido e confirme sua participação.',
            ],
            [
              'Escolha o modelo e escreva',
              'Com a inscrição confirmada, escolha o modelo e crie seu artigo.',
            ],
          ].map(([title, description], index) => (
            <li
              className="flex gap-4 rounded-lg border border-vince-border bg-white p-5"
              key={title}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vince-tertiary font-extrabold text-vince-primary">
                {index + 1}
              </span>
              <div>
                <h2 className="font-extrabold text-vince-text">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-vince-muted">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div aria-label="Filtrar eventos" className="mt-8 flex flex-wrap gap-3">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos
        </FilterChip>
        <FilterChip active={filter === 'open'} onClick={() => setFilter('open')}>
          Inscrições abertas
        </FilterChip>
        <FilterChip active={filter === 'closed'} onClick={() => setFilter('closed')}>
          Inscrições encerradas
        </FilterChip>
        {student && (
          <FilterChip active={filter === 'registered'} onClick={() => setFilter('registered')}>
            Minhas inscrições
          </FilterChip>
        )}
      </div>
      {directory.isLoading && (
        <p className="mt-8 text-vince-muted" role="status">
          Carregando eventos…
        </p>
      )}
      {(directory.isError || registrations.isError) && (
        <Notice className="mt-6" tone="warning">
          Não foi possível carregar os eventos e inscrições. Atualize a página para tentar
          novamente.
        </Notice>
      )}

      <section className="mt-8 space-y-8">
        {officialEvents.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-extrabold text-vince-text">
              {professor
                ? 'Eventos oficiais em que oriento'
                : student
                  ? 'Eventos oficiais disponíveis'
                  : 'Eventos da coordenação'}
            </h2>
            <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
              {officialEvents.map(card)}
            </div>
          </div>
        )}
        {(professor || independentEvents.length > 0) && (
          <div>
            <h2 className="text-xl font-extrabold text-vince-text">
              {professor ? 'Meus eventos independentes' : 'Eventos do professor: testes e TCC'}
            </h2>
            <p className="mb-4 mt-2 text-sm leading-6 text-vince-muted">
              {professor
                ? 'Organize testes e artigos de TCC com seus próprios modelos, prazos e inscrições. Você é o responsável por estes eventos.'
                : 'Eventos disponibilizados e acompanhados diretamente pelo professor responsável.'}
            </p>
            <div className="grid min-w-0 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
              {independentEvents.map(card)}
            </div>
            {independentEvents.length === 0 && visibleEvents.length > 0 && (
              <p className="text-sm text-vince-muted">Nenhum evento independente neste filtro.</p>
            )}
          </div>
        )}
        {!directory.isLoading && !directory.isError && visibleEvents.length === 0 && (
          <EmptyState
            title={
              filter === 'registered'
                ? 'Você ainda não se inscreveu em um evento'
                : 'Nenhum evento disponível neste filtro'
            }
            description={
              student
                ? 'Consulte os eventos com inscrições abertas. Novos eventos aparecerão quando o responsável abrir as inscrições.'
                : 'Crie um evento ou selecione outro filtro para consultar os cadastrados.'
            }
          />
        )}
        {selectedEvent && (
          <SectionPanel title="Detalhes, modelos e cronograma">
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div>
                  <h2 className="text-2xl font-extrabold text-vince-text">{selectedEvent.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-vince-muted">
                    {selectedEvent.description ||
                      'Consulte o modelo disponibilizado e o cronograma de entregas.'}
                  </p>
                  <p className="mt-2 text-sm text-vince-muted">
                    Responsável: {selectedEvent.createdBy}
                  </p>
                </div>
                {student ? (
                  registeredIds.has(selectedEvent.id) ? (
                    <ModelLink eventId={selectedEvent.id} />
                  ) : (
                    <Button
                      disabled={!isOpen(selectedEvent)}
                      onClick={() => openRegistration(selectedEvent)}
                    >
                      Inscrever-me
                    </Button>
                  )
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <a
                      className="inline-flex min-h-11 items-center rounded-padrao border border-vince-border px-5 font-semibold text-vince-primary"
                      href={modelsHref(selectedEvent.id)}
                    >
                      Modelos e importação
                    </a>
                    {canManageRegistrations(selectedEvent) && (
                      <Button
                        disabled={setRegistrationOpen.isPending || deadlinePassed(selectedEvent)}
                        onClick={() =>
                          setRegistrationOpen.mutate(
                            { eventId: selectedEvent.id, open: !isOpen(selectedEvent) },
                            {
                              onError: showError,
                              onSuccess: () =>
                                toast.success(
                                  isOpen(selectedEvent)
                                    ? 'Inscrições encerradas.'
                                    : 'Inscrições abertas. O evento está disponível aos alunos.',
                                ),
                            },
                          )
                        }
                        variant="outline"
                      >
                        {deadlinePassed(selectedEvent)
                          ? 'Prazo encerrado'
                          : isOpen(selectedEvent)
                            ? 'Encerrar inscrições'
                            : 'Abrir inscrições'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {student && registeredIds.has(selectedEvent.id) && (
                <Notice tone="success">
                  Inscrição confirmada. O próximo passo é escolher o modelo e criar seu artigo.
                </Notice>
              )}
              {!student && canManageRegistrations(selectedEvent) && !isOpen(selectedEvent) && (
                <Notice>
                  {deadlinePassed(selectedEvent)
                    ? `O prazo de inscrição terminou em ${displayDate(selectedEvent.registrationDeadline)}.`
                    : `Abra as inscrições para disponibilizar este evento no catálogo dos alunos. O prazo é ${displayDate(selectedEvent.registrationDeadline)}.`}
                </Notice>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="Prazo de inscrição"
                  value={displayDate(selectedEvent.registrationDeadline)}
                />
                <Info
                  label="Escopo"
                  value={`${scopeLabels[selectedEvent.scope]}${selectedEvent.courseId ? ` · ${courseName(selectedEvent.courseId)}` : ''}`}
                />
                <Info
                  label="Equipes"
                  value={`${(directory.data?.articles ?? []).filter((article) => article.eventId === selectedEvent.id).length} de ${selectedEvent.maxTeams}`}
                />
                <Info label="Alunos por equipe" value={`Até ${selectedEvent.maxTeamSize ?? 6}`} />
              </div>
              <div className="rounded-lg border border-vince-border p-5">
                <h3 className="font-extrabold text-vince-text">Modelo disponibilizado no evento</h3>
                <p className="mt-2 text-sm leading-6 text-vince-muted">
                  {selectedEvent.templateTitle}
                  {selectedEvent.templateVersion
                    ? ` · versão ${selectedEvent.templateVersion}`
                    : ''}
                </p>
                <p className="mt-2 text-sm leading-6 text-vince-muted">
                  {student
                    ? 'Após a inscrição, consulte os modelos padrão de artigo e resumo expandido, o modelo do evento ou importe seu próprio modelo.'
                    : 'Consulte os modelos padrão, importe seu arquivo e gerencie os modelos disponíveis para os artigos.'}
                </p>
              </div>
              <div>
                <h3 className="mb-3 font-extrabold text-vince-text">Cronograma de entregas</h3>
                <ol className="grid gap-3 lg:grid-cols-3">
                  {selectedEvent.schedule.map((stage, index) => (
                    <li
                      className="flex gap-3 rounded-lg border border-vince-border p-4"
                      key={`${stage.name}-${index}`}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vince-primary text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-vince-text">{stage.name}</p>
                        <p className="mt-1 text-sm text-vince-muted">
                          {displayDate(stage.deadline)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                {selectedEvent.schedule.length === 0 && (
                  <p className="text-sm text-vince-muted">
                    O responsável ainda não definiu as entregas.
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-3 font-extrabold text-vince-text">Orientadores do evento</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedEvent.advisorIds.map((id) => (
                    <span
                      className="rounded-lg border border-vince-border px-4 py-3 text-sm font-medium text-vince-muted"
                      key={id}
                    >
                      {Object.values(demoUsers).find((person) => person.id === id)?.name ??
                        'Professor responsável'}
                    </span>
                  ))}
                  {selectedEvent.advisorIds.length === 0 && (
                    <p className="text-sm text-vince-muted">
                      Orientador a definir pelo responsável do evento.
                    </p>
                  )}
                </div>
              </div>
              {!student && (
                <div className="rounded-lg border border-vince-border p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-extrabold text-vince-text">Avaliadores</h3>
                      <p className="mt-1 text-sm text-vince-muted">
                        {canManage(selectedEvent)
                          ? 'Cadastre avaliadores ou registre convites para este evento.'
                          : 'A gestão de avaliadores é feita pelo responsável do evento.'}
                      </p>
                    </div>
                    {canManage(selectedEvent) && (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setAction('invite')} size="sm" variant="outline">
                          <MailIcon className="h-4 w-4" />
                          Convidar avaliador
                        </Button>
                        <Button onClick={() => setAction('evaluator')} size="sm">
                          <UserIcon className="h-4 w-4" />
                          Cadastrar avaliador
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {selectedEvaluators.map((evaluator) => (
                      <article
                        className="rounded-lg border border-vince-border p-4"
                        key={evaluator.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-vince-text">{evaluator.name}</h4>
                            <p className="mt-1 break-all text-sm text-vince-muted">
                              {evaluator.email}
                            </p>
                          </div>
                          <StatusBadge
                            label={
                              evaluator.status === 'active' ? 'Cadastrado' : 'Convite pendente'
                            }
                            tone={evaluator.status === 'active' ? 'success' : 'warning'}
                          />
                        </div>
                        <p className="mt-3 text-sm text-vince-muted">{evaluator.expertise}</p>
                      </article>
                    ))}
                    {selectedEvaluators.length === 0 && (
                      <p className="text-sm text-vince-muted">Nenhum avaliador vinculado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SectionPanel>
        )}
      </section>
    </PageScaffold>
  );
}

function EventCard({
  event,
  onRegister,
  onSelect,
  registered,
  selected,
  student,
  teams,
}: {
  event: EventTemplate;
  onRegister: () => void;
  onSelect: () => void;
  registered: boolean;
  selected: boolean;
  student: boolean;
  teams: number;
}) {
  const open = isOpen(event);
  const kind = eventKind(event);
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm ${selected ? 'border-vince-primary ring-1 ring-vince-primary' : 'border-vince-border'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-vince-tertiary p-5">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-vince-primary">
          <GraduationCapIcon className="h-5 w-5" />
          {kind === 'official'
            ? 'Evento oficial'
            : kind === 'tcc'
              ? 'TCC · independente'
              : 'Teste · independente'}
        </span>
        <StatusBadge
          label={
            registered && student
              ? 'Inscrição confirmada'
              : open
                ? 'Inscrições abertas'
                : 'Inscrições encerradas'
          }
          tone={(registered && student) || open ? 'success' : 'muted'}
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-xl font-extrabold leading-tight text-vince-text">{event.name}</h3>
        <p className="mt-3 text-sm leading-6 text-vince-muted">
          {event.description ||
            `Evento de ${scopeLabels[event.scope].toLocaleLowerCase()}, organizado por ${event.createdBy}.`}
        </p>
        <div className="my-5 space-y-3 text-sm text-vince-muted">
          <p className="flex items-start gap-2">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0" />
            Inscrições até {displayDate(event.registrationDeadline)}
          </p>
          <p className="flex items-start gap-2">
            <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {event.templateTitle}
          </p>
          <p>
            {student
              ? `Responsável: ${event.createdBy}`
              : `${teams}/${event.maxTeams} equipes · até ${event.maxTeamSize ?? 6} alunos por equipe`}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-3 border-t border-vince-border pt-5">
          {student &&
            (registered ? (
              <ModelLink eventId={event.id} />
            ) : (
              <Button disabled={!open} onClick={onRegister}>
                Inscrever-me
              </Button>
            ))}
          <Button
            aria-label={`Ver detalhes de ${event.name}`}
            aria-pressed={selected}
            onClick={onSelect}
            variant="outline"
          >
            Ver detalhes
          </Button>
        </div>
      </div>
    </article>
  );
}

function ModelLink({ eventId }: { eventId: string }) {
  return (
    <a
      className="inline-flex min-h-11 items-center justify-center rounded-padrao bg-vince-primary px-4 py-2 text-center text-sm font-semibold text-white"
      href={modelsHref(eventId)}
    >
      Escolher modelo e criar artigo
    </a>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vince-border bg-[#fffafa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-vince-muted">{label}</p>
      <p className="mt-1 font-extrabold text-vince-text">{value}</p>
    </div>
  );
}
