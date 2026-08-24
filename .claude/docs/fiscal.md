> Leia antes de mexer em `fiscal.js`, `EtapaFiscal.jsx`, `useFiscal.js` ou `exportacaoFiscal.js`.

# Apuração fiscal — LALUR e PIS/COFINS

A aba **Fiscal → Apuração** responde uma pergunta só: *o imposto que a
contabilidade lançou está certo?* Ela recalcula PIS, COFINS, IRPJ e CSLL
a partir da mesma DRE que o app monta e confronta com o que está na
demonstração. A entrega é a **divergência**, no mesmo espírito da prova
de integridade da DRE.

**Por que isso cabe no escopo.** O projeto é a DRE e a transição para o
CPC 51, e o fiscal entrou em 24/08/2026 porque justifica **duas linhas da
própria demonstração**: Deduções da Receita (PIS/COFINS/ISS) e IRPJ/CSLL.
Não é um módulo fiscal genérico, e a pergunta-filtro do escopo continua
valendo para qualquer coisa que se queira acrescentar aqui.

## Confere, não apura

Está escrito na tela e **dentro do Excel exportado**, porque a planilha
circula sozinha: guia, saldo a compensar, período de recolhimento e
obrigação acessória continuam sendo do sistema fiscal. Um arquivo que
parece apuração oficial e não é seria pior que arquivo nenhum.

## Seis decisões que não devem ser desfeitas

1. **Nada aqui decide para onde uma conta vai.** A resolução continua em
   `classify.js` e `cpc51.js`; `fiscal.js` lê a DRE pronta. Uma terceira
   verdade sobre o destino de uma conta é exatamente o que o De-Para
   existe para impedir.

2. **Onde o app não sabe, ele não afirma.** A proporção do PROUNI sai
   marcada **ESTIMADA**; cada adição sugerida nasce **não confirmada** e
   carrega o motivo. É a mesma doutrina do `[__________]` da nota de
   MPDA — e é por isso que `confiavel` existe nos dois resultados.

3. **Sugestão não entra na soma até ser aceita.** `sugerirAjustes` propõe
   olhar as provisões e a depreciação; somá-las por padrão produziria um
   lucro real que *parece* calculado e é um chute sobre a dedutibilidade
   de cada uma. Enquanto houver ajuste pendente, `lalur.confiavel` é
   falso e a tela diz que a apuração está incompleta.

4. **`DED_IMPOSTOS` mistura PIS, COFINS e ISS numa linha só.** Confrontar
   o grupo inteiro com PIS + COFINS daria divergência sempre, com o ISS
   escondido lá dentro. O bloco traz um **De-Para curto de tributos**,
   sugerido pelo nome da conta, corrigível, com a coluna de origem da
   decisão. Enquanto houver conta "a confirmar", `pisCofins.confiavel` é
   falso: aquele valor pode ser PIS, COFINS ou ISS, e cada hipótese dá
   uma divergência diferente.

   **`SOBRE SERVIÇO` não identifica o ISS.** É a frase que os três
   tributos usam no plano de contas — inclusive a própria conta-síntese
   `(-)IMPOSTOS E CONTRIB. S/SERVIÇOS`. Com ela no padrão, a síntese
   genérica virava ISS e o valor saía do confronto sem ninguém ver. O
   nome do tributo, ou nada.

5. **Bolsas e PROUNI não são exclusão de base.** Devoluções e descontos
   incondicionais são: aquela receita não existiu. Bolsas e PROUNI
   definem a **proporção isenta** da receita da mantida — tratá-las como
   exclusão reduziria a base duas vezes. E a isenção reduz o **devido**,
   não a base, do lado do IRPJ/CSLL.

6. **Valor não entra em perfil.** `params` (regime, alíquotas, adesão ao
   PROUNI, periodicidade) e `mapaTributos` são **decisão** e viajam no
   perfil, que continua podendo ser versionado no Git. **Prejuízo fiscal
   e base negativa de CSLL são valores** de uma empresa identificada:
   ficam só na sessão em IndexedDB e saem no "Limpar tudo". Há teste
   provando que eles não aparecem no JSON do perfil.

## A matemática, e onde ela pode mudar

| Peça | Regra |
|---|---|
| Base de PIS/COFINS | receita bruta − devoluções − descontos incondicionais |
| Cumulativo | PIS 0,65% · COFINS 3% |
| Não cumulativo | PIS 1,65% · COFINS 7,6% — **os créditos NÃO são calculados aqui** |
| Lucro real | lucro antes do IR + adições − exclusões − compensação |
| Compensação | limitada a **30%** do lucro ajustado (Lei 8.981/95, art. 42) |
| IRPJ | 15% do lucro real |
| Adicional | 10% sobre o que exceder R$ 20.000 **por mês** de período de apuração |
| CSLL | 9% |
| Presumido | base = 32% da receita bruta; **não há LALUR** |
| PROUNI | reduz o devido na proporção estimada da receita isenta |

O adicional multiplica o limite por `mesesDoPeriodo(periodicidade)` — 1,
3 ou 12. Trocar a periodicidade sem trocar o arquivo carregado produz um
número errado, e é a próxima coisa a proteger se o bloco crescer.

**Alíquota é parâmetro editável, não constante cravada.** Trocar o regime
repõe as de PIS e COFINS; as demais ficam como o usuário deixou. Quem
edita uma alíquota registra o motivo fora do app — o app não tem onde
guardar isso e não deve fingir que tem.

## O que este bloco NÃO faz

- Não apura crédito de PIS/COFINS no regime não cumulativo.
- Não tem LALUR Parte B (controle de diferenças temporárias no tempo).
- Não gera guia, não controla saldo a recolher nem obrigação acessória.
- Não sabe a proporção oficial do PROUNI — ela vem do termo de adesão.

## Arquivos

| Arquivo | O que é |
|---|---|
| `lib/fiscal.js` | toda a lógica, pura e testável sem React |
| `hooks/useFiscal.js` | o estado: parâmetros, ajustes, prejuízo, sessão |
| `components/EtapaFiscal.jsx` | a tela, em três blocos |
| `lib/exportacaoFiscal.js` | o Excel de cinco abas |
| `lib/__tests__/fiscal.test.js` | 37 testes, inclusive sobre o arquivo gerado |
