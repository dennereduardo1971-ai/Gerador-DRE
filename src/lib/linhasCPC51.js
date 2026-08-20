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
import { IDS_CATEGORIA } from "./cpc51.js";
import { competenciaLegivel } from "./parse.js";

/* O CÓDIGO DA LINHA (`1.1`, `2.3`...) — o que o modelo de DRE do CPC 51
   que o cliente usa como base traz na segunda coluna, para a nota
   explicativa poder citar a linha em vez de repetir o rótulo inteiro.
 *
 * O primeiro número é a posição da CATEGORIA na ordem da norma, que é
 * fixa (`IDS_CATEGORIA`) — não muda de um fechamento para o outro. O
 * segundo é a posição da linha dentro do bloco, e esse depende do que
 * teve movimento no período: um grupo sem lançamento nenhum não vira
 * linha, e as de baixo sobem. É código de POSIÇÃO NESTA demonstração,
 * como numeração de linha de balanço publicado — não é código de conta,
 * e não serve de chave para carga em ERP (para isso existe o De-Para,
 * que anda por código de conta). */
const codigo = (catId, i) => `${IDS_CATEGORIA.indexOf(catId) + 1}.${i + 1}`;

export function montarLinhas51(dre51) {
  const itens = [];

  const bloco = (catId, titulo) => {
    const c = dre51.cat[catId];
    if (!c || !c.grupos.length) return;
    itens.push({ t: "secao", lbl: titulo, cat: catId });
    c.grupos.forEach((g, i) =>
      itens.push({ t: "l", lbl: g.nome, val: g.total, id: g.id, cat: catId, cod: codigo(catId, i) }));
  };

  bloco("OPERACIONAL", "Receitas e despesas operacionais");
  itens.push({ t: "sub", lbl: "( = ) Resultado Operacional", val: dre51.operacional, cat: "OPERACIONAL" });

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

/* A COLUNA COMPARATIVA — o que o CPC 51 exige para 2027 (2026
 * reapresentado) e o que o modelo de DRE usado como base traz como
 * segunda coluna de valores.
 *
 * Ela só é preenchida quando existe período anterior DE VERDADE no que
 * foi importado: a demonstração precisa estar filtrada numa competência
 * e o arquivo precisa ter a competência de antes dela. Fora disso a
 * coluna sai VAZIA, nunca com zero e nunca com o valor de um período
 * que não é o anterior — a mesma regra da nota de MPDA, onde o que o app
 * não sabe sai como lacuna. Comparar "Jan a Jun" com "Mai" produziria um
 * número que parece comparativo e não é.
 *
 * O casamento é por RÓTULO, como em `EtapaComparativo`: um mês sem
 * determinado grupo simplesmente não tem aquela linha, e a célula fica
 * vazia em vez de deslocar a coluna inteira. */
export function comparativo51(dres51PorCompetencia = [], filtroCompetencia) {
  if (!filtroCompetencia || filtroCompetencia === "todas") return null;
  const i = dres51PorCompetencia.findIndex((d) => d.competencia === filtroCompetencia);
  if (i <= 0) return null;
  const anterior = dres51PorCompetencia[i - 1];
  const valores = {};
  montarLinhas51(anterior.dre51).itens.forEach((it) => {
    if (it.val != null) valores[it.lbl] = it.val;
  });
  return { competencia: anterior.competencia, rotulo: competenciaLegivel(anterior.competencia), valores };
}
