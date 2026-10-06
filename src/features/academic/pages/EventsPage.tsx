import { useMemo, useState } from 'react';

import {
  Button,
  CalendarIcon,
  ChartIcon,
  DocumentIcon,
  GraduationCapIcon,
  PlusIcon,
} from '@shared/ui';

import {
  FilterChip,
  PageScaffold,
  SectionPanel,
  StatusBadge,
} from '../components/AcademicPrimitives';
import { academicEvents, type AcademicEvent, type EventStatus } from '../model/academic';

const statusView: Record<
  EventStatus,
  { label: string; tone: 'success' | 'warning' | 'muted' | 'danger' }
> = {
  canceled: { label: 'Cancelado', tone: 'danger' },
  finished: { label: 'Concluído', tone: 'muted' },
  planning: { label: 'Planejamento', tone: 'warning' },
  running: { label: 'Em andamento', tone: 'success' },
};

const filterOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Em andamento', value: 'running' },
  { label: 'Concluídos', value: 'finished' },
  { label: 'Planejamento', value: 'planning' },
] as const;

export function EventsPage() {
  const [status, setStatus] = useState<'all' | EventStatus>('all');
  const [selectedEventId, setSelectedEventId] = useState(academicEvents[0]?.id ?? '');

  const visibleEvents = useMemo(() => {
    return academicEvents.filter((event) => status === 'all' || event.status === status);
  }, [status]);

  const selectedEvent =
    academicEvents.find((event) => event.id === selectedEventId) ??
    visibleEvents[0] ??
    academicEvents[0];

  return (
    <PageScaffold
      actions={
        <Button className="rounded-padrao px-7">
          <PlusIcon className="h-5 w-5" />
          Novo evento
        </Button>
      }
      activeSection="events"
      description="Gerencie eventos acadêmicos, congressos, simpósios, cronogramas e orientadores por escopo."
      eyebrow="Eventos Acadêmicos"
      title="Eventos Acadêmicos"
    >
      <section className="mt-10 rounded-lg border border-vince-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <FilterChip
                active={status === option.value}
                key={option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>

          <label className="flex items-center gap-3 text-base font-medium text-vince-muted">
            Ordenar por:
            <select className="h-11 rounded-none border border-vince-border bg-white px-5 text-vince-text focus:border-vince-primary">
              <option>Data mais recente</option>
              <option>Mais equipes</option>
              <option>Maior participação</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-8 grid gap-8">
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleEvents.map((event) => (
            <EventCard event={event} key={event.id} onSelect={() => setSelectedEventId(event.id)} />
          ))}
        </div>

        <SectionPanel title="Cronograma e orientadores">
          {selectedEvent && (
            <div className="space-y-6">
              <div>
                <StatusBadge
                  label={statusView[selectedEvent.status].label}
                  tone={statusView[selectedEvent.status].tone}
                />
                <h2 className="mt-3 text-2xl font-extrabold text-vince-text">
                  {selectedEvent.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-vince-muted">{selectedEvent.theme}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Escopo" value={selectedEvent.scope} />
                <Info label="Equipes" value={`${selectedEvent.teams}/${selectedEvent.maxTeams}`} />
                <Info label="Tamanho máx." value={`${selectedEvent.maxTeamSize} alunos`} />
                <Info label="Participantes" value={String(selectedEvent.participants)} />
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <p className="font-bold text-vince-text lg:col-span-3">Etapas</p>
                {selectedEvent.milestones.map((milestone) => (
                  <div
                    className="flex gap-3 rounded-lg border border-vince-border p-4"
                    key={milestone.order}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vince-primary text-sm font-bold text-white">
                      {milestone.order}
                    </span>
                    <div>
                      <p className="font-semibold text-vince-text">{milestone.name}</p>
                      <p className="mt-1 text-sm text-vince-muted">{milestone.date}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <p className="font-bold text-vince-text lg:col-span-3">Orientadores do evento</p>
                {selectedEvent.advisors.map((advisor) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-vince-border px-4 py-3"
                    key={advisor}
                  >
                    <span className="font-medium text-vince-muted">{advisor}</span>
                    <button className="text-sm font-semibold text-vince-primary" type="button">
                      Revogar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionPanel>
      </section>
    </PageScaffold>
  );
}

function EventCard({ event, onSelect }: { event: AcademicEvent; onSelect: () => void }) {
  const view = statusView[event.status];
  const muted = event.status === 'finished' || event.status === 'canceled';

  return (
    <article className="overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm">
      <div
        className={
          muted ? 'bg-[#887b7e] px-6 py-6 text-white' : 'bg-vince-primary px-6 py-6 text-white'
        }
      >
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-padrao bg-white/16">
            {event.status === 'finished' ? (
              <ChartIcon className="h-6 w-6" />
            ) : (
              <GraduationCapIcon className="h-6 w-6" />
            )}
          </span>
          <StatusBadge
            label={view.label}
            tone={event.status === 'running' ? 'primary' : view.tone}
          />
        </div>
      </div>

      <div className="p-7">
        <h2 className="text-2xl font-extrabold leading-tight text-vince-text">{event.title}</h2>
        <p className="mt-3 min-h-[72px] text-base leading-6 text-vince-muted">
          Tema: {event.theme}
        </p>

        <div className="mt-6 space-y-3 text-sm font-medium text-vince-muted">
          <p className="flex items-center gap-2">
            <DocumentIcon className="h-4 w-4" />
            Curso: {event.course}
          </p>
          <p className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {event.startDate} - {event.endDate}
          </p>
        </div>

        <div className="mt-7 flex items-end justify-between border-t border-vince-border pt-6">
          <div className="flex gap-8">
            <strong className="text-3xl text-vince-primary">
              {event.teams}
              <span className="mt-1 block text-sm font-medium text-vince-muted">Equipes</span>
            </strong>
            <strong className="text-3xl text-vince-primary">
              {event.participants}
              <span className="mt-1 block text-sm font-medium text-vince-muted">Participantes</span>
            </strong>
          </div>
          <button
            aria-label={`Detalhar ${event.title}`}
            className="text-4xl leading-none text-vince-primary"
            onClick={onSelect}
            type="button"
          >
            →
          </button>
        </div>
      </div>
    </article>
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
