import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { PageScaffold } from '@features/admin';
import {
  Button,
  LandmarkIcon,
  MetricCard,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  StatusBadge,
} from '@shared/ui';

import { cn } from '@shared/lib/cn';

import { InstitutionDetailsDialog } from '../components/InstitutionDetailsDialog';
import { NewInstitutionDialog } from '../components/NewInstitutionDialog';
import {
  type Institution,
  type InstitutionAdmin,
  type InstitutionStatus,
} from '../model/institution';
import {
  useInstitutionAdmins,
  useInstitutionMutations,
  useInstitutions,
  type InstitutionInput,
} from '../api/institutionApi';
import { describeInstitutionError } from '../model/errors';

const statusLabel: Record<InstitutionStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const adminToneClass: Record<InstitutionAdmin['tone'], string> = {
  light: 'bg-[#ded9d7] text-[#55494c]',
  primary: 'bg-vince-primary text-white',
  dark: 'bg-[#4a4144] text-white',
};

export function InstitutionsPage() {
  const institutionsQuery = useInstitutions();
  const institutions = useMemo(() => institutionsQuery.data ?? [], [institutionsQuery.data]);
  const mutations = useInstitutionMutations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InstitutionStatus>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );

  const visibleInstitutions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return institutions.filter((institution) => {
      const searchable = [
        institution.name,
        institution.acronym,
        institution.legalId,
        institution.domain,
        institution.city,
        institution.state,
        institution.supportEmail,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');

      const matchesStatus = status === 'all' || institution.status === status;
      const matchesSearch = normalizedSearch.length === 0 || searchable.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [institutions, search, status]);

  const activeCount = institutions.filter((institution) => institution.status === 'active').length;
  const inactiveCount = institutions.length - activeCount;
  async function handleCreate(
    input: InstitutionInput & { active: boolean; adminEmail: string },
  ): Promise<boolean> {
    try {
      const created = await mutations.create.mutateAsync(input);
      toast.success('Instituição cadastrada.');
      if (input.adminEmail.trim()) {
        const result = await mutations.assignAdmin.mutateAsync({
          institutionId: created.id,
          email: input.adminEmail,
        });
        if (result.kind === 'invited') {
          toast.success('Convite de administrador emitido.', {
            description: `${window.location.origin}${result.url}`,
            duration: 20_000,
          });
        }
      }
      setSelectedInstitutionId(created.id);
      return true;
    } catch (error) {
      toast.error(describeInstitutionError(error));
      return false;
    }
  }

  async function handleUpdate(id: string, input: InstitutionInput) {
    try {
      await mutations.update.mutateAsync({ id, input });
      toast.success('Dados da instituição atualizados.');
    } catch (error) {
      toast.error(describeInstitutionError(error));
    }
  }

  async function toggleInstitutionStatus(institutionId: string) {
    const current = institutions.find((institution) => institution.id === institutionId);
    if (!current) return;
    const active = current.status !== 'active';
    try {
      await mutations.setActive.mutateAsync({ id: institutionId, active });
      toast.success(active ? 'Instituição reativada.' : 'Instituição desativada.');
    } catch (error) {
      toast.error(describeInstitutionError(error));
    }
  }

  return (
    <PageScaffold
      activeSection="institutions"
      description="Mantenha a fronteira institucional dos dados, suporte e administradores responsáveis."
      eyebrow="Instituições"
      title="Instituições"
      actions={
        <Button className="rounded-padrao px-7" onClick={() => setIsDialogOpen(true)} size="md">
          <PlusIcon className="h-5 w-5" />
          Nova instituição
        </Button>
      }
    >
      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <MetricCard label="Instituições ativas" value={String(activeCount)} />
        <MetricCard label="Instituições inativas" value={String(inactiveCount)} tone="muted" />
        <MetricCard label="Total de instituições" value={String(institutions.length)} />
      </section>

      <section className="mt-8 rounded-lg border border-vince-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar instituições</span>
            <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-vince-muted" />
            <input
              className="h-12 w-full rounded-lg border border-vince-border bg-white pl-14 pr-5 text-base text-vince-text placeholder:text-vince-muted focus:border-vince-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, sigla, domínio ou identificador..."
              value={search}
            />
          </label>

          <label>
            <span className="sr-only">Filtrar por status</span>
            <select
              className="h-12 w-full rounded-lg border border-vince-border bg-white px-5 text-base text-vince-text focus:border-vince-primary lg:w-[190px]"
              onChange={(event) => setStatus(event.target.value as 'all' | InstitutionStatus)}
              value={status}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>

          <Button
            className="h-12 rounded-lg px-5 font-medium"
            disabled={!search && status === 'all'}
            onClick={() => {
              setSearch('');
              setStatus('all');
            }}
            variant="outline"
          >
            Limpar filtros
          </Button>
        </div>
      </section>

      <section className="mt-8 min-w-0 overflow-hidden rounded-lg border border-vince-border bg-white shadow-sm">
        <div
          aria-label="Lista de instituições"
          className="overflow-x-auto"
          role="region"
          tabIndex={0}
        >
          <div className="grid min-w-[1040px] grid-cols-[2.4fr_0.8fr_1.4fr_0.5fr] border-b border-vince-border bg-[#fbf8f8] px-8 py-6 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            <span>Nome</span>
            <span>Status</span>
            <span>Administradores</span>
            <span>Ações</span>
          </div>

          {visibleInstitutions.map((institution) => (
            <InstitutionRow
              institution={institution}
              key={institution.id}
              onSelect={() => setSelectedInstitutionId(institution.id)}
            />
          ))}

          {institutionsQuery.isPending && (
            <div className="px-5 py-14 text-center text-vince-muted" role="status">
              Carregando instituições…
            </div>
          )}

          {!institutionsQuery.isPending && visibleInstitutions.length === 0 && (
            <div className="px-5 py-14 text-center text-vince-muted" role="status">
              Nenhuma instituição encontrada.
            </div>
          )}
        </div>

        <div
          className="border-t border-vince-border px-5 py-5 text-sm text-vince-muted"
          role="status"
        >
          <span>
            Mostrando {visibleInstitutions.length} de {institutions.length} instituições
          </span>
        </div>
      </section>

      <NewInstitutionDialog
        onCreate={handleCreate}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
      />
      <InstitutionDetailsDialog
        institution={selectedInstitution}
        onClose={() => setSelectedInstitutionId(null)}
        onDeactivate={(id) => void toggleInstitutionStatus(id)}
        onUpdate={(id, input) => void handleUpdate(id, input)}
      />
    </PageScaffold>
  );
}

type InstitutionRowProps = {
  institution: Institution;
  onSelect: () => void;
};

function InstitutionRow({ institution, onSelect }: InstitutionRowProps) {
  const inactive = institution.status === 'inactive';
  const admins = useInstitutionAdmins(institution.id).data ?? [];

  return (
    <article className="grid min-w-[1040px] grid-cols-[2.4fr_0.8fr_1.4fr_0.5fr] items-center border-b border-vince-border px-8 py-6 last:border-b-0">
      <div className="flex items-center gap-5">
        <span
          className={cn(
            'relative inline-flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-vince-border bg-vince-tertiary text-vince-primary',
            inactive && 'text-[#8f8386]',
          )}
        >
          <LandmarkIcon className="h-7 w-7" />
          {inactive && <span className="absolute h-px w-9 rotate-45 bg-[#8f8386]" />}
        </span>
        <div>
          <h2
            className={cn(
              'max-w-[330px] text-xl font-extrabold leading-7 text-vince-text',
              inactive && 'text-[#898083] line-through',
            )}
          >
            {institution.name}
          </h2>
          <p className={cn('text-base text-vince-muted', inactive && 'text-[#9d9497]')}>
            {[institution.acronym, [institution.city, institution.state].filter(Boolean).join(', ')]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-1 text-sm text-vince-muted">{institution.domain}</p>
        </div>
      </div>

      <div>
        <StatusBadge
          label={statusLabel[institution.status]}
          tone={inactive ? 'muted' : 'success'}
        />
      </div>

      <div>
        {admins.length > 0 ? (
          <div className="flex -space-x-2">
            {admins.slice(0, 3).map((admin) => (
              <span
                aria-label={admin.name}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 ring-white',
                  adminToneClass[admin.tone],
                )}
                key={admin.id}
                title={`${admin.name} · ${admin.email}`}
              >
                {admin.initials}
              </span>
            ))}
            {admins.length > 3 && (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ded9d7] text-sm font-bold text-[#55494c] ring-2 ring-white">
                +{admins.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-lg leading-7 text-[#9d9497]">Nenhum administrador</span>
        )}
      </div>

      <button
        aria-label={`Detalhes de ${institution.name}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-primary hover:bg-vince-tertiary"
        onClick={onSelect}
        type="button"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
    </article>
  );
}
