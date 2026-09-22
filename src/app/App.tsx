import { useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AccessLandingPage, LoginPage, RecoverAccessPage } from '@features/access';
import { InstitutionsPage } from '@features/institutions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

type RouteKey = 'landing' | 'login' | 'recoverAccess' | 'institutions';

const routeTitle: Record<RouteKey, string> = {
  landing: 'VinceArt | Academic Portal',
  login: 'Entrar | VinceArt',
  recoverAccess: 'Recuperar acesso | VinceArt',
  institutions: 'Instituições | VinceArt',
};

function resolveRoute(pathname: string): RouteKey {
  if (pathname === '/entrar' || pathname === '/login') {
    return 'login';
  }

  if (pathname === '/recuperar-acesso' || pathname === '/forgot-password') {
    return 'recoverAccess';
  }

  if (pathname === '/admin/instituicoes' || pathname === '/instituicoes') {
    return 'institutions';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { navigateTo, route };
}

export function App() {
  const { navigateTo, route } = useRoute();

  return (
    <QueryClientProvider client={queryClient}>
      {route === 'landing' && <AccessLandingPage />}
      {route === 'login' && (
        <LoginPage onAuthenticated={() => navigateTo('/admin/instituicoes')} />
      )}
      {route === 'recoverAccess' && <RecoverAccessPage />}
      {route === 'institutions' && <InstitutionsPage />}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}
