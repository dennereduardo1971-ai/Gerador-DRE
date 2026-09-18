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

import { nomeDoGrupo, rotuloDaLinha } from "./rotulos.js";

/* AS LINHAS ESTRUTURAIS — seções e subtotais, que não pertencem a grupo
 * nenhum e por isso precisam de id próprio para poderem ser renomeadas
 * (`rotulos.js`). O id é a CHAVE: ele viaja na sessão e no perfil, então
 * mudar um id aqui apaga o apelido que alguém já tinha dado àquela linha.
 *
 * As linhas de GRUPO não estão nesta lista de propósito: o nome delas é o
 * nome do próprio grupo (`nomeDoGrupo`), e é o mesmo texto que aparece no
 * De-Para e nas exportações. Renomear "Bolsas / Resoluções" num lugar e
 * não no outro é como o arquivo entregue passa a divergir da tela. */
export const LINHAS_ESTRUTURAIS = [
  { id: "SEC_RECEITA_BRUTA", padrao: "Receita Operacional Bruta" },
  { id: "SUB_RECEITA_BRUTA", padrao: "( = ) Receita Bruta de Serviços" },
  { id: "SEC_DEDUCOES", padrao: "Deduções à Receita Operacional" },
  { id: "SUB_RECEITA_LIQUIDA", padrao: "Receita Operacional Líquida" },
  { id: "SUB_RESULTADO_BRUTO", padrao: "( = ) Resultado Operacional Bruto" },
  { id: "SEC_DESPESAS", padrao: "Despesas Operacionais" },
  { id: "SEC_FINANCEIRO", padrao: "Receita / Despesas Financeiras" },
  { id: "SUB_RESULTADO_OPER", padrao: "Resultado Operacional" },
  { id: "SEC_NAO_OPER", padrao: "Receitas / Despesas Não Operacionais" },
  { id: "SUB_ANTES_IR", padrao: "Lucro Antes do Imposto de Renda e Cont. Social" },
  { id: "FINAL_LIQUIDO", padrao: "Lucro Líquido do Exercício" },
];

const PADRAO_LINHA = Object.fromEntries(LINHAS_ESTRUTURAIS.map((l) => [l.id, l.padrao]));

/** Monta a lista de linhas da demonstração como dados, não como JSX
 *  solto. Isso existe por causa do canal: cada linha precisa saber onde
 *  o saldo corrente estava antes dela e onde ficou depois, e isso só dá
 *  pra calcular percorrendo a demonstração em ordem.
 *
 *  `rotulos` são os apelidos do usuário (`rotulos.js`). Sem eles, os
 *  rótulos, os sinais e as condições de exibição são exatamente os
 *  mesmos de sempre — há teste travando essa igualdade. */
export function montarLinhas(dre, rotulos = null) {
  const b = dre.bal;

  /* O PREFIXO É DA LINHA, O NOME É DO GRUPO. "( + ) " e "( – ) " dizem o
     que a linha faz na cascata — são estrutura da demonstração, não nome,
     e por isso não entram no que se pode renomear. Colar o prefixo no
     nome editável deixaria o usuário apagar o sinal da própria DRE. */
  const nomeG = (id) => nomeDoGrupo(id, rotulos);
  const estrutural = (id, t, val) => ({ t, id, chave: id, lbl: rotuloDaLinha(id, PADRAO_LINHA[id], rotulos), val });

  /* Uma linha da DRE e, logo abaixo, as faixas de modalidade dela —
     quando o grupo tem alguma conta com modalidade declarada.
     `orientacao` é o sinal com que a linha é APRESENTADA (receita soma,
     dedução e despesa aparecem negativas): as faixas usam exatamente o
     mesmo, senão a soma delas não bateria com o número impresso acima. */
  const linha = (id, prefixo, orientacao = 1) => {
    const g = b[id];
    const saida = [{ t: "l", lbl: prefixo + nomeG(id), val: orientacao * g.total, id, chave: id }];
    (g.faixas || []).forEach((f) =>
      saida.push({
        t: "mod", lbl: f.nome, val: orientacao * f.total,
        id, mod: f.id, chave: `${id}|${f.id}`,
      })
    );
    return saida;
  };

  const itens = [
    estrutural("SEC_RECEITA_BRUTA", "secao"),
    ...linha("REC_MENSALIDADES", "( + ) "),
    ...linha("REC_TAXAS", "( + ) "),
    estrutural("SUB_RECEITA_BRUTA", "sub", dre.receitaBruta),

    estrutural("SEC_DEDUCOES", "secao"),
    ...linha("DED_BOLSAS", "( – ) ", -1),
    ...linha("DED_PROUNI", "( – ) ", -1),
    ...linha("DED_DEVOLUCOES", "( – ) ", -1),
    ...linha("DED_DESCONTOS", "( – ) ", -1),
    ...linha("DED_IMPOSTOS", "( – ) ", -1),
    estrutural("SUB_RECEITA_LIQUIDA", "sub", dre.receitaLiq),
  ];

  if (b.CUSTOS.contas.length > 0) {
    itens.push(...linha("CUSTOS", "( – ) ", -1));
    itens.push(estrutural("SUB_RESULTADO_BRUTO", "sub", dre.resultadoOperBruto));
  }

  itens.push(estrutural("SEC_DESPESAS", "secao"));
  itens.push(...linha("DESP_FOPAG", "", -1));
  itens.push(...linha("DESP_ADM", "", -1));
  if (b.DEPRECIACAO.contas.length > 0) itens.push(...linha("DEPRECIACAO", "", -1));
  if (b.PROVISOES_CONTINGENCIAS.contas.length > 0) itens.push(...linha("PROVISOES_CONTINGENCIAS", "", -1));
  if (b.PROVISOES_PCLD.contas.length > 0) itens.push(...linha("PROVISOES_PCLD", "", -1));

  itens.push(estrutural("SEC_FINANCEIRO", "secao"));
  itens.push(...linha("REC_FIN", "( + ) "));
  itens.push(...linha("DESP_FIN", "( – ) ", -1));
  itens.push(estrutural("SUB_RESULTADO_OPER", "sub", dre.resultadoOper));

  if (b.OUTRAS_REC.contas.length > 0 || b.OUTRAS_DESP.contas.length > 0) {
    itens.push(estrutural("SEC_NAO_OPER", "secao"));
    itens.push(...linha("OUTRAS_REC", "( + ) "));
    itens.push(...linha("OUTRAS_DESP", "( – ) ", -1));
  }

  itens.push(estrutural("SUB_ANTES_IR", "sub", dre.antesIR));
  itens.push(...linha("IRPJ_CSLL", "( – ) ", -1));
  itens.push(estrutural("FINAL_LIQUIDO", "final", dre.liquido));

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
