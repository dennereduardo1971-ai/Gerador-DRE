# Gerador de DRE

Importa um razão contábil (CSV) e monta a Demonstração do Resultado do
Exercício — conferência de partidas dobradas, classificação de contas de
resultado (com sugestão automática) e a demonstração final com análise
vertical, detalhe por conta e exportação em CSV. Também monta um Balanço
Patrimonial simplificado, uma análise horizontal (variação % entre meses)
e mantém um histórico local de DREs geradas para comparação.

A estrutura da demonstração (receita bruta com mensalidades e taxas,
deduções detalhadas, custos, despesas operacionais, financeiro, não
operacional e IRPJ/CSLL) foi calibrada a partir de uma DRE real de uma
instituição de ensino — mas o app funciona com qualquer razão que traga
conta e valor de débito/crédito em colunas separadas.

## Etapas

1. **Importar** — CSV ou Excel (.xlsx, .xls, .xlsm, .xlsb, .ods) do
   razão, lido em partes (sem travar a página mesmo com dezenas de
   milhares de linhas), com barra de progresso real. Se o Excel tiver
   mais de uma aba, usa automaticamente a primeira que tiver dados.
2. **Conferir** — totais, teste de partidas dobradas, filtro por
   **competência** (mês/ano — isola a DRE e o Balanço num mês só) e por
   dia específico ou centro de custo, mapeamento manual de colunas.
3. **Classificar** — sugestão automática de grupo por conta, ajustável.
   As classificações feitas à mão podem ser salvas num **perfil** (arquivo
   JSON) e recarregadas no mês seguinte, em vez de refazer tudo.
4. **DRE** — demonstração final, com opção de salvar no histórico local.
5. **Balanço** — contas 1 (ativo) e 2 (passivo/PL), com aviso claro de que
   reflete a movimentação do arquivo, não necessariamente o saldo
   patrimonial acumulado (depende do razão trazer o saldo de abertura).
6. **Horizontal** — variação % de cada linha da DRE entre competências
   (mês/ano), quando o arquivo cobre mais de um mês.
7. **Histórico** — DREs salvas no navegador (localStorage), com
   comparação lado a lado entre duas, e sincronização opcional com um
   arquivo JSON dentro de um repositório do GitHub (ver seção abaixo).
8. **CPC 51** — a mesma DRE na estrutura que passa a valer em 2027, com a
   prova de que o lucro líquido não muda, e um plano de ação com o
   cronograma de implementação (ver seção abaixo).

## CPC 51 — a DRE que entra em 2027

O CPC 51 (versão brasileira do IFRS 18) vale para exercícios iniciados em
**1º de janeiro de 2027**, com 2026 reapresentado como comparativo. A
demonstração do resultado passa a ter cinco categorias — operacional,
investimento, financiamento, tributos sobre o lucro e operações
descontinuadas — e dois subtotais obrigatórios: **resultado operacional**
e **resultado antes do financiamento e dos tributos sobre o lucro**. O
"não operacional" deixa de existir: o operacional vira a categoria
residual.

A aba **Demonstração CPC 51** monta essa estrutura a partir do mesmo
razão (ou balancete) já importado:

- **Prova de que o resultado não mudou** — lucro líquido na estrutura
  atual, na do CPC 51 e a diferença entre os dois, que precisa ser zero.
  É a confirmação que o cronograma exige antes de reapresentar qualquer
  demonstração.
- **Ponte do operacional** — o lucro líquido não muda, mas o resultado
  operacional muda. A ponte mostra, agrupado pelo motivo, o que saiu para
  investimento ou financiamento e o que entrou porque o não operacional
  acabou.
- **Política contábil** — quem tem como atividade principal investir em
  ativos ou financiar clientes apresenta aquele resultado dentro do
  operacional. São duas caixas de seleção que mudam a demonstração na
  hora e saem registradas na planilha exportada.
- **Contas que pedem atenção** — o app aponta contas que agregam
  naturezas diferentes (movimentam os dois sentidos, ou têm histórico que
  discorda da categoria), que é o que precisa virar subconta no plano.
- **MPDA** — se a empresa divulga EBITDA ou "resultado recorrente", o
  CPC 51 passa a exigir nota explicativa com conciliação. O app calcula a
  medida, mostra a conciliação e gera a minuta da nota. Os efeitos
  tributário e de não controladores por item saem como lacuna a
  preencher: são dados que o app não tem, e publicar zero ali seria
  afirmar o que ninguém apurou.
- **Exportação** — um Excel com seis abas (DRE CPC 51, DFs paralelas,
  Conciliação, De-Para do plano de contas, MPDA e Política), mais o
  De-Para em CSV avulso para quem vai parametrizar o ERP.

A aba **Plano de ação** traz o cronograma de implementação inteiro — dez
fases, 49 passos e os entregáveis de cada uma, com prazos em dias e
indicação de quais passos este app já executa. O andamento fica salvo no
navegador e não é apagado pelo botão "Limpar tudo": ali não há dado
financeiro, só o estado do projeto.

## Sincronização com GitHub (salvamento em nuvem simples)

O histórico de DREs pode ser sincronizado com um arquivo JSON dentro de
um repositório do GitHub, usando a própria API de Conteúdo do GitHub —
sem precisar de servidor: o navegador fala direto com `api.github.com`.

Na aba **7 · Histórico**, em "Sincronização com GitHub", preencha:
- usuário/organização e nome do repositório
- branch (padrão `main`)
- caminho do arquivo (padrão `data/historico.json`)
- um token do GitHub

**Sobre o token:** crie um [fine-grained personal access
token](https://github.com/settings/personal-access-tokens), restrito
só a este repositório, com permissão de **Contents: Read and write**.
Nunca use um token clássico com acesso à conta inteira — o token fica
salvo no `localStorage` do navegador, então quanto mais restrito, melhor.

Ao clicar em "Sincronizar agora", o app busca o que já está no
repositório, mescla com o que está só no navegador atual (sem perder
nada de nenhum dos dois lados) e grava o resultado de volta — tanto
localmente quanto no GitHub. Isso dá um jeito rápido de ter o mesmo
histórico em mais de um navegador/computador, sem montar um backend de
verdade.

## Sessão salva no navegador

O trabalho em andamento (razão importado, mapeamento de colunas,
classificações, empresa/CNPJ e filtros) fica guardado no próprio
navegador, em IndexedDB — então fechar a aba ou recarregar a página não
faz perder a importação. Nada é enviado para lugar nenhum.

Como isso deixa dados financeiros gravados na máquina, há um botão
**"Limpar tudo"** no cabeçalho que apaga a sessão inteira — vale usar ao
terminar, especialmente em computador compartilhado ou de empresa.

## Perfil de classificação

Na etapa 3, "Salvar perfil" gera um arquivo JSON com as classificações
que você fez à mão; "Carregar perfil" aplica esse arquivo a um razão
novo e informa quantas contas daquele arquivo já vieram classificadas.

O perfil guarda **só as decisões** — código da conta → grupo da DRE,
categoria do CPC 51, política contábil e as MPDA divulgadas — e os nomes
das contas. Nenhum valor, nenhum lançamento. Isso é de propósito:
o arquivo pode ser versionado no Git ou levado para outro computador sem
carregar nenhum dado financeiro de cliente.

O mesmo botão aceita também um **perfil de plano de contas**, que liga
faixas de código a grupos da DRE. É assim que o app atende um plano de
contas diferente do que já vem embutido, sem precisar alterar o código.
Um perfil de plano só é aplicado se sua assinatura bater com o plano
importado — aplicar o perfil errado distribuiria os valores de forma
silenciosamente errada.

## DRE comparativa

A aba **Comparativa** mostra a demonstração inteira com uma coluna por
mês, com a análise vertical de cada mês embaixo de cada valor — dá para
comparar a estrutura do resultado, e não só o tamanho. Precisa de um
razão que cubra pelo menos dois meses.

Cada título de seção (Receita Operacional Bruta, Deduções, Despesas
Operacionais, Financeiras, Não Operacionais) traz o total das contas
agrupadas embaixo dele, para quem não conhece a estrutura da DRE de cor
bater o olho e já ver o valor.

## Prova de integridade

No rodapé da DRE, uma linha mostra em reais quanto entrou na
demonstração, quanto ficou de fora e se os dois somados batem com o
movimento das contas de resultado do razão. Antes havia apenas a
contagem de contas ignoradas — número que não diz nada sozinho, já que
12 contas podem ser R$ 3,00 ou R$ 3 milhões.

## Exportação

Na tela da DRE:

- **Baixar Excel** — arquivo `.xlsx` com a demonstração numa aba, as
  contas de cada grupo em outra (com filtro automático) e, quando o razão
  cobre mais de um mês, a comparativa numa terceira. Os números saem como
  número, não como texto, então dá para somar e filtrar em cima.
- **Baixar CSV** — mesma estrutura, para quem prefere texto puro.
- **Imprimir / PDF** — abre a impressão do navegador; em "Destino",
  escolha "Salvar como PDF".

## Painel

A aba **Painel** é a leitura rápida do período:

- **Indicadores** — receita líquida, lucro, margens, EBITDA aproximado e,
  com balancete carregado, liquidez corrente e geral, endividamento,
  capital circulante líquido e imobilização do patrimônio líquido.
- **Estrutura patrimonial em 3D** — Ativo e Passivo + PL como duas torres
  empilhadas que terminam na mesma altura, com o resultado do exercício
  visível do lado direito. Arraste para girar; há um botão "ver de
  frente" e quem usa redução de movimento já recebe a versão plana.
- **Cascata do resultado** — da receita bruta ao lucro líquido, mostrando
  o que cada linha retirou.
- **Evolução mensal** — receita, despesas e lucro por competência.
- **Composição das despesas** — para onde foi o dinheiro, ranqueado.

O painel funciona com só uma das duas fontes e diz qual falta para
completar.

## Duas fontes: balancete e razão

O app aceita as duas, e elas descrevem o mesmo fato de formas
diferentes — o razão soma lançamento a lançamento, o balancete já traz o
movimento somado pela contabilidade. A DRE sai igual pelos dois
caminhos.

**O balancete é a fonte principal** quando traz as contas de resultado
(3 a 7): ele passou pelo fechamento, monta DRE e Balanço de uma vez e
ainda traz o plano de contas junto, dispensando o arquivo separado.

**O razão continua valendo** para o que só ele tem: análise mês a mês
(Comparativa e Horizontal), filtro por centro de custo e detalhe de cada
lançamento. Com os dois carregados, há um seletor de fonte nas etapas
Conferir, Classificar e DRE.

Se o seu balancete vier filtrado apenas nas contas 1 e 2, ele monta o
Balanço mas não a DRE — exporte o mesmo relatório sem filtrar por conta
para o balancete fazer tudo sozinho.

## Balancete de verificação

Se o arquivo carregado for um **balancete de verificação completo** (o
relatório com código hierárquico, saldo anterior, débito, crédito e saldo
atual), o app reconhece sozinho e monta o Balanço Patrimonial inteiro a
partir dele — inclusive sem razão nenhum importado.

A tela tem duas visões:

- **Estrutura** — Ativo de um lado, Passivo + Patrimônio Líquido do
  outro, com Circulante e Não Circulante, para leitura.
- **Balancete completo** — a árvore inteira, expansível, com os cinco
  valores de cada conta, busca e opção de ocultar contas paradas.

No topo, a equação patrimonial: *Ativo = Passivo + PL + Resultado do
exercício*. Um balancete só das contas 1 e 2 não fecha, e não deve
fechar — a diferença entre os dois lados é o resultado do período, que
mora nas contas 3 a 7. Se houver um razão do mesmo período importado, o
app confere esse valor contra o Lucro Líquido da DRE.

## Balancete de abertura

Na aba Balanço dá para carregar um **balancete de abertura**: os saldos
de cada conta no início do período, que o razão sozinho não traz. Sem
ele, o Balanço mostra a movimentação do período; com ele, mostra
abertura + movimentação = saldo final, que é o Balanço de verdade.

Formato: código da conta na primeira coluna e saldo na segunda (devedor
positivo, credor negativo), ou débito e crédito em duas colunas. Aceita
CSV, TXT e Excel.

## Imagem do painel

No Painel, **"Baixar imagem"** gera um PNG com os indicadores, a cascata
do resultado, a evolução mensal e o ranking de despesas — pronto para
anexar num relatório ou compartilhar. **"Salvar no GitHub"** manda a
mesma imagem para o repositório (ver "Arquivos" abaixo), com um aviso de
confirmação a cada uso porque a imagem traz valores financeiros reais.

## Arquivos

A aba **Arquivos** guarda imagens e outros documentos do projeto dentro
do próprio repositório, usando a mesma sincronização com o GitHub já
configurada na aba Histórico — mesmo token, sem serviço novo.

**Importante:** se o repositório for público (o normal de um projeto
publicado no GitHub Pages), todo arquivo enviado aqui fica acessível a
qualquer pessoa, sem login, e continua no histórico do Git mesmo depois
de excluído. A tela avisa isso antes de qualquer envio. Limite de 1 MB
por arquivo.

## Testes

```bash
npm test
```

Testes de `src/lib` com Vitest, usando um razão sintético — rodam em
qualquer máquina, sem precisar de arquivo real. São 198 hoje, e entre
eles está a garantia de que a DRE na estrutura do CPC 51 e a DRE atual
fecham no mesmo lucro líquido.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview   # serve o build local pra conferir
```

Gera `dist/`, estático — dá pra publicar em qualquer host (Vercel,
Netlify, GitHub Pages, etc.).

## Estrutura

```
src/
  lib/                 # lógica pura, sem React — testável isolada
    parse.js           # leitura do CSV, normalização de número/encoding, agregação por conta e competência
    importarArquivo.js # decide entre CSV e Excel pela extensão do arquivo
    importarCSV.js     # importação de CSV em chunks, com progresso real
    importarExcel.js   # importação de Excel (xlsx/xls/xlsm/xlsb/ods) via SheetJS, carregado sob demanda
    classify.js        # sugestão automática de classificação e montagem da DRE
    grupos.js          # os grupos da DRE e o sinal de cada um
    linhasDRE.js       # a estrutura da DRE como dados (rótulos, sinais, cascata)
    balanco.js         # Balanço Patrimonial simplificado (contas 1 e 2)
    balancete.js       # balancete de verificação hierárquico: traz o Balanço pronto
    abertura.js        # balancete de abertura no formato simples (código;saldo)
    indicadores.js     # margens, índices e séries do painel
    imagemPainel.js    # gera o PNG do painel via <canvas>
    cpc51.js           # as cinco categorias do CPC 51, a política de julgamento e a conciliação
    linhasCPC51.js     # a demonstração do CPC 51 como dados (mesma forma de linhasDRE.js)
    mpda.js            # medidas de desempenho definidas pela administração + minuta da nota
    cronograma51.js    # o cronograma de implementação (10 fases, 49 passos) como dado
    planoAcao.js       # andamento do plano de ação (localStorage)
    exportacao.js      # exportação da DRE em CSV e Excel
    exportacaoCPC51.js # Excel de seis abas, De-Para em CSV e a nota de MPDA em texto
    perfil.js          # perfil de classificação (conta → grupo e categoria) em arquivo
    planoPerfil.js     # motor de perfis de plano de contas (código → grupo)
    planos/iesb.js     # o plano de contas do IESB, como dado
    sessao.js          # persistência da sessão em IndexedDB
    historico.js       # histórico local de DREs geradas (localStorage) + sincronização
    githubApi.js       # leitura/gravação de arquivos no repositório via API do GitHub
    useTema.js         # hook de tema claro/escuro (persistido em localStorage)
  components/          # uma tela por arquivo; EtapaCPC51/CategoriasCPC51/
                       # MedidasMPDA/Cronograma51 formam o bloco do CPC 51
  App.jsx              # orquestra o estado e as etapas
  App.css              # design system em variáveis CSS, tema escuro incluso
```

A lógica de parsing e classificação está isolada de React (`src/lib`),
então dá pra testar ou reaproveitar sem montar componente nenhum.

## Como a classificação automática funciona

Cada conta de resultado é testada individualmente contra um texto
"enriquecido": o histórico dos lançamentos + o nome da própria conta no
plano de contas importado + o nome de cada conta **ancestral** no plano
de contas (a conta-síntese que a agrupa, um nível acima, dois níveis
acima etc.). Isso importa porque num plano de contas real é comum a
conta-folha ter um nome genérico e só a conta-síntese algumas casas
acima dizer do que se trata de verdade — por exemplo, uma conta chamada
só "GRADUACAO PRESENCIAL" só fica clara como "devolução de mensalidade"
quando se sabe que ela está dentro de "(-)DEVOLUCOES MENSALIDADES/TAXAS"
duas casas decimais acima.

Sem plano de contas importado, cai num fallback por maioria dentro do
prefixo de 3 dígitos — mais grosseiro, mas que não depende de nome
nenhum, só do histórico dos lançamentos.

## O que ajustar para outro plano de contas

Em `src/lib/classify.js`:
- `GRUPOS` — os itens da DRE e o sinal de cada um.
- Os padrões `PAT_*` — expressões regulares que casam com o texto
  enriquecido de cada conta (histórico + nome + ancestrais) para sugerir
  o grupo (ex.: `MENSALIDADE`, `BOLSA`, `FOPAG`, `FINANCEIR`). Ajuste ou
  adicione termos do seu próprio plano de contas aqui — e preste atenção
  à ORDEM das checagens: padrões mais específicos (ex. IRPJ/CSLL) têm que
  vir antes dos mais genéricos (ex. provisão), porque "PROVISÃO DE IRPJ"
  bate nos dois.
- `sugerirClassificacao` — a lógica de decisão em si, caso os grupos
  mudem de forma mais estrutural.

## Limitações conhecidas

- A leitura de Excel usa o pacote `xlsx` (SheetJS) da versão publicada no
  npm, que tem duas vulnerabilidades conhecidas sem correção nessa
  distribuição (prototype pollution e ReDoS — [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6),
  [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)).
  Como o app roda inteiramente no navegador e só processa arquivos que
  você mesmo escolhe abrir, o risco prático pra uso pessoal é baixo — mas
  não abra planilhas de origem desconhecida nele. A SheetJS publica
  versões corrigidas fora do npm, em cdn.sheetjs.com, caso queira trocar.
- Contas com zero à esquerda armazenadas como número (não texto) numa
  célula do Excel perdem esse zero — comum em qualquer app que lê
  planilhas. Se isso for um problema no seu plano de contas, formate a
  coluna de conta como texto na planilha de origem antes de importar.

## Licença

Uso livre para fins de portfólio/estudo.
