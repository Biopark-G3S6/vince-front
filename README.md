# VinceArt — Frontend

Portal acadêmico em React, TypeScript e Vite, entregue como aplicação estática.
A versão deste repositório é uma **demonstração navegável com dados locais**: permite
experimentar equipes, artigos, edição, correção, discussão e acompanhamento sem backend.

A revisão dos requisitos, as lacunas e os limites da demonstração estão em
[`AUDITORIA.md`](AUDITORIA.md). A especificação disponível é [`docs/URS.docx`](docs/URS.docx),
versão 0.4. Os ADRs citados no código não estão disponíveis nesta cópia da documentação;
as referências expressam a arquitetura pretendida e não comprovam sua implementação.

## Executar

Requer Node.js 22.12 ou superior (recomendado Node.js 24 LTS) e pnpm 11.21.0.

```bash
git clone --recurse-submodules https://github.com/Biopark-G3S6/vince-front.git
cd vince-front
pnpm install --frozen-lockfile
pnpm run dev
```

Abra `http://localhost:5173`. No PowerShell com scripts desabilitados, use `pnpm.cmd`
no lugar de `pnpm`. Se já clonou sem a documentação, execute
`git submodule update --init --recursive`.

Na tela de entrada, use uma das contas abaixo. A senha é **vince123** para todas elas:

| Perfil        | E-mail                        |
| ------------- | ----------------------------- |
| Administrador | `admin@vinceart.edu.br`       |
| Coordenador   | `coordenador@vinceart.edu.br` |
| Professor     | `professor@vinceart.edu.br`   |
| Aluno         | `aluno@vinceart.edu.br`       |

Cada conta abre dashboard, menu e ações próprios. A sessão demonstrativa fica somente
na aba atual e as rotas da interface são filtradas pelo perfil. Isso continua sendo
controle local do protótipo, sem autenticação ou autorização de servidor.

- O administrador gerencia instituições, cursos, turmas, eventos e modelos.
- O coordenador consulta professores e alunos, publica eventos oficiais, disponibiliza modelos e gerencia avaliadores e convites.
- O professor acompanha equipes e cria seus próprios artigos e eventos independentes de teste ou TCC, sem acompanhamento da coordenação.
- O aluno escolhe ou importa modelos, inscreve-se nos eventos disponíveis e trabalha em seus artigos, correções, discussão e assistência.

Em **Modelos de artigo**, os três perfis encontram os padrões **Artigo científico** e
**Resumo expandido**, os modelos dos eventos e sua biblioteca pessoal. **Importar modelo**
aceita arquivos `.docx` de até 10 MB, permite revisar o conteúdo e o salva para reutilização.
Professores e coordenadores também podem publicar um modelo nos eventos que administram.
Escolher um modelo cria um novo artigo e preserva o conteúdo dos artigos existentes.

Para participar de um evento, o aluno abre **Eventos e inscrições**, escolhe **Inscrever-me**,
confirma a participação e segue em **Escolher modelo e criar artigo**. Eventos oficiais novos
ficam disponíveis quando a coordenação abre as inscrições. O professor usa **Eventos e TCCs**
para criar um evento de teste ou TCC e definir seus modelos, prazos e inscrições. Esses espaços
independentes e seus artigos ficam fora da gestão e dos relatórios da coordenação.

`convite@vinceart.edu.br` abre a definição de senha e
`inativo@vinceart.edu.br` demonstra o bloqueio por instituição inativa.

Não é necessário criar `.env` para a demonstração. A configuração de `.env.example`
e o proxy `/api` preparam uma futura integração com
[vince-back](https://github.com/Biopark-G3S6/vince-back).

## Dados e limites

- O perfil é definido pelo login e não pode ser trocado dentro das telas protegidas.
  Menu, dashboard, artigos e ações são adaptados à sessão da aba.
- Os fluxos de artigo, templates, correção e discussão usam o armazenamento local do navegador.
  O botão “Restaurar dados de demonstração” reinicia os exemplos dessas áreas.
- A identidade da sessão e o artigo selecionado ficam no armazenamento de sessão da aba. Instituições
  e cadastros acadêmicos persistem neste navegador; perfil e concessões de acesso são exemplos em memória.
- A coedição e as atualizações entre abas funcionam na mesma origem do mesmo navegador.
  Sincronização entre dispositivos, e-mails e IA externa dependem de serviços ainda não integrados.
- Perfil, senha e permissões na tela de acesso não alteram contas reais. Relatórios e
  indicadores incluem dados de exemplo, conforme detalhado na auditoria.

## Testar

```bash
pnpm run verify
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
```

`verify` executa tipos, lint, formatação e testes unitários/de integração. Os testes
de navegador ficam em `e2e/` e iniciam o Vite automaticamente, ou reutilizam o servidor
local em execução. Cada caso recebe um contexto de navegador isolado e os fluxos de
revisão usam uma data fixa para manter os prazos dos exemplos reproduzíveis.

O Playwright gera `playwright-report/` e `test-results/`, com capturas e rastros de
falhas. Consulte o relatório com `pnpm exec playwright show-report`.

| Comando                | Finalidade                            |
| :--------------------- | :------------------------------------ |
| `pnpm run dev`         | Servidor de desenvolvimento           |
| `pnpm run verify`      | Tipos, lint, formatação e testes      |
| `pnpm run build`       | Compilação para `dist/`               |
| `pnpm run preview`     | Visualizar o build local              |
| `pnpm run test:e2e`    | Navegação e fluxos em navegador       |
| `pnpm run docs:update` | Atualizar o submódulo de documentação |

`api:types` e `api:check` estão preparados para um contrato OpenAPI futuro: exigem
`API_SPEC_URL` e a especificação do backend. Ainda não há `src/shared/api/schema.ts`
integrado às chamadas da demonstração.

## Organização e convenções

```text
src/
  app/                    composição, providers e resolução dos caminhos
  features/<feature>/
    api/                  consultas e mutações (atualmente simuladas)
    components/           componentes da área
    pages/                telas
    model/                tipos, validação e apresentação
    index.ts              superfície pública
  shared/                 design system, i18n, armazenamento simulado e utilitários
e2e/                      testes de uso, fluxo e responsividade
```

Consuma cada feature pelo seu `index.ts`; `shared/` não importa features. Dados de
consulta vivem no cache do TanStack Query, e mutações invalidam as consultas afetadas.
Zustand guarda preferências de interface da demonstração.

`PageScaffold` e `AdminShell` padronizam navegação, títulos e espaçamento. Componentes
de `shared/ui` padronizam cartões, botões, estados vazios, abas e confirmações.
Os tokens de cor e raio ficam em `src/index.css`; os estilos do documento estão
isolados em `features/editor/article-editor.css` para preservar impressão e exportação.

O roteamento atual é resolvido manualmente em `App.tsx`; a configuração do plugin
TanStack Router, por si só, não o torna o roteador ativo. O editor é carregado sob
demanda. Em hospedagem estática, configure fallback de caminhos para `index.html`,
permitindo recarregar URLs como `/admin/equipes`.

## Integração e aceite pendentes

A arquitetura prevista usa cookie `HttpOnly`, endpoint de identidade e autorização
em cada operação no backend. Não armazene tokens ou senhas no navegador. Ocultar uma
ação na interface não substitui autorização no servidor.

As metas de experiência são LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75.
Esses limites exigem medição própria; aprovação de build, testes e capturas não
comprova desempenho em produção. Consulte a auditoria para o restante das pendências.
