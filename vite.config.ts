import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Aplicação de página única, entregue como artefato estático (ADR-0016 §3).
// Não existe servidor de renderização — o cookie de sessão vai direto do
// navegador para a API (ADR-0013 §8).
export default defineConfig({
  plugins: [
    tanstackRouter({
      // O roteamento raiz vive em app/, conforme ADR-0015 §3. As telas moram
      // nas features; as rotas apenas as compõem.
      routesDirectory: 'src/app/routes',
      generatedRouteTree: 'src/app/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@app': path.resolve(import.meta.dirname, './src/app'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@features': path.resolve(import.meta.dirname, './src/features'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Em desenvolvimento, a API é servida sob a mesma origem para que o cookie
      // de sessão funcione sem configuração de CORS com credenciais.
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Divisão de código por rota (ADR-0015 §16), exigida pelas metas de ADR-0011 §3.
    target: 'es2022',
    sourcemap: true,
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Sem limiar: ADR-0024 §21 proíbe meta percentual como critério.
      reporter: ['text-summary', 'html'],
    },
  },
});
