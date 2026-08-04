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
const PAT_FOPAG = /FOPAG|SAL[ÁA]RIO|FOLHA DE PAG|\bFGTS\b|\bINSS\b|F[ÉE]RIAS|13[º°O]?\s|D[ÉE]CIMO TERCEIRO|RESCIS[ÃA]O|VALE TRANSP|VALE ALIMENT|PR[ÓO].?LABORE|ENCARGOS SOCIAIS|\bPESSOAL\b|DOCENTES?\b/i;
const PAT_DEPREC = /DEPRECIA|AMORTIZ/i;
const PAT_PROVISAO = /PROVIS[ÃA]O|PCLD|CONTING[ÊE]NCIA/i;
const PAT_FIN = /JUROS|TARIFA BANC|DESPESA BANC|\bIOF\b|FINANCIAMENTO|EMPR[ÉE]STIMO|RENDIMENTO DE APLIC|APLICA[ÇC][ÃA]O FINANC|FINANCEIR/i;
const PAT_IRPJCSLL = /\bIRPJ\b|\bCSLL\b/i;
const PAT_NAO_OPER = /OUTRAS RECEITA|OUTRAS DESPESA|N[ÃA]O OPERACIONAL|EQUIVAL[ÊE]NCIA PATRIMONIAL|GANHO.{0,15}CAPITAL|PERDA.{0,15}CAPITAL|OPERA[ÇC][ÕO]ES DESCONTINUADAS/i;

const PADROES = {
  mens: PAT_MENSALIDADE, taxa: PAT_TAXA, bolsa: PAT_BOLSA, prouni: PAT_PROUNI,
  devolu: PAT_DEVOLU, desconto: PAT_DESCONTO, imposto: PAT_IMPOSTO, fopag: PAT_FOPAG,
  deprec: PAT_DEPREC, provisao: PAT_PROVISAO, fin: PAT_FIN, irpj: PAT_IRPJCSLL,
  naoOper: PAT_NAO_OPER,
};

/** Sugere o grupo de cada conta de resultado.
 *
 * A direção (receita ou despesa) vem do sinal do saldo da própria conta.
 * Para o rótulo específico, cada conta é testada individualmente contra
 * um texto "enriquecido": o histórico dos lançamentos + o nome da própria
 * conta no plano de contas (se importado) + o nome de cada conta
 * ANCESTRAL no plano de contas (a conta-pai, avó etc., cortando o código
 * um dígito de cada vez). Isso importa porque num plano de contas real é
 * comum a conta-folha ter um nome genérico ("GRADUACAO PRESENCIAL") e só
 * a conta-síntese algumas casas acima dizer do que se trata de verdade
 * ("(-)DEVOLUCOES MENSALIDADES/TAXAS") — sem a hierarquia, essa conta
 * nunca bateria com nenhum padrão.
 *
 * Sem plano de contas importado, cai num fallback por maioria dentro do
 * prefixo de 3 dígitos (o comportamento original, mais grosseiro mas que
 * não depende de nome nenhum — só do histórico dos lançamentos). */
export function sugerirClassificacao(contas, nomes = {}) {
  const porPrefixo = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    porPrefixo[p] = porPrefixo[p] || { saldo: 0, n: 0 };
    porPrefixo[p].saldo += c.saldo;
    porPrefixo[p].n++;
  });
  const credores = Object.entries(porPrefixo)
    .filter(([, v]) => v.saldo > 0)
    .sort((a, b) => b[1].saldo - a[1].saldo);
  const prefixoReceita = credores.length ? credores[0][0] : null;
  const digitoReceita = prefixoReceita ? prefixoReceita[0] : null;

  /** Histórico + nome da conta + nome de cada ancestral no plano de
   *  contas, do mais próximo ao mais distante. */
  const textoDaConta = (c) => {
    let texto = c.historico + " " + (nomes[c.conta] || "");
    for (let len = c.conta.length - 1; len >= 1; len--) {
      const ancestral = nomes[c.conta.slice(0, len)];
      if (ancestral) texto += " " + ancestral;
    }
    return texto;
  };

  // fallback por maioria do prefixo de 3 dígitos — igual ao comportamento
  // anterior, só entra em ação quando a conta em si não bate com nada
  const contagem = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    contagem[p] = contagem[p] || {};
    const texto = textoDaConta(c);
    for (const [nome, re] of Object.entries(PADROES)) {
      if (re.test(texto)) contagem[p][nome] = (contagem[p][nome] || 0) + 1;
    }
  });

  const mapa = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    const texto = textoDaConta(c);
    const bate = (re) => re.test(texto);
    let g = null;

    // decisão direta, conta por conta — a ordem importa: padrões mais
    // específicos (ex. IRPJ/CSLL) checados antes dos mais genéricos (ex.
    // provisão), porque "PROVISÃO DE IRPJ" bate nos dois.
    if (c.saldo > 0) {
      if (bate(PAT_MENSALIDADE)) g = "REC_MENSALIDADES";
      else if (bate(PAT_TAXA)) g = "REC_TAXAS";
      else if (bate(PAT_FIN)) g = "REC_FIN";
      else if (bate(PAT_NAO_OPER)) g = "OUTRAS_REC";
    } else {
      if (bate(PAT_BOLSA)) g = "DED_BOLSAS";
      else if (bate(PAT_PROUNI)) g = "DED_PROUNI";
      else if (bate(PAT_DEVOLU)) g = "DED_DEVOLUCOES";
      else if (bate(PAT_FOPAG)) g = "DESP_FOPAG";
      else if (bate(PAT_IMPOSTO)) g = "DED_IMPOSTOS";
      else if (bate(PAT_IRPJCSLL)) g = "IRPJ_CSLL";
      else if (bate(PAT_DEPREC)) g = "DEPRECIACAO";
      else if (bate(PAT_PROVISAO)) g = "PROVISOES";
      else if (bate(PAT_FIN)) g = "DESP_FIN";
      else if (bate(PAT_DESCONTO)) g = "DED_DESCONTOS";
      else if (bate(PAT_NAO_OPER)) g = "OUTRAS_DESP";
    }

    if (!g) {
      const b = porPrefixo[p];
      const cnt = contagem[p] || {};
      const maioria = (k) => b.n > 0 && (cnt[k] || 0) / b.n >= 0.5;
      if (c.saldo > 0) {
        if (maioria("mens")) g = "REC_MENSALIDADES";
        else if (maioria("taxa")) g = "REC_TAXAS";
        else if (maioria("fin")) g = "REC_FIN";
        else if (p === prefixoReceita) g = "REC_MENSALIDADES";
        else g = "OUTRAS_REC";
      } else {
        if (maioria("bolsa")) g = "DED_BOLSAS";
        else if (maioria("prouni")) g = "DED_PROUNI";
        else if (maioria("devolu")) g = "DED_DEVOLUCOES";
        else if (maioria("fopag")) g = "DESP_FOPAG";
        else if (maioria("imposto")) g = "DED_IMPOSTOS";
        else if (maioria("irpj")) g = "IRPJ_CSLL";
        else if (maioria("deprec")) g = "DEPRECIACAO";
        else if (maioria("provisao")) g = "PROVISOES";
        else if (maioria("fin")) g = "DESP_FIN";
        else if (maioria("desconto")) g = "DED_DESCONTOS";
        else if (digitoReceita && p[0] === digitoReceita) g = "DED_DESCONTOS";
        else g = "DESP_ADM";
      }
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
