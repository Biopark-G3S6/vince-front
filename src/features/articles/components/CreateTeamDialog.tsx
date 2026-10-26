import { useState, type FormEvent } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';

import { useCurrentUser } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { Button, Notice } from '@shared/ui';

import { useCreateTeam, useEventDirectory } from '../api/hooks';
import { articleHref } from '../api/registryApi';
import { students } from '../model/article';

const errorMessage: Record<string, string> = {
  ADVISOR_NOT_ASSIGNED_TO_EVENT: 'Só um professor vinculado ao evento pode criar equipes nele.',
  EVENT_TEAM_LIMIT_REACHED: 'O evento já atingiu o limite de equipes.',
  VALIDATION_FAILED: 'Informe o nome da equipe, o título do artigo e ao menos um integrante.',
};

const fieldClass =
  'h-11 w-full rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary';

type CreateTeamDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

/**
 * RF-EQP-001 — Criar equipe no evento. A equipe nasce com o seu artigo, e é por aqui
 * que um artigo novo passa a existir.
 */
export function CreateTeamDialog({ onOpenChange, open }: CreateTeamDialogProps) {
  const user = useCurrentUser();
  const directory = useEventDirectory();
  const createTeam = useCreateTeam();
  const events = directory.data?.events ?? [];
  const [selectedEvent, setSelectedEvent] = useState<string>();
  const [teamName, setTeamName] = useState('');
  const [title, setTitle] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([students[0]!.id]);
  const eventId = selectedEvent ?? events[events.length - 1]?.id ?? '';
  const event = events.find((candidate) => candidate.id === eventId);
  const teamsInEvent =
    directory.data?.articles.filter((article) => article.eventId === eventId).length ?? 0;

  function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();

    createTeam.mutate(
      { eventId, memberIds, teamName, title },
      {
        onError: (error) =>
          toast.error(errorMessage[getErrorCode(error)] ?? 'Não foi possível criar a equipe.'),
        onSuccess: (article) => {
          toast.success('Equipe criada. O artigo dela já pode ser aberto.');
          // O artigo nasce em STARTED; a equipe segue direto para o editor.
          window.location.assign(articleHref('/artigos/editor', article.id));
        },
      },
    );
  }

  const toggleMember = (id: string) =>
    setMemberIds((current) =>
      current.includes(id) ? current.filter((member) => member !== id) : [...current, id],
    );

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24151a]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-vince-border bg-white p-8 shadow-2xl">
          <Dialog.Title className="text-2xl font-extrabold text-vince-text">
            Criar equipe
          </Dialog.Title>
          <Dialog.Description className="mt-2 leading-7 text-vince-muted">
            A equipe é criada dentro de um evento e já nasce com o seu artigo, a partir do modelo
            que o evento definiu.
          </Dialog.Description>

          {user.role !== 'advisor' && (
            <Notice className="mt-5" tone="warning">
              Só um professor vinculado ao evento pode criar equipes nele.
            </Notice>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">Evento</span>
              <select
                className={fieldClass}
                onChange={(changeEvent) => setSelectedEvent(changeEvent.target.value)}
                value={eventId}
              >
                {events.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {event && (
                <span className="mt-2 block text-sm text-vince-muted">
                  Modelo: {event.templateTitle}
                  {event.templateVersion ? ` (versão ${event.templateVersion})` : ''} · equipes:{' '}
                  {teamsInEvent} de {event.maxTeams}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Nome da equipe
              </span>
              <input
                className={fieldClass}
                onChange={(changeEvent) => setTeamName(changeEvent.target.value)}
                placeholder="Equipe Ômega"
                value={teamName}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-vince-muted">
                Título do artigo
              </span>
              <input
                className={fieldClass}
                onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                placeholder="Tema de pesquisa da equipe"
                value={title}
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-vince-muted">Integrantes</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {students.map((student) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-vince-border px-3 py-2"
                    key={student.id}
                  >
                    <input
                      checked={memberIds.includes(student.id)}
                      className="h-4 w-4 accent-vince-primary"
                      onChange={() => toggleMember(student.id)}
                      type="checkbox"
                    />
                    <span className="text-vince-text">{student.name}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-sm text-vince-muted">
                Nesta demonstração, a perspectiva de aluno é a de {students[0]!.name}; inclua-o para
                editar o artigo como integrante.
              </p>
            </fieldset>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.Close>
              <Button disabled={createTeam.isPending || !eventId} type="submit">
                Criar equipe e artigo
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
