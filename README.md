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

O perfil guarda **só as decisões** (código da conta → grupo da DRE) e os
nomes das contas — nenhum valor, nenhum lançamento. Isso é de propósito:
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

## Testes

```bash
npm test
```

Testes de `src/lib` com Vitest, usando um razão sintético — rodam em
qualquer máquina, sem precisar de arquivo real.

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
  lib/
    parse.js        # leitura do CSV, normalização de número/encoding, agregação por conta e competência
    importarArquivo.js  # decide entre CSV e Excel pela extensão do arquivo
    importarCSV.js   # importação de CSV em chunks, com progresso real
    importarExcel.js # importação de Excel (xlsx/xls/xlsm/xlsb/ods) via SheetJS, carregado sob demanda
    classify.js     # grupos da DRE e sugestão automática de classificação
    balanco.js       # Balanço Patrimonial simplificado (contas 1 e 2)
    exportCsv.js     # exportação da DRE final em CSV
    useTema.js       # hook de tema claro/escuro (persistido em localStorage)
    historico.js     # histórico local de DREs geradas (localStorage) + sincronização
    githubApi.js     # leitura/gravação de um arquivo no repositório via API do GitHub
  components/
    EtapaImportar.jsx
    EtapaConferir.jsx
    EtapaClassificar.jsx
    EtapaDRE.jsx
    EtapaBalanco.jsx
    EtapaHorizontal.jsx
    EtapaHistorico.jsx
    SincronizacaoGitHub.jsx  # painel de configuração e sincronização
    LinhaDRE.jsx     # linha/seção/detalhe reutilizados na etapa 4
  App.jsx            # orquestra o estado e as etapas
  App.css
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
