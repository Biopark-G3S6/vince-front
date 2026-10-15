import { Suspense, useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import {
  AcademicDashboardPage,
  ArticlesPage,
  ClassesPage,
  CoursesPage,
  EventsPage,
  TeamsPage,
} from '@features/academic';
import {
  AccessAccountPage,
  AccessLandingPage,
  LoginPage,
  PasswordSetupPage,
  RecoverAccessPage,
} from '@features/access';
import { ShellSlotsProvider } from '@features/admin';
import { AssistancePage } from '@features/assistance';
import { ArticleEditorPage, ChooseTemplatePage, PreviewPage } from '@features/editor';
import { DiscussionPage, NotificationBell, NotificationsPage } from '@features/discussion';
import { InstitutionsPage } from '@features/institutions';
import { ProgressPage } from '@features/progress';
import { ReviewCyclePage } from '@features/review';
import { LanguageSettingsPage } from '@features/settings';
import { subscribeMockDb } from '@shared/api/mockDb';
import '@shared/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const shellSlots = { notifications: <NotificationBell /> };

type RouteKey =
  | 'landing'
  | 'login'
  | 'recoverAccess'
  | 'passwordSetup'
  | 'dashboard'
  | 'institutions'
  | 'courses'
  | 'classes'
  | 'events'
  | 'teams'
  | 'articles'
  | 'review'
  | 'discussion'
  | 'notifications'
  | 'assistance'
  | 'progress'
  | 'language'
  | 'editor'
  | 'editorPreview'
  | 'chooseTemplate'
  | 'accessAccount';

const routeTitle: Record<RouteKey, string> = {
  accessAccount: 'Acesso | VinceArt',
  articles: 'Artigos | VinceArt',
  assistance: 'Assistência Automatizada | VinceArt',
  classes: 'Turmas | VinceArt',
  courses: 'Cursos | VinceArt',
  dashboard: 'Dashboard | VinceArt',
  discussion: 'Discussão | VinceArt',
  editor: 'Editor de Artigo | VinceArt',
  editorPreview: 'Visualização do Artigo | VinceArt',
  chooseTemplate: 'Modelo do Artigo | VinceArt',
  events: 'Eventos | VinceArt',
  institutions: 'Instituições | VinceArt',
  landing: 'VinceArt | Academic Portal',
  language: 'Idioma | VinceArt',
  login: 'Entrar | VinceArt',
  notifications: 'Notificações | VinceArt',
  passwordSetup: 'Definir senha | VinceArt',
  progress: 'Acompanhamento | VinceArt',
  recoverAccess: 'Recuperar acesso | VinceArt',
  review: 'Ciclo de Correção | VinceArt',
  teams: 'Equipes | VinceArt',
};

function resolveRoute(pathname: string): RouteKey {
  if (pathname === '/entrar' || pathname === '/login') {
    return 'login';
  }

  if (pathname === '/recuperar-acesso' || pathname === '/forgot-password') {
    return 'recoverAccess';
  }

  if (pathname === '/definir-senha' || pathname === '/reset-password') {
    return 'passwordSetup';
  }

  if (pathname === '/admin' || pathname === '/admin/dashboard' || pathname === '/dashboard') {
    return 'dashboard';
  }

  if (pathname === '/admin/acesso' || pathname === '/perfil') {
    return 'accessAccount';
  }

  if (pathname === '/admin/instituicoes' || pathname === '/instituicoes') {
    return 'institutions';
  }

  if (pathname === '/admin/cursos' || pathname === '/cursos') {
    return 'courses';
  }

  if (pathname === '/admin/turmas' || pathname === '/turmas') {
    return 'classes';
  }

  if (pathname === '/admin/eventos' || pathname === '/eventos') {
    return 'events';
  }

  if (pathname === '/admin/equipes' || pathname === '/equipes') {
    return 'teams';
  }

  if (pathname === '/admin/artigos' || pathname === '/artigos') {
    return 'articles';
  }

  const workspaceRoutes: Record<string, RouteKey> = {
    '/admin/acompanhamento': 'progress',
    '/admin/assistencia': 'assistance',
    '/admin/correcao': 'review',
    '/admin/discussao': 'discussion',
    '/admin/editor': 'editor',
    '/admin/editor/visualizar': 'editorPreview',
    '/admin/templates': 'chooseTemplate',
    '/artigos/editor': 'editor',
    '/artigos/modelo': 'chooseTemplate',
    '/artigos/visualizar': 'editorPreview',
    '/admin/idioma': 'language',
    '/admin/notificacoes': 'notifications',
  };

  return workspaceRoutes[pathname] ?? 'landing';
}

function useRoute() {
  const [route, setRoute] = useState(() => resolveRoute(window.location.pathname));

  useEffect(() => {
    function handleLocationChange() {
      setRoute(resolveRoute(window.location.pathname));
    }

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    document.title = routeTitle[route];
  }, [route]);

  function navigateTo(pathname: string) {
    window.history.pushState({}, '', pathname);
    setRoute(resolveRoute(pathname));
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }

  return { navigateTo, route };
}

export function App() {
  const { navigateTo, route } = useRoute();

  // Outra aba alterou os dados simulados: as consultas são refeitas, o que entrega a
  // mensagem a quem está com a discussão aberta, sem recarregar a página (RF-DSC-004).
  useEffect(() => subscribeMockDb(() => void queryClient.invalidateQueries()), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ShellSlotsProvider slots={shellSlots}>
        {/* Os catálogos de tradução são carregados sob demanda, por namespace (ADR-0026 §29). */}
        <Suspense fallback={null}>
          {route === 'landing' && <AccessLandingPage />}
          {route === 'login' && (
            <LoginPage
              onAuthenticated={() => navigateTo('/admin/dashboard')}
              onPasswordSetup={() => navigateTo('/definir-senha')}
            />
          )}
          {route === 'recoverAccess' && <RecoverAccessPage />}
          {route === 'passwordSetup' && <PasswordSetupPage />}
          {route === 'dashboard' && <AcademicDashboardPage />}
          {route === 'institutions' && <InstitutionsPage />}
          {route === 'courses' && <CoursesPage />}
          {route === 'classes' && <ClassesPage />}
          {route === 'events' && <EventsPage />}
          {route === 'teams' && <TeamsPage />}
          {route === 'articles' && <ArticlesPage />}
          {route === 'accessAccount' && <AccessAccountPage />}
          {route === 'review' && <ReviewCyclePage />}
          {route === 'discussion' && <DiscussionPage />}
          {route === 'notifications' && <NotificationsPage />}
          {route === 'assistance' && <AssistancePage />}
          {route === 'progress' && <ProgressPage />}
          {route === 'language' && <LanguageSettingsPage />}
          {route === 'editor' && <ArticleEditorPage />}
          {route === 'chooseTemplate' && <ChooseTemplatePage />}
          {route === 'editorPreview' && <PreviewPage />}
        </Suspense>
      </ShellSlotsProvider>
      <Toaster closeButton richColors />
    </QueryClientProvider>
  );
}
