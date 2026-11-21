import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de integração das telas contra o backend real (vince-back em :3000).
 *
 * O backend precisa estar de pé, migrado e com a carga inicial; a senha do administrador
 * de sistema vem de E2E_ADMIN_PASSWORD. Os testes de demonstração continuam em
 * `playwright.config.ts`.
 */
export default defineConfig({
  testDir: './e2e/integration',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'integration',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } },
    },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
