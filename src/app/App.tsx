import { Suspense, useCallback, useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import {
  AcademicDashboardPage,
  ArticlesPage,
  ClassesPage,
  CoursesPage,
  EventsPage,
  PeoplePage,
  TeamsPage,
} from '@features/academic';
import {
  AccessAccountPage,
  AccessLandingPage,
  LoginPage,
  PasswordSetupPage,
  RecoverAccessPage,
} from '@features/access';
import {
  canAccessSection,
  ShellSlotsProvider,
  useAuthenticatedUser,
  useSignOut,
  type AdminSection,
} from '@features/admin';
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
  | 'people'
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
  people: 'Professores e alunos | VinceArt',
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

const routeSections: Partial<Record<RouteKey, AdminSection>> = {
  accessAccount: 'access',
  articles: 'articles',
  assistance: 'assistance',
  classes: 'classes',
  courses: 'courses',
  dashboard: 'dashboard',
  discussion: 'discussion',
  editor: 'editor',
  editorPreview: 'editor',
  chooseTemplate: 'templates',
  events: 'events',
  people: 'people',
  institutions: 'institutions',
  language: 'language',
  notifications: 'notifications',
  progress: 'progress',
  review: 'review',
  teams: 'teams',
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

  if (pathname === '/admin/pessoas' || pathname === '/pessoas') {
    return 'people';
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

  const navigateTo = useCallback((pathname: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', pathname);
    setRoute(resolveRoute(pathname));
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }, []);

  return { navigateTo, route };
}

export function App() {
  const { navigateTo, route } = useRoute();
  const authenticatedUser = useAuthenticatedUser();
  const signOut = useSignOut();
  const protectedSection = routeSections[route];
  const permitted =
    !protectedSection ||
    (authenticatedUser ? canAccessSection(authenticatedUser.role, protectedSection) : false);
  const visibleRoute: RouteKey =
    protectedSection && !authenticatedUser
      ? 'login'
      : protectedSection && !permitted
        ? 'dashboard'
        : route;

  // Outra aba alterou os dados simulados: as consultas são refeitas, o que entrega a
  // mensagem a quem está com a discussão aberta, sem recarregar a página (RF-DSC-004).
  useEffect(() => subscribeMockDb(() => void queryClient.invalidateQueries()), []);

  useEffect(() => {
    if (protectedSection && !authenticatedUser) {
      navigateTo('/entrar', true);
      return;
    }

    if (protectedSection && !permitted) {
      navigateTo('/admin/dashboard', true);
    }
  }, [authenticatedUser, navigateTo, permitted, protectedSection]);

  return (
    <QueryClientProvider client={queryClient}>
      <ShellSlotsProvider slots={shellSlots}>
        {/* Os catálogos de tradução são carregados sob demanda, por namespace (ADR-0026 §29). */}
        <Suspense
          fallback={
            <div
              className="flex min-h-screen items-center justify-center bg-vince-surface p-6 text-vince-muted"
              role="status"
            >
              Carregando a página…
            </div>
          }
        >
          {visibleRoute === 'landing' && <AccessLandingPage />}
          {visibleRoute === 'login' && (
            <LoginPage
              onAuthenticated={() => {
                queryClient.clear();
                navigateTo('/admin/dashboard');
              }}
              onPasswordSetup={() => navigateTo('/definir-senha')}
            />
          )}
          {visibleRoute === 'recoverAccess' && <RecoverAccessPage />}
          {visibleRoute === 'passwordSetup' && <PasswordSetupPage />}
          {visibleRoute === 'dashboard' && <AcademicDashboardPage />}
          {visibleRoute === 'institutions' && <InstitutionsPage />}
          {visibleRoute === 'courses' && <CoursesPage />}
          {visibleRoute === 'classes' && <ClassesPage />}
          {visibleRoute === 'events' && <EventsPage />}
          {visibleRoute === 'people' && <PeoplePage />}
          {visibleRoute === 'teams' && <TeamsPage />}
          {visibleRoute === 'articles' && <ArticlesPage />}
          {visibleRoute === 'accessAccount' && (
            <AccessAccountPage
              onSignOut={() => {
                signOut();
                queryClient.clear();
                window.sessionStorage.removeItem('vinceart.article');
                window.sessionStorage.removeItem('vinceart.editor.identity');
                navigateTo('/entrar', true);
              }}
            />
          )}
          {visibleRoute === 'review' && <ReviewCyclePage />}
          {visibleRoute === 'discussion' && <DiscussionPage />}
          {visibleRoute === 'notifications' && <NotificationsPage />}
          {visibleRoute === 'assistance' && <AssistancePage />}
          {visibleRoute === 'progress' && <ProgressPage />}
          {visibleRoute === 'language' && <LanguageSettingsPage />}
          {visibleRoute === 'editor' && <ArticleEditorPage />}
          {visibleRoute === 'chooseTemplate' && <ChooseTemplatePage />}
          {visibleRoute === 'editorPreview' && <PreviewPage />}
        </Suspense>
      </ShellSlotsProvider>
      <Toaster closeButton richColors />
    </QueryClientProvider>
  );
}
