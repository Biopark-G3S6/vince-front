# VinceArt — Frontend

Aplicação de página única em React, entregue como artefato estático. As decisões de arquitetura
que governam este repositório estão em [`docs/`](docs/), incluído como submódulo a partir de
[vince-docs](https://github.com/Biopark-G3S6/vince-docs).

> Divergência entre este código e os ADRs é **defeito**, não estilo.

## Começando

```bash
git clone --recurse-submodules https://github.com/Biopark-G3S6/vince-front.git
cd vince-front

cp .env.example .env
pnpm install
pnpm run dev
```

Requer o backend em execução — veja
[vince-back](https://github.com/Biopark-G3S6/vince-back).
Já clonou sem os submódulos? `git submodule update --init --recursive`.

## Estrutura

```
src/
  app/                    bootstrap, providers, roteamento raiz
  features/<feature>/     espelha um módulo do backend
    api/                  chamadas HTTP e hooks de consulta e mutação
    components/           componentes desta feature
    pages/                telas
    model/                tipos, validação, lógica de apresentação
    index.ts              superfície pública
  shared/                 design system, cliente HTTP, utilitários
```

Cada diretório tem um README com as regras que valem ali.

## As duas regras que definem este frontend

**1. Dado que veio da API não entra em store global.** Ele vive no cache do TanStack Query, que é
projeção eventualmente consistente e não fonte da verdade. Copiar resultado de consulta para um
store significa reimplementar cache, invalidação e concorrência à mão — e esquecer de invalidar
depois do primeiro POST.

**2. Uma feature só é acessada pelo seu `index.ts`.** É a mesma fronteira que o backend impõe
entre módulos, e o lint reprova o build quando alguém a atravessa.

## Autenticação — o que o frontend faz

Quase nada, e isso é resultado de decisão de arquitetura. A sessão vive em cookie `HttpOnly`
(`ADR-0013 §8`), então:

1. `POST /auth/login` na tela de login.
2. Endpoint de identidade no carregamento, antes de renderizar rota protegida.
3. Redirecionar ao login quando receber `401`.

Sem armazenar token, sem interceptador de renovação, sem corrida entre requisições paralelas.
E **nunca** guarde credencial em `localStorage` (`ADR-0013 §11`).

As permissões que chegam pelo endpoint de identidade servem **só para compor a tela**. Ocultar um
botão é experiência de uso, não segurança — quem autoriza é o backend (`RNF-SEG-018`).

## Comandos

| Comando                | O que faz                                                                |
| :--------------------- | :----------------------------------------------------------------------- |
| `pnpm run verify`      | **A porta de verificação**: tipos, lint, formatação, fronteiras e testes |
| `pnpm run dev`         | Servidor de desenvolvimento                                              |
| `pnpm run api:types`   | Regenera os tipos a partir da especificação do backend                   |
| `pnpm run test:e2e`    | Testes ponta a ponta (fora da porta de verificação, por duração)         |
| `pnpm run docs:update` | Atualiza o submódulo de documentação                                     |

## Metas de experiência

`ADR-0011 §3`, no percentil 75: **LCP ≤ 2,5 s**, **INP ≤ 200 ms**, **CLS ≤ 0,1**.

Sem renderização no servidor, isso depende inteiramente de divisão de código por rota e de
reservar espaço para conteúdo assíncrono — o esqueleto de carregamento precisa ter a **mesma
altura** do conteúdo real, senão o layout salta e o CLS estoura.
