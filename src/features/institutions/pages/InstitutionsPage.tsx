import { useMemo, useState } from 'react';

import {
  Button,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from '@shared/ui';

import { cn } from '@shared/lib/cn';

import { AdminShell } from '../components/AdminShell';
import { NewInstitutionDialog } from '../components/NewInstitutionDialog';
import {
  initialInstitutions,
  type Institution,
  type InstitutionAdmin,
  type InstitutionStatus,
} from '../model/institution';

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
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InstitutionStatus>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const visibleInstitutions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return institutions.filter((institution) => {
      const matchesStatus = status === 'all' || institution.status === status;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${institution.name} ${institution.city} ${institution.state}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [institutions, search, status]);

  function handleCreate(institution: Institution) {
    setInstitutions((current) => [institution, ...current]);
  }

  return (
    <AdminShell>
      <main className="px-6 py-12 lg:px-[50px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-sm text-vince-muted">
              <span>Admin</span>
              <ChevronRightIcon className="h-4 w-4" />
              <span className="font-bold text-vince-text">Instituições</span>
            </nav>
            <h1 className="text-4xl font-extrabold tracking-normal text-vince-text">
              Instituições
            </h1>
          </div>

          <Button
            className="mt-2 rounded-full px-7"
            onClick={() => setIsDialogOpen(true)}
            size="md"
          >
            <PlusIcon className="h-5 w-5" />
            Nova instituição
          </Button>
        </div>

        <section className="mt-14 rounded-[18px] border border-vince-border bg-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar instituições</span>
              <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-vince-muted" />
              <input
                className="h-12 w-full rounded-lg border border-vince-border bg-white pl-14 pr-5 text-lg text-vince-muted placeholder:text-vince-muted focus:border-vince-primary"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar instituições..."
                value={search}
              />
            </label>

            <label>
              <span className="sr-only">Filtrar por status</span>
              <select
                className="h-12 w-full rounded-lg border border-vince-border bg-white px-5 text-lg text-vince-text focus:border-vince-primary lg:w-[174px]"
                onChange={(event) => setStatus(event.target.value as 'all' | InstitutionStatus)}
                value={status}
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>

            <Button className="h-12 rounded-lg px-5 font-medium" variant="outline">
              <FilterIcon className="h-5 w-5" />
              Filtros
            </Button>
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-[14px] border border-vince-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[2.2fr_0.8fr_1.4fr_1.2fr_0.45fr] border-b border-vince-border bg-[#fbf8f8] px-8 py-6 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
              <span>Nome</span>
              <span>Status</span>
              <span>Administradores</span>
              <span>Data de cadastro</span>
              <span>Ações</span>
            </div>

            {visibleInstitutions.map((institution) => (
              <InstitutionRow institution={institution} key={institution.id} />
            ))}

            {visibleInstitutions.length === 0 && (
              <div className="min-w-[900px] px-8 py-14 text-center text-vince-muted">
                Nenhuma instituição encontrada.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-vince-border px-8 py-5 text-sm text-vince-muted">
            <span>
              Mostrando 1-{visibleInstitutions.length} de {institutions.length + 42} instituições
            </span>
            <div className="flex items-center gap-5">
              <button
                aria-label="Página anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-vince-tertiary"
                type="button"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                aria-label="Próxima página"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-vince-text hover:bg-vince-tertiary"
                type="button"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <NewInstitutionDialog
        onCreate={handleCreate}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
      />
    </AdminShell>
  );
}

type InstitutionRowProps = {
  institution: Institution;
};

function InstitutionRow({ institution }: InstitutionRowProps) {
  const inactive = institution.status === 'inactive';

  return (
    <article className="grid min-w-[900px] grid-cols-[2.2fr_0.8fr_1.4fr_1.2fr_0.45fr] items-center border-b border-vince-border px-8 py-6 last:border-b-0">
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
              'max-w-[290px] text-xl font-extrabold leading-7 text-vince-text',
              inactive && 'text-[#898083] line-through',
            )}
          >
            {institution.name}
          </h2>
          <p className={cn('text-base text-vince-muted', inactive && 'text-[#9d9497]')}>
            {institution.city}, {institution.state}
          </p>
        </div>
      </div>

      <div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-base font-medium',
            institution.status === 'active'
              ? 'border-green-200 bg-green-100 text-green-800'
              : 'border-vince-border bg-[#f8eeee] text-vince-muted',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              institution.status === 'active' ? 'bg-vince-success' : 'bg-[#98888c]',
            )}
          />
          {statusLabel[institution.status]}
        </span>
      </div>

      <div>
        {institution.admins.length > 0 ? (
          <div className="flex -space-x-2">
            {institution.admins.map((admin) => (
              <span
                aria-label={admin.name}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 ring-white',
                  adminToneClass[admin.tone],
                )}
                key={admin.name}
                title={admin.name}
              >
                {admin.initials}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-lg leading-7 text-[#9d9497]">Nenhum administrador</span>
        )}
      </div>

      <time className={cn('text-lg text-vince-muted', inactive && 'text-[#9d9497]')}>
        {institution.createdAt}
      </time>

      <button
        aria-label={`Ações para ${institution.name}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-primary hover:bg-vince-tertiary"
        type="button"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
    </article>
  );
}
