import {
  CalendarIcon,
  ChartIcon,
  CheckCircleIcon,
  DocumentIcon,
  EditIcon,
  HomeIcon,
  ShieldIcon,
  UsersIcon,
} from '@shared/ui';

import { BrandMark } from '../components/BrandMark';

type FlowStep = {
  icon: typeof CalendarIcon;
  label: string;
  title: string;
  description: string;
};

type ModuleCard = {
  image: string;
  icon: typeof HomeIcon;
  title: string;
  description: string;
};

const images = {
  dashboard: '/assets/landing-dashboard-hero.png',
  organization: '/assets/landing-library-hero.png',
  teams: '/assets/landing-dashboard-hero.png',
};

const flowSteps: FlowStep[] = [
  {
    icon: CalendarIcon,
    label: 'ETAPA 1',
    title: 'Organize o evento',
    description: 'Configure cronogramas, comitês científicos e trilhas para guiar submissões.',
  },
  {
    icon: UsersIcon,
    label: 'ETAPA 2',
    title: 'Forme as equipes',
    description: 'Vincule orientadores, pesquisadores e estudantes ao trabalho acadêmico.',
  },
  {
    icon: DocumentIcon,
    label: 'ETAPA 3',
    title: 'Produza o artigo',
    description: 'Controle autoria, metadados, versões e evidências do desenvolvimento.',
  },
  {
    icon: ChartIcon,
    label: 'ETAPA 4',
    title: 'Acompanhe o progresso',
    description: 'Visualize status, prazos e riscos de cada equipe sem perder rastreabilidade.',
  },
  {
    icon: CheckCircleIcon,
    label: 'ETAPA 5',
    title: 'Avalie os trabalhos',
    description: 'Organize revisão, apontamentos e decisões com trilha de responsabilidade.',
  },
  {
    icon: EditIcon,
    label: 'ETAPA 6',
    title: 'Registre as publicações',
    description: 'Consolide submissões, certificados e histórico institucional de produção.',
  },
];

const moduleCards: ModuleCard[] = [
  {
    image: images.organization,
    icon: HomeIcon,
    title: 'Organização acadêmica',
    description: 'Estrutura instituições, cursos, turmas, eventos e fronteiras de acesso.',
  },
  {
    image: images.teams,
    icon: UsersIcon,
    title: 'Acompanhamento de equipes',
    description: 'Monitora equipes, orientadores e concessões temporárias de atuação.',
  },
];

export function AccessLandingPage() {
  return (
    <main className="min-h-screen bg-white text-vince-text">
      <header className="sticky top-0 z-20 border-b border-[#f0dfe3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a
            aria-label="VinceArt"
            className="flex items-center gap-2 font-extrabold text-vince-primary"
            href="/"
          >
            <HomeIcon className="h-4 w-4" />
            <span>VinceArt</span>
          </a>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-8 text-sm font-medium text-vince-muted md:flex"
          >
            <a className="border-b-2 border-vince-primary pb-1 text-vince-primary" href="/">
              Início
            </a>
            <a className="pb-1 hover:text-vince-primary" href="#fluxo">
              Fluxo
            </a>
            <a className="pb-1 hover:text-vince-primary" href="#modulos">
              Módulos
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              className="inline-flex h-9 items-center rounded-padrao border border-vince-border px-4 text-sm font-semibold text-vince-primary hover:bg-vince-tertiary"
              href="/entrar"
            >
              Entrar
            </a>
            <a
              className="hidden h-9 items-center rounded-padrao bg-vince-primary px-4 text-sm font-semibold text-white hover:bg-[#571424] sm:inline-flex"
              href="/entrar"
            >
              Acessar plataforma
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#f0dfe3] bg-[#fffafa]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1fr_0.95fr] md:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-padrao border border-vince-border bg-white px-3 py-2 text-sm font-semibold text-vince-primary shadow-sm">
              <ShieldIcon className="h-4 w-4" />
              Plataforma acadêmica institucional
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-tight text-vince-text md:text-5xl">
              Organize, acompanhe e valorize a produção acadêmica.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-vince-muted">
              Controle identidade, instituições, eventos, equipes e artigos em uma experiência
              única, feita para governança acadêmica e rastreabilidade de ponta a ponta.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center rounded-padrao bg-vince-primary px-5 text-base font-semibold text-white hover:bg-[#571424]"
                href="/entrar"
              >
                Entrar na plataforma
              </a>
              <a
                className="inline-flex h-11 items-center rounded-padrao border border-vince-border bg-white px-5 text-base font-semibold text-vince-muted hover:bg-vince-tertiary"
                href="#modulos"
              >
                Conheça o VinceArt
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 bottom-0 h-24 rounded-full bg-[#d7c8c8] blur-3xl" />
            <div className="relative overflow-hidden rounded-lg border border-[#ead9dd] bg-white shadow-2xl">
              <img
                alt="Dashboard analítico em tela de computador"
                className="aspect-[4/3] w-full object-cover"
                src={images.dashboard}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#260b14]/35 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/25 bg-white/88 p-4 backdrop-blur">
                <p className="text-sm font-bold text-vince-primary">Painel institucional</p>
                <p className="mt-1 text-sm text-vince-muted">
                  Status, produção e permissões efetivas em uma visão executiva.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20" id="fluxo">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-vince-text">O fluxo da excelência</h2>
          <p className="mt-3 text-vince-muted">
            Um processo estruturado para gerenciar cada etapa do desenvolvimento científico, desde a
            concepção até a publicação.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {flowSteps.map((step) => {
            const StepIcon = step.icon;

            return (
              <article
                className="rounded-padrao border border-[#f0dfe3] bg-white p-6 shadow-sm"
                key={step.label}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-vince-tertiary text-vince-primary">
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-black uppercase text-vince-primary">
                    {step.label}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-vince-text">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-vince-muted">{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[#f0dfe3] bg-[#fffdfd] py-20" id="modulos">
        <div className="mx-auto max-w-6xl px-4">
          <div>
            <h2 className="text-3xl font-extrabold text-vince-text">Módulos institucionais</h2>
            <p className="mt-3 max-w-2xl text-vince-muted">
              Construído sob medida para as demandas de gestão acadêmica universitária, sem misturar
              administração do sistema com conteúdo acadêmico sensível.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {moduleCards.map((card) => {
              const ModuleIcon = card.icon;

              return (
                <article
                  className="overflow-hidden rounded-padrao border border-[#ead9dd] bg-white shadow-sm"
                  key={card.title}
                >
                  <img alt="" className="h-56 w-full object-cover" src={card.image} />
                  <div className="p-6">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-padrao bg-vince-tertiary text-vince-primary">
                      <ModuleIcon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 font-bold text-vince-text">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-vince-muted">{card.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#f0dfe3] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-vince-muted md:flex-row md:items-center md:justify-between">
          <BrandMark compact />
          <nav aria-label="Links institucionais" className="flex gap-6">
            <a href="/">Privacidade</a>
            <a href="/">Termos</a>
            <a href="/">Suporte</a>
            <a href="/">Contato</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
