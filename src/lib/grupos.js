/* Os grupos da DRE — a lista de linhas que a demonstração pode ter, e o
 * sinal (natureza) de cada uma.
 *
 * Módulo próprio porque tanto `classify.js` (que decide em qual grupo cada
 * conta cai) quanto `planoPerfil.js` (que valida perfis contra esses ids)
 * precisam da lista. Com GRUPOS dentro de classify.js os dois se
 * importavam em círculo.
 */

export const GRUPOS = [
  { id: "REC_MENSALIDADES", nome: "Receita Bruta com Mensalidades", sinal: 1 },
  { id: "REC_TAXAS", nome: "Receita com Taxas", sinal: 1 },
  { id: "DED_BOLSAS", nome: "Bolsas / Resoluções", sinal: -1 },
  { id: "DED_PROUNI", nome: "Prouni", sinal: -1 },
  { id: "DED_DEVOLUCOES", nome: "Mensalidades Devolvidas", sinal: -1 },
  { id: "DED_DESCONTOS", nome: "Descontos / Cancelamentos", sinal: -1 },
  { id: "DED_IMPOSTOS", nome: "PIS / COFINS / ISS", sinal: -1 },
  { id: "CUSTOS", nome: "Custos dos Serviços", sinal: -1 },
  { id: "DESP_FOPAG", nome: "Despesas com Pessoal (Fopag)", sinal: -1 },
  { id: "DESP_ADM", nome: "Despesas Administrativas", sinal: -1 },
  { id: "DEPRECIACAO", nome: "Depreciação / Amortização", sinal: -1 },
  { id: "PROVISOES_CONTINGENCIAS", nome: "Provisões / Reversões Contingências", sinal: -1 },
  { id: "PROVISOES_PCLD", nome: "Provisões / Reversões PCLD", sinal: -1 },
  { id: "REC_FIN", nome: "Receitas Financeiras", sinal: 1 },
  { id: "DESP_FIN", nome: "Despesas Financeiras", sinal: -1 },
  { id: "OUTRAS_REC", nome: "Receitas Não Operacionais", sinal: 1 },
  { id: "OUTRAS_DESP", nome: "Despesas Não Operacionais", sinal: -1 },
  { id: "IRPJ_CSLL", nome: "IRPJ e CSLL", sinal: -1 },
  { id: "IGNORAR", nome: "Não entra na DRE", sinal: 0 },
];
export const NOME_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.nome]));

export const SINAL_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.sinal || 1]));

/** A conta é de natureza CREDORA (receita) ou devedora (despesa)?
 *
 *  Era `c.saldo > 0` espalhado por `classify.js` e `planoPerfil.js`, e o
 *  problema estava no zero: saldo zero caía no ramo `else`, o de despesa.
 *  Com o balancete emitido COM as contas sem movimento — que é o que se
 *  quer, para parametrizar a conta antes de ela ter saldo —, toda conta
 *  de receita zerada era classificada como despesa em silêncio.
 *
 *  O desempate é a natureza do SALDO que o balancete traz (`natureza`,
 *  posta por `contasDeMovimento`). Quando nem isso existe — conta nova,
 *  nunca movimentada — devolve `null`: não há o que deduzir, e quem
 *  decide é o código da conta no plano. Chamador nenhum deve tratar
 *  `null` como "despesa"; é para isso que ele não é `false`. */
export function ehCredora(c) {
  if (c.saldo > 0.005) return true;
  if (c.saldo < -0.005) return false;
  if (c.natureza > 0) return true;
  if (c.natureza < 0) return false;
  return null;
}
