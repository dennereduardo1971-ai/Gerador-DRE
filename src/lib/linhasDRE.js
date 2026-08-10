/* Estrutura da DRE como DADOS, não como JSX.
 *
 * Existe por causa do canal (a cascata): cada linha precisa saber onde o
 * saldo corrente estava antes dela e onde ficou depois, e isso só dá para
 * calcular percorrendo a demonstração em ordem. Ficar aqui, fora do
 * React, tem dois efeitos: dá para testar a soma de cada seção sem
 * renderizar nada, e a DRE comparativa (N competências em colunas)
 * reaproveita exatamente a mesma estrutura de linhas — sem risco de a
 * versão de uma coluna e a de doze divergirem em rótulo ou sinal.
 */

/** Monta a lista de linhas da demonstração como dados, não como JSX
 *  solto. Isso existe por causa do canal: cada linha precisa saber onde
 *  o saldo corrente estava antes dela e onde ficou depois, e isso só dá
 *  pra calcular percorrendo a demonstração em ordem.
 *
 *  Os rótulos, os sinais e as condições de exibição são exatamente os
 *  mesmos de antes — só mudou o formato. */
export function montarLinhas(dre) {
  const b = dre.bal;
  const itens = [
    { t: "secao", lbl: "Receita Operacional Bruta" },
    { t: "l", lbl: "( + ) Receita Bruta com Mensalidades", val: b.REC_MENSALIDADES.total, id: "REC_MENSALIDADES" },
    { t: "l", lbl: "( + ) Receita com Taxas", val: b.REC_TAXAS.total, id: "REC_TAXAS" },
    { t: "sub", lbl: "( = ) Receita Bruta de Serviços", val: dre.receitaBruta },

    { t: "secao", lbl: "Deduções à Receita Operacional" },
    { t: "l", lbl: "( – ) Bolsas / Resoluções", val: -b.DED_BOLSAS.total, id: "DED_BOLSAS" },
    { t: "l", lbl: "( – ) Prouni", val: -b.DED_PROUNI.total, id: "DED_PROUNI" },
    { t: "l", lbl: "( – ) Mensalidades Devolvidas", val: -b.DED_DEVOLUCOES.total, id: "DED_DEVOLUCOES" },
    { t: "l", lbl: "( – ) Descontos / Cancelamentos", val: -b.DED_DESCONTOS.total, id: "DED_DESCONTOS" },
    { t: "l", lbl: "( – ) PIS / COFINS / ISS", val: -b.DED_IMPOSTOS.total, id: "DED_IMPOSTOS" },
    { t: "sub", lbl: "Receita Operacional Líquida", val: dre.receitaLiq },
  ];

  if (b.CUSTOS.contas.length > 0) {
    itens.push({ t: "l", lbl: "( – ) Custos dos Serviços", val: -b.CUSTOS.total, id: "CUSTOS" });
    itens.push({ t: "sub", lbl: "( = ) Resultado Operacional Bruto", val: dre.resultadoOperBruto });
  }

  itens.push({ t: "secao", lbl: "Despesas Operacionais" });
  itens.push({ t: "l", lbl: "Despesas com Pessoal (Fopag)", val: -b.DESP_FOPAG.total, id: "DESP_FOPAG" });
  itens.push({ t: "l", lbl: "Despesas Administrativas", val: -b.DESP_ADM.total, id: "DESP_ADM" });
  if (b.DEPRECIACAO.contas.length > 0)
    itens.push({ t: "l", lbl: "Depreciação / Amortização", val: -b.DEPRECIACAO.total, id: "DEPRECIACAO" });
  if (b.PROVISOES_CONTINGENCIAS.contas.length > 0)
    itens.push({ t: "l", lbl: "Provisões / Reversões Contingências", val: -b.PROVISOES_CONTINGENCIAS.total, id: "PROVISOES_CONTINGENCIAS" });
  if (b.PROVISOES_PCLD.contas.length > 0)
    itens.push({ t: "l", lbl: "Provisões / Reversões PCLD", val: -b.PROVISOES_PCLD.total, id: "PROVISOES_PCLD" });

  itens.push({ t: "secao", lbl: "Receita / Despesas Financeiras" });
  itens.push({ t: "l", lbl: "( + ) Receitas Financeiras", val: b.REC_FIN.total, id: "REC_FIN" });
  itens.push({ t: "l", lbl: "( – ) Despesas Financeiras", val: -b.DESP_FIN.total, id: "DESP_FIN" });
  itens.push({ t: "sub", lbl: "Resultado Operacional", val: dre.resultadoOper });

  if (b.OUTRAS_REC.contas.length > 0 || b.OUTRAS_DESP.contas.length > 0) {
    itens.push({ t: "secao", lbl: "Receitas / Despesas Não Operacionais" });
    itens.push({ t: "l", lbl: "( + ) Receitas Não Operacionais", val: b.OUTRAS_REC.total, id: "OUTRAS_REC" });
    itens.push({ t: "l", lbl: "( – ) Despesas Não Operacionais", val: -b.OUTRAS_DESP.total, id: "OUTRAS_DESP" });
  }

  itens.push({ t: "sub", lbl: "Lucro Antes do Imposto de Renda e Cont. Social", val: dre.antesIR });
  itens.push({ t: "l", lbl: "( – ) IRPJ e CSLL", val: -b.IRPJ_CSLL.total, id: "IRPJ_CSLL" });
  itens.push({ t: "final", lbl: "Lucro Líquido do Exercício", val: dre.liquido });

  totalizarSecoes(itens);
  return { itens, escala: aplicarCascata(itens) };
}

/** Total de cada seção: soma das linhas comuns logo abaixo dela, até a
 *  próxima seção ou subtotal. É a leitura de "bateu o olho no título, já
 *  sei o total" para quem não conhece a estrutura da DRE de cor. */
export function totalizarSecoes(itens) {
  for (let i = 0; i < itens.length; i++) {
    if (itens[i].t !== "secao") continue;
    let soma = 0;
    for (let j = i + 1; j < itens.length && itens[j].t === "l"; j++) soma += itens[j].val;
    itens[i].val = soma;
  }
  return itens;
}

/** A cascata: cada linha comum move o saldo corrente; cada subtotal
 *  reancora no valor autoritativo vindo de quem montou a demonstração,
 *  para o desenho nunca derivar de uma soma própria.
 *
 *  Vive fora de `montarLinhas` porque a demonstração do CPC 51
 *  (`linhasCPC51.js`) é outra estrutura de linhas lendo as mesmas contas:
 *  duas cópias desse laço acabariam divergindo no dia em que uma das duas
 *  ganhasse um tipo de linha novo. */
export function aplicarCascata(itens) {
  let acumulado = 0;
  const pontos = [0];
  for (const it of itens) {
    if (it.t === "l") {
      it.inicio = acumulado;
      acumulado += it.val;
      it.fim = acumulado;
      pontos.push(acumulado);
    } else if (it.t === "sub" || it.t === "final") {
      acumulado = it.val;
      it.nivel = it.val;
      pontos.push(it.val);
    }
  }
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  return max > min ? { min, max } : null;
}
