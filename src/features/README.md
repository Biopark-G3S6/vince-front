# Features

Cada diretório aqui espelha um **módulo do backend** (`ADR-0015 §1`). A simetria é intencional:
quando o time discute "o módulo de orientação", os dois repositórios têm uma pasta com esse nome,
e a alteração de uma capacidade fica contida dos dois lados.

**Não** crie diretórios por camada técnica neste nível (`ADR-0015 §2`).

## Estrutura obrigatória

```
<feature>/
  api/          chamadas HTTP e hooks de consulta e mutação
  components/   componentes desta feature
  pages/        telas
  model/        tipos, validação e lógica de apresentação
  index.ts      superfície pública — a fachada da feature
```

## As regras que o lint impõe

| Regra                                                          | Origem          |
| :------------------------------------------------------------- | :-------------- |
| Uma feature só é acessada pelo `index.ts` de outra             | ADR-0015 §4, §5 |
| `shared/` nunca importa de `features/`                         | ADR-0015 §6     |
| Sem dependências cíclicas entre features                       | ADR-0015 §9     |
| Componente não chama a API diretamente — só pela camada `api/` | ADR-0017 §6     |

## Estado: a regra que mais importa

**Dado que veio da API não entra em store global** (`ADR-0015 §12`).

| Categoria          | O que é                              | Onde vive                            |
| :----------------- | :----------------------------------- | :----------------------------------- |
| Estado de servidor | Artigos, usuários, avaliações        | Cache do TanStack Query              |
| Estado de cliente  | Modal aberto, filtro, tema, rascunho | `useState`, ou Zustand se for global |

O cache é projeção eventualmente consistente, não fonte da verdade (`§13`) — o mesmo princípio
que o `ADR-0006 §7` aplica às réplicas locais no backend. Copiar o resultado de uma consulta
para um store significa reimplementar cache, invalidação e concorrência à mão.

Toda mutação que altere dado de servidor deve invalidar as consultas afetadas (`§14`).

## Permissões na interface

Ocultar ou desabilitar ação para quem não tem permissão é **experiência de uso, não segurança**
(`ADR-0015 §19, §20`). Quem autoriza é o backend, sempre. As permissões que chegam pelo endpoint
de identidade servem só para compor a tela (`RNF-SEG-018`).
