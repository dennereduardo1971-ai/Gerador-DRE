> Leia antes de mexer em qualquer `exportacao*.js`, em `excelEstilo.js` ou no CSS de impressão.

# Exportação

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

## Duas bibliotecas de planilha, cada uma fazendo a metade que sabe fazer

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

