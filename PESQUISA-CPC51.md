# Pesquisa CPC 51 — o que a norma exige e o que falta no app

Levantamento de 20/08/2026, a partir de fontes públicas (CFC, CVM,
CPC, IASB e publicações técnicas de KPMG, EY, PwC, BDO, Grant
Thornton e RSM). Versão de leitura publicada como artefato.

**Limite honesto deste documento:** o texto oficial do CPC 51 /
NBC TG 51 **não foi lido**. O ambiente da sessão bloqueia o acesso
direto a `cpc.org.br`, `cfc.org.br`, `gov.br/cvm` e `ifrs.org`. Tudo
aqui vem de fonte secundária confiável — mas **nenhum número de item
citado abaixo deve ir para papel de trabalho sem conferência contra o
texto publicado no DOU de 22/12/2025.**

## 1. Status regulatório — a norma saiu de minuta

| Data | Ato |
|---|---|
| jul–set/2025 | Audiência pública conjunta CPC + CFC + CVM (comentários até 12/9/2025) |
| 13/11/2025 | **NBC TG 51** aprovada pelo CFC |
| 22/12/2025 | Publicação no **DOU**, edição 243, seção 1 |
| 24/12/2025 | **Resolução CVM 237** — obrigatória para companhias abertas em exercícios iniciados em ou após 1º/1/2027; revoga as Resoluções CVM 106 e 156 |
| 24/12/2025 | **Resolução CVM 238** — ajusta as demais normas afetadas |

Substitui o **CPC 26 (R1)**. Alcança toda entidade que elabora
demonstrações pelo conjunto de pronunciamentos do CPC — aberta ou
fechada, incluindo sociedade de grande porte.

O `CLAUDE.md` e `cpc51.js` falam de "CPC 51" sem citar o ato que o
tornou obrigatório. Corrigir isso é a mudança de menor esforço do
levantamento inteiro.

## 2. O relógio

2026 é o exercício comparativo, e está correndo. Balanço de abertura
do comparativo: 1º/1/2026 (saldos de 31/12/2025). Vale também para as
**intermediárias**: as condensadas do 1º trimestre de 2027 já saem no
formato novo, com 2026 reapresentado.

## 3. Estrutura — confirmada, e já implementada

Cinco categorias (operacional residual, investimento, financiamento,
tributos sobre o lucro, descontinuadas) e dois subtotais obrigatórios
(resultado operacional; resultado antes do financiamento e dos
tributos sobre o lucro). Nada divergiu do que `cpc51.js` já faz.

Dois detalhes que a leitura rápida perde:

- **O rótulo da categoria não precisa aparecer na face** — o que a
  norma exige são os subtotais.
- ISS, PIS e COFINS sobre receita **não** são "tributos sobre o
  lucro": ficam em operacional. (Já está certo no app.)

## 4. Regras de classificação que o motor não conhece

| Item | Categoria | Situação |
|---|---|---|
| **Equivalência patrimonial** | Investimento, **sempre** — a única regra sem exceção da norma, nem para quem tem investir como atividade principal | falta |
| **Diferença de câmbio** | Mesma categoria do item que a originou. A dispensa por "custo ou esforço excessivo" tem limiar alto e não se justifica só por exigir mudança de sistema | falta |
| **Derivativo** | Mesma categoria do risco gerenciado, salvo se exigir abrir ganhos/perdas em bruto | falta |
| **Juro de arrendamento (CPC 06)** | Financiamento (a depreciação do direito de uso continua operacional) | falta |
| Rendimento de caixa e aplicações | Investimento | já (REC_FIN) |
| Juros/multa de mora de aluno | Operacional | parcial (detector de contas mistas) |
| Tarifa bancária, IOF corrente | Operacional | já (texto de DESP_FIN) |

## 5. Atividade principal é FATO, não declaração

A literatura é explícita: ter atividade principal especificada é
"a matter of fact rather than an assertion". Depende de julgamento
sobre fatos e circunstâncias, e a norma dá um teste prático — é
provável que seja atividade principal quando a entidade usa, como
indicador importante de desempenho, um subtotal que inclui aqueles
resultados.

`POLITICA_PADRAO` chama isso de "política contábil" e oferece dois
booleanos. O ajuste é textual: é julgamento sobre fatos, documentado
em política, não criado por ela — e falta um campo de **justificativa**
por interruptor, que viaje no perfil e saia na planilha.

## 6. Agregação, desagregação e rotulagem — requisito inteiro sem cobertura

- Agregar por características **compartilhadas**; desagregar pelas
  **não compartilhadas**.
- A linha da face é resumo: é normal conter itens dissimilares, o que
  em geral torna a desagregação em nota necessária.
- **"Outros" é desencorajado.** Exige avaliar se há rótulo mais
  informativo (nomear pelo item material costuma resolver). Sem rótulo
  melhor, usar o mais preciso possível ("outras despesas
  operacionais") e abrir em nota se material.
- Agregação só de imateriais precisa ser aberta se for grande a ponto
  de o leitor duvidar que não haja nada material dentro.

Vira checagem mecânica no app, no mesmo formato de `contasMistas`.

## 7. Natureza × função × misto — e a nota das cinco naturezas

A análise das despesas operacionais passa a ser exigida **na face**,
por natureza, por função ou nas duas bases. Cada linha,
individualmente, agrega em **uma** base só. A escolha é a que der o
"resumo estruturado mais útil".

**A DRE do IESB já é mista:**

| Linha | Base |
|---|---|
| Custo dos Serviços | função |
| Despesas com Pessoal (Fopag) | natureza |
| Despesas Administrativas | função |
| Depreciação e Amortização | natureza |
| Provisões / PCLD | natureza |

Quem apresenta por função ou em base mista deve divulgar em **nota
única** cinco despesas por natureza: depreciação, amortização,
benefícios a empregados, perdas por redução ao valor recuperável e
reversões, baixas de estoque e reversões. Mais a descrição qualitativa
do que compõe cada linha por função.

O app tem os dados: folha docente + administrativa = benefícios a
empregados; depreciação já é grupo; PCLD é o impairment de recebíveis;
baixa de estoque não se aplica — e dizer isso por escrito é melhor que
omitir.

Vigilância: em abr/2026 o IFRIC analisou exatamente a fronteira desse
assunto (desagregar despesas de mesma natureza entre linhas por
natureza e por função) e concluiu que a norma já dá base suficiente,
sem novo projeto normativo. É julgamento documentado, não regra
fechada.

## 8. MPDA — o que falta

- **Efeito tributário e efeito sobre não controladores item a item**,
  mais a explicação de *como* foram determinados (alíquota estatutária,
  rateio pro rata ou outro método que informe melhor). Hoje sai como
  lacuna — honesto, mas incompleto.
- A norma quer **nota única** com todas as medidas; a exportação hoje
  tende a uma seção por medida.
- **Mudança de cálculo entre períodos** precisa ser explicada; o app
  não guarda histórico da definição.
- **CPC 41/IAS 33 foi alterado junto:** resultado por ação adicional só
  pode ser divulgado **em nota**, nunca na face, e só se o numerador
  for total/subtotal da norma ou uma MPDA. Cabe como aviso na tela.

## 9. Transição — a exigência que o app atende pela metade

A norma se aplica retrospectivamente. Para o **período comparativo**,
exige-se **conciliação entre os valores reapresentados e os
anteriormente apresentados** sob a norma antiga — inclusive nos
comparativos das intermediárias. Em compensação, dispensa-se a
informação quantitativa que o CPC 23/IAS 8 normalmente exigiria.

Ou seja: a peça central da transição é literalmente uma tabela
"de onde veio → para onde foi", **linha a linha**, que fecha.
`conciliar()` faz a ponte só do resultado operacional, agrupada por
motivo, e prova que o lucro líquido não muda. Falta a conciliação
linha a linha da DRE do CPC 26 para a do CPC 51, exportável, com a
coluna de origem da decisão. É o entregável da Fase 7.

## 10. Fora da DRE (não virar tela, mas registrar)

- **DFC:** no método indireto o ponto de partida passa a ser o
  **resultado operacional**. Acabam as opções: sem atividade principal
  especificada, juros e dividendos recebidos → investimento; pagos →
  financiamento, em correspondência direta com a categoria da DRE.
  É o melhor argumento de venda do De-Para: a mesma decisão monta duas
  demonstrações.
- **Balanço:** goodwill em linha própria, separado dos demais
  intangíveis.
- Resultado abrangente, DMPL, notas e IFRS 19 também são alcançados.

## 11. Brasil

Adaptações do CPC 51 sobre a IFRS 18 (itens a conferir no texto
oficial): **10(h)** inclui a DVA quando legalmente exigida; **12A**
lembra que a lei societária exige a DR como peça separada; **29A**
exercício social de 12 meses; **109A** composição do PL; mais ajustes
no nome do Balanço Patrimonial e na ordem das contas. **A DVA
continua.**

**Efeito fiscal direto: não há.** O CPC 51 não altera reconhecimento
nem mensuração — é apresentação e divulgação. O lucro societário não
muda em essência e as adições/exclusões do lucro real seguem as
mesmas. O que exige atenção é a amarração: **ECF** e conciliação com
e-Lalur/e-Lacs.

**A confirmar, não afirmar:** fontes secundárias indicam que a prática
de *registrar* receita bruta e deduções em contas e *apresentar* a DRE
a partir da receita líquida acomoda lei societária e legislação
tributária. Se confirmado no texto, a cascata "Receita Bruta −
Deduções" pode precisar virar **opção de apresentação** na tela do
CPC 51, não estrutura fixa. **Não mexer com base nesta pesquisa.**

## 12. Vigilância normativa

Entre nov/2025 e abr/2026 o IFRIC tratou de ao menos três questões de
IFRS 18 (14ª compilação de agenda decisions): escopo da divulgação de
despesas por natureza (concluída em abr/2026, sem projeto normativo);
classificação de ganhos/perdas em derivativo que gerencia exposição
cambial; diferença cambial de passivo/ativo monetário intragrupo.

Consequência para o app: as regras de classificação são **dado**, não
código — como já são o plano de contas e o cronograma. Decisão do
IFRIC deve virar edição de tabela, não refatoração.

## 13. Fila proposta (valor por esforço)

1. **Conciliação de transição linha a linha** — estender `conciliar()`
   da ponte do operacional para a tabela completa CPC 26 → CPC 51, com
   motivo e origem da decisão, exportável. Exigência literal da norma
   e entregável da Fase 7. Reaproveita `montarLinhas` e
   `montarLinhas51`; sem motor novo.
2. **Nota das cinco naturezas + diagnóstico natureza/função** — um
   terceiro eixo por grupo, como dado, no formato de `MAPA_PADRAO`. A
   DRE do cliente principal é mista, então a nota é obrigatória para
   ele.
3. **As quatro regras de classificação que faltam** (seção 4). A de
   equivalência patrimonial merece ser a única regra dura do motor.
4. **Referência normativa nos exportáveis e na tela** — NBC TG 51
   (13/11/2025, DOU 22/12/2025), Resolução CVM 237/2025, vigência
   1º/1/2027, comparativo 2026. Uma linha, três exportações.
5. **Diagnóstico de agregação e rotulagem** (seção 6), no formato de
   `contasMistas`.
6. **Política de atividade principal: fato, com justificativa**
   (seção 5). Quase todo textual.
7. **Efeito tributário por item de MPDA** — já era backlog; a pesquisa
   acrescenta a nota única e o aviso do CPC 41.
8. **Revisar as datas do cronograma** — `cronograma51.js` foi escrito
   quando a norma era minuta. Conferir se as fases 1 a 4 deveriam
   aparecer atrasadas em ago/2026.

## 14. O que não trazer

DFC e Balanço no formato CPC 51 (o Balanço foi removido de propósito),
DMPL, resultado abrangente, IFRS 19, DVA — e qualquer painel ou
gráfico montado sobre as categorias novas. A pergunta continua sendo
"isto serve à DRE ou à transição?".
