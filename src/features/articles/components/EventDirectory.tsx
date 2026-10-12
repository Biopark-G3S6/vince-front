import { useFormatters } from '@shared/i18n';
import { SectionPanel } from '@shared/ui';

import { useEventDirectory } from '../api/hooks';
import { courseName } from '../model/templates';

const scopeLabel = { class: 'Turma', course: 'Curso', institution: 'Instituição' };

/** Eventos cadastrados, com o modelo que cada um congelou, o cronograma e as equipes. */
export function EventDirectory() {
  const { formatDate } = useFormatters();
  const { data } = useEventDirectory();

  if (!data) {
    return null;
  }

  return (
    <SectionPanel className="mt-8" title="Eventos cadastrados">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-vince-border text-sm text-vince-muted">
            <tr>
              <th className="pb-3 font-semibold">Evento</th>
              <th className="pb-3 font-semibold">Escopo</th>
              <th className="pb-3 font-semibold">Modelo do artigo</th>
              <th className="pb-3 font-semibold">Cronograma</th>
              <th className="pb-3 text-right font-semibold">Equipes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vince-border">
            {data.events.map((event) => (
              <tr key={event.id}>
                <td className="py-4 pr-4 align-top">
                  <p className="font-bold text-vince-text">{event.name}</p>
                  <p className="text-sm text-vince-muted">Criado por {event.createdBy}</p>
                </td>
                <td className="py-4 pr-4 align-top text-vince-muted">
                  {scopeLabel[event.scope]}
                  {event.courseId ? ` · ${courseName(event.courseId)}` : ''}
                </td>
                <td className="py-4 pr-4 align-top text-vince-text">
                  {event.templateTitle}
                  {event.templateVersion ? ` · versão ${event.templateVersion}` : ''}
                </td>
                <td className="py-4 pr-4 align-top text-sm text-vince-muted">
                  <ol className="space-y-0.5">
                    {event.schedule.map((step, index) => (
                      <li key={step.name}>
                        {index + 1}. {step.name} — {formatDate(step.deadline)}
                      </li>
                    ))}
                  </ol>
                </td>
                <td className="py-4 text-right align-top font-bold text-vince-text">
                  {data.articles.filter((article) => article.eventId === event.id).length} de{' '}
                  {event.maxTeams}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}
