/* Estrutura de grupos da DRE e sugestão automática de classificação,
 * calibrada contra a Demonstração do Resultado Intermediária de uma
 * instituição de ensino real (mensalidades, taxas, bolsas, Prouni,
 * devoluções, descontos, PIS/COFINS/ISS, fopag, administrativas,
 * depreciação, provisões, financeiro e não operacional). */

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
  { id: "PROVISOES", nome: "Provisões / Reversões", sinal: -1 },
  { id: "REC_FIN", nome: "Receitas Financeiras", sinal: 1 },
  { id: "DESP_FIN", nome: "Despesas Financeiras", sinal: -1 },
  { id: "OUTRAS_REC", nome: "Receitas Não Operacionais", sinal: 1 },
  { id: "OUTRAS_DESP", nome: "Despesas Não Operacionais", sinal: -1 },
  { id: "IRPJ_CSLL", nome: "IRPJ e CSLL", sinal: -1 },
  { id: "IGNORAR", nome: "Não entra na DRE", sinal: 0 },
];
export const NOME_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.nome]));

const PAT_MENSALIDADE = /MENSALIDADE|\bMENS\.?\b/i;
const PAT_TAXA = /\bTAXA/i;
const PAT_BOLSA = /BOLSA|BOLSISTA|RESOLU[ÇC][ÃA]O|CONV[ÊE]NIO|AJUSTE.*CURSO/i;
const PAT_PROUNI = /PROUNI/i;
const PAT_DEVOLU = /DEVOLU|\bDEV\d/i;
const PAT_DESCONTO = /DESCONTO|CANCELAD|\bCANC\b/i;
const PAT_IMPOSTO = /\bPIS\b|COFINS|\bISS\b/i;
const PAT_FOPAG = /FOPAG|SAL[ÁA]RIO|FOLHA DE PAG|\bFGTS\b|\bINSS\b|F[ÉE]RIAS|13[º°O]?\s|D[ÉE]CIMO TERCEIRO|RESCIS[ÃA]O|VALE TRANSP|VALE ALIMENT|PR[ÓO].?LABORE|ENCARGOS SOCIAIS/i;
const PAT_DEPREC = /DEPRECIA|AMORTIZ/i;
const PAT_PROVISAO = /PROVIS[ÃA]O|PCLD|CONTING[ÊE]NCIA/i;
const PAT_FIN = /JUROS|TARIFA BANC|DESPESA BANC|\bIOF\b|FINANCIAMENTO|EMPR[ÉE]STIMO|RENDIMENTO DE APLIC|APLICA[ÇC][ÃA]O FINANC/i;
const PAT_IRPJCSLL = /\bIRPJ\b|\bCSLL\b/i;

const PADROES = {
  mens: PAT_MENSALIDADE, taxa: PAT_TAXA, bolsa: PAT_BOLSA, prouni: PAT_PROUNI,
  devolu: PAT_DEVOLU, desconto: PAT_DESCONTO, imposto: PAT_IMPOSTO, fopag: PAT_FOPAG,
  deprec: PAT_DEPREC, provisao: PAT_PROVISAO, fin: PAT_FIN, irpj: PAT_IRPJCSLL,
};

/** Sugere o grupo de cada conta de resultado.
 *
 * A direção (receita ou despesa) vem do saldo do subgrupo — os 3 primeiros
 * dígitos da conta —, o que funciona em qualquer plano de contas. Dentro
 * dela, o histórico decide o rótulo específico por maioria de contas do
 * subgrupo que confirmam o padrão, para não trocar de grupo por causa de
 * um lançamento isolado com nome atípico. */
export function sugerirClassificacao(contas) {
  const porPrefixo = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    porPrefixo[p] = porPrefixo[p] || { saldo: 0, n: 0 };
    porPrefixo[p].saldo += c.saldo;
    porPrefixo[p].n++;
  });

  const contagem = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    contagem[p] = contagem[p] || {};
    for (const [nome, re] of Object.entries(PADROES)) {
      if (re.test(c.historico)) contagem[p][nome] = (contagem[p][nome] || 0) + 1;
    }
  });

  const credores = Object.entries(porPrefixo)
    .filter(([, v]) => v.saldo > 0)
    .sort((a, b) => b[1].saldo - a[1].saldo);
  const prefixoReceita = credores.length ? credores[0][0] : null;
  const digitoReceita = prefixoReceita ? prefixoReceita[0] : null;

  const mapa = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    const b = porPrefixo[p];
    const cnt = contagem[p] || {};
    const maioria = (k) => b.n > 0 && (cnt[k] || 0) / b.n >= 0.5;
    let g;
    if (b.saldo > 0) {
      if (maioria("mens")) g = "REC_MENSALIDADES";
      else if (maioria("taxa")) g = "REC_TAXAS";
      else if (maioria("fin")) g = "REC_FIN";
      else if (p === prefixoReceita) g = "REC_MENSALIDADES";
      else g = "OUTRAS_REC";
    } else {
      if (maioria("bolsa")) g = "DED_BOLSAS";
      else if (maioria("prouni")) g = "DED_PROUNI";
      else if (maioria("devolu")) g = "DED_DEVOLUCOES";
      else if (maioria("imposto")) g = "DED_IMPOSTOS";
      else if (maioria("fopag")) g = "DESP_FOPAG";
      else if (maioria("deprec")) g = "DEPRECIACAO";
      else if (maioria("provisao")) g = "PROVISOES";
      else if (maioria("fin")) g = "DESP_FIN";
      else if (maioria("irpj")) g = "IRPJ_CSLL";
      else if (maioria("desconto")) g = "DED_DESCONTOS";
      else if (digitoReceita && p[0] === digitoReceita) g = "DED_DESCONTOS";
      else g = "DESP_ADM";
    }
    mapa[c.conta] = g;
  });
  return mapa;
}

/** Agrupa contas por 1º dígito do plano de contas, com totais de débito e
 *  crédito — usado para o usuário decidir quais dígitos são resultado. */
export function agruparPorDigito(contas) {
  const g = {};
  contas.forEach((c) => {
    const d = c.conta[0];
    g[d] = g[d] || { digito: d, cre: 0, deb: 0, n: 0 };
    g[d].cre += c.cre;
    g[d].deb += c.deb;
    g[d].n++;
  });
  return Object.values(g).sort((a, b) => a.digito.localeCompare(b.digito));
}

/** Monta a DRE completa a partir das contas de resultado já classificadas. */
export function montarDRE(contasResultado, grupoDe) {
  const bal = {};
  GRUPOS.forEach((g) => (bal[g.id] = { total: 0, contas: [] }));
  contasResultado.forEach((c) => {
    const g = grupoDe(c.conta);
    const val = Math.abs(c.saldo);
    bal[g].total += val;
    bal[g].contas.push({ ...c, val });
  });
  Object.values(bal).forEach((b) => b.contas.sort((a, z) => z.val - a.val));

  const v = (id) => bal[id].total;
  const receitaBruta = v("REC_MENSALIDADES") + v("REC_TAXAS");
  const deducoes = v("DED_BOLSAS") + v("DED_PROUNI") + v("DED_DEVOLUCOES") + v("DED_DESCONTOS") + v("DED_IMPOSTOS");
  const receitaLiq = receitaBruta - deducoes;
  const resultadoOperBruto = receitaLiq - v("CUSTOS");
  const despOper = v("DESP_FOPAG") + v("DESP_ADM") + v("DEPRECIACAO") + v("PROVISOES");
  const resultadoFin = v("REC_FIN") - v("DESP_FIN");
  const resultadoOper = resultadoOperBruto - despOper + resultadoFin;
  const naoOper = v("OUTRAS_REC") - v("OUTRAS_DESP");
  const antesIR = resultadoOper + naoOper;
  const liquido = antesIR - v("IRPJ_CSLL");

  return {
    bal, receitaBruta, deducoes, receitaLiq, resultadoOperBruto, despOper,
    resultadoFin, resultadoOper, naoOper, antesIR, liquido,
  };
}
