> Leia antes de mexer em `balancete.js` ou na etapa Importar — o formato do relatório `ctbr041` e as armadilhas que ele esconde.

# Balancete de verificação

`balancete.js` lê o relatório que o sistema contábil emite de verdade
(`ctbr041`): código pontuado em vários níveis, saldo anterior, débito,
crédito, movimento e saldo atual, com a natureza indicada por "D"/"C" no
fim do número. Quando esse formato é reconhecido, ele vira a FONTE da
DRE e o razão passa a ser a contraprova — não o contrário. **Só esse
formato entra**: o `código;saldo` simples existia para dar abertura ao
Balanço Patrimonial, tela que o app não tem mais, e aceitá-lo agora
seria aceitar um arquivo que não produz nada.

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
  importação.** Um arquivo assim, filtrado em 1 e 2, simplesmente não
  monta a DRE — e a tela diz isso em vez de mostrar demonstração zerada.
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
  **Essa é a validação mais forte que o arquivo permite**, e por isso ela
  sai por escrito no aviso da importação: se os dois caminhos não batem, o
  arquivo tem problema antes de qualquer classificação.

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
| DRE | sim, e já fechada | sim, somada pelo app |
| Plano de contas | vem junto | arquivo separado |
| Competência mês a mês | não (retrato de um período) | sim |
| Centro de custo | não | sim |
| Lançamento individual | não | sim |
| Confiabilidade | fechado pela contabilidade | somado pelo app |

Por isso a Comparativa e o filtro de centro de custo continuam dependendo
do razão, e `FonteDados.jsx` diz isso na tela antes de alguém trocar de
fonte sem entender o que perde.

**Balancete filtrado.** `coberturaBalancete()` detecta quais dígitos raiz
o arquivo traz. O relatório típico de fechamento patrimonial vem filtrado
só em 1 e 2 — aí ele NÃO monta a DRE, e a tela explica que basta exportar
o mesmo relatório sem filtrar por conta.

**O balancete traz o plano de contas de graça.** `nomesDoBalancete()`
devolve código → descrição de todas as contas, sintéticas inclusive. Como
a classificação por código reconhece o plano pela ASSINATURA (nome das
contas-síntese de topo), carregar o balancete dispensa o arquivo separado
de plano de contas. Em `App.jsx`, `nomesEfetivos` põe os nomes do
balancete por baixo dos importados à mão — o usuário mantém a última
palavra.

