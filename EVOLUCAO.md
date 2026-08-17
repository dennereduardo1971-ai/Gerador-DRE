# Evolução do projeto — memória viva

Este arquivo é a **memória de trabalho do Claude** neste repositório.
`CLAUDE.md` responde "como o projeto é e por quê"; aqui fica "onde ele
está agora, o que já foi medido, o que ficou pendente e o que vale fazer
em seguida".

A diferença importa: `CLAUDE.md` é doutrina, muda pouco e cada frase dele
precisa continuar verdadeira. Este arquivo é diário, cresce por cima e
pode conter hipóteses ainda não confirmadas — desde que rotuladas como
tal.

## Como me atualizar (protocolo para o Claude, toda sessão)

No **fim** de cada sessão de trabalho, antes de commitar:

1. Atualize **Estado atual** — só os números que mudaram (contagem de
   testes, tamanho do bundle, arquivos maiores). Números velhos aqui são
   piores que número nenhum: eles fazem a próxima sessão decidir errado.
2. Acrescente uma entrada em **Registro**, no topo, com a data. Curta:
   o que mudou, o que foi medido, o que ficou de fora e por quê.
3. Revise **Próximos passos**: risque o que foi feito, reordene se a
   sessão mudou a prioridade, acrescente o que descobriu.
4. Se descobriu uma armadilha que custaria caro repetir, ela **não fica
   aqui**: vai para "Armadilhas conhecidas" em `CLAUDE.md`, que é o
   arquivo que a próxima sessão lê primeiro. Aqui fica só o registro de
   que ela foi encontrada.
5. Se alguma frase de `CLAUDE.md` deixou de ser verdade por causa da sua
   mudança, corrija `CLAUDE.md` **no mesmo commit**.

Duas regras que não se afrouxam:

- **Nenhum dado de cliente aqui.** Nem valor, nem nome de conta com
  saldo, nem trecho de razão. Este arquivo é versionado e público.
- **Não escreva "validado" o que você não validou.** Se rodou só o
  Vitest, escreva "Vitest passou"; `fixtures/validar.mjs` só roda em
  máquina que tenha os arquivos reais, e mentir sobre isso é o tipo de
  erro que este projeto inteiro existe para evitar.

## Estado atual

_Atualizado em 17/08/2026._

| | |
|---|---|
| Testes | 211 (Vitest, 14 arquivos) |
| Lint | `npx oxlint src/` — 2 avisos pré-existentes em `historico.js` |
| Bundle | app 413 kB (127 kB gzip) + `xlsx` 424 kB em chunk sob demanda |
| CSS | 40 kB (8,2 kB gzip) |
| Código | ~8.760 linhas em `src/` (App.jsx + lib + components) |
| Maiores arquivos | `App.jsx` (856), `cpc51.js` (455), `cronograma51.js` (370) |
| Validação contra DRE real | `node fixtures/validar.mjs` — **não roda nesta máquina** (os arquivos reais são gitignorados) |
| Skills versionadas | 6 (`manter-evolucao`, `testar-com-arquivo-real`, `ajustar-classificacao-dre`, `build-e-publicar`, `nova-funcionalidade`, `otimizar-app`) |
| Agentes | 3 (`auditor-contabil`, `revisor-visual`, `arquiteto-erp`) |

A navegação tem **Início** solto no topo e cinco seções, definidas como
dado em `SECOES` (`App.jsx`):

| Seção | Abas |
|---|---|
| (sem seção) | Início |
| Fluxo | Importar → Conferir → Classificar → DRE |
| Análises | Painel, Balanço, Horizontal, Comparativa |
| Parâmetros | De-Para |
| Arquivo | Histórico, Arquivos |
| CPC 51 · 2027 | Demonstração, Plano de ação |

## Registro

### 17/08/2026 (2ª sessão) — casco novo e textos enxutos

Pedido: "um layout mais dinâmico e fácil de entender, sem textos longos".
Escopo acordado com o Denner antes de mexer: **casco novo + enxugar
textos, mantendo a paleta "Razão"**. Tabelas, DRE e gráficos não foram
tocados — são a parte validada contra número real.

Entrou:

- `components/Icones.jsx` — 22 ícones de traço em `currentColor`, SVG
  inline. Nenhuma biblioteca: um pacote de ícones custaria dezenas de kB
  para desenhar 22 formas, e traço em `currentColor` herda a cor do item
  (inclusive no tema escuro) sem regra extra.
- `components/Inicio.jsx` — a tela que responde "o que eu faço agora?":
  estado do arquivo, **um** próximo passo em destaque, lista de
  pendências clicáveis e atalhos. Sem gráfico e sem análise, de
  propósito — ver decisão abaixo.
- Casco em `App.jsx`/`App.css`: faixa fixa no topo (identidade, selos de
  contexto, ações em ícone), menu lateral com ícone + rótulo, recolhível
  para trilho de 64px (lembrado em localStorage), gaveta off-canvas no
  celular.
- Padrão `<details className="explica">` — o texto longo saiu da frente
  em 13 telas sem sumir do app.

Decisão estrutural mais importante: **Início não concorre com Painel.**
Início responde "por onde começo e o que está me esperando"; Painel
responde "e daí?". Por isso Início não tem gráfico nenhum — os três
números do topo são isca para o Painel, não leitura de resultado. Se um
dia entrar cascata ou ranking ali, as duas telas viram a mesma tela e uma
delas passa a sobrar.

Segunda decisão: **a trilha vertical virou gaveta no celular, não faixa
rolável.** A faixa cabia, mas com quatorze itens obrigava a arrastar às
cegas, e o que estava fora da vista não existia. A gaveta mostra a lista
inteira com os rótulos de seção intactos.

Terceira: **o sub-rótulo do menu virou selo.** "3 a resolver" e "3" dizem
a mesma coisa, mas só o selo sobrevive ao trilho recolhido. O significado
por extenso foi para o `aria-label` do botão ("De-Para — 3 contas a
resolver"), porque "3" sozinho não é acessível.

Medido / verificado:

- Vitest: **211 testes passando** (nenhum novo — a mudança é de casco).
- `npx oxlint src/`: sem avisos novos (seguem os 2 de `historico.js`).
- `npm run build`: ok. Bundle 405 → 413 kB (125 → 127 kB gzip); CSS
  31 → 40 kB (6,8 → 8,2 gzip). O CSS é onde o casco novo mora.
- Navegador (Chromium, **build de produção**, razão sintético): Início
  vazio e com dados, DRE, De-Para, Classificar, Importar, CPC 51,
  Conferir; trilho recolhido e expandido; tema claro e escuro; gaveta a
  390px. Sem erro de página em nenhuma.
- Acessibilidade conferida na mesma passada: `aria-current` só no item
  ativo, os 14 itens alcançáveis por Tab com contorno de 2px visível,
  selos com `aria-label` por extenso, `prefers-reduced-motion` zerando
  animação e transição, `@media print` escondendo topo e menu e deixando
  só a demonstração.
- 390px: sem rolagem horizontal do corpo em nenhuma tela testada.
- **Não verificado:** `fixtures/validar.mjs` — os arquivos reais não
  estão nesta máquina. Risco baixo por construção: `classify.js`,
  `balancete.js`, `cpc51.js`, `linhasDRE.js` e `grupos.js` não foram
  tocados.

Dois defeitos corrigidos de quebra, os dois achados só por olhar o app
rodando (nenhum teste os pegaria):

1. **`.chip` colidiu com a legenda dos gráficos.** A classe nova do selo
   de contexto tinha o mesmo nome de uma classe já existente mais abaixo
   no `App.css` (o quadradinho 11×11 da legenda) — o selo virava uma tira
   de 11px de altura com o texto cortado fora da caixa. Renomeado para
   `ctx-chip`. Virou armadilha em `CLAUDE.md`.
2. **Célula de descrição empilhada a 390px.** `.tabela-cartao td` é uma
   grade de duas colunas; uma descrição longa engordava a coluna `auto` e
   espremia o resto — no De-Para, onde a mesma célula carrega o motivo da
   revisão, o motivo virava uma tira de 40px com uma palavra por linha.
   `td.desc` passa a empilhar (rótulo em cima, conteúdo embaixo).

Também corrigido: `pct` em `parse.js` usava `toFixed(1)` e saía com ponto
decimal ("326.3%") num app inteiro em pt-BR. Trocado por vírgula. Seguro
porque `pct` só alimenta tela e o PNG do painel — os exportadores
formatam número por conta própria.

Ficou de fora, de propósito:

- Redesenhar tabelas, DRE, cascata e gráficos. É onde mora o número
  validado centavo a centavo; mexer ali sem os arquivos reais em mãos
  seria trocar risco por estética.
- Colapsar o aviso de repositório público (`Arquivos.jsx`) e a instrução
  de token fine-grained (`SincronizacaoGitHub.jsx`) em `<details>`. São
  as duas frases que precisam estar na frente de quem vai clicar —
  esconder um aviso de consequência é o oposto de "fácil de entender".
- Trocar a paleta. Verde e vermelho continuam pertencendo ao dado.

### 17/08/2026 — trilha em cinco seções, área De-Para, skills e agentes

Sessão de dois objetivos: deixar a navegação legível agora que são 13
abas, e abrir a área De-Para — que é o primeiro passo concreto do
caminho para ERP, porque parametrização é o que um ERP pede antes de
qualquer coisa.

Entrou:

- `lib/depara.js` — a tabela de parametrização: uma linha por conta de
  resultado, com grupo da DRE, categoria do CPC 51, **origem de cada
  decisão**, motivo de revisão, resumo e filtros. Ele não decide nada:
  compõe `grupoDe` (classify) com `resolverCategoria` (cpc51).
- `lib/exportacaoDePara.js` — CSV e Excel (com filtro automático e aba de
  resumo por grupo), o entregável da Fase 2 e a entrada da Fase 4.
- `components/DePara.jsx` — placar, filtros por situação/grupo/categoria,
  os **dois eixos editáveis na mesma linha** e leitura por destino.
- `SECOES` em `App.jsx`: a trilha virou dado, com `abaDisponivel()` e
  `estadoDaAba` (sub-rótulo com o número da tela, ponto âmbar quando há
  pendência).
- Cinco skills novas em `.claude/skills/` — três delas (`testar-com-
  arquivo-real`, `ajustar-classificacao-dre`, `build-e-publicar`) eram
  prometidas pelo `CLAUDE.md` desde sempre e nunca tinham sido escritas.
- Três agentes em `.claude/agents/`.

Decisão estrutural mais importante: **o De-Para junta os dois eixos numa
tela só, mas não vira uma terceira fonte de verdade.** Ele lê e escreve
exatamente o mesmo estado de Classificar e da aba CPC 51 — por isso
reclassificar ali refaz a DRE na hora. `deParaCPC51` (que alimenta o
Excel de seis abas) continua existindo separado, e há teste novo provando
que as duas tabelas concordam conta a conta sobre grupo e categoria. Era
a alternativa a um refactor que criaria import circular entre
`cpc51.js` e `depara.js`.

Segunda decisão: **a trilha como dado.** Eram três blocos de JSX quase
idênticos com três expressões booleanas diferentes de "quando esta aba
abre", impossíveis de comparar sem lê-las lado a lado. Agora a regra está
escrita uma vez em `abaDisponivel()`, e a mesma função guarda o estado
vazio do `<main>` — antes eram duas cópias da regra, e uma aba nova caía
em tela branca se você esquecesse da segunda.

Medido / verificado:

- Vitest: **211 testes passando** (13 novos).
- `npx oxlint src/`: sem avisos novos (seguem os 2 de `historico.js`).
- `npm run build`: ok. Bundle 391 → 405 kB (121 → 125 kB gzip); CSS
  30 → 31 kB.
- Navegador (Chromium, **build de produção**, razão sintético): as cinco
  seções aparecem; o De-Para lista as contas com placar coerente; o
  filtro "pendentes" isola as três contas certas; escolher uma categoria
  sobe a completude na hora (72,7% → 81,8%) e o sub-rótulo da trilha
  acompanha; a conciliação do CPC 51 continua em **0,00** depois da
  mudança; CSV e XLSX baixam de verdade e o XLSX abre com as duas abas
  e o filtro automático. Sem erro de página.
- 390px e tema escuro conferidos na mesma passada: sem rolagem
  horizontal do corpo, tabela vira cartão empilhado, e o sub-rótulo de
  **pendência** continua visível na faixa (os informativos somem).
- **Não verificado:** `fixtures/validar.mjs` — os arquivos reais não
  estão nesta máquina. Risco baixo por construção: `classify.js`,
  `parse.js` e `grupos.js` não foram tocados.

Achado de quebra, corrigido só no exportador novo: o CSV rodava **os
números gerados pelo próprio app** por `neutralizarFormula`, que prefixa
com aspa simples tudo que começa com `-`. Resultado: toda despesa saía
como TEXTO, que o Excel não soma — num arquivo cujo destino é carga em
ERP e conferência por totais. `exportacaoDePara.js` separa célula de
texto (neutralizada) de célula de número (formatada por `dec`), com teste
cobrindo as duas metades. **O mesmo defeito continua em
`baixarCSVDePara` e nos outros CSVs de `exportacao.js`** — não foi
corrigido nesta sessão para não mexer em exportador validado sem pedido;
está no backlog abaixo.

Ficou de fora, de propósito:

- Editar a política contábil do CPC 51 pelo De-Para. Ela muda a
  demonstração inteira e continua morando na aba CPC 51, junto do texto
  que explica a consequência.
- Salvar perfil pelo De-Para. O botão continua na etapa Classificar; a
  tela nova aponta para lá em vez de duplicar o controle.
- Filtro por centro de custo e por competência dentro do De-Para. O
  mapeamento não depende de período — quem quer conferir um mês usa os
  filtros da etapa Conferir, que já valem para a tela toda.

### 10/08/2026 — CPC 51: motor, telas, exportação e plano de ação

Ponto de partida: o cronograma de implementação das DFs conforme CPC 51
(Gennesys), 10 fases e 49 passos, com go-live em jan-fev/2027 e 2026
tendo que ser reapresentado como comparativo.

Entrou:

- `cpc51.js` — cinco categorias, política de atividade principal, mapa
  grupo → categoria, decisão manual por conta, `montarDRE51`,
  `conciliar`, detector de contas mistas, De-Para e cobertura.
- `linhasCPC51.js` — a demonstração nova como dados, reusando a cascata
  de `linhasDRE.js` (extraída em `aplicarCascata`/`totalizarSecoes`).
- `mpda.js` — medidas de desempenho da administração, conciliação e
  minuta de nota explicativa.
- `cronograma51.js` + `planoAcao.js` + `Cronograma51.jsx` — o cronograma
  como dado, com andamento salvo em localStorage.
- `exportacaoCPC51.js` — Excel de seis abas (DRE CPC 51, DFs paralelas,
  Conciliação, De-Para, MPDA, Política), CSV do De-Para e a minuta da
  nota em texto.
- Telas: `EtapaCPC51.jsx`, `CategoriasCPC51.jsx`, `MedidasMPDA.jsx`.
- `perfil.js` foi para a versão 2: leva categoria por conta, política e
  MPDA. Perfis versão 1 continuam sendo lidos.

Decisão estrutural mais importante: **a categoria do CPC 51 é um eixo
paralelo ao grupo da DRE, não um grupo novo.** Criar grupos novos em
`grupos.js` quebraria a DRE atual (validada centavo a centavo) e faria
dinheiro sumir da tela no dia em que uma conta caísse num grupo que a
hierarquia de subtotais não soma. Como consequência, o lucro líquido é
idêntico nas duas estruturas por construção — a contribuição de cada
conta é o próprio saldo nas duas —, e há teste congelando isso.

Medido / verificado:

- Vitest: 198 testes passando (43 novos).
- `npx oxlint src/`: sem avisos novos.
- `npm run build`: ok; o bundle principal cresceu ~10 kB.
- Navegador (Chromium via Playwright, build de produção): importação de
  um razão sintético, prova de conciliação fechando em 0,00, colapso do
  financiamento no operacional ao marcar "financiar clientes é atividade
  principal", MPDA (EBITDA = operacional + depreciação), persistência do
  plano de ação após F5, e os três downloads gerados de verdade — o
  .xlsx abriu com as seis abas certas.
- **Não verificado:** `fixtures/validar.mjs` (arquivos reais ausentes
  nesta máquina). Risco baixo por construção: `classify.js` e `parse.js`
  não foram tocados neste trabalho.

Corrigido de quebra: o cabeçalho de período das exportações fazia
`join(" a ")` entre TODOS os meses ("jan a fev a mar a abr"); agora, com
mais de dois, mostra primeiro e último.

Ficou de fora, de propósito:

- Efeito tributário e de não controladores por item de conciliação da
  MPDA. A norma exige; o app não tem alíquota efetiva por ajuste nem
  participação de não controladores. Sai como lacuna marcada na minuta,
  nunca como zero.
- Operações descontinuadas como grupo próprio da DRE atual. Hoje se
  resolve marcando a categoria conta a conta, sem mexer na hierarquia
  validada.
- Demonstração comparativa 2026 x 2027 na estrutura do CPC 51 (a
  comparação obrigatória da Fase 8). Depende de ter os dois exercícios
  carregados ao mesmo tempo, o que o app ainda não faz.

## Próximos passos, na ordem que eu priorizaria

1. **Editor de perfil de plano a partir do De-Para.** Agora que a tela
   mostra origem → destino → origem da decisão conta a conta, gerar o
   arquivo de perfil de plano a partir dessas decisões é um botão e uma
   função de serialização. Fecha o ciclo "atender cliente novo sem
   commit e sem build", que é a restrição de projeto mais importante do
   caminho para ERP, e serve de especificação para a Fase 4.
2. **Número gerado pelo app não deve passar por `neutralizarFormula`.**
   Corrigido em `exportacaoDePara.js`; falta em `baixarCSVDePara`
   (`exportacaoCPC51.js`) e no CSV da DRE (`exportacao.js`), onde toda
   despesa continua saindo como texto que o Excel não soma. Defeito real
   e barato de corrigir — separar célula de texto de célula de número,
   como o exportador novo faz, e cobrir com teste.
3. **Comparativa na estrutura do CPC 51** (Fase 8, passo 36). A norma
   exige 2027 contra 2026 reapresentado. Hoje `EtapaComparativo` monta
   colunas por competência na estrutura antiga; falta a mesma coisa
   lendo `montarLinhas51`. É o maior buraco funcional que sobrou.
4. **Extrair `useCPC51`, `useDePara` e o casco de `App.jsx`.** O
   componente passou de 766 para 856 linhas com o topo e o menu novos —
   é o arquivo que mais cresce a cada funcionalidade, e cada módulo de
   ERP vai empurrar mais. O corte mais óbvio agora é um `<Casco>` levando
   topo + menu + `ItemMenu`, que é bloco fechado e não toca em estado
   contábil nenhum.
5. **Efeito tributário por item de MPDA**, com campo editável por ajuste
   — fecha a exigência da norma que hoje sai como lacuna.
6. **Seletor de aba do Excel** (`importarExcel.js` já devolve `abas`,
   falta UI).
7. **Agregar durante a importação**, em vez de guardar `linhas` cru em
   memória — tira o teto de tamanho de arquivo.
8. **Limpeza barata:** `historico.js` tem `lerSha` morto e uma expressão
   sem uso; são os dois únicos avisos de lint do projeto.

## Rumo a ERP: como pensar os próximos módulos

O agente `arquiteto-erp` existe para desenhar isso caso a caso, mas a
regra geral cabe aqui: **módulo novo entra ao LADO do núcleo contábil,
nunca por dentro dele.** O núcleo (parse → agregação → classificação →
demonstrações) está validado centavo a centavo e é o ativo do projeto.

Cadastro vai para a seção *Parâmetros* da trilha, junto do De-Para;
leitura vai para *Análises*. E qualquer parametrização nova copia o
formato de `depara.js`: origem, destino, **origem da decisão** e um
placar de quanto falta — porque foi a coluna de origem que transformou
uma planilha de mapeamento em documento de auditoria.

## Hipóteses ainda não confirmadas

- O plano de contas do IESB provavelmente permite um mapa
  código → categoria do CPC 51 tão exato quanto o `MAPA_CODIGO_IESB` é
  para os grupos. Se confirmado, viraria um campo `categorias` no perfil
  de plano (`planos/iesb.js`) e dispensaria decisão manual conta a conta
  no cliente principal. **Depende de confrontar com o plano real** — não
  chute.
- Juros e multa de mora sobre mensalidade em atraso são operacionais
  (nascem da operação, não de um ativo que rende sozinho). Está assim no
  detector de contas mistas, com aviso pedindo revisão, mas é julgamento
  a confirmar com a auditoria na Fase 1.
