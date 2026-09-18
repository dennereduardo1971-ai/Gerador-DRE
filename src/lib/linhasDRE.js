/* Estrutura da DRE como DADOS, não como JSX.
 *
 * Existe por causa do canal (a cascata): cada linha precisa saber onde o
 * saldo corrente estava antes dela e onde ficou depois, e isso só dá para
 * calcular percorrendo a demonstração em ordem. Ficar aqui, fora do
 * React, tem dois efeitos: dá para testar a soma de cada seção sem
 * renderizar nada, e a DRE comparativa (N competências em colunas)
 * reaproveita exatamente a mesma estrutura de linhas — sem risco de a
 * versão de uma coluna e a de doze divergirem em rótulo ou sinal.
 *
 * TRÊS TIPOS DE LINHA MOVEM O SALDO E UM NÃO MOVE. `l` (linha comum),
 * `sub` e `final` são a demonstração; `mod` é a quebra da linha de cima
 * em Presencial / EAD / Comum (ver `modalidade.js`). A faixa `mod` é
 * DETALHE de uma linha que já foi somada, então ela não entra na
 * cascata nem no total da seção — somá-la contaria o mesmo dinheiro
 * duas vezes. `totalizarSecoes` e `aplicarCascata` sabem disso, e é a
 * única coisa que um tipo de linha novo precisa acertar aqui.
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

  /* Uma linha da DRE e, logo abaixo, as faixas de modalidade dela —
     quando o grupo tem alguma conta com modalidade declarada.
     `orientacao` é o sinal com que a linha é APRESENTADA (receita soma,
     dedução e despesa aparecem negativas): as faixas usam exatamente o
     mesmo, senão a soma delas não bateria com o número impresso acima. */
  const linha = (id, lbl, orientacao = 1) => {
    const g = b[id];
    const saida = [{ t: "l", lbl, val: orientacao * g.total, id, chave: id }];
    (g.faixas || []).forEach((f) =>
      saida.push({
        t: "mod", lbl: f.nome, val: orientacao * f.total,
        id, mod: f.id, chave: `${id}|${f.id}`,
      })
    );
    return saida;
  };

  const itens = [
    { t: "secao", lbl: "Receita Operacional Bruta" },
    ...linha("REC_MENSALIDADES", "( + ) Receita Bruta com Mensalidades"),
    ...linha("REC_TAXAS", "( + ) Receita com Taxas"),
    { t: "sub", lbl: "( = ) Receita Bruta de Serviços", val: dre.receitaBruta },

    { t: "secao", lbl: "Deduções à Receita Operacional" },
    ...linha("DED_BOLSAS", "( – ) Bolsas / Resoluções", -1),
    ...linha("DED_PROUNI", "( – ) Prouni", -1),
    ...linha("DED_DEVOLUCOES", "( – ) Mensalidades Devolvidas", -1),
    ...linha("DED_DESCONTOS", "( – ) Descontos / Cancelamentos", -1),
    ...linha("DED_IMPOSTOS", "( – ) PIS / COFINS / ISS", -1),
    { t: "sub", lbl: "Receita Operacional Líquida", val: dre.receitaLiq },
  ];

  if (b.CUSTOS.contas.length > 0) {
    itens.push(...linha("CUSTOS", "( – ) Custos dos Serviços", -1));
    itens.push({ t: "sub", lbl: "( = ) Resultado Operacional Bruto", val: dre.resultadoOperBruto });
  }

  itens.push({ t: "secao", lbl: "Despesas Operacionais" });
  itens.push(...linha("DESP_FOPAG", "Despesas com Pessoal (Fopag)", -1));
  itens.push(...linha("DESP_ADM", "Despesas Administrativas", -1));
  if (b.DEPRECIACAO.contas.length > 0)
    itens.push(...linha("DEPRECIACAO", "Depreciação / Amortização", -1));
  if (b.PROVISOES_CONTINGENCIAS.contas.length > 0)
    itens.push(...linha("PROVISOES_CONTINGENCIAS", "Provisões / Reversões Contingências", -1));
  if (b.PROVISOES_PCLD.contas.length > 0)
    itens.push(...linha("PROVISOES_PCLD", "Provisões / Reversões PCLD", -1));

  itens.push({ t: "secao", lbl: "Receita / Despesas Financeiras" });
  itens.push(...linha("REC_FIN", "( + ) Receitas Financeiras"));
  itens.push(...linha("DESP_FIN", "( – ) Despesas Financeiras", -1));
  itens.push({ t: "sub", lbl: "Resultado Operacional", val: dre.resultadoOper });

  if (b.OUTRAS_REC.contas.length > 0 || b.OUTRAS_DESP.contas.length > 0) {
    itens.push({ t: "secao", lbl: "Receitas / Despesas Não Operacionais" });
    itens.push(...linha("OUTRAS_REC", "( + ) Receitas Não Operacionais"));
    itens.push(...linha("OUTRAS_DESP", "( – ) Despesas Não Operacionais", -1));
  }

  itens.push({ t: "sub", lbl: "Lucro Antes do Imposto de Renda e Cont. Social", val: dre.antesIR });
  itens.push(...linha("IRPJ_CSLL", "( – ) IRPJ e CSLL", -1));
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
    /* A faixa de modalidade é DETALHE da linha logo acima, não uma linha
       nova: ela se pula (`continue`), não se soma nem interrompe o
       bloco. Com `while (t === "l")`, como era antes de existir a
       quebra por modalidade, a primeira faixa cortava a seção e o total
       do título passava a mostrar só a primeira linha. */
    for (let j = i + 1; j < itens.length; j++) {
      const t = itens[j].t;
      if (t === "mod") continue;
      if (t !== "l") break;
      soma += itens[j].val;
    }
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
    // `mod` não move o saldo corrente: o dinheiro dela já andou na
    // linha de cima. Cai fora dos dois ramos de propósito.
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
