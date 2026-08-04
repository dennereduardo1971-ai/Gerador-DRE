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
const PAT_PCLD = /PCLD|CR[ÉE]D.{0,15}LIQUIDA[ÇC][ÃA]O DUVIDOSA|PERDAS? ESTIMADAS?/i;
const PAT_FIN = /JUROS|TARIFA BANC|DESPESA BANC|\bIOF\b|FINANCIAMENTO|EMPR[ÉE]STIMO|RENDIMENTO DE APLIC|APLICA[ÇC][ÃA]O FINANC|FINANCEIR/i;
const PAT_IRPJCSLL = /\bIRPJ\b|\bCSLL\b/i;
const PAT_NAO_OPER = /OUTRAS RECEITA|OUTRAS DESPESA|N[ÃA]O OPERACIONAL|EQUIVAL[ÊE]NCIA PATRIMONIAL|GANHO.{0,15}CAPITAL|PERDA.{0,15}CAPITAL|OPERA[ÇC][ÕO]ES DESCONTINUADAS/i;

const PADROES = {
  mens: PAT_MENSALIDADE, taxa: PAT_TAXA, bolsa: PAT_BOLSA, prouni: PAT_PROUNI,
  devolu: PAT_DEVOLU, desconto: PAT_DESCONTO, imposto: PAT_IMPOSTO, fopag: PAT_FOPAG,
  deprec: PAT_DEPREC, provisao: PAT_PROVISAO, pcld: PAT_PCLD, fin: PAT_FIN, irpj: PAT_IRPJCSLL,
  naoOper: PAT_NAO_OPER,
};

/* ---------------------------------------------------------------------
 * Classificação exata por código de conta — plano de contas do IESB
 * ---------------------------------------------------------------------
 * O texto/histórico é um sinal probabilístico; o CÓDIGO da conta no plano
 * de contas oficial é um fato. Este mapa liga cada conta SINTÉTICA mais
 * específica do plano (a que agrupa diretamente as contas-folha de um
 * mesmo assunto) ao grupo da DRE correspondente. Validado linha a linha
 * contra a DRE real de jan a jun/2026: todo grupo bateu com a DRE oficial
 * até o centavo (ver histórico do commit para o script de conferência).
 *
 * Só entra em ação quando o plano de contas importado tem a "assinatura"
 * do IESB (ver `assinaturaPlanoIESB`) — com outro plano de contas, ou sem
 * plano de contas nenhum, a classificação cai no texto/histórico como
 * sempre caiu. Isso existe para que a distribuição de valores bata
 * exatamente com o contábil real do Denner, sem depender de palavras-chave
 * que podem coincidir por acaso. */
const MAPA_CODIGO_IESB = {
  // Receita bruta
  "31101": "REC_MENSALIDADES", // RECEITAS PROPRIAS
  "31103": "REC_MENSALIDADES", // RECEITAS BOLSISTAS (fies/prouni/gdf/institucional/convênios — ainda receita bruta)
  "31102": "REC_TAXAS", // OUTRAS/RECEITAS ACESSORIAS TAXAS
  // Deduções da receita
  "32100": "DED_BOLSAS", // (-)BOLSAS ESTUDANTIS
  "32101": "DED_DESCONTOS", // (-)OUTROS DESCONTOS
  "32102": "DED_DESCONTOS", // (-)MENSALIDADES CANCELADAS PROPRIAS
  "32103": "DED_DESCONTOS", // (-)MENSALIDADES CANCELADAS BOLSISTAS
  "32104": "DED_DEVOLUCOES", // (-)DEVOLUCOES MENSALIDADES/TAXAS
  "32105": "DED_IMPOSTOS", // (-)IMPOSTOS E CONTRIB. S/SERVICOS (ISS/PIS/COFINS)
  // Custo dos serviços = folha dos docentes (quem entrega o serviço-fim)
  "41101": "CUSTOS", // CUSTO TOTAL - DOCENTES
  "41102": "CUSTOS", // IMPOSTOS/CONTRIB. FOPAG - DOCENTES
  "41103": "CUSTOS", // DEMAIS ENCARGOS FOPAG - DOCENTES
  // Fopag operacional = folha do administrativo + apoio acadêmico
  "41110": "DESP_FOPAG", "41111": "DESP_FOPAG", "41112": "DESP_FOPAG", // administrativo
  "41120": "DESP_FOPAG", "41121": "DESP_FOPAG", "41122": "DESP_FOPAG", // apoio acadêmico
  // Despesas administrativas
  "41201": "DESP_ADM", "41202": "DESP_ADM", "41203": "DESP_ADM", "41204": "DESP_ADM",
  "41205": "DESP_ADM", "41206": "DESP_ADM", "41207": "DESP_ADM", "41208": "DESP_ADM",
  "41209": "DESP_ADM", "41211": "DESP_ADM",
  "41210": "DEPRECIACAO", // DEPRECIACAO SOCIETARIA (não é despesa administrativa comum)
  // Resultado financeiro
  "42101": "DESP_FIN", // DESPESAS FINANCEIRAS
  "42102": "REC_FIN", // (-)RECEITAS FINANCEIRAS (nome do plano é enganoso: é receita)
  // Provisões — separadas em duas linhas, como na DRE oficial: Contingências
  // (cíveis/trabalhistas, novas e revertidas) e PCLD (perdas estimadas com
  // créditos de liquidação duvidosa, fiscal e societária, novas e revertidas).
  // Confirmado batendo com as duas linhas da DRE oficial mês a mês.
  "6110100": "PROVISOES_CONTINGENCIAS", // PROV. CONTINGENCIAS CIVEIS
  "6110101": "PROVISOES_CONTINGENCIAS", // (-) REV. PROV. CONTINGENCIAS CIVEIS
  "6110102": "PROVISOES_CONTINGENCIAS", // INSS (contingência)
  "6110104": "PROVISOES_CONTINGENCIAS", // PROV. CONTINGENCIAS TRABALHISTAS
  "6110105": "PROVISOES_CONTINGENCIAS", // (-) REV. PROV. CONTING. TRABALHISTAS
  "6110115": "PROVISOES_CONTINGENCIAS", // CONTINGENCIAS CIVEIS REALIZADAS
  "6110116": "PROVISOES_CONTINGENCIAS", // CONTINGENCIAS TRABALHISTAS REALIZADAS
  "6110103": "PROVISOES_PCLD", // PERDAS EST. P/CRED. LIQ. DUVIDOSA FISCAL
  "6110106": "PROVISOES_PCLD", // PERDAS EST. PROG./CONVENIOS
  "6110111": "PROVISOES_PCLD", // (-)REV. CRED. LIQ. DUV. EXERC ANTERIORES
  "6110112": "PROVISOES_PCLD", // (-)REV. CRED. LIQ. DUV. EXERC. CORRENTE
  "6110114": "PROVISOES_PCLD", // (-)PROG. ALIM. TRABALHADOR
  "6110119": "PROVISOES_PCLD", // PERDAS EST. P/CRED. LIQ. DUVIDOSA SOCIET
  "61101": "PROVISOES_PCLD", // fallback — qualquer conta nova nesse grupo que ainda não foi vista
  // Fechamento do exercício — não é conta de resultado
  "71101": "IGNORAR",
};

/** Contas-folha cujo nome diz uma coisa diferente do grupo em que o plano
 *  as colocou — exceções pontuais, achadas comparando com a DRE oficial:
 *  - 6110113 mora dentro de "Provisões" no plano, mas a DRE oficial trata
 *    IPTU de imóvel de investimento como Não Operacional.
 *  - 3210208 mora dentro de "Mensalidades Canceladas Próprias" no plano,
 *    mas o nome ("DEV. DE MENSALIDADES") é devolução de verdade. */
const EXCECOES_CODIGO_IESB = {
  "6110113": "OUTRAS_DESP", // IPTU IMOVEIS INVESTIMENTO
  "3210208": "DED_DEVOLUCOES", // (-)DEV. DE MENSALIDADES
};

/** Contas de IRPJ/CSLL (inclui incentivo Prouni e diferimento) dentro do
 *  grupo 611 de provisões — checadas antes do mapa geral porque "provisão
 *  de IRPJ/CSLL" bate em Provisões por código, mas tem grupo próprio. */
const CODIGOS_IRPJ_CSLL_IESB = new Set([
  "6110107", "6110108", // PROVISAO IRPJ / CSLL
  "6110109", "6110110", // (-) RESERVA INCENTIVO FISCAL PROUNI IRPJ / CSLL
  "6110117", "6110118", // PROVISAO IRPJ / CSLL DIFERIDO(A)
]);

/** A assinatura confirma que o plano de contas importado é o do IESB antes
 *  de confiar no mapa de códigos acima — checa o nome das contas-síntese
 *  de topo (1 dígito), que são as mais estáveis do plano. */
function assinaturaPlanoIESB(nomes) {
  const tem = (cod, trecho) => (nomes[cod] || "").toUpperCase().includes(trecho);
  return (
    tem("3", "RECEITAS LIQUIDAS") &&
    tem("4", "DESPESAS ADMINISTRATIVAS") &&
    tem("5", "OUTRAS RECEITAS") &&
    tem("6", "PROVISOES")
  );
}

/** Resolve o grupo de uma conta pelo código, seguindo a ordem: exceção
 *  pontual > IRPJ/CSLL > Prouni dentro de Bolsas > mapa geral > seção 511
 *  (outras receitas/despesas não operacionais, decidida pelo sinal do
 *  saldo, pois no plano ela mistura contas devedoras e credoras). Retorna
 *  null quando o código não é reconhecido, para cair no classificador por
 *  texto/histórico. */
function grupoPorCodigoIESB(conta, nomes, saldo) {
  if (EXCECOES_CODIGO_IESB[conta]) return EXCECOES_CODIGO_IESB[conta];
  if (CODIGOS_IRPJ_CSLL_IESB.has(conta)) return "IRPJ_CSLL";
  // "(-)PROUNI" mora dentro da conta-síntese "(-)BOLSAS ESTUDANTIS" (32100)
  // no plano, mas a DRE oficial trata Prouni como linha própria. Contas de
  // Prouni dentro de OUTROS grupos (ex. Mensalidades Canceladas Bolsistas)
  // ficam no grupo do código mesmo — só a de Bolsas é exceção, confirmado
  // batendo com a DRE oficial mês a mês.
  if (conta.slice(0, 5) === "32100" && PAT_PROUNI.test(nomes[conta] || "")) return "DED_PROUNI";
  for (let len = conta.length; len >= 1; len--) {
    const g = MAPA_CODIGO_IESB[conta.slice(0, len)];
    if (g) return g;
  }
  if (conta.slice(0, 2) === "51") return saldo > 0 ? "OUTRAS_REC" : "OUTRAS_DESP";
  return null;
}

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

  // se o plano de contas importado é o do IESB, o código da conta manda —
  // é um fato do plano, não uma suposição sobre o texto do lançamento
  const usarCodigoIESB = assinaturaPlanoIESB(nomes);

  const mapa = {};
  contas.forEach((c) => {
    const p = c.conta.slice(0, 3);
    const texto = textoDaConta(c);
    const bate = (re) => re.test(texto);
    let g = usarCodigoIESB ? grupoPorCodigoIESB(c.conta, nomes, c.saldo) : null;
    if (g) { mapa[c.conta] = g; return; }

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
      else if (bate(PAT_PROVISAO)) g = bate(PAT_PCLD) ? "PROVISOES_PCLD" : "PROVISOES_CONTINGENCIAS";
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
        else if (maioria("provisao")) g = maioria("pcld") ? "PROVISOES_PCLD" : "PROVISOES_CONTINGENCIAS";
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

const SINAL_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.sinal || 1]));

/** Monta a DRE completa a partir das contas de resultado já classificadas.
 *
 * O total de cada grupo é a soma LÍQUIDA (com sinal) orientada pela
 * natureza esperada do grupo (`c.saldo * sinalDoGrupo`), não a soma das
 * magnitudes (`Math.abs`). Isso importa porque grupos como Provisões
 * misturam, de verdade, contas de despesa (nova provisão) com contas de
 * receita (reversão/estorno) dentro da MESMA linha da DRE oficial — se
 * somasse só magnitude, uma reversão que deveria REDUZIR a despesa do mês
 * acabaria sendo somada como se também fosse despesa, inflando o grupo em
 * vez de compensá-lo (confirmado comparando com a DRE real: em meses com
 * reversão de PCLD maior que a provisão nova, a linha vira positiva). Cada
 * conta individual dentro do grupo continua exibida em módulo (`val`), só
 * o total agregado usa o valor líquido. */
export function montarDRE(contasResultado, grupoDe) {
  const bal = {};
  GRUPOS.forEach((g) => (bal[g.id] = { total: 0, contas: [] }));
  contasResultado.forEach((c) => {
    const g = grupoDe(c.conta);
    const val = Math.abs(c.saldo);
    bal[g].total += c.saldo * (SINAL_GRUPO[g] ?? 1);
    bal[g].contas.push({ ...c, val });
  });
  Object.values(bal).forEach((b) => b.contas.sort((a, z) => z.val - a.val));

  const v = (id) => bal[id].total;
  const receitaBruta = v("REC_MENSALIDADES") + v("REC_TAXAS");
  const deducoes = v("DED_BOLSAS") + v("DED_PROUNI") + v("DED_DEVOLUCOES") + v("DED_DESCONTOS") + v("DED_IMPOSTOS");
  const receitaLiq = receitaBruta - deducoes;
  const resultadoOperBruto = receitaLiq - v("CUSTOS");
  const despOper = v("DESP_FOPAG") + v("DESP_ADM") + v("DEPRECIACAO") + v("PROVISOES_CONTINGENCIAS") + v("PROVISOES_PCLD");
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
