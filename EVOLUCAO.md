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

_Atualizado em 27/08/2026._

| | |
|---|---|
| Testes | 268 (Vitest, 13 arquivos) |
| Lint | `npx oxlint src/ fixtures/` — **zero avisos em tudo** (o ruído de `process` em `validar.mjs`, documentado desde agosto, saiu com um `overrides` no `.oxlintrc.json`) |
| Bundle | app 402 kB (124 kB gzip) + `xlsx` 424 kB (leitura) + `exceljs` 930 kB/256 kB gzip (escrita) — os dois em chunk sob demanda |
| CSS | 31,3 kB (6,6 kB gzip) — zero classe órfã (conferido por script) |
| Código | ~9.000 linhas de JS/JSX em `src/` (fora `__tests__/`) |
| Maiores arquivos | `App.jsx` (562), `balancete.js` (517), `cpc51.js` (479), `fiscal.js` (473) |
| Contexto por sessão | `CLAUDE.md` 402 linhas / 22 kB (era 969 / 55 kB); `EVOLUCAO.md` 346 (era 890) |
| Abas | 11 (eram 10; a Apuração entrou em 24/08/2026) |
| Fonte de dados | **só o balancete de verificação** — o razão contábil saiu em 24/08/2026 |
| Validação contra DRE real | `node fixtures/validar.mjs` — **não rodou nesta sessão** (arquivos reais gitignorados nesta máquina). O script foi REESCRITO contra os balancetes e não foi executado por ninguém ainda. |
| Validação contra balancetes reais | 6 arquivos (fev–jun/2026 + 1 variante) conferidos em 20/08/2026, antes desta sessão. Nesta sessão, as 33 exceções de categoria do CPC 51 do IESB foram conferidas contra o Excel real de 25/08/2026 (ver Registro) — não é o `validar.mjs`, mas é a mesma disciplina: conferir contra dado real, não só contra o razão sintético. |
| Excel conferido por lib independente | sim — `openpyxl` releu o De-Para e a Apuração gerados por `exceljs`, e também a aba DR_CPC_51_Detalhada nova (ver Registro) |
| App rodado no navegador | sim — 8 abas renderizam sem erro, sem rolagem horizontal a 390px, sem interativo sem nome acessível |
| Skills versionadas | 6 |
| Agentes | 3 (`auditor-contabil`, `revisor-visual`, `arquiteto-erp`) — **nenhum rodou nesta sessão** |

A navegação tem **Início** solto no topo e cinco seções, definidas como
dado em `SECOES` (`App.jsx`):

| Seção | Abas |
|---|---|
| (sem seção) | Início |
| Fluxo | Importar → Conferir → Classificar → DRE |
| Parâmetros | De-Para |
| Fiscal | Apuração |
| Acompanhamento | Comparativa, Histórico |
| CPC 51 · 2027 | Demonstração, Plano de ação |

A doutrina agora é **núcleo + `.claude/docs/`**: `CLAUDE.md` traz escopo,
arquitetura, armadilhas e um índice "quero mudar X → leia Y"; o detalhe
de cada assunto mora num arquivo lido sob demanda.

## Registro

### 27/08/2026 (continuação) — o plano do IESB ganha exceção de categoria do CPC 51

Denner mandou o Excel do CPC 51 que ele mesmo tinha exportado e depois
editado à mão: 34 contas ganharam categoria manual (as financeiras e as
não operacionais, os grupos que a doutrina já marca como "mistura
natureza"), e uma delas ("Apuração", conta técnica de fechamento do
exercício) veio com rótulo e categoria que não existem no app.

**Decisão estrutural.** Até esta sessão, o plano de contas embutido
(`planos/iesb.js`) só resolvia o GRUPO da DRE por código; a categoria do
CPC 51 só tinha DOIS níveis — decisão manual da sessão, ou padrão do
grupo inteiro. Para os grupos que misturam natureza (REC_FIN, DESP_FIN,
OUTRAS_REC, OUTRAS_DESP) isso significava reclassificar as mesmas contas
todo mês. Criei um terceiro nível, `categoriaDoPlano` (`cpc51.js`) —
busca EXATA pelo código da conta, sem cascata de prefixo (é dentro do
MESMO prefixo que convivem naturezas diferentes), entre a decisão manual
e o padrão do grupo. `PLANO_IESB.categorias` guarda as 33 contas
confirmadas (34 menos a de fechamento, que ficou de fora — ver abaixo).
`resolverCategoria`, `fazerCategoriaDe`, `deParaCPC51`, `coberturaCPC51`
e `montarDePara` (depara.js) foram todos ajustados para consultar essa
camada e — o ponto que quase passou despercebido — para tirar a conta da
fila de "a revisar" quando o plano já resolveu, não só quando a sessão
resolveu. Sem esse segundo ajuste as 33 contas continuariam pedindo
revisão todo mês mesmo já classificadas certo.

`lerPlano`/`baixarPlano` (planoPerfil.js) também passam a validar e
preservar `categorias` num perfil carregado de arquivo — não só no plano
embutido —, para um cliente novo poder usar a mesma camada sem exigir
build.

**A conta "Apuração" (7110101) ficou de fora, a pedido de Denner: foi
engano.** É o lançamento técnico de fechamento do exercício, que o app
já excluía da DRE (`IGNORAR`) antes desta sessão — incluir ela no CPC 51
contaria o resultado em dobro. Nada mudou nela; ela só não teve a
categoria manual do Excel promovida a padrão.

**O que foi medido.** Vitest 268/268 (13 arquivos, +8 testes novos em
`planoPerfil.test.js` — só ESTRUTURA testada, nenhum valor de saldo).
`oxlint` — zero avisos. `npm run build` — passou. E o que mais importa
aqui: **as 33 contas foram conferidas contra o Excel real do IESB**
(fora do repositório, por `openpyxl`/script descartável) — o app hoje
resolve as 33 automaticamente, sem clique nenhum, com o mesmo valor que
Denner confirmou à mão, e nenhuma delas aparece mais na fila de revisão.
A conta técnica de fechamento confirmou continuar fora da DRE.

**O que ficou de fora.** `node fixtures/validar.mjs` não rodou (arquivos
reais gitignorados nesta máquina) — mas a mudança tocou `planoPerfil.js`,
que é um dos três que a doutrina manda validar com ele. Vale rodar na
próxima máquina que tiver os arquivos, antes da próxima entrega. O
arquivo Excel que o Denner mandou não foi commitado em lugar nenhum (uso
só em memória/scratch, descartado ao fim da sessão) — é dado real de
cliente, e a doutrina proíbe.

### 27/08/2026 — aba "DR_CPC_51_Detalhada" no Excel do CPC 51

Denner pediu uma aba nova no Excel do CPC 51 para clicar num tópico da
DRE e ver as contas que formam aquele saldo — mandou de exemplo uma tela
de outro sistema com o tópico em cima e as contas indentadas embaixo.

**Decisão estrutural.** Excel não tem "clique" de app; o equivalente
nativo é o agrupamento de linhas (o `+` da margem esquerda), o mesmo
recurso que já abre a aba "Resumo" do De-Para
(`exportacaoDePara.js::escreverResumoPorGrupo`). A aba nova
(`DR_CPC_51_Detalhada`, entre "DRE CPC 51" e "DFs paralelas" no workbook)
repete as linhas de `montarLinhas51` e pendura embaixo de cada tópico as
contas que `montarDRE51` já agrupa em `dre51.cat[categoria].grupos[i].contas`
— **nenhum dado novo foi calculado**, só a árvore que já existia ganhou
uma segunda vista. Contas nascem `hidden` com `outlineLevel = 1`, exatamente
como no De-Para, para abrir recolhida e não virar uma parede de linhas.

**O erro da primeira versão, e por que ele já estava documentado.** A
primeira entrega deu ao tópico as colunas Código/Descrição/Valor e à
conta as colunas Conta/Descrição da conta/Saldo da conta — cada nível com
as suas. Denner mandou print: o valor da conta saía três colunas para o
lado do valor do tópico que ele soma, e conferir a composição virava
cruzar duas tabelas em vez de olhar uma coluna só. Isso é exatamente o
que o comentário de `escreverResumoPorGrupo` já explica para a aba
"Resumo" do De-Para ("as duas compartilham de propósito a coluna Saldo")
— eu tinha o padrão certo do lado, li o comentário, e mesmo assim escrevi
a aba nova sem reaproveitá-lo. A correção foi fazer tópico e conta
compartilharem Código/Conta, Descrição e Valor na MESMA coluna (a
categoria fica em branco na linha da conta, como o "Grupo na DRE" fica
em branco na linha da conta no Resumo) — de 8 colunas para 5.

**O que foi medido.** Vitest 260/260 (13 arquivos, 3 `it` novos: a aba
existe com o mesmo layout de agrupamento do De-Para; cada tópico pendura
o mesmo conjunto de contas, na mesma ordem, que `dre51.cat[...].grupos`,
e a soma delas bate com o valor do tópico; tópico e conta saem na mesma
coluna de código, descrição e valor). `oxlint src/ fixtures/` — zero
avisos. `npm run build` — passou (bundle principal foi de 397 kB para
401 kB gzip 124 kB, porque `exportacaoCPC51.js` é importado estático em
`App.jsx`, fora do chunk sob demanda do `exceljs`).

O `.xlsx` gerado com um razão sintético foi relido com `openpyxl`
(biblioteca independente do `exceljs`, que escreveu o arquivo), nas duas
rodadas — o `outlinePr.summaryBelow` sai `False`, cada tópico com contas
vem com `outline_level=1`/`hidden=True` embaixo dele, e depois da
correção o valor da conta chega na mesma coluna do valor do tópico. É o
mesmo cuidado que valeu para o De-Para em sessão anterior: escritor e
leitor não podem ser a mesma lib no dia da conferência.

**O que ficou de fora.** `node fixtures/validar.mjs` não rodou — os
arquivos reais não estão nesta máquina (gitignorados) e a mudança não
tocou `classify.js`, `balancete.js` nem `planoPerfil.js`, que são os três
que a doutrina manda validar contra arquivo real.

### 24/08/2026 (2ª sessão) — a conferência contra cinco balancetes reais

Denner mandou os balancetes de fevereiro a junho e pediu para conferir
antes de publicar. Foi a primeira vez que o caminho novo (balancete como
fonte única + bloco fiscal) rodou contra arquivo de verdade.

**O que passou.** Os cinco arquivos foram lidos pela aba certa, com o
período que cada um declara. Nenhuma linha inconsistente, nenhuma
sintética que não soma as filhas, patrimonial e resultado apurando o mesmo
número nos cinco meses. A prova de integridade fecha em todos: nada de
valor caiu em `IGNORAR`. E, o teste mais forte que dá para fazer sem a DRE
oficial, **o lucro líquido da DRE montada bate exatamente com o resultado
que as contas 1 e 2 do próprio balancete implicam**, mês a mês.

As contas sem movimento apareceram e se comportaram: todas com destino
definido, nenhuma de natureza credora caindo em grupo de despesa, e a
classificação das contas COM movimento **idêntica** com e sem elas nos
cinco meses. Os dois defeitos silenciosos corrigidos na sessão anterior
estão, portanto, confirmados contra arquivo real, não só contra teste
sintético.

**O que não passou — e o que mudou por causa disso.** O bloco fiscal
acusava divergência de PIS/COFINS em todos os meses, com o recalculado
perto de três vezes o lançado. Investigando: o De-Para de tributos acertou
os três (PIS, COFINS e ISS têm conta própria), e o lançado corresponde a
**exatamente** 0,65% e 3,00% de uma mesma base — ou seja, a contabilidade
está internamente coerente e no regime certo. O que não bate é a BASE: a
que o app deduzia da DRE ficava muito acima da usada, e a distância
**variou de mês para mês**, o que exclui até a hipótese de um percentual
fixo de isenção.

Não era divergência: era o app afirmando uma base que ele chutou. A base
de PIS/COFINS virou **campo**, com a estimativa da DRE mostrada ao lado
como referência; enquanto ninguém informa, `pisCofins.confiavel` é falso e
o placar diz "Incompleto — base de PIS/COFINS a informar", nunca "Diverge".
O aviso vai junto no Excel, que circula sozinho. É a mesma doutrina do
`[__________]` da nota de MPDA, aplicada onde ela estava faltando.

**Uma corrida achada ao carregar os cinco de uma vez.** `EtapaImportar`
dispara uma importação assíncrona por arquivo, e cada uma tomava o foco ao
terminar: quem lesse por último ganhava. A tela abria num mês qualquer do
meio, diferente a cada carga, sem nada explicando. Agora o foco só muda
para período igual ou mais recente que o em foco — cinco arquivos ou um, o
mês mais novo fica na tela.

**Medido:** 256 testes (13 arquivos), lint limpo, build fecha. Cinco
balancetes reais lidos pelo pipeline do app; app dirigido em Chromium com
os cinco carregados — onze abas renderizam, sem erro de página, sem
rolagem horizontal.

**O que continua sem rodar:** `fixtures/validar.mjs`. Ele precisa da DRE
oficial para comparar, e só os balancetes foram enviados. O que dava para
conferir sem ela foi conferido e está acima; a comparação centavo a
centavo contra a DRE oficial continua pendente.

### 24/08/2026 — o razão sai, as zeradas entram, o fiscal nasce

Quatro frentes num pedido só do Denner: "garantir a máxima eficiência e
economia de tokens", cancelar o razão, ler as contas sem movimento e um
bloco para LALUR e PIS/COFINS. Perguntei 16 questões em quatro rodadas
antes de escrever qualquer linha — as decisões estão na tabela do plano e
nos commits.

**Um commit por frente, nesta ordem:** doutrina → razão → zeradas →
fiscal. Inverti a ordem planejada entre "extrair hooks" e "remover o
razão": apagar o razão primeiro encolheu o `App.jsx` em ~300 linhas, e a
extração de hooks foi feita uma vez em vez de duas.

**O que foi medido**

| | Antes | Depois |
|---|---|---|
| `CLAUDE.md` (lido toda sessão) | 969 linhas / 55,5 kB | 402 / 22,3 kB |
| `EVOLUCAO.md` | 890 linhas | 346 (o resto em `EVOLUCAO-ARQUIVO.md`) |
| `App.jsx` | 945 linhas | 557 |
| Testes | 211 | 251 |
| Bundle (app) | 377 kB | 397 kB |
| Abas | 10 | 11 |

O bundle cresceu 20 kB porque o bloco fiscal é código novo; o `App.jsx`
caiu 41% e a doutrina fixa por sessão caiu 60%.

**Três defeitos reais achados no caminho, todos silenciosos:**

1. **`saldo > 0 ? receita : despesa`** (`classify.js`, `planoPerfil.js`).
   Movimento zero cai no `else`. Com o balancete emitido COM as contas
   zeradas — que é o que o pedido 3 queria —, toda conta de receita sem
   movimento seria classificada como despesa sem nenhum sinal na tela.
   Virou `ehCredora()`, que desempata pela natureza do saldo e devolve
   `null` quando não há o que deduzir. `null` não é "despesa".
2. **O fallback por maioria afrouxava com as zeradas.** `contagem/n >=
   0.5`: contas sem movimento aumentam `n` sem aumentar `contagem`, e a
   classificação de contas COM movimento mudava sozinha. Só contas com
   movimento votam agora, e há teste provando que a decisão é idêntica
   com e sem vinte zeradas na lista.
3. **Formato de moeda cravado na coluna 8** do Excel do De-Para. A coluna
   nova empurrou o Saldo para a 9, o formato caía sobre a célula de texto
   ao lado e o saldo saía sem moeda. Ancorado em `COLUNAS.length`.

E um quarto, de tela: o selo do Confronto fiscal dizia "Diverge" e o
subtexto "batem nos dois tributos", porque o subtexto só olhava as
pendências.

**O que ficou de fora, e por quê**

- **`fixtures/validar.mjs` não foi executado.** Ele foi reescrito contra
  os balancetes (não crava nome de arquivo: varre `fixtures/` e reconhece
  o que é balancete e o que é a DRE oficial pelo conteúdo), mas os
  arquivos reais estão no `.gitignore` e não estão nesta máquina. **Rodar
  antes de publicar.** É a validação mais forte que o projeto tem, e
  nenhuma das mudanças em `classify.js` desta sessão passou por ela.
- **Créditos de PIS/COFINS no não cumulativo** e **LALUR Parte B** não
  entraram — estão no backlog, e a tela diz que não calcula os créditos.
- **Nenhum agente rodou** (`auditor-contabil`, `revisor-visual`). Confiro
  isso com o usuário antes: o `auditor-contabil` é o que faria a pergunta
  certa sobre os três defeitos acima.

### 20/08/2026 (4ª sessão) — o app fica só com a DRE e o CPC 51

Pedido do Denner, textual: "preciso que o foco seja apenas a DRE e o
CPC 51, afinal esse projeto é exclusivo pra essa transição". Antes de
apagar qualquer coisa, levantei o custo em código exclusivo de cada aba
fora desse eixo e **confirmei o corte com ele** — deletar 1.700 linhas de
funcionalidade não é decisão para tomar sozinho, mesmo com o pedido
escrito.

**Saíram, com confirmação:**

| Aba | O que foi apagado |
|---|---|
| Painel | `Painel`, `Graficos`, `TorresPatrimoniais`, `indicadores.js`, `imagemPainel.js` + 2 arquivos de teste |
| Balanço | `EtapaBalanco`, `BalancoCompleto`, `balanco.js`, `abertura.js` + 1 arquivo de teste |
| Arquivos | `Arquivos.jsx` e metade de `githubApi.js` (`listarPasta`/`enviarArquivo`/`excluirArquivo`) |
| Horizontal | fundida na Comparativa, que agora responde em dois níveis de zoom |

**As consequências que não eram óbvias, e por isso valem registro:**

- **`abertura.js` foi junto com o Balanço.** O formato simples
  `código;saldo` servia a uma coisa só: dar saldo de abertura ao Balanço.
  Sem a tela, o app aceitaria esse arquivo e não produziria nada — pior
  do que recusá-lo, porque o usuário acharia que carregou. A importação
  agora só reconhece o balancete COMPLETO, e diz isso.
- **`achatar` e `gruposDe` (em `balancete.js`) eram só do Balanço** —
  saíram com seus testes. O resto do módulo fica: ele é fonte da DRE.
- **`resultadoConfere` ia ficar órfão, e foi promovido.** Era a
  conferência cruzada mostrada só na tela do Balanço: Δ(Ativo + Passivo)
  do período tem que bater com o resultado apurado pelas contas 3 a 7,
  por caminhos independentes. Em vez de deletar, passou para o aviso da
  importação — é a validação mais forte que o arquivo permite, e agora
  ela vale para a DRE, que é o que sobrou.
- **Textos de tela mentiam depois do corte.** "É dele que dependem as
  abas Comparativa e Horizontal", "monta DRE e Balanço de uma vez", "o
  Balanço deixa de ser só movimentação" — sete trechos em quatro
  componentes. Corrigidos; sobrou um `grep` limpo por "Balanço",
  "Painel", "Horizontal" e "Arquivos" em `src/components`.
- **CSS morto não some sozinho.** 59 classes ficaram órfãs (três seções
  inteiras: Balanço, Painel, Galeria). Removidas por script + conferência:
  hoje **zero classe do `App.css` sem uso no JSX**.

**Medido, antes → depois:**

| | Antes | Depois |
|---|---|---|
| Abas | 14 | 10 |
| Seções do menu | 5 | 4 |
| Bundle do app | 424 kB / 130 kB gzip | **377 kB / 117 kB gzip** |
| CSS | 41 kB / 8,3 kB gzip | **30 kB / 6,4 kB gzip** |
| Testes | 244 | 211 (os 33 a menos cobriam código apagado) |
| Lint | zero avisos | zero avisos |

**Como foi verificado além do Vitest.** Subi o app com `npm run dev` e
percorri as dez abas num Chromium headless (Playwright), com o razão
sintético importado: todas renderizam, **zero erro de runtime**, zero
`pageerror`. O único recurso que falha é a folha do Google Fonts, barrada
pela rede desta máquina. Uma captura de cada aba ficou fora do
repositório.

**O que NÃO mudou, de propósito:** o núcleo contábil inteiro —
`classify.js`, `parse.js`, `montarDRE`, `cpc51.js`, `depara.js`, os
perfis de plano e as exportações. Nenhum número da DRE foi tocado nesta
sessão, e os testes que congelam esses invariantes continuam todos
verdes. `fixtures/validar.mjs` não rodou (arquivos reais ausentes nesta
máquina).

**Doutrina nova em `CLAUDE.md`:** a seção "O que é" agora abre declarando
o escopo e listando o que foi removido, com a pergunta que toda ideia
nova tem que passar — "isto serve à DRE ou à transição?". Sem isso, a
próxima sessão reconstrói o Painel achando que está ajudando.


### 20/08/2026 (3ª sessão) — a DRE do CPC 51 exportada no layout do modelo do cliente

O chefe do Denner mandou um modelo de DRE do CPC 51/IFRS 18 para
instituição de ensino (um `.xlsx` de 30 linhas, sem valores) e pediu que
ele fosse a base. Perguntei antes de mexer, porque havia duas leituras
muito diferentes — e ele escolheu **base do layout**, não das linhas.

**A fronteira que essa escolha desenha, e por que ela é a certa.** O
modelo traz colunas (`Categoria CPC51 | Código | Descrição | 2025 | 2024
| Notas`) E uma lista de linhas própria ("Receitas de Pós-Graduação",
"Receitas de Extensão", "Custos Acadêmicos", "PCLD"). Trocar as COLUNAS
não muda número nenhum. Trocar as LINHAS exigiria remapear conta a conta
e jogaria fora a validação centavo a centavo contra a demonstração
oficial — é a mesma armadilha que "criar grupos novos em `grupos.js`"
representa, e vale registrar que o caminho seguro aqui foi perguntar, não
adivinhar.

**O que a aba "DRE CPC 51" ganhou:**

- **Categoria em coluna própria.** A linha e o subtotal que fecham um
  bloco levam o nome da categoria; os subtotais que atravessam
  categorias saem como "Subtotal" e o resultado do período como "Final"
  — exatamente como no modelo.
- **Código de linha** (`1.1`, `2.3`), nascido em `montarLinhas51` para a
  tela e o arquivo não poderem divergir. Primeiro dígito = posição fixa
  da categoria na ordem da norma; segundo = posição na demonstração
  daquele fechamento. Está documentado no próprio módulo que isso é
  numeração de linha publicada, não código de conta — quem precisa de
  chave para ERP usa o De-Para, que anda por código de conta.
- **Coluna de notas, em branco.** A referência da nota explicativa é de
  quem redige as demonstrações. Preencher seria inventar referência.
- **Coluna comparativa**, preenchida só quando existe período anterior
  DE VERDADE (competência filtrada e a anterior presente no arquivo).
  Sem isso ela sai vazia com o motivo escrito acima da tabela. Comparar
  "Jan a Jun" com "Mai" daria um número que parece comparativo e não é —
  mesma regra da nota de MPDA, onde o que o app não sabe vira lacuna.

**Não foi adotado do modelo:** ele apresenta receitas E despesas
financeiras inteiras dentro de "Financiamento". A doutrina do projeto
(e o próprio CPC 51) separa: rendimento de aplicação é investimento,
juros de mora de aluno é operacional, tarifa bancária é operacional,
juros de empréstimo é financiamento. O app continua marcando esses dois
grupos para revisão, e o arquivo do chefe mostra que ele já decidiu 23
contas exatamente aí — adotar a simplificação do modelo apagaria esse
trabalho.

**Seam novo:** `montarWorkbookCPC51`, separada de `baixarExcelCPC51`,
pelo mesmo motivo de `montarWorkbookDePara` na sessão anterior — o teste
afirma sobre o arquivo (colunas, código, comparativo cheio e vazio) sem
precisar de DOM.

**Sobre a aba Resumo do De-Para:** confirmado com o Denner que a
expansão `+/-` entregue na sessão anterior é o que ele queria; nada
mudou ali.

**Medido:** 244 testes (de 237), lint zero avisos em `src/`, build ok —
app 424 kB (130 kB gzip), +1 kB. Conferido também gerando o arquivo real
(232 contas, com as 23 decisões de categoria do chefe) e relendo com
openpyxl: as colunas saem no formato do modelo e o lucro líquido continua
idêntico nas duas estruturas. `fixtures/validar.mjs` não rodou (arquivos
reais ausentes nesta máquina).


### 20/08/2026 (2ª sessão) — o Resumo do Excel De-Para vira tabela em dois níveis

Pedido do Denner, com o arquivo do chefe em mãos: na planilha exportada,
clicar num grupo do resumo ("Receita Bruta com Mensalidades, 29 contas")
e ver as contas que formam aquele saldo logo abaixo — a conferência que
a tela já permite, dentro do arquivo entregue.

**O que mudou.** A aba "Resumo" do Excel do De-Para deixou de ser uma
tabela de 4 colunas com uma linha por grupo e passou a ser uma tabela de
8 colunas em dois níveis: a linha do grupo (nome, saldo, quantas contas,
quantas a revisar) e, penduradas nela pelo agrupamento nativo do Excel,
as contas que a compõem (conta, descrição, categoria do CPC 51,
situação, saldo). As contas nascem recolhidas.

Três decisões que valem a pena não desfazer:

- **`summaryBelow: false`.** Sem isso o Excel desenha o botão `+` uma
  linha DEPOIS do bloco de contas, e ninguém entende o que ele abre.
- **A coluna Saldo é a mesma nos dois níveis.** O total do grupo fica
  exatamente em cima das parcelas — abrir o grupo e conferir se fecha é
  olhar uma coluna só. É o que faz a expansão servir para conferência, e
  não só para "mostrar mais linhas".
- **`porGrupo` passou a carregar `contas`**, as mesmas linhas que
  somaram o total, na mesma ordem. Não há segunda seleção de contas em
  lugar nenhum: quem abre o grupo vê literalmente o que gerou o número.

**Seam novo para teste:** `montarWorkbookDePara` foi separada de
`baixarExcelDePara`. A primeira devolve o workbook e não toca em DOM,
então o Vitest consegue afirmar sobre o arquivo de verdade (nível de
outline, linha recolhida, e o total de cada grupo batendo com a soma das
contas debaixo dele) em vez de só sobre o array que o alimentou.

**Medido:** 237 testes (de 234), lint zero avisos em `src/`, build ok —
bundle do app 423 kB (130 kB gzip), sem mudança relevante: a expansão é
metadado de linha, não código novo no caminho quente. Conferido também
fora do Vitest, relendo o `.xlsx` gerado com **openpyxl** (biblioteca
independente da que escreveu, como manda a doutrina): com os 232 registros
do arquivo que o chefe devolveu, os 18 grupos fecham centavo a centavo
com as contas recolhidas debaixo de cada um, todas com `hidden` e
`outlineLevel=1`.

**O que ficou de fora, e por quê:**

- **O CSV não ganhou nada** — CSV não tem agrupamento. Quem quer a
  conferência rápida usa o Excel; o CSV continua sendo o arquivo de
  carga.
- **A aba "De-Para" continua plana**, com o filtro automático. Ela é
  ordenada por tamanho de saldo, não por grupo, e outline junto de
  autoFilter briga na hora de filtrar.
- **Nada foi importado do arquivo do chefe.** Conferido: ele é o próprio
  export do app de 19/08 (`lastModifiedBy` vazio, `modified` igual a
  `created`), sem edição feita no Excel — as 23 decisões manuais que ele
  traz já são as da sessão do app. Se um dia o fluxo for "o chefe edita a
  planilha e a gente carrega de volta", isso é funcionalidade nova
  (leitura do De-Para preenchido), não está feito.



> As sessões anteriores a 20/08/2026 (merge do balancete) estão em
> [`EVOLUCAO-ARQUIVO.md`](EVOLUCAO-ARQUIVO.md). Nada foi perdido — elas
> saíram daqui para o diário caber numa leitura, que é o que o torna útil.

## Próximos passos, na ordem que eu priorizaria

0. **RODAR `node fixtures/validar.mjs`** com a **DRE oficial** em
   `fixtures/`. Os cinco balancetes de fev–jun/2026 já passaram pelo
   pipeline (ver o registro de 24/08, 2ª sessão) e o que dava para
   conferir sem a DRE oficial fechou — inclusive o lucro líquido contra o
   resultado implícito nas contas 1 e 2. Falta a comparação centavo a
   centavo grupo a grupo, que exige a planilha da DRE oficial; sem ela o
   script para com `exit 2`, de propósito.
0b. **Descobrir a base de PIS/COFINS da apuração.** É pergunta para o
   Denner, não para o código: a base lançada é muito menor que a receita
   bruta líquida de devoluções e descontos, e a proporção muda todo mês
   (regime de caixa? isenção de entidade beneficente? exclusão específica
   de receita?). Hoje o app pede a base na tela e se recusa a chamar a
   diferença de divergência. Se a regra for derivável do balancete, ela
   vira cálculo; se não for, o campo é a resposta certa e fica como está.
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
3. **Comparativa na estrutura do CPC 51 NA TELA** (Fase 8, passo 36).
   O Excel exportado já traz uma coluna comparativa (a competência
   anterior, quando existe no arquivo); `EtapaComparativo` continua
   montando colunas só na estrutura antiga. O que falta é a tela lendo
   `montarLinhas51` por competência — os dados já estão prontos em
   `dres51PorCompetencia` (`App.jsx`).
4. **Extrair `useCPC51`, `useDePara` e o casco de `App.jsx`.** Mesmo
   depois do corte de abas ele tem 945 linhas — é o arquivo que mais
   cresce a cada funcionalidade, e cada módulo de ERP vai empurrar mais.
   O corte mais óbvio é um `<Casco>` levando topo + menu + `ItemMenu`,
   que é bloco fechado e não toca em estado contábil nenhum.
5. **Efeito tributário por item de MPDA**, com campo editável por ajuste
   — fecha a exigência da norma que hoje sai como lacuna.
6. **Seletor de aba do Excel** (`importarExcel.js` já devolve `abas`,
   falta UI).
7. **Agregar durante a importação**, em vez de guardar `linhas` cru em
   memória — tira o teto de tamanho de arquivo.
8. **Ler de volta o De-Para preenchido fora do app.** O arquivo que o
   chefe do Denner devolveu nesta sessão era o próprio export, sem
   edição — mas o fluxo "exporta, alguém preenche no Excel, carrega de
   volta" é o próximo pedido natural, e hoje não existe. O formato de
   saída já é estável e tem a coluna de origem da decisão; o que falta é
   a leitura, decidir o que fazer quando o arquivo carregado discorda da
   classificação atual, e não deixar isso apagar decisão manual em
   silêncio. Cuidado: o caminho óbvio (aplicar tudo do arquivo) é
   exatamente a classe de defeito que o projeto evita.
9. **Teste unitário para `periodoLegivel()`.** Corrigido na sessão de
   17/08 (4ª) um bug real de período mostrando dias soltos fora de
   ordem em vez de "Jan/2026 a Jun/2026" — e não havia teste nenhum
   cobrindo esse texto, nem antes nem depois do fix. Cobrir os três
   ramos (competência filtrada, dia filtrado, intervalo de competências)
   é barato e fecha essa lacuna de cobertura.

**Fora do escopo, e não por esquecimento:** indicadores, gráficos,
Balanço Patrimonial e galeria de arquivos foram removidos em 20/08/2026
por decisão do usuário. Não os proponha de volta sem ele pedir — a
pergunta que toda ideia nova responde é "isto serve à DRE ou à
transição para o CPC 51?".

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
