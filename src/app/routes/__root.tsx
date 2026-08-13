import { createRootRoute, Outlet } from '@tanstack/react-router';

/**
 * Rota raiz. As telas residem nas features; as rotas apenas as compõem
 * (ADR-0015 §1 a §3).
 *
 * Rota protegida NÃO deve ser renderizada antes da resolução da identidade
 * do usuário (ADR-0015 §18) — o carregamento aguarda o endpoint de identidade.
 */
export const Route = createRootRoute({
  component: () => <Outlet />,
});
