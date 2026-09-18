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


## O terceiro eixo na tabela

Além de grupo da DRE e categoria do CPC 51, cada linha traz a
**modalidade** (Presencial / EAD / Comum) e a origem dela — "manual",
"nome no plano" ou "sem modalidade". O seletor tem a mesma mecânica do
de categoria: vazio significa "siga o nome do plano de contas", e o
texto da opção mostra qual é esse padrão.

**Comum não é pendência.** A despesa administrativa da instituição
inteira é comum de verdade; contá-la como trabalho a fazer encheria o
placar de tarefa que não existe. Por isso a modalidade não entra em
`pendente` — ela tem filtro próprio ("Sem modalidade (comum)"), para
quem quiser varrer as comuns atrás de uma que deveria estar segregada.

As colunas da exportação são derivadas de `COLUNAS` / `COLUNAS_RESUMO`,
nunca de índice cravado: a coluna de Modalidade entrou no meio do
resumo e um `6` fixo passaria a formatar a célula de texto ao lado.


## A tela onde se renomeia

O De-Para acumulou um quarto papel: é onde se muda o NOME de tudo.

- **O nome da conta** é um campo na própria linha, com o nome do plano
  como `placeholder` e, quando os dois diferem, à vista embaixo ("no
  plano: ..."). Campo vazio volta ao nome do plano.
- **O resto** (modalidades e seus termos, nomes de grupo, seções,
  subtotais e categorias do CPC 51) fica no painel `EditorNomes`, no topo
  da tela, em blocos recolhíveis.

Por que aqui e não na DRE: a DRE é a tela que se imprime e se assina, e
campo de texto no meio dela convida a editar enquanto se confere — um
clique errado vira rótulo trocado num documento que saiu para fora. O
De-Para já era a tela de cadastro.

Regra que não se afrouxa: **nenhum campo desta tela muda valor.** Ver
`.claude/docs/nomes.md`.
