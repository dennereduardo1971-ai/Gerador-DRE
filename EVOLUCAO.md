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

_Atualizado em 10/08/2026._

| | |
|---|---|
| Testes | 198 (Vitest, 13 arquivos) |
| Lint | `npx oxlint src/` — 2 avisos pré-existentes em `historico.js` |
| Bundle | app 391 kB (121 kB gzip) + `xlsx` 424 kB em chunk sob demanda |
| CSS | 30 kB (6,6 kB gzip) |
| Código | ~7.800 linhas em `src/` |
| Maiores arquivos | `App.jsx` (672), `cpc51.js` (455), `cronograma51.js` (370) |
| Validação contra DRE real | `node fixtures/validar.mjs` — **não roda nesta máquina** (os arquivos reais são gitignorados) |

Fluxo do app: Importar → Conferir → Classificar → DRE. Vistas paralelas:
Painel, Balanço, Horizontal, Comparativa, Histórico, Arquivos. Grupo
CPC 51: Demonstração CPC 51 e Plano de ação.

## Registro

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

Ainda no mesmo dia, saiu o **relatório técnico para a diretoria** (PDF de
19 páginas: regras da norma, impacto na DRE com exemplo numérico
conciliado, as dez fases e as decisões que dependem da diretoria). Ele
não mora no repositório — é entregável do escritório, não do app.

Escrevê-lo levantou uma dúvida de produto que precisa ser resolvida:

- **O modelo "EBITDA" que o app oferece como MPDA pode não ser MPDA.** A
  norma exclui expressamente da definição alguns subtotais de uso
  corrente, entre eles o resultado operacional antes de depreciação,
  amortização e perdas por redução ao valor recuperável — que é
  exatamente como `MODELOS[0]` está definido em `mpda.js`. Já o "EBITDA
  ajustado" e o "resultado recorrente" são MPDA sem dúvida. Se
  confirmado, o modelo EBITDA deve trazer um aviso na tela em vez de ser
  oferecido como se exigisse nota. **Confirmar na redação final do
  CPC 51 antes de mexer** — errar para o lado de exigir nota demais é
  menos grave que o contrário, mas os dois lados desinformam.

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

1. **Comparativa na estrutura do CPC 51** (Fase 8, passo 36). A norma
   exige 2027 contra 2026 reapresentado. Hoje `EtapaComparativo` monta
   colunas por competência na estrutura antiga; falta a mesma coisa
   lendo `montarLinhas51`. É o maior buraco funcional que sobrou.
2. **Editor de perfil de plano na interface** (backlog antigo do
   `CLAUDE.md`, agora mais valioso): com o De-Para do CPC 51 pronto na
   tela, gerar o arquivo de perfil a partir das decisões tomadas fecha o
   ciclo e serve de especificação para a Fase 4 (parametrização do ERP).
3. **Extrair um `useCPC51` de `App.jsx`.** O componente passou de 500
   para 672 linhas e concentra oito estados novos. Não é urgente, mas é
   o arquivo que mais cresce a cada funcionalidade.
4. **Resolver o enquadramento do EBITDA puro como MPDA** (ver registro de
   10/08). É correção de conteúdo normativo, não de código: se confirmado,
   vira um aviso na tela e um parágrafo a mais na minuta da nota.
5. **Efeito tributário por item de MPDA**, com campo editável por ajuste
   — fecha a exigência da norma que hoje sai como lacuna.
6. **Seletor de aba do Excel** (`importarExcel.js` já devolve `abas`,
   falta UI).
7. **Agregar durante a importação**, em vez de guardar `linhas` cru em
   memória — tira o teto de tamanho de arquivo.
8. **Limpeza barata:** `historico.js` tem `lerSha` morto e uma expressão
   sem uso; são os dois únicos avisos de lint do projeto.

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
