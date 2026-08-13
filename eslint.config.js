// Enforcement das fronteiras entre features (ADR-0015 §8).
// É o mesmo mecanismo do backend: sem ele, a organização por features degrada
// para organização por pastas — o equivalente frontend da erosão que ADR-0007 previne.
//
//   ADR-0015 §4, §5  uma feature só é acessada pelo seu index.ts
//   ADR-0015 §6      shared/ não importa de features/
//   ADR-0015 §9      sem dependências cíclicas entre features

import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'coverage/**', 'src/routeTree.gen.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        {
          type: 'feature-public',
          pattern: 'src/features/(*)/index.ts',
          mode: 'file',
          capture: ['feature'],
        },
        {
          type: 'feature-internal',
          pattern: 'src/features/(*)/**',
          capture: ['feature'],
        },
      ],
    },
    rules: {
      'boundaries/no-unknown': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message:
            '${file.type} não pode importar de ${dependency.type}. Uma feature só é acessível pelo seu index.ts (ADR-0015 §5).',
          rules: [
            // Raiz da aplicação: providers, roteamento — consome features pela superfície pública.
            { from: 'app', allow: ['shared', 'feature-public'] },

            // Design system e utilitários: nunca apontam para features (ADR-0015 §6).
            { from: 'shared', allow: ['shared'] },

            // Superfície pública da feature: expõe o próprio interno.
            {
              from: 'feature-public',
              allow: ['shared', ['feature-internal', { feature: '${from.feature}' }]],
            },

            // Interno da feature: o próprio interno, shared, e outras features só pela fachada.
            {
              from: 'feature-internal',
              allow: [
                'shared',
                'feature-public',
                ['feature-internal', { feature: '${from.feature}' }],
              ],
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../features/*/*', '@features/*/*'],
              message:
                'Importação do interno de outra feature. Use @features/<feature> (ADR-0015 §5).',
            },
          ],
        },
      ],
    },
  },

  prettier,
);
