# Gerador de DRE — contexto do projeto

Leia isto antes de mexer em qualquer coisa. Este arquivo é o que faz
uma sessão nova de Claude Code entender o projeto sem eu precisar
reexplicar tudo. Mantenha-o atualizado: se você mudar algo que
invalida uma frase daqui, corrija a frase no mesmo commit.

## O que é

App React (Vite) que importa um razão contábil (CSV ou Excel) e monta
a Demonstração do Resultado do Exercício, Balanço Patrimonial
simplificado, análise horizontal e histórico de DREs — peça de
portfólio de Denner (contábil/fiscal, graduando em Ciências Contábeis).
Roda 100% no navegador, sem backend. Site publicado via GitHub Pages
a partir da pasta `/docs`.

Link do site: https://dennereduardo1971-ai.github.io/Gerador-DRE/
Repositório: https://github.com/dennereduardo1971-ai/Gerador-DRE

## Quem usa isto e como

Denner não usa terminal no dia a dia (PC da empresa, sem acesso). Se
você está rodando como Claude Code num ambiente COM terminal e
credenciais de git configuradas, pode commitar e dar `git push`
direto. Se estiver ajudando pelo chat do claude.ai sem terminal do
lado do usuário, o fluxo de entrega é: build local → copiar `dist/`
para `docs/` → empacotar `docs/` em zip → o usuário sobe manualmente
pelo **Add file → Upload files** do GitHub (arrastando a pasta) → o
Pages atualiza sozinho. Nesse caso, também vale empacotar o projeto
inteiro (sem `node_modules`/`dist`) como entregável de backup.

## Arquitetura

```
src/
  lib/                       # lógica pura, sem React — testável isolada
    parse.js                 # leitura do CSV, normalização de número/encoding,
                              # agregação por conta e por competência (mês/ano)
    importarArquivo.js       # ponto único: decide CSV x Excel pela extensão
    importarCSV.js           # CSV em chunks, com progresso real (SEM worker —
                              # ver "Armadilhas conhecidas" abaixo)
    importarExcel.js         # xlsx/xls/xlsm/xlsb/ods via SheetJS, import()
                              # dinâmico (code-splitting — não deixe virar
                              # import estático, ver "Armadilhas")
    classify.js               # GRUPOS da DRE + sugerirClassificacao()
                              # (o coração do projeto — ver seção própria)
    balanco.js                 # Balanço Patrimonial simplificado (contas 1/2)
    historico.js                # histórico local de DREs (localStorage) +
                                 # sincronização com githubApi.js
    githubApi.js                 # lê/grava um arquivo JSON no repo via API do
                                  # GitHub — o "banco de dados" do histórico
    grupos.js                     # os grupos da DRE e o sinal de cada um
                                   # (módulo próprio: classify e planoPerfil
                                   #  precisam dele e se importavam em círculo)
    planoPerfil.js                # motor de perfis de plano de contas
    planos/iesb.js                # o plano do IESB, como DADO
    linhasDRE.js                  # a estrutura da DRE (rótulos, sinais,
                                   #  cascata, soma por seção)
    abertura.js                   # balancete simples (código;saldo)
    indicadores.js                # margens, índices e séries do painel
                                   #  (inclui cascataPassos, fonte única
                                   #  compartilhada pelo SVG e pelo PNG)
    imagemPainel.js                # gera o PNG do painel via <canvas>
    balancete.js                  # balancete de verificação hierárquico
                                   #  (traz o Balanço inteiro pronto)
    cpc51.js                      # as cinco categorias do CPC 51, a
                                   #  política de julgamento e a
                                   #  conciliação com a estrutura atual
    linhasCPC51.js                # a demonstração do CPC 51 como dados
    mpda.js                       # medidas de desempenho da administração
    cronograma51.js               # o cronograma de implementação, como dado
    planoAcao.js                  # andamento do plano (localStorage)
    depara.js                     # a tabela de parametrização: conta →
                                   #  grupo da DRE + categoria do CPC 51,
                                   #  com a ORIGEM de cada decisão
    exportacaoDePara.js           # o De-Para completo em CSV e Excel
    exportacaoCPC51.js            # Excel de seis abas + De-Para + nota
    exportacao.js                 # CSV e Excel, ambos a partir de linhasDRE
    excelEstilo.js                # o visual dos Excel exportados, uma vez
                                   #  só (exceljs — xlsx não escreve estilo)
    sessao.js                     # persistência da sessão em IndexedDB
    perfil.js                     # perfil de classificação (conta → grupo)
                                   # salvável em arquivo
    useTema.js                    # tema claro/escuro
  components/
    Etapa*.jsx                  # uma etapa do fluxo por arquivo
    EtapaCPC51.jsx               # a DRE em cinco categorias + conciliação
    CategoriasCPC51.jsx           # política, De-Para dos grupos, contas mistas
    MedidasMPDA.jsx                # MPDA com a conciliação sempre aberta
    Cronograma51.jsx                # o plano de ação, fase a fase
    LinhaDRE.jsx                 # Linha/Secao/Cabecalho/Detalhe da DRE
    DePara.jsx                       # a área de parametrização: os dois
                                      #  eixos editáveis na mesma linha
    Eixo.jsx                      # Canal e Balanca — o eixo visual
                                   # compartilhado (ver "Sistema visual")
    SincronizacaoGitHub.jsx         # painel de config da sincronização
    Icones.jsx                       # os ícones do casco, SVG inline em
                                      #  currentColor (sem biblioteca)
    Inicio.jsx                        # a tela "o que eu faço agora?" —
                                       #  estado, próximo passo, pendências
  App.jsx                        # dono de todo o estado; as Etapas são
                                  # "burras" (recebem props, chamam callbacks);
                                  # a navegação é DADO (`SECOES`) e o casco
                                  # (topo + menu lateral) mora aqui
  App.css                        # design system em variáveis CSS (--papel,
                                  # --tinta, --marca, --barra-* etc.) — tema
                                  # escuro é um seletor
                                  # `:root[data-tema="dark"]` que sobrescreve
                                  # as mesmas variáveis
```

Fluxo do app: Importar → Conferir → Classificar → DRE. As demais abas
são vistas paralelas sobre o mesmo estado agregado (`contas`, calculado
uma vez em `App.jsx` via `agregarPorConta`). **Na etapa Importar o
balancete vem primeiro e o razão está atrás de "opções avançadas"**: o
balancete já passou pelo fechamento e monta DRE e Balanço sozinho,
enquanto o razão só é necessário para o que ele não carrega (competência
mês a mês num arquivo só, centro de custo, lançamento individual).

**A navegação é dado, não JSX.** `SECOES` em `App.jsx` descreve cinco
seções, cada uma agrupando abas que respondem à mesma pergunta. **Início**
fica solto acima delas, porque não pertence a nenhuma:

| Seção | Pergunta | Abas |
|---|---|---|
| — | o que eu faço agora? | Início |
| Fluxo | como eu chego na DRE? | Importar → Conferir → Classificar → DRE |
| Análises | o que estes números dizem? | Painel, Balanço, Horizontal, Comparativa |
| Parâmetros | para onde vai cada conta? | De-Para |
| Arquivo | o que já foi fechado? | Histórico, Arquivos |
| CPC 51 · 2027 | como isso fica em 2027? | Demonstração, Plano de ação |

Quatro coisas a não desfazer aqui:

- **Só "Fluxo" é numerado**, porque só ele é sequencial de verdade. O
  número pendura no canto do ícone em vez de substituí-lo, para o
  ícone continuar sendo o que se reconhece de relance no trilho
  recolhido; as outras seções não recebem número nenhum, para não
  fingirem ser passos 5, 6 e 7.
- **A regra de "quando esta aba abre" se escreve uma vez**, em
  `abaDisponivel()`. Ela governa o menu E o estado vazio do `<main>`;
  eram duas cópias antes, e aba nova aberta no menu caía em tela
  branca quando alguém esquecia da segunda.
- **Parâmetros não é uma linha em Análises.** De-Para é cadastro, não
  leitura de resultado — e cadastro que se procura em "Análises" é
  cadastro que ninguém acha. É também a seção onde entram os módulos de
  parametrização do caminho para ERP.
- **Início não é o Painel.** Início responde "por onde começo e o que
  está me esperando"; Painel responde "e daí?". Por isso Início não tem
  gráfico nenhum — os três números do topo são isca para o Painel, não
  leitura de resultado. Pôr cascata ou ranking ali faz as duas telas
  virarem a mesma tela, e uma delas passa a sobrar.

O estado de cada aba (`estadoDaAba`) aparece como **selo** ao lado do
nome: um número (`17` contas, `3` a resolver) ou `!`/`✓`. Selo em **âmbar**
— nunca vermelho, que aqui pertence ao dado — marca pendência. O selo é
`aria-hidden` e o significado por extenso vai no `aria-label` do botão
("De-Para — 3 contas a resolver"), porque "3" sozinho não diz nada a quem
usa leitor de tela. Ele foi escolhido no lugar do sub-rótulo em frase
justamente por caber no trilho recolhido, onde vira um ponto no canto.

## Sistema visual ("Razão")

A referência é o papel de razão contábil (green-bar paper): daí o
neutro verde-acinzentado e a listra de linha alternada nas tabelas.
Duas regras que não devem ser desfeitas sem motivo:

1. **A cor de marca (índigo) nunca é verde nem vermelha.** Verde e
   vermelho pertencem ao dado — saldo, resultado, diferença que não
   fecha. Se um dia a marca virar verde, a semântica contábil da tela
   deixa de funcionar.
2. **Mono (`Spline Sans Mono`) é só para código de conta.** Valores em
   R$ e percentuais usam Archivo com `font-variant-numeric: tabular-nums`
   (verificado: Archivo tem a feature `tnum`; NÃO tem `zero`, então não
   adianta pedir zero cortado). Mono em coluna de valor engorda a tabela
   e dá cara de editor de código.

### O casco: topo de contexto e menu lateral

Três peças: faixa fixa no topo, menu lateral que recolhe, conteúdo.

O topo carrega **contexto, não apresentação**. Existia ali um parágrafo
explicando o app; um parágrafo se lê uma vez e depois é ruído permanente.
No lugar entraram três selos (`ctx-chip`) que dizem o tempo todo as três
coisas que mudam o que está na tela — qual arquivo, qual período, qual
fonte — e cada um leva à tela que muda aquilo.

O menu recolhe para um trilho de 64px só com ícones, e a escolha fica em
`localStorage` (é preferência de quem usa, não estado do arquivo: não
entra na sessão em IndexedDB, que é só para dado de cliente). No celular
ele vira **gaveta**, não faixa rolável: a faixa cabia, mas com quatorze
itens obrigava a arrastar às cegas, e o que estava fora da vista não
existia.

O único movimento do casco é um fade de 0.2s ao trocar de aba, e a
largura do menu animando ao recolher. Nada mais anima — número que o olho
precisa ler não se mexe.

### Texto longo mora em `<details class="explica">`

Regra desta interface: **a primeira coisa visível numa tela é o que fazer,
não a explicação de por quê.** O texto que explica consequência, formato
de arquivo ou fundamento contábil continua no app, fechado, atrás de um
`<summary>` de três a cinco palavras.

Duas exceções, e não são estilo: o aviso de repositório público em
`Arquivos.jsx` e a instrução de token fine-grained em
`SincronizacaoGitHub.jsx` ficam **abertos**. São avisos de consequência,
lidos por quem está prestes a clicar — esconder um aviso desses é o
oposto de "fácil de entender".

### O canal (elemento de assinatura)

`Eixo.jsx` exporta duas primitivas puramente visuais:

- **`Canal`** — a coluna de cascata dentro da própria DRE. Cada linha
  desenha seu segmento começando onde o subtotal anterior parou:
  deduções e custos andam para a esquerda a partir do saldo corrente,
  adições para a direita. O fundo pálido é o nível ANTES da linha (sem
  ele a mordida vermelha flutua no vazio). Subtotais desenham barra
  cheia do zero até o valor.
- **`Balanca`** — o mesmo eixo espelhado, usado em Conferir (débito ×
  crédito) e Balanço (Ativo × Passivo + PL). Os dois braços são índigo
  neutro; **o único trecho vermelho é o excesso de um lado sobre o
  outro**, ou seja, literalmente o que não fecha.

Os números da cascata são calculados em `montarLinhas()` dentro de
`EtapaDRE.jsx`, percorrendo a demonstração em ordem — e **cada subtotal
reancora no valor autoritativo vindo de `montarDRE`**, nunca numa soma
própria. Isso é de propósito: o desenho não pode divergir do número
impresso ao lado se algum grupo for exibido condicionalmente.

Uma tentação a evitar: já existiu uma barrinha de variação divergente
na Análise Horizontal e ela foi removida. Com uma variação atípica
(+424% num mês) a escala compartilhada esmaga todas as outras e as
barras viram slivers invisíveis — o número já dizia tudo.

### Piso de qualidade

Responsivo até 390px (o menu vira gaveta; tabelas com descrição textual
viram cartões empilhados via `.tabela-cartao` + `data-rotulo`, e a célula
`.desc` empilha rótulo sobre conteúdo em vez de dividir em duas colunas;
tabelas curtas e numéricas rolam na horizontal), foco de teclado visível em todo
interativo, `prefers-reduced-motion` respeitado, `@media print`
preservando só a demonstração. A dropzone é operável por teclado
(Enter/Espaço) e os `<select>` de grupo e checkboxes de tabela têm
`aria-label` próprio, porque o cabeçalho da coluna sozinho não nomeia
o controle.

## O coração do projeto: classificação de contas

`sugerirClassificacao()` em `classify.js` decide em qual grupo da DRE
(`GRUPOS`) cada conta de resultado cai. Isto NÃO é um classificador
genérico — foi calibrado e testado contra o plano de contas real de
uma instituição de ensino (IESB), então entenda o raciocínio antes de
mudar:

1. **Decisão é por conta individual**, não por maioria de um grupo de
   contas. Isso já foi tentado (maioria por prefixo de 3 dígitos) e
   quebrou contra dados reais: o mesmo prefixo pode conter sub-contas
   de grupos completamente diferentes (ex. um prefixo com Bolsas,
   Descontos, Devoluções e Impostos misturados).
2. Cada conta é testada contra um **texto enriquecido**: histórico dos
   lançamentos + nome da própria conta (se houver plano de contas
   importado) + nome de **cada conta ancestral** no plano de contas
   (cortando o código um dígito de cada vez). Isso resolve o caso comum
   de conta-folha com nome genérico cuja natureza real só aparece no
   nome da conta-síntese pai.
3. **A ordem dos padrões `PAT_*` importa.** Padrões mais específicos
   têm que vir antes dos mais genéricos, porque termos se sobrepõem em
   plano de contas real:
   - `PROVISAO IRPJ`/`PROVISAO CSLL` bate em "provisão" E em "IRPJ/CSLL"
     → IRPJ/CSLL tem que ser checado antes de Provisões.
   - `PIS S/FOLHA PAGAMENTO` (encargo trabalhista, grupo Fopag) bate em
     "PIS" igual a `(-)PIS` (imposto sobre receita, grupo Deduções) →
     Fopag é checado antes de Impostos.
4. Sem plano de contas importado, cai num **fallback por maioria do
   prefixo de 3 dígitos** (o comportamento antigo, mais grosseiro, mas
   que não depende de nome nenhum).
5. Classificações manuais do usuário (`classif` em `App.jsx`) sempre
   têm prioridade sobre a sugestão automática — importar um novo plano
   de contas nunca desfaz uma escolha manual.

**Antes de mudar um padrão `PAT_*` ou a ordem de prioridade**, rode
contra um arquivo real (ver skill `testar-com-arquivo-real`) e
confira: (a) nenhuma conta sobra em "Não entra na DRE" quando há plano
de contas, (b) a soma de todos os grupos bate com a soma absoluta de
todas as contas de resultado (nada se perde ou duplica), (c) o
Lucro Líquido final não muda por acaso — se mudar, entenda por quê
antes de aceitar.

### Camada de código exato (plano de contas do IESB)

Acima do classificador por texto existe uma segunda camada, mais forte:
`MAPA_CODIGO_IESB` em `classify.js` liga cada conta-síntese do plano de
contas do IESB (ex. `31101`, `32104`, `41101`) direto ao grupo da DRE,
sem depender de palavra nenhuma. Ela só entra em ação quando o plano de
contas importado bate a "assinatura" do IESB (`assinaturaPlanoIESB` —
checa o nome das contas-síntese 3/4/5/6); com outro plano de contas, ou
sem plano nenhum, cai no texto/histórico como sempre caiu.

Essa camada foi validada linha a linha contra a DRE real de jan a
jun/2026 (script `fixtures/validar.mjs`, arquivos reais do Denner em
`fixtures/`, ignorados no git) — bateu **centavo a centavo** em todo
grupo, inclusive Lucro Líquido final. Rode esse script depois de
qualquer mudança em `classify.js` ou `parse.js` para garantir que não
regrediu:

```bash
node fixtures/validar.mjs
```

Três coisas importantes que esse trabalho revelou, para não serem
desfeitas por acidente:

1. **Custo dos Serviços ≠ Despesas com Pessoal.** A folha dos DOCENTES
   (`411`/`4110`) é Custo dos Serviços (quem entrega o serviço-fim); a
   folha do administrativo (`4111`) e do apoio acadêmico (`4112`) é
   Despesas com Pessoal (Fopag) dentro de Despesas Operacionais. São
   grupos diferentes por desenho contábil, não por coincidência.
2. **Há exceções pontuais no próprio plano de contas** que o mapa por
   código sozinho erraria — contas-folha cujo nome diz uma coisa e cujo
   grupo-pai no plano diz outra (ex. conta de PROUNI dentro do grupo
   "Bolsas Estudantis"; conta de IPTU de imóvel de investimento dentro
   de "Provisões", mas tratada como Não Operacional na DRE oficial).
   Ver `EXCECOES_CODIGO_IESB` e o comentário de `grupoPorCodigoIESB`.
3. **`montarDRE` soma o saldo com sinal, não a magnitude.** Grupos como
   Provisões misturam de verdade contas de despesa (nova provisão) com
   contas de receita (reversão/estorno) na MESMA linha da DRE oficial —
   em meses onde a reversão supera a provisão nova, a linha vira
   positiva de verdade (reduz despesa). Somar `Math.abs(saldo)` por
   conta, como o código fazia antes, perde esse líquido e infla o
   grupo. Por isso `bal[g].total` acumula `saldo * sinalDoGrupo`, não
   `Math.abs(saldo)` — e a tela (`EtapaDRE.jsx`) e o CSV
   (`exportacao.js`) mostram o valor líquido de verdade (podendo aparecer
   uma despesa "positiva" num mês de reversão forte), em vez de forçar
   parênteses de despesa sempre.
4. **Provisões é, na DRE oficial, DUAS linhas, não uma**: "Provisões/
   Reversões Contingências" (cíveis/trabalhistas, novas e revertidas —
   contas `6110100`, `6110101`, `6110102`, `6110104`, `6110105`,
   `6110115`, `6110116`) e "Provisões/Reversões PCLD" (perdas estimadas
   com créditos de liquidação duvidosa, fiscal e societária, novas e
   revertidas — contas `6110103`, `6110106`, `6110111`, `6110112`,
   `6110114`, `6110119`). Os grupos na DRE são `PROVISOES_CONTINGENCIAS`
   e `PROVISOES_PCLD`. Não junte de volta numa linha só sem confirmar
   contra a DRE oficial — foi assim que apareceu o erro da primeira
   versão dessa camada.

## Regras da DRE (estrutura fixa em `montarDRE`)

```
Receita Bruta = Mensalidades + Taxas
Receita Líquida = Receita Bruta − Deduções (Bolsas + Prouni + Devoluções + Descontos + Impostos)
Resultado Operacional Bruto = Receita Líquida − Custos
Despesas Operacionais = Fopag + Administrativas + Depreciação + Provisões
Resultado Financeiro = Receitas Financeiras − Despesas Financeiras
Resultado Operacional = Resultado Operacional Bruto − Despesas Operacionais + Resultado Financeiro
Não Operacional = Outras Receitas − Outras Despesas
Antes do IR = Resultado Operacional + Não Operacional
Lucro Líquido = Antes do IR − IRPJ/CSLL
```

Essa hierarquia foi calibrada contra uma DRE real (formato
`DRE-BALANÇO_INTERMEDIÁRIOS`, seções em caixa alta com prefixo
`( + )`/`( – )`/`( = )`). Se for generalizar para outro tipo de
empresa (comércio, indústria), ANTES de mexer na estrutura, considere
se dá para fazer só adicionando um grupo novo em `GRUPOS` — é bem mais
seguro que reescrever a hierarquia de subtotais.

## Armadilhas conhecidas (não repita)

- **Papaparse com `worker: true` quebra em produção.** Funciona em
  `npm run dev` mas quebra no build publicado (GitHub Pages, qualquer
  subcaminho) com um erro `charCodeAt is not a function` vindo de um
  script com nome de UUID — é o worker tentando carregar um script por
  URL que não resolve no bundle empacotado. `importarCSV.js` usa
  `worker: false` com `parser.pause()/resume()` de propósito. Não
  reverta isso sem testar contra um build real publicado.
- **`xlsx` (SheetJS) tem que ser `import()` dinâmico**, não import
  estático — senão o bundle principal engorda ~350KB pra quem só usa
  CSV. Ver `importarExcel.js`. **`exceljs` também**, pelo mesmo motivo —
  ver `excelEstilo.js` e a seção "Exportação" abaixo.
- **`xlsx` (SheetJS Community) não escreve estilo de célula** — `cell.s`
  (negrito, cor de fundo) é aceito no objeto e ignorado ao gravar; só
  `cell.z` (formato numérico) chega no arquivo. Ver a seção "Exportação".
- **Ordem de regras CSS com a mesma especificidade decide por SOURCE
  ORDER, não por "estar dentro de `@media`".** Uma regra `.x { display:
  none; }` fora de qualquer media query, posicionada DEPOIS de
  `@media print { .x { display: block; } }` no arquivo, GANHA na
  impressão — o media query não dá prioridade sozinho. Foi assim que
  `.print-rodape` ficou invisível mesmo dentro do próprio `@media print`
  até a ordem ser corrigida. Regra de bolso: declare o `display: none`
  "de tela" ANTES do bloco `@media print` que o sobrescreve, nunca
  depois.
- **`transform` esconde visualmente, mas NÃO tira da ordem de tabulação
  nem da árvore de acessibilidade** — ao contrário de `display: none` e
  `visibility: hidden`. A gaveta do menu no celular (`.lateral` fora da
  tela via `translateX(-100%)`) deixava todos os ~18 botões do menu
  alcançáveis por Tab e por leitor de tela mesmo fechada, antes do
  conteúdo principal. Off-canvas acessível precisa de `visibility:
  hidden` (ou `inert`) junto do `transform` — com um atraso na
  transição só do lado de FECHAR (`transition: transform .2s ease,
  visibility 0s linear .2s`), pra a animação de deslizar continuar
  visível e o elemento só sair da árvore quando já estiver inteiramente
  fora da tela. Ver `.lateral` em `App.css` dentro de
  `@media (max-width: 920px)`.
- **`meses` (o array de `agregarPorConta`) é a lista de DIAS do
  arquivo** (coluna Dia/Mês, tipo "01/jan"), não de meses — nome
  historicamente errado, um `Set` sem ordem cronológica nenhuma. Usar
  `meses[0]`/`meses[last]` ou `meses.join()` como "o período do
  arquivo" produz uma lista enorme fora de ordem ou um intervalo entre
  dois dias quase aleatórios — aconteceu em CINCO lugares ao mesmo
  tempo (`periodoLegivel()` em `exportacao.js`, o `.dre-head` da DRE e
  do CPC 51, o selo de contexto do topo, `onSalvarHistorico`) antes de
  ser corrigido. **Período do arquivo é COMPETÊNCIA** (mês/ano) — use
  `listarCompetencias()` (devolve já ordenado por `compararCompetencia`)
  e `competenciaLegivel()`, nunca `meses`. `meses`/`filtroMes` só
  servem para o filtro "Dia específico" de verdade, em
  `EtapaConferir.jsx`.
- **Números de Excel com célula numérica nativa**: não formate como
  texto antes de somar (`raw: false` no SheetJS introduz ambiguidade
  de locale — "1,234.56" americano vira "1.23456" se tratado como
  BR). Deixe como número nativo do JS; `numeroBR()` em `parse.js` já
  lida bem com número OU string.
- **Zero à esquerda em conta armazenada como número numa célula
  Excel** se perde — isso é do próprio Excel, não é bug do app.
  Documentado no README, não tem solução no nosso lado.
- **A vulnerabilidade conhecida do pacote `xlsx` do npm** (prototype
  pollution + ReDoS, sem correção nessa distribuição) é aceita
  conscientemente — app roda só no navegador do próprio usuário,
  processando arquivo que ele mesmo escolhe abrir. Documentado no
  README. Não troque de lib sem avisar, `exceljs` (a alternativa mais
  óbvia) não lê `.xls` legado.
- **Classe nova em `App.css` pode colidir com classe existente.** O
  arquivo tem mais de 1.700 linhas e nomes curtos e genéricos já estão
  tomados — `.chip` era o quadradinho 11×11 da legenda dos gráficos.
  Declarar `.chip` de novo mais acima não dá erro nenhum: a declaração de
  baixo vence, e o elemento novo aparece com a altura errada e o texto
  cortado fora da caixa. Nenhum teste pega isso. **Antes de criar uma
  classe, `grep` pelo nome no `App.css` inteiro**, e prefira um prefixo de
  contexto (`ctx-chip`, `dp-motivo`, `etapa-selo`) a um substantivo solto.
- **Célula de texto longo em `.tabela-cartao` precisa de `td.desc`.** No
  modo cartão (390px) o `td` é uma grade de duas colunas, `1fr auto`. Uma
  descrição longa engorda a coluna `auto` e espreme a outra até sobrar
  uma tira de 40px — com uma palavra por linha — para o rótulo e para
  qualquer conteúdo extra da mesma célula (no De-Para, o motivo da
  revisão). Célula de texto corrido leva `className="desc"`, que empilha.
- **Nunca escreva VALOR real em comentário, teste ou documentação.**
  Não basta manter as planilhas fora do Git: saldo, total de Ativo,
  débito do período e resultado do exercício já vazaram mais de uma vez
  por essa porta — copiados do arquivo real para dentro de comentário de
  código, de teste e do próprio `CLAUDE.md`, "só para ilustrar". Num
  repositório público, isso é a demonstração financeira de uma
  instituição identificada. Para ilustrar formato, use número fictício e
  diga que é exemplo. O que pode ser citado é ESTRUTURA (código de conta,
  nome de conta-síntese, quantidade de níveis), nunca quantia.
- **Nunca commite os arquivos reais de razão/plano de contas do
  Denner** (números financeiros de instituição real) — ficam em
  `fixtures/`, que está no `.gitignore`.
- **Número gerado pelo app não pode passar por `neutralizarFormula`.**
  Ela prefixa com aspa simples tudo que começa com `- = + @` — defesa
  certa para TEXTO vindo do plano de contas e do histórico do razão, que
  o app não controla. Mas `dec(-40000)` produz `"-40000.00"`, que também
  começa com `-`: aplicada ali, ela transforma **toda despesa numa
  célula de texto que o Excel não soma**. Num arquivo cujo destino é
  carga em ERP e conferência por totais, isso é pior que inútil.
  `exportacaoDePara.js` separa `celulaTexto` de `celulaNumero`, com
  teste cobrindo as duas metades. **O defeito ainda existe em
  `baixarCSVDePara` e no CSV da DRE** — está no backlog de
  `EVOLUCAO.md`, não é comportamento desejado.

## Como testar

Duas camadas, e as duas importam:

1. **Vitest** (`npm test`) — testes em `src/lib/__tests__/`, com razão
   sintético. Rodam em qualquer máquina, sem dado real. Eles congelam
   de propósito as decisões que já custaram caro: o cabeçalho real do
   razão do IESB, a separação custo/fopag, Prouni fora de Bolsas,
   provisões em duas linhas, a soma líquida (reversão reduz despesa), a
   hierarquia de subtotais, a igualdade entre o lucro líquido das duas
   estruturas (CPC 51) e o acordo entre as duas tabelas De-Para. Se um
   deles ficar vermelho depois de uma mudança sua, presuma regressão até
   provar o contrário.
2. **`node fixtures/validar.mjs`** — a validação contra a DRE real, mês
   a mês, centavo a centavo. Insubstituível: o Vitest prova que a lógica
   não mudou, mas só o arquivo real prova que ela está certa. Rode
   sempre que mexer em `classify.js` ou `parse.js`. Precisa dos arquivos
   em `fixtures/`, que estão no `.gitignore` — se você está numa máquina
   sem eles, diga isso ao usuário em vez de fingir que validou.

## Build e publicação

Desde a integração contínua, **publicar é só dar push na `main`**: o
workflow builda e commita `docs/` sozinho. O passo manual abaixo continua
valendo para quem quer conferir o build localmente antes:

```bash
npm install
npm test             # 234 testes (conferir em EVOLUCAO.md)
npm run build        # gera dist/
rm -rf docs && cp -r dist docs   # normalmente desnecessário: o CI faz
```

O `vite.config.js` usa `base: './'` (caminho relativo) de propósito —
funciona tanto em GitHub Pages num subcaminho (`/Gerador-DRE/`) quanto
aberto localmente, sem precisar reconfigurar nada.

## Skills e agentes deste projeto

Skills (`.claude/skills/`) — instruções que uma sessão carrega para fazer
uma tarefa do jeito deste projeto:

| Skill | Quando |
|---|---|
| `manter-evolucao` | fechar a sessão: medir, registrar em `EVOLUCAO.md`, corrigir este arquivo no mesmo commit |
| `nova-funcionalidade` | tela, módulo ou capacidade nova — inclusive os módulos do caminho para ERP |
| `ajustar-classificacao-dre` | mudar para onde uma conta vai (padrões, mapa por código, perfis, categorias) |
| `testar-com-arquivo-real` | validar contra o razão e a DRE reais de `fixtures/`, e ser honesto quando eles não estão na máquina |
| `otimizar-app` | desempenho, bundle e código morto — medindo antes e depois |
| `build-e-publicar` | levar a mudança ao site, com e sem terminal do lado do usuário |

Agentes (`.claude/agents/`) — sessões especializadas para revisar ou
planejar:

| Agente | Para quê |
|---|---|
| `auditor-contabil` | "esta mudança alterou algum número que não devia mudar?" — invariantes, testes congelados, validação real |
| `revisor-visual` | sistema visual "Razão" e o piso de acessibilidade: paleta, 390px, foco, temas, impressão |
| `arquiteto-erp` | desenhar o próximo módulo rumo a ERP, reusando o núcleo em vez de reescrevê-lo |

A doutrina continua morando **aqui**: as skills apontam para as seções
deste arquivo em vez de duplicá-las. Quando uma decisão mudar, mude
aqui — se a frase correspondente numa skill deixar de bater, corrija a
skill no mesmo commit.

## Memória de trabalho: `EVOLUCAO.md`

Este arquivo é doutrina: como o projeto é e por quê. `EVOLUCAO.md` é o
diário: onde ele está agora, o que já foi medido (testes, bundle,
tamanho dos arquivos), o que ficou pendente e em que ordem atacar.

A divisão importa na prática. Quando você descobrir uma armadilha que
custaria caro repetir, ela vem para "Armadilhas conhecidas" **aqui** —
não para o diário, porque é este arquivo que a próxima sessão lê antes
de mexer em qualquer coisa. O diário registra que a armadilha apareceu,
o que foi medido e o que sobrou para depois.

## Persistência e perfil

`sessao.js` guarda a sessão inteira (razão, mapeamento, classificações,
empresa/CNPJ, filtros) em **IndexedDB** — não localStorage, que é
síncrono e não aguenta o volume do razão. Duas sutilezas que não devem
ser desfeitas:

- A gravação só começa depois que a restauração termina
  (`sessaoCarregada`). Sem essa trava, o estado vazio do primeiro render
  sobrescreve a sessão salva e o usuário perde tudo justamente ao abrir.
- Como isso deixa dado financeiro real no disco da máquina — e o Denner
  usa PC de empresa —, **"Limpar tudo" tem que continuar sendo um botão
  visível**, não uma opção escondida.

`perfil.js` serializa o mapa conta → grupo num arquivo JSON (versão 2:
leva junto a categoria do CPC 51 por conta, a política de atividade
principal e as MPDA; perfis versão 1 continuam sendo lidos). Ele guarda
**só decisões e nomes de conta, nunca valores** — de propósito, para
poder ser versionado ou compartilhado sem carregar número de cliente
nenhum. Ao carregar, `cobertura()` responde "esse perfil serve para este
razão?" antes de aplicar. Contas vindas do perfil entram como `tocadas`
(manuais), porque é o que elas são: alguém já decidiu antes.

## Perfil de plano de contas

O plano do IESB **não mora mais em `classify.js`** — virou dado em
`planos/iesb.js`, lido pelo motor em `planoPerfil.js`. Atender outro
cliente é carregar um arquivo pela etapa 3, sem commit e sem build.

Duas coisas que não devem ser afrouxadas:

- **A assinatura é obrigatória.** Um perfil sem assinatura é recusado na
  leitura. Sem ela não há como saber se o perfil serve para o plano
  importado, e aplicar o perfil errado distribuiria os valores de forma
  silenciosamente errada — que é exatamente a classe de defeito que este
  projeto mais tenta evitar.
- **A resolução é do código mais específico para o mais genérico.** A
  conta-folha exata vence a conta-síntese que a contém. É isso que faz
  as exceções (3210208, 6110113) e o IRPJ/CSLL dentro de 611 caírem no
  lugar certo sem nenhuma lista de prioridade à parte.

Regras cobrem o que não cabe num mapa de prefixo: `tipo: "nome"` (Prouni
morando dentro de Bolsas) e `tipo: "sinal"` (seções que misturam receita
e despesa). `quando: "antes"` roda antes do mapa; `"depois"`, só se o
mapa não resolveu.

Ao mexer aqui, os testes de `planoPerfil.test.js` cobrem a mecânica, mas
**só `fixtures/validar.mjs` prova que o perfil do IESB continua certo.**

## De-Para — a tabela de parametrização

`depara.js` responde, para cada conta de resultado, "para onde isso
vai?" — nos DOIS eixos ao mesmo tempo: o grupo da DRE atual e a
categoria do CPC 51. É a aba **Parâmetros → De-Para**, o entregável da
Fase 2 do cronograma e a especificação de entrada da Fase 4
(parametrização no ERP).

Cinco decisões que não devem ser desfeitas:

1. **Ele não decide nada.** A resolução continua em `classify.js` (via
   `grupoDe`) e em `cpc51.js` (via `resolverCategoria`). `depara.js` só
   junta, rotula a origem e conta o que falta. Reimplementar qualquer uma
   das duas decisões ali criaria uma segunda verdade sobre o destino de
   uma conta.
2. **A tela escreve no MESMO estado** de Classificar e da aba CPC 51
   (`classif`/`tocadas` e `categoriaConta`). Por isso reclassificar no
   De-Para refaz a DRE na hora — é literalmente a mesma decisão, feita de
   outro lugar. Não crie um terceiro estado paralelo.
3. **`deParaCPC51` (em `cpc51.js`) continua existindo separado**, porque
   é o recorte que alimenta o Excel de seis abas da auditoria. Fazer um
   delegar ao outro criaria import circular entre `cpc51.js` e
   `depara.js` — a mesma classe de problema que fez `grupos.js` nascer.
   Em vez disso, `depara.test.js` prova que as duas tabelas concordam
   conta a conta sobre grupo e categoria.
4. **No Excel, o resumo por grupo é uma tabela em DOIS níveis.** A linha
   do grupo abre nas contas que formam aquele saldo, pelo agrupamento
   nativo do Excel (`summaryBelow: false`, contas recolhidas em
   `outlineLevel 1`) — a mesma conferência que a tela permite, dentro do
   arquivo entregue. Duas coisas sustentam isso: a coluna **Saldo é a
   mesma nos dois níveis** (o total fica em cima das parcelas, então
   conferir se fecha é olhar uma coluna só) e as contas vêm de
   `porGrupo(...).contas`, a MESMA lista que somou o total — não há
   segunda seleção que possa divergir dele. `montarWorkbookDePara` é
   separada de `baixarExcelDePara` de propósito, para o teste afirmar
   sobre o arquivo em si sem precisar de DOM.
5. **A coluna "origem da decisão" é o que torna a planilha um documento
   de auditoria.** Sem ela, mapeamento herdado do padrão e mapeamento
   conferido conta a conta parecem a mesma coisa — e é justamente essa
   diferença que a auditoria pergunta. `completude` conta só a conta que
   TEM destino na DRE e não depende mais de julgamento: um De-Para 100%
   "preenchido" com metade das contas em "Não entra na DRE" está
   escondendo trabalho, não pronto.

Qualquer parametrização nova do caminho para ERP copia esse formato:
origem, destino, origem da decisão, e um placar de quanto falta.

## Exportação

`exportacao.js` gera CSV e Excel a partir de `montarLinhas` — a mesma
função que desenha a tela. Antes o CSV reconstruía a DRE à mão, com os
rótulos digitados de novo: no dia em que alguém mudasse a estrutura e
esquecesse do segundo lugar, o arquivo entregue ao cliente divergiria
silenciosamente da tela conferida. **Não volte a escrever a estrutura da
DRE em nenhum outro lugar.**

O PDF é a impressão do navegador (o CSS de impressão já existia, revisado
na sessão do Excel estilizado — ver abaixo), não uma biblioteca. É menos
configurável, mas não adiciona 300 kB ao bundle nem um segundo motor de
layout para manter em sincronia com a tela.

### Duas bibliotecas de planilha, cada uma fazendo a metade que sabe fazer

`xlsx` (SheetJS Community) **lê** o arquivo importado — CSV, `.xls`
legado, `.xlsb`, `.ods`. `exceljs` **escreve** os três Excel exportados
(`exportacao.js`, `exportacaoDePara.js`, `exportacaoCPC51.js`). As duas
convivem de propósito, e a razão é um limite real da `xlsx`:

**`xlsx` (SheetJS Community) ignora `cell.s` ao gravar.** O objeto em
memória aceita `s: { font: { bold: true }, fill: {...} }` sem reclamar,
mas `get_cell_style` (em `node_modules/xlsx/xlsx.js`) só olha `cell.z`
(formato numérico) na hora de escrever o `.xlsx` — cor de fundo, fonte e
negrito são recurso pago (SheetJS Pro) nessa distribuição. Um cabeçalho
com `s: {font:{bold:true}}` abre no Excel sem nenhum estilo; isso já
esteve no código deste projeto como código morto até ser descoberto e
corrigido. **Não tente estilizar célula com `xlsx` de novo** — se um dia
precisar de estilo em algo que só `xlsx` grava, é limite da biblioteca,
não bug de uso.

O agrupamento de linhas do Excel (o `+` da margem) também só existe do
lado do `exceljs`, e é o que faz a aba "Resumo" do De-Para abrir cada
grupo nas suas contas — ver a seção "De-Para".

`exceljs` escreve estilo de verdade, mas pesa **~271 kB gzip**
minificado — quase o dobro do `xlsx` (141 kB gzip). Só entra via
`import()` dinâmico, no clique de "Baixar Excel", nunca no bundle
principal. `excelEstilo.js` define o visual uma vez (cabeçalho de marca,
cabeçalho de tabela, rajado alternado ecoando o papel de razão, subtotal
em negrito, formato de moeda nativo) para as três exportações saírem com
a mesma cara em vez de cada uma inventar a própria.

**Ao verificar um Excel gerado, não confie só na biblioteca que o
escreveu para relê-lo** — um bug de escrita pode ser autoconsistente e
passar despercebido se a mesma lib relê o que ela mesma gravou errado.
Leia de volta com uma biblioteca INDEPENDENTE (`openpyxl` em Python
serviu bem) antes de considerar validado.

## Balancete de abertura

`abertura.js` resolve pela raiz a limitação do Balanço que antes só se
podia avisar: o razão de um mês não carrega saldo inicial, então o
Balanço era a variação do período. Com o balancete carregado,
`montarBalanco` passa a calcular abertura + movimentação = saldo final, e
`comAbertura` diz em qual dos dois modos o resultado está — a tela usa
isso para não mostrar o aviso errado.

Duas decisões que parecem detalhe e não são: código repetido **soma** (há
sistemas que quebram a mesma conta por centro de custo, e sobrescrever
perderia dinheiro calado), e conta que só existe no balancete **entra**
no Balanço com movimento zero (se sumisse, o Balanço continuaria errado,
que é o problema que o balancete veio corrigir).

## Balancete de verificação

`balancete.js` lê o relatório que o sistema contábil emite de verdade
(`ctbr041`): código pontuado em vários níveis, saldo anterior, débito,
crédito, movimento e saldo atual, com a natureza indicada por "D"/"C" no
fim do número. Quando esse formato é reconhecido, ele vira a FONTE do
Balanço e o razão passa a ser a contraprova — não o contrário.

O relatório sai do sistema com **duas abas**: `Parametros` (as perguntas
do relatório — datas, faixa de contas) e só a segunda com o balancete.
`importarExcelComoLinhas` escolhe a aba **com mais linhas com código de
conta na primeira coluna**, não a primeira com dados — senão importa a
aba de parâmetros e o arquivo inteiro morre em "não achei nenhuma conta".

Sete armadilhas deste formato, todas cobertas por teste:

- **Os níveis não têm largura fixa** (1, 2, 3, 5 e 7 dígitos no plano do
  IESB) e **um nível pode ser pulado**: `1.3.40.0` pendura direto em
  `1.3`, porque `1.3.4` não existe. Por isso o pai é o *prefixo mais
  longo que existe*, nunca "um nível acima".
- **O prefixo sozinho não basta: existe NÍVEL DE PASSAGEM.** A máscara do
  código é ambígua em plano real. No IESB, `4.1.10.1` (CUSTO TOTAL -
  DOCENTES) e `4.1.10.10` (CUSTO COM PESSOAL - DOCENTES) saem com valores
  **idênticos nas cinco colunas**, e as folhas do ramo numeram a partir do
  código de cinco dígitos (`4.1.10.11.4` = `4110114`), não do de seis.
  Pelo prefixo puro sobra um valor numa sintética e falta o mesmo valor
  na outra. `reconciliarHierarquia` move as filhas para a
  sintética de passagem — e **só mantém o movimento se os dois lados
  passarem a fechar**, então um arquivo cuja hierarquia por prefixo já
  bate nunca é tocado, e um que não fecha de verdade continua sendo
  relatado como não fechando. O reparo sai em `bal.reconciliadas` e é
  dito na tela; não é silencioso.
- **As sintéticas já vêm somadas.** Totalizar tudo dá o dobro; só as
  folhas entram em qualquer soma calculada aqui.
- **O ponto é ambíguo dentro do mesmo arquivo**: colunas formatadas vêm
  em pt-BR (`123.456.789,01`) e colunas numéricas cruas vêm com ponto
  decimal (`123456789.01`). Quem desempata é a vírgula, igual a
  `numeroBR`. Tratar ponto como milhar nos dois casos multiplicava o
  movimento do período por cem.
- **O balancete das contas 1 e 2 NÃO fecha, e não deve fechar.** A
  diferença entre Ativo e Passivo + PL é o resultado do exercício, que
  está nas contas 3 a 7. Em números de exemplo: Ativo 200.000.000,00 −
  Passivo 199.500.000,00 = 500.000,00. **Nunca trate isso como erro de
  importação.**
- **Resultado do PERÍODO não é resultado ACUMULADO — e confundir os dois
  gera alarme falso.** O saldo atual das contas de resultado é acumulado
  no exercício (o relatório pergunta a data do saldo anterior de
  receitas/despesas); o movimento é só o período pedido. Em números de
  exemplo, num arquivo de junho: acumulado do exercício = 500.000,00,
  período (só junho) = 300.000,00 — e a DRE, que `contasDeMovimento`
  monta de débito e crédito **do período**, apura os 300.000,00.
  Confrontá-la com o acumulado acusava "os dois arquivos podem não cobrir
  o mesmo período" sobre UM arquivo só. `resumir` devolve
  `resultadoAcumulado` e `resultadoPeriodo` separados, e a tela confronta
  a DRE com o do período (dizendo quando ela bate com o acumulado, que é o
  caso do razão do exercício inteiro).
- **"Débitos − créditos = resultado" só vale no balancete FILTRADO em 1 e
  2.** Num balancete completo os dois lados se anulam por partida dobrada:
  débito e crédito do período saem IGUAIS, ou seja a diferença entre eles
  é **zero**, não o resultado do exercício. A identidade que vale sempre é
  Δ(Ativo + Passivo) do período = resultado do período — e quando o
  arquivo traz os dois lados, as contas patrimoniais e as de resultado
  apuram esse mesmo número por caminhos independentes (`resultadoConfere`).

## Painel

`Painel.jsx` responde "e daí?", enquanto as outras telas respondem "os
números estão certos?". São públicos diferentes: quem confere abre a DRE
e o balancete, quem decide abre o painel.

Cada bloco depende de uma fonte e só aparece se ela existir — margens
precisam do razão, índices patrimoniais precisam do balancete. **Nunca
mostre zero no lugar de dado ausente**: `indicadores.js` devolve `null`
quando o denominador é zero, porque uma liquidez corrente em 0,00 parece
diagnóstico ("não cobre o curto prazo") quando na verdade é ausência de
passivo circulante. Endividamento 0% é diferente: aí o zero é resposta.

A classificação circulante × não circulante × PL é feita pelo **nome** do
grupo, não pelo código: no plano do IESB, `1.2` e `1.3` são ambos Ativo
Não Circulante, e outro plano usaria outra numeração.

### Sobre o 3D

As torres patrimoniais (`TorresPatrimoniais.jsx`) são o único lugar com
três dimensões, e é deliberado. O Balanço É duas pilhas de mesma altura,
então volume e perspectiva tornam a igualdade física — dá para ver que as
torres terminam no mesmo nível antes de ler qualquer número.

**Não estenda 3D aos outros gráficos.** Perspectiva distorce comparação:
a barra mais próxima parece maior que outra de mesmo valor, e num painel
financeiro isso deixa de ser estilo e vira erro de leitura. Cascata,
evolução e ranking são 2D e precisos de propósito.

Feito com transformações CSS, não com three.js: uma biblioteca 3D
custaria mais de 600 kB num app cujo bundle tem 300, para desenhar
caixas. Todo o painel — indicadores, três gráficos SVG e as torres —
somou 15 kB.

## Armazenamento de arquivos (imagens e outros)

`githubApi.js` ganhou `listarPasta`/`enviarArquivo`/`excluirArquivo`,
que usam a mesma API de Conteúdo do GitHub que já sincroniza o
`historico.json` — mesmo token, mesmo repositório, sem serviço novo.
Arquivos ficam em `data/arquivos/` e a interface é `Arquivos.jsx`.

**O aviso de repositório público não é opcional e não é rodapé.** Se o
repo for público (o normal de um projeto no GitHub Pages), todo arquivo
enviado por aqui fica acessível a qualquer pessoa, sem login, e continua
no histórico do Git mesmo depois de excluído pela interface. `Arquivos.jsx`
mostra esse aviso ANTES de liberar qualquer envio, e o botão "Salvar no
GitHub" do Painel pede confirmação explícita a cada uso — não é um "aceitar
uma vez e esquecer". Isso importa mais aqui do que no `historico.json`
porque a imagem do painel carrega valores financeiros reais legíveis
direto na miniatura, não só um número dentro de um JSON.

Limite de 1 MB por arquivo: é o teto prático da API de Conteúdo em
base64 num único request. Arquivos maiores precisariam do fluxo de blobs
da Git Data API, que não foi implementado por não ser necessário para o
que o próprio app gera.

## Imagem do painel

`imagemPainel.js` desenha o PNG em `<canvas>`, não captura o DOM.
Capturar exigiria uma biblioteca tipo html2canvas (~50 kB) e ainda assim
tropeçaria nas variáveis CSS e nas transformações 3D das torres
patrimoniais. Desenhar do zero usa os MESMOS dados computados que a tela
(`indicadores.js`) — a cascata da imagem é `cascataPassos()`, a mesma
função que desenha o SVG da tela, extraída de propósito para as duas
técnicas de desenho não poderem divergir sobre o que a cascata representa.

**As torres 3D não entram na imagem.** Um retrato estático da perspectiva
exigiria reimplementar a projeção 3D em canvas só para uma imagem — não
paga o esforço. A imagem cobre indicadores, cascata, evolução e ranking.

A paleta usa cores concretas (`PALETAS.claro`/`escuro`), não variáveis
CSS: um arquivo exportado precisa se bastar sozinho, sem depender de uma
folha de estilos que não vai junto com o PNG.

## As duas fontes (razão × balancete)

**Elas descrevem o mesmo fato por caminhos diferentes.** O razão soma
lançamento a lançamento até chegar no movimento de cada conta; o
balancete já traz esse movimento somado e fechado pela contabilidade.
`contasDeMovimento()` converte as folhas do balancete para o formato de
`agregarPorConta`, e `fontes.test.js` prova que a DRE sai idêntica pelos
dois caminhos, linha por linha.

**Atenção ao sinal.** `agregarPorConta` usa `saldo = crédito − débito`
(natureza credora positiva, que é o que `montarDRE` espera para
receitas); o balancete usa `movimento = débito − crédito`. Um é o
negativo do outro. "Simplificar" isso inverte a DRE inteira sem quebrar
mais nada visivelmente — há teste explícito guardando esse ponto.

**Qual manda.** `fonteEfetiva = balancetePodeDRE && fonte !== "razao"`.
Ou seja: o balancete vence por padrão quando cobre contas de resultado,
porque passou pelo fechamento; o razão só assume por escolha explícita.

**Não são redundantes — e é por isso que o razão fica:**

| | Balancete | Razão |
|---|---|---|
| DRE e Balanço | sim | DRE sim, Balanço parcial |
| Plano de contas | vem junto | arquivo separado |
| Competência mês a mês | não (retrato de um período) | sim |
| Centro de custo | não | sim |
| Lançamento individual | não | sim |
| Confiabilidade | fechado pela contabilidade | somado pelo app |

Por isso Comparativa, Horizontal e o filtro de centro de custo continuam
dependendo do razão, e `FonteDados.jsx` diz isso na tela antes de alguém
trocar de fonte sem entender o que perde.

**Balancete filtrado.** `coberturaBalancete()` detecta quais dígitos raiz
o arquivo traz. O relatório típico de fechamento patrimonial vem filtrado
só em 1 e 2 — aí ele monta o Balanço mas não a DRE, e a tela explica que
basta exportar o mesmo relatório sem filtrar por conta.

**O balancete traz o plano de contas de graça.** `nomesDoBalancete()`
devolve código → descrição de todas as contas, sintéticas inclusive. Como
a classificação por código reconhece o plano pela ASSINATURA (nome das
contas-síntese de topo), carregar o balancete dispensa o arquivo separado
de plano de contas. Em `App.jsx`, `nomesEfetivos` põe os nomes do
balancete por baixo dos importados à mão — o usuário mantém a última
palavra.

## Segurança dos dados

Este app lida com movimentação financeira real de uma instituição. Os
pontos abaixo saíram de uma auditoria e **não devem ser afrouxados.**

**`.gitignore` protege `fixtures/` e toda planilha.** Antes não protegia:
só por sorte nenhum razão real foi commitado. Commit não se apaga — uma
vez versionado, o dado sobrevive no histórico e em todo clone. A regra é
`fixtures/*` com exceção para `*.mjs`, mais `*.xlsx`/`*.csv`/etc. em
qualquer pasta.

**Injeção de fórmula no CSV** (`neutralizarFormula`). Excel avalia como
fórmula qualquer célula iniciada por `= + - @` tab ou CR. Uma descrição
de conta como `=HYPERLINK("http://...&"&A1)` vira link que exfiltra dados
da planilha. O texto vem do plano de contas e do histórico do razão —
dados que o app não controla — e o destino do CSV é ser aberto no Excel
por um contador. A defesa é prefixar com aspa simples. O Excel (xlsx)
não precisa disso: SheetJS grava célula de texto como texto, não fórmula.

**ReDoS via perfil de plano de contas** (`padraoSeguro`). `regras` do
tipo `nome` traziam regex de arquivo direto para `new RegExp`. `(a+)+$`
contra 30 caracteres leva mais de 30 segundos e **congela a aba de vez**
— JavaScript não interrompe regex em andamento. Padrão com quantificador
aninhado, maior que 120 caracteres ou inválido é recusado na leitura e a
regra é descartada com aviso, em vez de derrubar o app.

**Visibilidade do repositório é consultada, não presumida.** A tela de
Arquivos pergunta à API se o repo é público ou privado e muda o texto do
aviso. Presumir foi como o aviso ficou factualmente errado antes —
dizendo "este repositório é público" para um repositório privado, o que
tanto assusta à toa quanto ensina o usuário a ignorar avisos.

**Riscos aceitos conscientemente** (documentados, não corrigidos):

- *Token do GitHub em `localStorage`* — qualquer XSS o vaza. Mitigado por
  não haver nenhum ponto de injeção de HTML no app (sem
  `dangerouslySetInnerHTML`, sem `innerHTML`, sem `eval`), e pela
  orientação de usar token fine-grained, só deste repositório, com
  expiração curta.
- *`xlsx` 0.18.5 tem duas falhas altas conhecidas* (prototype pollution e
  ReDoS, GHSA-4r6h-8v6p-xvw6 e GHSA-5pgg-2g8v-p4x9) e **não há correção
  no npm** — o SheetJS saiu do registro público na versão 0.20. Atualizar
  exige apontar para `cdn.sheetjs.com`, o que quebra `npm ci` no CI. O
  risco concreto exige abrir uma planilha maliciosa, e os arquivos aqui
  vêm do próprio sistema contábil do usuário.
- *Sessão em IndexedDB sem criptografia* — dado financeiro fica no disco
  da máquina. É o preço de não perder a importação num F5; por isso
  "Limpar tudo" precisa continuar sendo botão visível.

## Integração contínua

`.github/workflows/ci.yml` roda lint, testes e build em todo push e PR, e
publica `docs/` automaticamente na `main`. `docs/**` está no
`paths-ignore` de propósito: o job de publicação commita nessa pasta, e
sem a exclusão cada publicação dispararia outra, em loop.

## CPC 51 — a estrutura que entra em 2027

O CPC 51 (versão brasileira do IFRS 18) vale para exercícios iniciados
em **1º de janeiro de 2027**, com 2026 reapresentado como comparativo. A
DRE passa a ter **cinco categorias** (operacional, investimento,
financiamento, tributos sobre o lucro, operações descontinuadas) e **dois
subtotais obrigatórios** (resultado operacional; resultado antes do
financiamento e dos tributos sobre o lucro). Some o "não operacional": o
operacional vira a categoria RESIDUAL.

Cinco coisas que não devem ser desfeitas por acidente:

1. **A categoria é um eixo PARALELO ao grupo, não um grupo novo.** Cada
   conta tem um grupo (a linha da DRE atual) e uma categoria (o bloco do
   CPC 51). Criar grupos novos em `grupos.js` quebraria a DRE validada
   centavo a centavo e faria dinheiro sumir da tela no dia em que uma
   conta caísse num grupo que a hierarquia de subtotais não soma.
2. **O lucro líquido é idêntico nas duas estruturas por construção.** A
   contribuição de cada conta para o resultado é o próprio `saldo`
   (crédito − débito) nos dois caminhos; mudar de categoria muda a linha,
   nunca o total. `conciliar()` mede isso a cada render e há teste
   congelando a garantia. Se algum dia essa igualdade quebrar, o defeito
   está no mapeamento de categorias — não é "diferença de arredondamento".
3. **A política de atividade principal é decisão contábil, não
   configuração.** Quem investe ou financia clientes como negócio
   principal apresenta aquele resultado dentro do operacional. Ela muda a
   demonstração inteira, viaja no perfil e sai na planilha exportada
   porque é o que a auditoria vai pedir primeiro.
4. **Receitas e Despesas Financeiras são os grupos que mais precisam de
   revisão.** `REC_FIN` mistura rendimento de aplicação (investimento)
   com juros de mora de aluno (operacional); `DESP_FIN` mistura juros de
   empréstimo (financiamento) com tarifa bancária (operacional). O padrão
   escolhe o caso mais comum e MARCA para revisão — não finge certeza.
5. **A minuta da nota de MPDA deixa lacuna onde não sabe.** A norma exige
   efeito tributário e de não controladores por item de conciliação; o
   app não tem esses dados. Sai `[__________]`, nunca zero — zero é uma
   afirmação.

O cronograma de implementação (10 fases, 49 passos, go-live em
jan-fev/2027) está em `cronograma51.js` e aparece na aba "Plano de ação",
com o andamento em localStorage. Ele sobrevive a "Limpar tudo" de
propósito: não guarda dado financeiro nenhum, e é do escritório, não do
arquivo aberto.

## Ideias de expansão (backlog, não compromissos)

Na ordem que eu (Claude) priorizaria, já sem o que foi feito. A lista
viva, com o que foi medido em cada sessão, está em `EVOLUCAO.md`:

1. **Editor de perfil de plano a partir do De-Para** — hoje dá para
   CARREGAR um perfil de plano, mas criar um do zero ainda exige
   escrever o JSON à mão. Com a aba De-Para mostrando origem → destino →
   origem da decisão, gerar o arquivo a partir dessas decisões é um botão
   e uma serialização, e fecha o ciclo "atender cliente novo sem commit
   e sem build".
2. **Comparativa na estrutura do CPC 51** — a norma exige 2027 contra
   2026 reapresentado (Fase 8, passo 36). Hoje `EtapaComparativo` só
   monta colunas na estrutura antiga.
3. **Seletor de aba do Excel** — `importarExcel.js` escolhe a primeira
   aba com dados; já devolve `abas`, falta UI.
4. **Circulante × Não Circulante no Balanço** — agora que existe saldo de
   abertura, o passo seguinte é classificar por hierarquia do plano de
   contas e transportar o resultado do exercício para o PL.
5. **Agregar durante a importação** em vez de guardar `linhas` cru em
   memória — tiraria o teto de tamanho de arquivo.
