/* A demonstração do resultado do CPC 51 como DADOS.
 *
 * Mesmo formato de `linhasDRE.js` — `{ t, lbl, val, id }` mais a cascata
 * — de propósito: assim a tela reaproveita os componentes `Linha`,
 * `Secao` e `Detalhe` que já existem, e a exportação reaproveita
 * `matrizDRE`. Duas demonstrações, um só desenho.
 *
 * A ordem das categorias e os dois subtotais obrigatórios são a própria
 * norma; não são preferência de layout. Por isso a lista abaixo é fixa e
 * o que varia é só o conteúdo de cada bloco:
 *
 *   Operacional                        → ( = ) Resultado Operacional        [obrigatório]
 *   Investimento                       → ( = ) Resultado antes do financiamento
 *                                              e dos tributos sobre o lucro [obrigatório]
 *   Financiamento                      → ( = ) Resultado antes dos tributos
 *   Tributos sobre o lucro             → ( = ) Resultado das operações continuadas
 *   Operações descontinuadas           → ( = ) Resultado líquido do período
 *
 * Uma categoria sem conta nenhuma não vira seção vazia na tela, mas o
 * SUBTOTAL continua aparecendo: "Resultado antes do financiamento e dos
 * tributos" é linha obrigatória mesmo quando não há financiamento — sumir
 * com ela por falta de movimento seria descumprir a norma justamente no
 * caso mais comum.
 */

import { aplicarCascata, totalizarSecoes } from "./linhasDRE.js";

export function montarLinhas51(dre51) {
  const itens = [];

  const bloco = (catId, titulo) => {
    const c = dre51.cat[catId];
    if (!c || !c.grupos.length) return;
    itens.push({ t: "secao", lbl: titulo });
    c.grupos.forEach((g) => itens.push({ t: "l", lbl: g.nome, val: g.total, id: g.id, cat: catId }));
  };

  bloco("OPERACIONAL", "Receitas e despesas operacionais");
  itens.push({ t: "sub", lbl: "( = ) Resultado Operacional", val: dre51.operacional });

  bloco("INVESTIMENTO", "Investimento");
  itens.push({
    t: "sub",
    lbl: "( = ) Resultado antes do financiamento e dos tributos sobre o lucro",
    val: dre51.antesFinTributos,
  });

  bloco("FINANCIAMENTO", "Financiamento");
  itens.push({ t: "sub", lbl: "( = ) Resultado antes dos tributos sobre o lucro", val: dre51.antesTributos });

  bloco("TRIBUTOS", "Tributos sobre o lucro");
  itens.push({ t: "sub", lbl: "( = ) Resultado das operações continuadas", val: dre51.continuadas });

  /* Só entra quando existe. Aqui a ausência da linha não esconde
     obrigação nenhuma: uma empresa sem operação descontinuada não tem o
     que apresentar, e o resultado das continuadas já é o líquido. */
  if (dre51.cat.DESCONTINUADAS.grupos.length) {
    bloco("DESCONTINUADAS", "Operações descontinuadas");
  }
  itens.push({ t: "final", lbl: "( = ) Resultado Líquido do Período", val: dre51.liquido });

  totalizarSecoes(itens);
  return { itens, escala: aplicarCascata(itens) };
}
