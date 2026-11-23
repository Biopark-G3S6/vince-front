import { useState, type ReactNode } from 'react';

import { toast } from 'sonner';

import { hasPermission, PageScaffold, useCurrentUser } from '@features/admin';
import { currentVersion, type StoredTemplate, type TemplatePreview } from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import { cn } from '@shared/lib/cn';
import { Button, ConfirmDialog, Notice, UploadIcon } from '@shared/ui';

import { useTemplateCourses, useTemplateLibrary, useTemplateMutations } from '../api/templateApi';
import { TemplateForm } from '../components/TemplateForm';

import '../article-editor.css';

const errorMessage: Record<string, string> = {
  PERMISSION_DENIED: 'Você não tem permissão para esta ação.',
  RESOURCE_NOT_FOUND: 'O modelo não está mais disponível.',
  VALIDATION_FAILED: 'Confira o nome e o conteúdo do modelo.',
};

const showError = (error: unknown) =>
  toast.error(errorMessage[getErrorCode(error)] ?? 'Não foi possível concluir a ação.');

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
  scopeLabel: string;
  canMaintain: boolean;
  canDeactivate: boolean;
  onOpen: () => void;
  onDeactivate: () => void;
};

function TemplateCard({
  template,
  scopeLabel,
  canMaintain,
  canDeactivate,
  onOpen,
  onDeactivate,
}: TemplateCardProps) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm',
        !template.active && 'opacity-70',
      )}
    >
      <Preview kind={template.preview} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill>{scopeLabel}</Pill>
          <Pill>Versão {currentVersion(template).number}</Pill>
          {!template.active && <Pill>Desativado</Pill>}
        </div>
        <h3 className="text-lg font-extrabold leading-snug">{template.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-vince-muted">{template.description}</p>
        <Button className="mt-5 w-full" onClick={onOpen} variant="outline">
          {canMaintain && template.active ? 'Editar modelo' : 'Consultar modelo'}
        </Button>
        {canDeactivate && template.active && (
          <Button className="mt-2" onClick={onDeactivate} size="sm" variant="ghost">
            Desativar modelo
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * Os templates de artigo da instituição (RF-TPL-001). A escolha do template acontece na
 * criação do evento (RF-TPL-002), e cada artigo do evento nasce com a versão escolhida.
 */
export function ChooseTemplatePage() {
  const user = useCurrentUser();

  return (
    <PageScaffold
      activeSection="templates"
      title="Modelos de artigo"
      eyebrow="Biblioteca de modelos"
      description="Mantenha os modelos que servem de ponto de partida aos artigos. O modelo é escolhido na criação do evento, e cada artigo do evento nasce com a versão escolhida."
      actions={
        <a
          className="inline-flex min-h-11 items-center rounded-lg border border-vince-border bg-white px-4 py-2 text-sm font-semibold text-vince-primary hover:bg-vince-tertiary"
          href="/admin/eventos"
        >
          Eventos
        </a>
      }
    >
      <TemplateLibrary key={user.id} />
    </PageScaffold>
  );
}

function TemplateLibrary() {
  const user = useCurrentUser();
  const can = (permission: string) => hasPermission(user, permission);
  const canRead = can('TEMPLATE:READ');
  const maintains = can('TEMPLATE:UPDATE') || can('TEMPLATE:DEACTIVATE');
  const query = useTemplateLibrary(maintains, canRead);
  const coursesQuery = useTemplateCourses(canRead);
  const deactivate = useTemplateMutations().deactivate;
  const [editing, setEditing] = useState<StoredTemplate | 'new' | 'import' | null>(null);
  const [toDeactivate, setToDeactivate] = useState<StoredTemplate | null>(null);

  const institutionAdmin = user.roles.includes('institutionAdmin');
  const courseNames = new Map((coursesQuery.data ?? []).map((course) => [course.id, course.name]));
  const coordinated = new Set(
    (coursesQuery.data ?? [])
      .filter((course) => course.coordinatorId === user.id)
      .map((course) => course.id),
  );
  // RN2: o administrador mantém os da instituição; o coordenador, só os do seu curso.
  const canMaintain = (template: StoredTemplate) =>
    maintains &&
    (institutionAdmin || (template.courseId !== null && coordinated.has(template.courseId)));

  if (!canRead) {
    return (
      <Notice className="mt-6" tone="warning">
        Seu perfil não consulta modelos de artigo. O modelo do seu artigo é o escolhido pelo evento.
      </Notice>
    );
  }
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
  if (!query.data) {
    return (
      <p className="mt-6 text-vince-muted" role="status">
        Carregando modelos…
      </p>
    );
  }

  if (editing) {
    return (
      <TemplateForm
        importMode={editing === 'import'}
        onClose={() => setEditing(null)}
        onError={showError}
        template={
          typeof editing === 'string' ? null : { ...editing, canMaintain: canMaintain(editing) }
        }
      />
    );
  }

  const active = query.data.filter((template) => template.active);
  const institutionWide = active.filter((template) => template.courseId === null);
  const byCourse = active.filter((template) => template.courseId !== null);
  const inactive = query.data.filter((template) => !template.active);

  function cards(items: StoredTemplate[], empty: string) {
    if (items.length === 0) {
      return (
        <p className="mt-4 rounded-lg border border-dashed border-vince-border p-5 text-sm text-vince-muted">
          {empty}
        </p>
      );
    }
    return (
      <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {items.map((template) => (
          <TemplateCard
            canDeactivate={canMaintain(template) && can('TEMPLATE:DEACTIVATE')}
            canMaintain={canMaintain(template)}
            key={template.id}
            onDeactivate={() => setToDeactivate(template)}
            onOpen={() => setEditing(template)}
            scopeLabel={
              template.courseId
                ? (courseNames.get(template.courseId) ?? 'Curso')
                : 'Toda a instituição'
            }
            template={template}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10 py-6">
      <section aria-labelledby="institution-models-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-vince-text" id="institution-models-title">
              Modelos da instituição
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-vince-muted">
              Disponíveis aos eventos de qualquer curso e turma da instituição.
            </p>
          </div>
          {can('TEMPLATE:CREATE') && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setEditing('new')} variant="outline">
                Criar modelo
              </Button>
              <Button onClick={() => setEditing('import')}>
                <UploadIcon className="h-4 w-4" />
                Importar modelo
              </Button>
            </div>
          )}
        </div>
        {cards(institutionWide, 'Nenhum modelo da instituição.')}
      </section>
      <section aria-labelledby="course-models-title">
        <h2 className="text-xl font-extrabold text-vince-text" id="course-models-title">
          Modelos dos cursos
        </h2>
        <p className="mt-2 text-sm leading-6 text-vince-muted">
          Restritos a um curso: só os eventos desse curso e das suas turmas podem escolhê-los.
        </p>
        {cards(byCourse, 'Nenhum modelo restrito a curso.')}
      </section>
      {maintains && inactive.length > 0 && (
        <section aria-labelledby="inactive-models-title">
          <h2 className="text-xl font-extrabold text-vince-text" id="inactive-models-title">
            Modelos desativados
          </h2>
          <p className="mt-2 text-sm leading-6 text-vince-muted">
            Não são mais oferecidos a eventos novos; os eventos que já os adotaram continuam na
            versão escolhida.
          </p>
          {cards(inactive, '')}
        </section>
      )}
      <ConfirmDialog
        cancelLabel="Voltar"
        confirmLabel="Desativar modelo"
        description={`${toDeactivate?.title ?? ''} deixa de ser oferecido a eventos novos. Os eventos que já o adotaram continuam na versão escolhida.`}
        onConfirm={() => {
          const target = toDeactivate;
          setToDeactivate(null);
          if (target) {
            deactivate.mutate(target.id, {
              onError: showError,
              onSuccess: () => toast.success('Modelo desativado.'),
            });
          }
        }}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null);
        }}
        open={toDeactivate !== null}
        title="Desativar modelo?"
      />
    </div>
  );
}
