import { useEffect, useState } from 'react';

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
import { InstitutionsPage } from '@features/institutions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

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
  | 'accessAccount';

const routeTitle: Record<RouteKey, string> = {
  accessAccount: 'Acesso | VinceArt',
  articles: 'Artigos | VinceArt',
  classes: 'Turmas | VinceArt',
  courses: 'Cursos | VinceArt',
  dashboard: 'Dashboard | VinceArt',
  events: 'Eventos | VinceArt',
  institutions: 'Instituições | VinceArt',
  landing: 'VinceArt | Academic Portal',
  login: 'Entrar | VinceArt',
  passwordSetup: 'Definir senha | VinceArt',
  recoverAccess: 'Recuperar acesso | VinceArt',
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

  return 'landing';
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

  return (
    <QueryClientProvider client={queryClient}>
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
      <Toaster closeButton richColors />
    </QueryClientProvider>
  );
}
