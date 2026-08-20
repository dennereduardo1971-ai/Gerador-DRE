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

_Atualizado em 20/08/2026._

| | |
|---|---|
| Testes | 212 (Vitest, 13 arquivos) |
| Lint | `npx oxlint src/` — 2 avisos pré-existentes em `historico.js` |
| Bundle | app 396 kB (123 kB gzip) + `xlsx` 424 kB em chunk sob demanda |
| CSS | 30 kB (6,6 kB gzip) |
| Código | ~8.200 linhas em `src/` |
| Maiores arquivos | `App.jsx` (761), `cpc51.js` (455), `balancete.js` (421) |
| Validação contra DRE real | `node fixtures/validar.mjs` — **não rodou nesta sessão** (só `validar.mjs` está na pasta; os dados reais são gitignorados) |
| Validação contra balancetes reais | 6 arquivos (fev–jun/2026 + 1 variante de parametrização) conferidos fora do repositório: DRE mensal, DRE acumulada e Balanço batendo ao centavo |

Fluxo do app: **Importar (balancete primeiro, razão em opções avançadas)**
→ Conferir → Classificar → DRE. Vistas paralelas: Painel, Balanço,
Horizontal, Comparativa, Histórico, Arquivos. Grupo CPC 51: Demonstração
CPC 51 e Plano de ação.

## Registro

### 20/08/2026 — balancete como fonte principal; mês × acumulado

Sessão disparada por um pedido de "congelar o razão e trabalhar pelo
balancete". Antes de mudar qualquer coisa, seis balancetes reais foram
lidos com o parser do próprio repositório. O resultado mudou o plano.

**O bloqueador.** Nenhum daqueles arquivos carregava no app.
`importarExcelComoLinhas` escolhia "a primeira aba com dados", e o
relatório do sistema contábil traz uma aba de parâmetros ANTES da aba de
dados. O app lia os parâmetros, não achava conta nenhuma e dizia ao
usuário que o arquivo não servia. A escolha da aba agora é por CONTEÚDO
(um predicado que quem chama informa), não por posição nem por nome —
o nome da aba também varia. Virou armadilha em `CLAUDE.md`.

**A descoberta estrutural: um balancete mensal carrega duas DREs.**
O movimento do período dá o resultado do mês; o saldo atual das contas de
resultado dá o acumulado do exercício, porque elas chegam somadas desde
janeiro. Medido nos cinco meses: a DRE acumulada reproduz `Ativo −
Passivo` do mesmo arquivo ao centavo, e a diferença entre dois meses
consecutivos do acumulado reproduz a DRE mensal — também ao centavo.
Daí `contasAcumuladas()`, irmã de `contasDeMovimento()`.

**Dois alarmes falsos que existiam e sumiram.** (1) A tela comparava o
desequilíbrio do Balanço (acumulado) com a DRE do mês e acusava
divergência todo mês sem erro nenhum existir; agora compara contra a DRE
acumulada. (2) A conferência "cada sintética bate com suas filhas"
acusava 2 divergências em todos os arquivos por causa da reconstrução da
árvore por prefixo — trocada por conferência **por raiz** (soma das
folhas de cada dígito contra o total da raiz), que não depende da árvore
e passou 100% nos seis arquivos.

**O que NÃO foi feito, de propósito.** Tentei trocar a regra de
hierarquia por uma baseada em ordem (pilha de ancestrais mais curtos):
ela conserta o caso do Custo Docentes e **quebra** o `1.3.40.0` que o
`CLAUDE.md` já documentava. As duas regras erram casos diferentes e
nenhuma serve sozinha; como nenhum total depende disso (o conjunto de
folhas é idêntico nas duas), a árvore ficou como estava e o desencontro
passou a ser reportado à parte, em `sinteticasAproximadas`, sem contar
como erro. Mexer nisso sem um critério novo seria trocar um defeito
cosmético por um defeito de valor.

**Também entrou.** Leitura do período pela aba de parâmetros
(`periodoDoBalancete`), com mês por extenso só quando o recorte é o mês
fechado — recorte parcial sai como intervalo, para não mentir sobre o que
o arquivo cobre. Histórico passou a se alimentar sozinho ao ler um
balancete, com chave pelo período: reimportar o mesmo mês atualiza a
linha em vez de duplicar, e reclassificar uma conta corrige o retrato já
salvo. Aviso de cobertura parcial quando o balancete vem filtrado só nas
contas patrimoniais (ou só nas de resultado), em vez de mostrar uma
demonstração zerada.

**Medido.** Vitest 198 → 212. Build ok, `xlsx` continua em chunk sob
demanda. As seis planilhas passaram numa checagem ponta a ponta, e a DRE
mensal dos cinco meses bate com a medição feita ANTES das mudanças —
nenhuma regressão. `fixtures/validar.mjs` **não rodou**: a pasta só tem o
script nesta máquina.


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
4. **Efeito tributário por item de MPDA**, com campo editável por ajuste
   — fecha a exigência da norma que hoje sai como lacuna.
5. **Horizontal e Comparativa a partir de vários balancetes.** Hoje as
   duas dependem de `dresPorCompetencia`, que só existe com razão
   multi-mês. Ficou barato: cada balancete mensal já traz o movimento do
   próprio mês, e a série dos cinco meses foi montada e conferida durante
   a análise (a soma dos meses reproduz o acumulado). Falta o estado que
   guarde N balancetes em vez de um, e a UI de carregar vários.
6. **Seletor de aba do Excel.** `importarExcelAbas` agora devolve todas
   as abas com o conteúdo, então a UI ficou mais fácil que antes. Menos
   urgente desde que a escolha automática passou a ser por conteúdo.
7. **Agregar durante a importação**, em vez de guardar `linhas` cru em
   memória — tira o teto de tamanho de arquivo. Perde prioridade se o
   razão deixar mesmo de ser o caminho principal.
8. **Usar `Classe Conta` do plano de contas.** O arquivo de plano que o
   sistema emite traz "Sintetica"/"Analitica" e "Devedora"/"Credora" por
   conta — é a resposta autoritativa para quem é folha, que hoje é
   inferida por prefixo. Pode resolver o desencontro de árvore
   (`sinteticasAproximadas`) sem heurística nova. `parsearPlanoDeContas`
   hoje só lê código e descrição.
9. **Limpeza barata:** `historico.js` tem `lerSha` morto e uma expressão
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
