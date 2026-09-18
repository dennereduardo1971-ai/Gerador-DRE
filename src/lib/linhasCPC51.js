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
import { nomeDoGrupo, rotuloDaLinha } from "./rotulos.js";

/* As linhas estruturais desta demonstração — os títulos de bloco e os
 * subtotais —, com id próprio para poderem ser renomeadas (`rotulos.js`).
 *
 * Renomear aqui é mais delicado que na DRE atual: "Resultado Operacional"
 * e "Resultado antes do financiamento e dos tributos sobre o lucro" são
 * os DOIS SUBTOTAIS OBRIGATÓRIOS da norma, e a auditoria procura por
 * esses termos. O app deixa mudar — quem assina é quem decide —, mas o
 * padrão é o texto da norma, e voltar a ele é apagar o apelido. */
export const LINHAS_ESTRUTURAIS_51 = [
  { id: "SEC51_OPERACIONAL", padrao: "Receitas e despesas operacionais" },
  { id: "SUB51_OPERACIONAL", padrao: "( = ) Resultado Operacional" },
  { id: "SEC51_INVESTIMENTO", padrao: "Investimento" },
  { id: "SUB51_ANTES_FIN_TRIB", padrao: "( = ) Resultado antes do financiamento e dos tributos sobre o lucro" },
  { id: "SEC51_FINANCIAMENTO", padrao: "Financiamento" },
  { id: "SUB51_ANTES_TRIB", padrao: "( = ) Resultado antes dos tributos sobre o lucro" },
  { id: "SEC51_TRIBUTOS", padrao: "Tributos sobre o lucro" },
  { id: "SUB51_CONTINUADAS", padrao: "( = ) Resultado das operações continuadas" },
  { id: "SEC51_DESCONTINUADAS", padrao: "Operações descontinuadas" },
  { id: "FINAL51_LIQUIDO", padrao: "( = ) Resultado Líquido do Período" },
];

const PADRAO_51 = Object.fromEntries(LINHAS_ESTRUTURAIS_51.map((l) => [l.id, l.padrao]));

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

export function montarLinhas51(dre51, rotulos = null) {
  const itens = [];
  const rot = (id) => rotuloDaLinha(id, PADRAO_51[id], rotulos);

  const bloco = (catId, idTitulo) => {
    const c = dre51.cat[catId];
    if (!c || !c.grupos.length) return;
    itens.push({ t: "secao", lbl: rot(idTitulo), cat: catId, id: idTitulo, chave: idTitulo });
    c.grupos.forEach((g, i) => {
      itens.push({
        /* O nome do grupo é o MESMO das duas demonstrações e do De-Para
           (`nomeDoGrupo`): renomear "Bolsas / Resoluções" na DRE atual e
           essa linha continuar com o nome antigo faria as duas
           demonstrações parecerem falar de coisas diferentes. */
        t: "l", lbl: nomeDoGrupo(g.id, rotulos), val: g.total, id: g.id, cat: catId,
        cod: codigo(catId, i), chave: `${catId}|${g.id}`,
      });
      /* A quebra por modalidade (Presencial / EAD / Comum) é a mesma da
         DRE atual — `faixasDoGrupo` decide quando ela aparece, para as
         duas demonstrações nunca divergirem sobre qual linha se abre.
         O CÓDIGO DA LINHA NÃO SE ESTENDE À FAIXA: `2.3` é posição de
         LINHA na demonstração, e a faixa é detalhe dela, não uma linha
         nova que a nota explicativa possa citar. */
      (g.faixas || []).forEach((f) =>
        itens.push({
          t: "mod", lbl: f.nome, val: f.total, id: g.id, cat: catId,
          mod: f.id, chave: `${catId}|${g.id}|${f.id}`,
        })
      );
    });
  };

  const subtotal = (id, val, cat) => ({ t: "sub", lbl: rot(id), val, cat, id, chave: id });

  bloco("OPERACIONAL", "SEC51_OPERACIONAL");
  itens.push(subtotal("SUB51_OPERACIONAL", dre51.operacional, "OPERACIONAL"));

  bloco("INVESTIMENTO", "SEC51_INVESTIMENTO");
  itens.push(subtotal("SUB51_ANTES_FIN_TRIB", dre51.antesFinTributos));

  bloco("FINANCIAMENTO", "SEC51_FINANCIAMENTO");
  itens.push(subtotal("SUB51_ANTES_TRIB", dre51.antesTributos));

  bloco("TRIBUTOS", "SEC51_TRIBUTOS");
  itens.push(subtotal("SUB51_CONTINUADAS", dre51.continuadas));

  /* Só entra quando existe. Aqui a ausência da linha não esconde
     obrigação nenhuma: uma empresa sem operação descontinuada não tem o
     que apresentar, e o resultado das continuadas já é o líquido. */
  if (dre51.cat.DESCONTINUADAS.grupos.length) {
    bloco("DESCONTINUADAS", "SEC51_DESCONTINUADAS");
  }
  itens.push({ t: "final", lbl: rot("FINAL51_LIQUIDO"), val: dre51.liquido, id: "FINAL51_LIQUIDO", chave: "FINAL51_LIQUIDO" });

  totalizarSecoes(itens);
  return { itens, escala: aplicarCascata(itens) };
}

/* A COLUNA COMPARATIVA — o que o CPC 51 exige para 2027 (2026
 * reapresentado) e o que o modelo de DRE usado como base traz como
 * segunda coluna de valores.
 *
 * Ela só é preenchida quando existe período anterior DE VERDADE entre os
 * balancetes carregados: o que a tela mostra tem que ser um deles, e tem
 * que haver outro imediatamente antes na ordem do tempo. Fora disso a
 * coluna sai VAZIA, nunca com zero e nunca com o valor de um período que
 * não é o anterior — a mesma regra da nota de MPDA, onde o que o app não
 * sabe sai como lacuna. Comparar "Jan a Jun" com "Mai" produziria um
 * número que parece comparativo e não é.
 *
 * Carregar mais de um balancete é o que dá material a esta coluna: cada
 * arquivo declara o próprio período, e a lista chega aqui já ordenada.
 *
 * O casamento é pela CHAVE da linha (`categoria|grupo`, mais a
 * modalidade quando é faixa), não pelo rótulo: com a quebra por
 * modalidade, "Presencial" aparece em vários grupos, e casar por rótulo
 * repetiria o valor de um grupo em todos os outros. Um mês sem
 * determinado grupo simplesmente não tem aquela linha, e a célula fica
 * vazia em vez de deslocar a coluna inteira. */
export function comparativo51(dres51PorPeriodo = [], periodoAtivo, rotulos = null) {
  if (!periodoAtivo) return null;
  const i = dres51PorPeriodo.findIndex((d) => d.competencia === periodoAtivo);
  if (i <= 0) return null;
  const anterior = dres51PorPeriodo[i - 1];
  const valores = {};
  montarLinhas51(anterior.dre51, rotulos).itens.forEach((it) => {
    if (it.val != null) valores[it.chave ?? it.lbl] = it.val;
  });
  return { competencia: anterior.competencia, rotulo: anterior.rotulo, valores };
}
