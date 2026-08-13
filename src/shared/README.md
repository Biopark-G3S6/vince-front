# Shared

Design system, cliente HTTP e utilitários. **Nunca importa de `features/`** (`ADR-0015 §6`) e
**não contém regra de negócio** (`§7`).

```
shared/
  ui/       componentes de base — Radix estilizado com Tailwind
  api/      cliente HTTP, envelope de resposta, tipos derivados da especificação
  lib/      utilitários (cn, formatação)
  test/     preparação do ambiente de teste
```

## `ui/` — componentes são código seu

Os componentes de base vêm das primitivas sem estilo do **Radix UI**, adotadas pelo padrão
shadcn/ui, com o código-fonte residente aqui (`ADR-0016 §12`). Não são dependência versionada:
**correção publicada na origem não chega por `pnpm update`** — a incorporação é manual e
deliberada (`ADR-0016`, implicação 2).

Duas consequências práticas:

- A **acessibilidade vem da primitiva do Radix**, não da estilização (`implicação 3`). Trocar um
  `Dialog` do Radix por uma `div` estilizada remove controle de foco, navegação por teclado e
  semântica assistiva sem que nada acuse.
- Componente daqui **não contém regra de negócio nem chama a API** (`ADR-0016 §21`).

## Estilo

Tailwind é a **única** solução de estilização (`ADR-0016 §11`). Não adote biblioteca de
componentes com sistema de tokens próprio (`§13`) — dois sistemas de design competindo produzem
divergência visual progressiva e conflito de especificidade.

- Classes condicionais: `clsx` com `tailwind-merge` (`§15`).
- Variantes de componente: `class-variance-authority`, nunca concatenação de string (`§16`).
- Tokens declarados uma única vez, em `src/index.css` (`§18`).

## `api/` — o contrato não se escreve à mão

Os tipos em `api/schema.ts` são **derivados da especificação OpenAPI publicada pelo backend**
(`ADR-0017 §2`) e versionados aqui para que a divergência reprove o build (`§3, §4`).

Não declare manualmente tipo de requisição ou resposta da API (`§5`). Regenere com
`pnpm run api:types`.

Toda resposta segue o envelope único do `ADR-0025`: `data` e `status`, com `pagination` e
`errors` **ausentes** quando não aplicáveis — não nulos.
