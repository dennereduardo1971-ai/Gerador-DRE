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
| Testes | 230 (Vitest, 15 arquivos) |
| Lint | `npx oxlint src/` — **zero avisos** (os 2 de `historico.js` foram corrigidos) |
| Bundle | app 416 kB (128 kB gzip) + `xlsx` 424 kB (leitura) + `exceljs` 930 kB/256 kB gzip (escrita do Excel exportado) — os dois em chunk sob demanda |
| CSS | 41 kB (8,3 kB gzip) |
| Código | ~8.955 linhas em `src/` (App.jsx + lib + components) |
| Maiores arquivos | `App.jsx` (875), `cpc51.js` (455), `cronograma51.js` (370) |
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

### 17/08/2026 — balancete `ctbr041`: aba certa, nível de passagem e período × acumulado

Trabalho de outra sessão, que ficou pronto no disco e sem commit; este
commit só o preserva. Registro o que **eu mesmo verifiquei** aqui, e
marco o resto como não verificado.

O que entrou:

- `pontuarAbaDeContas` em `importarExcel.js`: entre várias abas vence a
  que tem mais linhas com código de conta na primeira coluna, não a
  primeira com dados. O relatório real vem com uma aba `Parametros` antes
  do balancete, e pegá-la matava o arquivo inteiro em "não achei nenhuma
  conta".
- `reconciliarHierarquia` em `balancete.js`: trata o **nível de
  passagem** (duas sintéticas com valores idênticos, filhas numeradas a
  partir do código mais curto). Só mantém o reparo se os dois lados
  passarem a fechar, e o que foi movido sai em `bal.reconciliadas` — não
  é silencioso.
- `resumir` passa a devolver `resultadoAcumulado` e `resultadoPeriodo`
  separados. Confundir os dois acusava "os dois arquivos podem não cobrir
  o mesmo período" sobre UM arquivo só.
- As armadilhas do formato passaram de quatro para sete em `CLAUDE.md`.

Verificado por mim: **230 testes passando** (15 arquivos), `npx oxlint
src/` em **zero avisos**, árvore de trabalho limpa depois do commit.

**Não verificado por mim:** `fixtures/validar.mjs` (os arquivos reais não
estão nesta máquina) e o comportamento na tela com o balancete real —
os números citados acima vieram da sessão que fez o trabalho, não de
medição minha.

Fica de fora do commit: `scratch/`, com os scripts de depuração daquela
sessão. Eles apontam para o balancete real do cliente em
`/root/.claude/uploads`, então entraram no `.gitignore` em vez do Git.

### 17/08/2026 (4ª sessão) — auditoria, revisão visual, limpeza de lint e um bug real de período

Pedido: rodar as skills e agentes de revisão pra achar otimizações e
melhorias. Disparei `auditor-contabil` e `revisor-visual` em paralelo
(sobre as duas mudanças da sessão anterior — casco novo e Excel
estilizado) e segui a skill `otimizar-app` eu mesmo enquanto os dois
trabalhavam.

**Auditoria contábil: passou, sem risco real.** `classify.js`, `cpc51.js`,
`linhasDRE.js`, `linhasCPC51.js`, `grupos.js` e `balancete.js` continuam
byte-idênticos aos dois commits anteriores. A troca `xlsx` → `exceljs`
na escrita preserva os mesmos valores em toda célula — só a API de
escrita mudou. A mudança de `pct()` (vírgula decimal) é comprovadamente
cosmética: nenhum exportador depende do texto que ela formata. Não
validado contra `fixtures/` (arquivos reais ausentes nesta máquina,
como sempre).

**Revisão visual: achou uma regressão de acessibilidade real, corrigida
na hora.** No celular, com a gaveta do menu fechada, `transform:
translateX(-100%)` esconde visualmente mas NÃO tira o `<nav>` da ordem
de tabulação nem da árvore de acessibilidade — Tab (ou um leitor de
tela) passava pelos ~18 botões do menu ainda fora da tela antes de
chegar ao conteúdo. Corrigido com `visibility: hidden` + atraso de
transição só do lado de fechar (padrão de disclosure acessível: a
animação de deslizar continua visível, o elemento só sai da árvore
quando já está inteiramente fora da tela). De quebra, adicionado Esc
para fechar a gaveta com devolução de foco ao botão que a abriu — a
gaveta não tinha nenhum dos dois antes. Confirmado com teste real de
teclado (Playwright): antes do fix, os 18 botões apareciam nos primeiros
Tabs; depois, zero.

**Limpeza de lint: os dois únicos avisos do projeto, corrigidos.**
`lerSha()` em `historico.js` nunca era chamado — `gravarSha` grava um
cache local do SHA remoto, mas `sincronizarHistorico()` e
`removerDoHistorico()` sempre buscam o SHA fresco via `buscarArquivo()`
antes de gravar, nunca o cache local. Função morta removida; a
ternário-como-statement de `gravarSha` virou `if`/`else`. `npx oxlint
src/` agora sai limpo.

**O achado mais importante veio do usuário, não das skills: período
errado em cinco lugares.** Um razão de vários meses mostrava uma lista
gigante e fora de ordem de dias soltos ("01/jan, 01/fev, 01/mar...") no
cabeçalho da DRE, e "01/jan a 29/mar" (dois dias quase aleatórios) no
selo de contexto do topo — para um arquivo de janeiro a junho. Causa:
`meses`, apesar do nome, é a lista de **dias** (coluna Dia/Mês) num
`Set` sem ordem cronológica nenhuma; cinco lugares usavam essa lista
como se fosse "o período do arquivo" — `periodoLegivel()` em
`exportacao.js` (cabeçalho de TODO CSV/Excel exportado), o `.dre-head`
da DRE, o do CPC 51, o `periodoLegivel` local de `App.jsx` (selo do
topo, Painel, Início) e `onSalvarHistorico`. Um conserto anterior (ver
sessão de 10/08 no histórico de commits) já tinha cortado a lista para
"primeiro e último" quando passava de dois itens — tratou o SINTOMA
(linha enorme) sem tocar na CAUSA (fonte errada, sem ordenação).

Corrigido pela raiz: `periodoLegivel()` agora recebe `competencias` — a
lista de competências (mês/ano) que `listarCompetencias()` já devolve
ordenada de verdade — em vez de `meses`. As cinco expressões duplicadas
viraram uma função só, chamada dos cinco lugares (App.jsx importa e usa
a mesma `periodoLegivel` de `exportacao.js`, com um `const periodo =`
calculado uma vez). `EtapaDRE.jsx` e `EtapaCPC51.jsx` perderam os props
`filtroMes`/`meses`/`filtroCompetencia` (não usados para mais nada além
disso) e passaram a receber `periodo` já pronto.

Medido / verificado:

- Vitest: 211 testes passando (nenhum teste cobria este texto — é
  território novo para cobertura futura, ver backlog).
- `npx oxlint src/`: **zero avisos** (eram 2 antes desta sessão).
- `npm run build`: bundle sem mudança de tamanho relevante (a correção
  de período não adiciona código; App.jsx foi de 856 para 875 linhas
  pela documentação do bug, não pela lógica).
- Reproduzido o bug de propósito: gerei um razão sintético de 6 meses
  (18 dias distintos, 3 por mês) e confirmei ANTES do fix que o
  cabeçalho realmente mostrava a lista de dias — depois do fix, o
  navegador real (build de produção) mostrou "Jan/2026 a Jun/2026" no
  selo do topo, no cabeçalho da DRE, no do CPC 51 e no `Período` do CSV
  baixado.
- Acessibilidade: teste de teclado real confirmando que a gaveta fechada
  saiu da ordem de tabulação, que `visibility` computa `hidden`/`visible`
  corretamente nos dois estados, e que Esc fecha e devolve o foco.

Achado de quebra, não corrigido (fora do escopo desta sessão, registrado
para não esquecer): nenhum teste cobre o texto de período — nem o antigo
bug, nem a correção. Um teste unitário para `periodoLegivel()` (os três
ramos: competência filtrada, dia filtrado, intervalo de competências)
seria barato e teria pego isso antes de chegar à tela.

Ficou de fora, de propósito:

- Os outros achados "não pude confirmar sem navegador" do
  `revisor-visual` (contraste efetivo nos dois temas, comportamento
  tátil real da gaveta) — precisam de olho humano, não é algo que dê
  para validar por leitura de código nem por Playwright sozinho.
- Extrair `useCPC51`/`useDePara`/o casco de `App.jsx` (875 linhas) —
  backlog já registrado, invasivo demais para entrar numa sessão de
  auditoria/revisão.

### 17/08/2026 (3ª sessão) — Excel exportado com estilo de verdade, PDF com rodapé e quebra de página

Pedido: downloads "organizados e estilizados", e PDF "se possível".
Antes de mexer, investiguei por que o estilo já escrito no código
(`s: { font: { bold: true } }` em três exportadores) não aparecia nos
arquivos — descoberta que mudou o plano inteiro.

**A descoberta:** `xlsx` (SheetJS Community, a biblioteca gratuita já
usada) aceita `cell.s` no objeto em memória, mas **ignora esse campo ao
gravar** — só formato numérico (`cell.z`) chega no `.xlsx` de verdade.
Confirmado lendo o código-fonte da lib (`get_cell_style` em
`node_modules/xlsx/xlsx.js` só olha `cell.z`) e testando: um cabeçalho
com `s: {font:{bold:true}}` abre no Excel sem nenhum estilo. Cor de
fundo, fonte e negrito são recurso pago (SheetJS Pro) nessa
distribuição — as três exportações do projeto tinham código morto.

Perguntei ao Denner até onde valia ir. Resposta: quer cor e negrito de
verdade. Medi o custo antes de decidir: `exceljs` (que escreve estilo de
verdade, grátis) pesa **~271 kB gzip** minificado — quase o dobro do
`xlsx` (141 kB gzip). Ele topou o peso.

Entrou:

- **`exceljs` como dependência nova**, só para ESCRITA — `import()`
  dinâmico, carregado só quando alguém clica em "Baixar Excel", no mesmo
  padrão que `xlsx` já usava. A LEITURA de arquivo importado continua em
  `xlsx`/SheetJS (é a única das duas que lê `.xls` legado, `.xlsb` e
  `.ods`) — as duas bibliotecas convivem, cada uma fazendo a metade que
  sabe fazer.
- `lib/excelEstilo.js` — o visual definido uma vez: cabeçalho de marca
  (índigo, texto branco), cabeçalho de tabela com fundo sutil e borda
  inferior de marca, rajado alternado (zebra) ecoando o papel de razão
  que dá nome ao projeto, subtotal em negrito com fundo e borda superior,
  formato de moeda nativo do Excel (parênteses + vermelho automático em
  negativo, sem precisar de cor manual), congelamento da linha de
  cabeçalho, larguras de coluna.
- Os três exportadores (`exportacao.js`, `exportacaoDePara.js`,
  `exportacaoCPC51.js`) reescritos para montar o workbook com `exceljs`
  em vez de `xlsx`. Os dados que cada aba mostra não mudaram — só quem
  escreve o arquivo.
- CSS de impressão (`@media print`) revisado: cabeçalho da demonstração
  com mais peso, `break-after`/`break-inside` para não deixar um título
  de seção sozinho no fim de uma página nem cortar uma linha ao meio, e
  um rodapé só de papel (`.print-rodape`, `display:none` na tela) com
  "Gerado em [data] às [hora]" ao final da DRE e da demonstração CPC 51.

**Dois defeitos de impressão achados só gerando o PDF de verdade** (nunca
apareceriam num teste unitário nem olhando a tela):

1. **O Lucro Líquido negativo sumia no PDF.** `.line[data-k="final"]
   .val.neg` tem `color: var(--marca-tinta)` (branco) para contrastar com
   o fundo índigo da linha na TELA; o `@media print` já zerava o fundo e
   pintava a linha de preto, mas não pintava esse `.val.neg` — mais
   específico, ele continuava branco. Texto branco em papel branco: a
   linha mais importante da demonstração ficava ilegível justamente
   quando o resultado era negativo. Corrigido com uma regra que sobrepõe
   `.val` e `.val.neg` para preto dentro do bloco de impressão.
2. **Legenda do canal ("0" / "receita bruta") órfã no cabeçalho.** O
   texto que rotula a barra visual (`.canal-legenda`) não estava sendo
   escondido junto com a própria barra (`.canal`, que já era `display:
   none`) — sobrava um texto solto brigando de posição com "Valor (R$)" e
   "% RL" no cabeçalho da tabela impressa. Adicionado `.canal-legenda` à
   mesma regra de ocultação.
3. **O próprio rodapé de impressão não aparecia**, nem no papel — bug
   introduzido e corrigido na mesma sessão: a regra `.print-rodape {
   display: none; }` (para nunca aparecer na tela) tinha ficado
   posicionada DEPOIS do bloco `@media print` no arquivo; com
   especificidade igual, quem vem depois no CSS vence, então ela apagava
   de volta o `display: block` de dentro do próprio bloco de impressão.
   Corrigido movendo a regra `display: none` para ANTES do `@media
   print`.

Medido / verificado:

- Vitest: 211 testes passando (nenhum mudou — os únicos testes que
  tocam exportação cobrem só o lado CSV/segurança, que não mudou).
- `npx oxlint src/`: sem avisos novos.
- `npm run build`: `exceljs` vira chunk próprio de 930 kB (256 kB gzip),
  carregado só sob demanda; bundle principal quase não mudou (415 kB).
- **Os três Excel gerados e lidos de volta por DUAS bibliotecas
  independentes** (o próprio `exceljs`, e depois `openpyxl` em Python —
  para provar que o arquivo é um `.xlsx` de verdade e não só algo que a
  mesma lib que o escreveu consegue reler): valores batendo com a tela,
  formato de moeda aplicado (`#,##0.00;[Red](#,##0.00)`), cabeçalho
  colorido (`FF2B3A8C`), negrito e fundo nos subtotais, painel congelado
  na linha de cabeçalho (`A7`, `A5`, `A2` conforme a aba), filtro
  automático.
- **PDF conferido de verdade**: `page.emulateMedia({media:"print"})` +
  `page.pdf()` no Chromium headless (o mesmo motor por trás do "Imprimir
  / PDF" do app) — 3 páginas A4, rodapé com data/hora visível ao final,
  Lucro Líquido negativo legível em preto, sem legenda órfã no
  cabeçalho.
- **Não tentei renderizar visualmente via LibreOffice** — `soffice
  --headless` está quebrado nesta máquina (falha até num `.xlsx`
  trivial, sem relação com os arquivos gerados). A prova por
  `openpyxl` supre isso.

Ficou de fora, de propósito:

- Biblioteca de geração de PDF (jsPDF, pdf-lib etc.). O Denner topou
  manter o PDF como impressão do navegador — CSS melhor, sem dependência
  nova. Continua valendo o motivo já documentado: menos configurável,
  mas sem 300 kB a mais nem um segundo motor de layout para manter em
  sincronia com a tela.
- Estender o estilo do Excel além do que já existia em conteúdo (não
  mudei nenhuma coluna, aba ou dado — só quem escreve e como fica).

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
   componente passou de 766 para 875 linhas com o topo e o menu novos —
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
8. **Teste unitário para `periodoLegivel()`.** Corrigido na sessão de
   17/08 (4ª) um bug real de período mostrando dias soltos fora de
   ordem em vez de "Jan/2026 a Jun/2026" — e não havia teste nenhum
   cobrindo esse texto, nem antes nem depois do fix. Cobrir os três
   ramos (competência filtrada, dia filtrado, intervalo de competências)
   é barato e fecha essa lacuna de cobertura.

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
