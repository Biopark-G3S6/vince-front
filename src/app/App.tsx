import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Estado de servidor é cache eventualmente consistente, nunca fonte da
      // verdade (ADR-0015 §13). Revalidar ao recuperar o foco é o padrão.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Raiz da aplicação.
 *
 * Rota protegida não é renderizada antes da resolução da identidade
 * (ADR-0015 §18) — o carregamento inicial aguarda o endpoint de identidade.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* TODO: RouterProvider do TanStack Router, após a definição das rotas. */}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}
