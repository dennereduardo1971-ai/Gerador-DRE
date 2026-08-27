> Leia antes de mexer em `cpc51.js`, `linhasCPC51.js`, `mpda.js`, `cronograma51.js` ou nas telas do CPC 51.

# CPC 51 — a estrutura que entra em 2027

O CPC 51 (versão brasileira do IFRS 18) vale para exercícios iniciados
em **1º de janeiro de 2027**, com 2026 reapresentado como comparativo. A
DRE passa a ter **cinco categorias** (operacional, investimento,
financiamento, tributos sobre o lucro, operações descontinuadas) e **dois
subtotais obrigatórios** (resultado operacional; resultado antes do
financiamento e dos tributos sobre o lucro). Some o "não operacional": o
operacional vira a categoria RESIDUAL.

Oito coisas que não devem ser desfeitas por acidente:

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
5. **O layout da demonstração exportada segue o modelo do cliente; as
   LINHAS, não.** A aba "DRE CPC 51" do Excel sai nas colunas do modelo
   que o escritório usa como base — `Categoria CPC 51 | Código |
   Descrição | período | comparativo | AV % | Notas`. Foi adotado o
   layout, porque trocar colunas não muda número nenhum; adotar as
   linhas do modelo ("Receitas de Pós-Graduação", "Custos Acadêmicos"…)
   exigiria remapear conta a conta e perderia a validação centavo a
   centavo. O **código da linha** (`1.1`, `2.3`) nasce em
   `montarLinhas51`: primeiro dígito é a posição fixa da categoria na
   ordem da norma, segundo é a posição na demonstração DAQUELE
   fechamento — é numeração de linha publicada, não código de conta, e
   não serve de chave para ERP. A coluna **Notas sai vazia** (a
   referência é de quem redige) e a **coluna comparativa só é preenchida
   quando existe período anterior de verdade** no arquivo (competência
   filtrada e a anterior presente); fora disso fica em branco, com o
   motivo escrito acima da tabela — comparar "Jan a Jun" com "Mai"
   produziria um número que parece comparativo e não é.
6. **A minuta da nota de MPDA deixa lacuna onde não sabe.** A norma exige
   efeito tributário e de não controladores por item de conciliação; o
   app não tem esses dados. Sai `[__________]`, nunca zero — zero é uma
   afirmação.
7. **A categoria também tem um plano de contas embutido, igual ao
   grupo.** `resolverCategoria` decide em três níveis — manual da sessão
   > `categoriaDoPlano` (exceção conta a conta do plano embutido,
   `cpc51.js`) > padrão do grupo (`MAPA_PADRAO`) — na mesma ordem que
   `grupoDe` já decide o GRUPO (manual > `grupoPorPlano` > texto). Existe
   porque REC_FIN/DESP_FIN/OUTRAS_REC/OUTRAS_DESP misturam natureza por
   desenho: o padrão do GRUPO nunca vai servir para todas as contas dele,
   mas uma vez que alguém julgou cada conta para um cliente (`PLANO_IESB.
   categorias`), essa decisão é permanente — não deveria se perder a cada
   balancete novo. **Ao adicionar uma exceção, lembre de tirar a conta da
   fila de "a revisar"** (`montarDePara`, `coberturaCPC51`) — resolver a
   categoria sem isso deixa a conta classificada certo E ainda pedindo
   revisão todo mês, o que é pior que não ter feito nada. Busca sempre
   EXATA pelo código completo, nunca por prefixo: é dentro do MESMO
   prefixo que convivem contas de natureza diferente (juros de empréstimo
   e tarifa bancária nascem as duas em "421"), e herdar por prefixo
   devolveria a mistura que esta camada existe para desfazer.
8. **A aba "DR_CPC_51_Detalhada" é a mesma demonstração com as contas
   penduradas embaixo de cada tópico, recolhidas.** Usa o agrupamento de
   linhas do Excel (`outlineLevel` + `hidden`, o mesmo recurso da aba
   "Resumo" do De-Para), NUNCA colunas próprias para a conta: tópico e
   conta compartilham a mesma coluna de código, descrição e valor — já
   houve uma versão com colunas separadas, e o valor da conta saía
   deslocado do valor do tópico que ele soma, obrigando a cruzar duas
   tabelas para conferir a composição.

O cronograma de implementação (10 fases, 49 passos, go-live em
jan-fev/2027) está em `cronograma51.js` e aparece na aba "Plano de ação",
com o andamento em localStorage. Ele sobrevive a "Limpar tudo" de
propósito: não guarda dado financeiro nenhum, e é do escritório, não do
arquivo aberto.

