> Leia antes de mexer em `depara.js`, `DePara.jsx` ou `exportacaoDePara.js` — a tabela de parametrização e o que a torna auditável.

# De-Para — a tabela de parametrização

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

