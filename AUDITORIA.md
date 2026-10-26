# Auditoria de documentação e cobertura funcional

Data: 21/10/2026. Base: código deste repositório e `docs/URS.docx`, versão 0.4, de
26/08/2026. Este documento separa capacidades demonstráveis no frontend de requisitos
que ainda dependem de integração, decisão de produto ou validação.

## Conclusão da revisão documental

O repositório contém um protótipo navegável com editor e fluxos acadêmicos simulados.
A existência de uma tela ou de uma função comentada com um RF não comprova o
atendimento completo do requisito. Não há base para declarar o produto pronto para
produção ou todos os 70 requisitos aceitos.

- A URS cobre 70 requisitos em 14 categorias, mas registra prioridades propostas,
  requisitos derivados sem ratificação e termo de aceite sem preenchimento. A
  validação com as partes interessadas continua pendente conforme a própria URS.
- Os READMEs referenciam ADRs, padrões de engenharia e evidências de elicitação que
  não estão disponíveis nesta cópia de `docs/`, onde foi encontrado apenas
  `URS.docx`. A conformidade com esses documentos não pode ser conferida aqui.
- O README foi alinhado ao estado atual: documenta credenciais de demonstração,
  dados locais, execução sem backend e os limites da autenticação e dos relatórios.
  Cookie `HttpOnly`, endpoint de identidade e API real permanecem como integração
  futura, claramente separada da demonstração.
- `src/shared/README.md` descreve `src/shared/api/schema.ts` como contrato gerado e
  versionado. Esse arquivo e um cliente HTTP integrado não foram encontrados.
- A configuração contém o plugin do TanStack Router, mas o roteamento efetivo em
  `src/app/App.tsx` usa `window.history` e resolução manual de caminhos. As três
  páginas do editor passaram a usar `React.lazy` pela fachada da feature; isso não
  substitui a futura integração do roteador nem comprova as metas de desempenho.

## Cobertura observada no código

“Local” significa estado em memória, `localStorage` ou `sessionStorage`; não
equivale a persistência ou autorização do servidor. As observações abaixo resultam
de leitura do código, e não de aceite funcional por parte interessada.

| Categoria da URS                  | O que existe no frontend                                                                                                                                                                                                           | Lacuna ou limite observado                                                                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ACS — acesso e identidade         | Contas demonstrativas separadas para administrador, coordenador, professor e aluno; a sessão da aba protege as rotas da interface e define menu, dashboard, perfil e ações disponíveis. Sair limpa a identidade e volta à entrada. | O controle continua no frontend, sem cookie `HttpOnly`, endpoint de identidade ou autorização de servidor. Nome, senha e concessões usam estado local da tela; faltam envio de e-mail e operações reais. |
| INS — instituições                | Busca, filtros, cadastro, edição, situação e administradores, com validação e confirmação de desativação.                                                                                                                          | Persistência local compartilhada via TanStack Query; faltam vínculos, autorização e validação no servidor.                                                                                               |
| CUR — cursos                      | Catálogo, busca, filtros, cadastro, designação e revogação de coordenador persistidos no navegador.                                                                                                                                | Manutenção completa e integração com instituição, permissões e contrato do servidor continuam pendentes.                                                                                                 |
| TUR — turmas                      | Cadastro, consulta, designação/revogação de professores, cadastro de alunos e emissão/revogação de convites locais.                                                                                                                | Aceite de convite, matrícula real e imposição dos vínculos dependem do backend.                                                                                                                          |
| EVT — eventos                     | Catálogo e criação local de evento, com template congelado no cadastro simulado; a visão do coordenador também cadastra eventos e registra ou convida avaliadores.                                                                 | Escopo, cronograma editável, orientadores, manutenção/cancelamento e elegibilidade precisam de cobertura integrada.                                                                                      |
| EQP — equipes                     | Criação de equipe e artigo no registry simulado; gestão local de integrantes elegíveis, convites e responsável nos exemplos acadêmicos.                                                                                            | As duas coleções ainda são distintas. Ingresso/aceite de convites e regras de elegibilidade, tamanho e unicidade precisam de integração e autorização no servidor.                                       |
| ART — artigos                     | Consulta, editor e correção; notas do artigo/individuais e publicação externa persistidas nos exemplos acadêmicos locais.                                                                                                          | Notas e publicação ainda precisam usar a mesma fonte dos artigos do registry e ser integradas ao servidor.                                                                                               |
| TPL — templates                   | Modelos, versionamento local, seleção no evento e uso como semente.                                                                                                                                                                | Exige persistência e autorização por instituição/curso para atender ao contrato de produção.                                                                                                             |
| EDT — edição                      | Editor Tiptap, referências estruturadas, citações, histórico, importação DOCX, exportação e Yjs.                                                                                                                                   | Coedição usa `BroadcastChannel` entre abas da mesma origem/navegador. Faltam transporte autenticado entre dispositivos, persistência durável e validação de concorrência real.                           |
| REV — correção                    | Entrega, desfazer entrega, apontamentos, devolução, atendimento, decisões, comparação e conclusão no backend simulado.                                                                                                             | Encerramento por prazo é executado durante a leitura de `getReviewCycle`; falta execução independente do navegador. Regras e imutabilidade precisam de imposição no servidor.                            |
| DSC — discussão e notificações    | Mensagens, respostas, exclusão, notificações e marcação de leitura locais; sincronização por eventos de armazenamento.                                                                                                             | Não há transporte entre navegadores/dispositivos nem entrega de e-mail integrada.                                                                                                                        |
| IAA — assistência                 | Consentimento local, resumo baseado nas versões, checagens estruturais e apresentação de resultados.                                                                                                                               | Similaridade, formatação e indícios de autoria incluem resultados fixos de demonstração. Não há serviço externo de IA nem verificador completo de norma.                                                 |
| ACP — acompanhamento e relatórios | Painéis, sinais, contribuição e geração/exportação de relatório.                                                                                                                                                                   | Mistura dados do ciclo local com equipes e métricas fixas, incluindo médias de notas, publicação e contribuição. Não representa relatório consolidado de produção.                                       |
| INT — idioma                      | i18next, catálogos por namespace, fallback e preferência local compartilhada entre perfil e tela de idioma; português publicado e inglês parcial no desenvolvimento.                                                               | Preferência ainda não ligada ao perfil no servidor. Há texto fixo fora dos catálogos.                                                                                                                    |

## Pendências prioritárias

1. **Identidade, autorização e persistência de produção.** Integrar autenticação,
   identidade, encerramento de sessão, recuperação, permissões efetivas e escopo
   institucional. A sessão e a matriz de rotas atuais são controles locais para a
   demonstração e precisam ser impostas pelo servidor em produção.
2. **Integração das operações locais.** Os cadastros, responsáveis, notas e
   publicações receberam ações com persistência no navegador. Ainda falta integrar
   essas mutações ao contrato de produção e ao mesmo conjunto de dados do editor.
   Nome, senha e concessões da tela de perfil continuam como demonstração em memória.
3. **Fonte única dos dados acadêmicos.** A coleção local `academic-management`
   passou a alimentar os cartões e métricas do dashboard, mas continua distinta do
   cadastro de `articles/api/registryApi.ts`. A criação de evento/equipe/artigo no
   registry pode divergir dos exemplos de gestão e dos relatórios demonstrativos.
4. **Prazos e colaboração independentes de abas.** Executar fechamento automático
   no backend e prover sincronização autenticada entre usuários/dispositivos.
   Relógio do navegador e armazenamento da origem não substituem esses serviços.
5. **Métricas e assistência verificáveis.** Substituir resultados demonstrativos
   por cálculos rastreáveis. A URS já registra, em §3 item 12, a pendência sobre
   serviço externo, declaração de consentimento e base para envio de conteúdo;
   isso continua em aberto para RF-IAA-001 em produção.
6. **Documentação normativa e contrato.** Disponibilizar os ADRs/padrões citados e
   registrar o contrato da API. O README agora descreve o modo de demonstração,
   os comandos de execução/teste e a restauração dos exemplos.

As decisões de escopo já registradas na URS não devem ser tratadas como defeitos
novos: radar externo adiado, uma instituição e uma turma por usuário, ABNT como
norma única, ausência de canal privado de professores, ausência de prorrogação
individual e similaridade limitada ao acervo interno. A ratificação e a visão dos
alunos permanecem pendências de produto, conforme §3.

## Como reproduzir o modo de demonstração

Requisitos declarados em `package.json`: Node.js 22.12 ou superior e pnpm 11.21.0.

```bash
pnpm install
pnpm run dev
```

No PowerShell com execução de scripts desabilitada, use `pnpm.cmd` no lugar de
`pnpm`. Não é necessário configurar `.env` para os fluxos simulados.

A entrada demonstrativa reconhece `admin@vinceart.edu.br`,
`coordenador@vinceart.edu.br`, `professor@vinceart.edu.br` e
`aluno@vinceart.edu.br`, todos com senha `vince123`.
`convite@vinceart.edu.br` demonstra a definição de senha e
`inativo@vinceart.edu.br` demonstra a instituição inativa. Esses valores são
condições fixas da interface, não contas de um serviço de autenticação.

Os dados simulados persistidos usam o prefixo `vinceart.mock.v1.` no armazenamento
local da origem. A preferência de idioma usa `vinceart.language`. A sessão usa
`vinceart.session` e o artigo aberto usa `vinceart.article`, ambos no
armazenamento de sessão da aba. Reiniciar o servidor não restaura esses dados;
para recomeçar as coleções simuladas, limpe os dados do site no navegador. Para
isolar também preferências e estado da aba, use um contexto novo do navegador.

## Ajustes de interface desta revisão

- A navegação administrativa, os títulos, os espaçamentos, as abas e as superfícies
  usam componentes compartilhados; instituições, perfil e modelos foram alinhados
  ao mesmo `PageScaffold` das demais áreas.
- Instituições e operações de gestão acadêmica passaram a preservar alterações no
  armazenamento local e a participar da restauração dos exemplos. O dashboard usa
  os dados dessa gestão; o acompanhamento só abre artigos reais pelo identificador,
  evitando direcionar equipes de exemplo para outro artigo.
- O editor removeu a largura mínima global, oferece estrutura recolhível no celular
  e mantém rolagem das ferramentas dentro da própria barra. As ações principais e
  os menus receberam áreas maiores de interação.
- Referências e histórico abrem em painel modal com controle de foco e rolagem;
  ao fechar, o foco volta ao documento. Os demais diálogos respeitam a altura da
  tela, e os estados de carregamento/falha permitem compreender ou repetir a ação.
- A folha e a visualização refluem em telas pequenas com margens de leitura. As
  medidas da norma continuam usadas para exportação e impressão A4; o zoom visual
  é removido na impressão. A prévia usa margens menores somente na tela pequena.

Esses itens descrevem alterações implementadas. A lista de resoluções e fluxos
efetivamente executados deve constar nos resultados de verificação.

## Verificações e critérios de conclusão

Esta análise de cobertura foi feita por inspeção estática. Há testes em
`src/**/*.spec.ts`, cenários de navegador em `e2e/` e configuração Playwright;
a presença desses arquivos não significa que as suítes tenham passado.
Resultados de execução devem registrar
comando, contexto, quantidade de testes e falhas, sem inferir cobertura de
produção a partir do backend simulado.

```bash
pnpm run verify
pnpm run build
pnpm run test:e2e
```

Para o aceite da experiência de uso, conferir todas as 22 páginas resolvidas por
`src/app/App.tsx`, incluindo entrada, recuperação, definição de senha, landing,
perfil, sete telas acadêmicas, editor/modelo/visualização, correção, discussão,
notificações, assistência, acompanhamento e idioma:

- Executar o fluxo equipe → artigo → edição → entrega → apontamento → devolução →
  atendimento → nova entrega → decisão/conclusão, verificando os dois perfis.
- Verificar busca sem resultado, campos inválidos, cancelamento, recarregamento,
  navegação voltar/avançar, entrada por URL e isolamento entre artigos.
- Conferir 320, 390, 768 e 1440 pixels: navegação acessível, ações sem corte,
  diálogos dentro da tela e rolagem horizontal restrita a áreas que a exijam.
- Conferir teclado, foco visível, rótulos, retorno do foco de diálogos, mensagens de
  erro e estados de carregamento/vazio. Classes responsivas e primitivas Radix
  ajudam a implementação, mas não comprovam esses comportamentos por si só.
- Comparar títulos, espaçamento, botões, formulários, cartões, tabelas e mensagens
  entre módulos. Registrar os tamanhos efetivamente testados e guardar evidências.

As metas do README (LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 no percentil 75) exigem
medição própria. Compilação bem-sucedida e inspeção de capturas não comprovam essas
metas, nem acessibilidade integral ou compatibilidade com todos os dispositivos.

## Resultados executados nesta revisão

Ambiente: Windows, Node.js 25.8.1, pnpm 11.21.0 e Chromium do Playwright. Os testes
usam dados locais isolados por contexto, com português do Brasil e fuso
`America/Sao_Paulo`. Os fluxos de correção mantêm uma data fixa para reproduzir os
prazos dos exemplos; isso não representa uma execução do serviço de prazo real.

| Verificação                                                   | Resultado                                                                                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm.cmd --config.verifyDepsBeforeRun=false run verify`      | Aprovado: tipos, ESLint, Prettier e 81 testes em 13 arquivos.                                                                                                   |
| `pnpm.cmd --config.verifyDepsBeforeRun=false run build`       | Aprovado. O Vite ainda avisa sobre o chunk do editor com aproximadamente 577 kB sem compressão.                                                                 |
| Playwright (`node node_modules/@playwright/test/cli.js test`) | 81 cenários de navegador aprovados após as correções, nos projetos desktop e mobile.                                                                            |
| Matriz de responsividade                                      | 22 telas em 320, 375, 768, 1024 e 1440 pixels: 110 combinações sem conteúdo saindo da viewport. Tabelas e ferramentas podem ter rolagem horizontal local.       |
| Revisão visual                                                | Capturas de dashboard, instituições, modelos, editor e discussão em desktop e celular; corrigida também a sobreposição interna de controles no editor a 375 px. |
| Documento e foco                                              | Painéis de referências/histórico com foco e Escape verificados; folha desktop de 794 px e PDF com dimensões A4 conferidos.                                      |

Rodada completa consolidada: `node node_modules/@playwright/test/cli.js test --workers=2`,
**81 aprovados, nenhuma falha e nenhum caso pulado**, em aproximadamente 2,4 minutos.

Os cenários incluem login com erro/sucesso, navegação e menu recolhível, cadastro e
edição institucional, equipe → artigo → edição preservada ao recarregar,
entrega/desfazer/apontamento/devolução, discussão entre abas e notificações,
restrições por sessão e perfil, consulta de professores e alunos, cadastro de evento,
convite e cadastro de avaliadores, abas por teclado, relatórios CSV, exportação DOCX,
template com versão congelada no evento, curso → turma, notas e publicação com
persistência após recarregamento. A matriz é executada uma vez no projeto desktop;
o projeto mobile executa os cenários de uso sem duplicar essa matriz.

O relatório navegável fica em [`playwright-report/index.html`](playwright-report/index.html),
com capturas e detalhes de cada cenário. `test-results/` guarda as evidências; esses
artefatos são gerados e não versionados. O CI passou a executar a suíte Chromium e
guardar os relatórios. Essa configuração foi adicionada nesta revisão, mas a
execução remota do CI não foi observada nesta sessão.

Não foram medidos Web Vitals em produção, auditada acessibilidade integral, nem
testados Safari, Firefox, aparelhos físicos ou integração com backend real.
