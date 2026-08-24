/* APURAÇÃO FISCAL — LALUR (Parte A) e PIS/COFINS.
 *
 * ESTE MÓDULO CONFERE, NÃO APURA PARA RECOLHIMENTO. Ele recalcula o
 * imposto a partir da DRE que o app já monta e confronta com o que a
 * contabilidade lançou. A entrega é a DIVERGÊNCIA — o mesmo espírito da
 * prova de integridade da DRE, e o motivo de o fiscal caber no escopo do
 * projeto: ele justifica duas linhas da própria demonstração (Deduções da
 * Receita e IRPJ/CSLL).
 *
 * Quatro decisões que não devem ser desfeitas:
 *
 * 1. NADA AQUI DECIDE PARA ONDE UMA CONTA VAI. A resolução continua em
 *    `classify.js` e `cpc51.js`; este módulo lê a DRE pronta. Uma terceira
 *    verdade sobre o destino de uma conta é exatamente o que o De-Para
 *    existe para impedir.
 *
 * 2. ONDE O APP NÃO SABE, ELE NÃO AFIRMA. Dedutibilidade de uma provisão
 *    específica, proporção oficial do PROUNI, natureza de um ajuste — tudo
 *    isso é julgamento de quem assina. O que o app propõe nasce marcado
 *    "a confirmar" e carrega o MOTIVO; nunca nasce como fato.
 *
 * 3. A ORIGEM DA DECISÃO VIAJA JUNTO, conta a conta e ajuste a ajuste. É a
 *    mesma coluna que torna o De-Para um documento de auditoria: sem ela,
 *    o que o app sugeriu e o que uma pessoa conferiu parecem a mesma
 *    coisa — e é justamente essa diferença que a auditoria pergunta.
 *
 * 4. VALOR NÃO ENTRA EM PERFIL. Prejuízo fiscal e base negativa de CSLL
 *    são saldos de uma empresa específica: ficam na sessão (IndexedDB) e
 *    saem no "Limpar tudo". Os PARÂMETROS (regime, alíquotas, adesão ao
 *    PROUNI, mapa de tributos) são decisão, não valor, e esses sim viajam
 *    no perfil.
 */

import { NOME_GRUPO } from "./grupos.js";

/* ------------------------------------------------------------------ *
 * Parâmetros
 * ------------------------------------------------------------------ */

export const REGIMES = [
  {
    id: "REAL_CUMULATIVO",
    nome: "Lucro Real — PIS/COFINS cumulativo",
    lalur: true,
    nota: "Serviço educacional costuma ficar no cumulativo mesmo dentro do Lucro Real.",
  },
  {
    id: "REAL_NAO_CUMULATIVO",
    nome: "Lucro Real — PIS/COFINS não cumulativo",
    lalur: true,
    creditos: true,
    nota: "Alíquotas maiores, com direito a crédito sobre insumos — os créditos não são calculados aqui.",
  },
  {
    id: "PRESUMIDO",
    nome: "Lucro Presumido",
    lalur: false,
    nota: "Não há LALUR: a base do IRPJ/CSLL é presumida sobre a receita bruta.",
  },
];

export const ALIQUOTAS_PADRAO = {
  REAL_CUMULATIVO: { pis: 0.0065, cofins: 0.03 },
  REAL_NAO_CUMULATIVO: { pis: 0.0165, cofins: 0.076 },
  PRESUMIDO: { pis: 0.0065, cofins: 0.03 },
};

export const PARAMS_FISCAIS_PADRAO = {
  regime: "REAL_CUMULATIVO",
  // Mensal, por estimativa/balancete de suspensão — que é o que casa com
  // o balancete que o app importa (um por mês).
  periodicidade: "MENSAL",
  aliquotas: {
    pis: 0.0065,
    cofins: 0.03,
    irpj: 0.15,
    adicional: 0.10,
    // O adicional incide sobre o que exceder R$ 20.000 por MÊS de período
    // de apuração (R$ 60.000 no trimestre, R$ 240.000 no ano).
    limiteAdicionalMensal: 20000,
    csll: 0.09,
    presuncaoServicos: 0.32,
    presuncaoCSLL: 0.32,
  },
  // Adesão ao PROUNI isenta IRPJ, CSLL, PIS e COFINS na proporção da
  // receita da mantida. É decisão da instituição, não configuração.
  prouni: { aderente: false },
};

/** Os parâmetros com as alíquotas de PIS/COFINS do regime escolhido, a
 *  menos que alguém as tenha editado à mão. */
export function comAliquotasDoRegime(params) {
  const base = ALIQUOTAS_PADRAO[params.regime] || ALIQUOTAS_PADRAO.REAL_CUMULATIVO;
  return { ...params, aliquotas: { ...params.aliquotas, ...base } };
}

export const regimeDe = (id) => REGIMES.find((r) => r.id === id) || REGIMES[0];

/* ------------------------------------------------------------------ *
 * PIS / COFINS
 * ------------------------------------------------------------------ */

/* Quais contas dentro de DED_IMPOSTOS são PIS, quais são COFINS e quais
 * são ISS.
 *
 * A DRE tem UMA linha "PIS / COFINS / ISS", e confrontar o grupo inteiro
 * com PIS+COFINS daria divergência sempre — o ISS estaria lá dentro sem
 * que ninguém visse. O mapa é um De-Para curto, sugerido pelo nome da
 * conta e corrigível, com a mesma coluna de origem da decisão. */
export const TRIBUTOS = [
  { id: "PIS", nome: "PIS" },
  { id: "COFINS", nome: "COFINS" },
  { id: "ISS", nome: "ISS" },
  { id: "OUTRO", nome: "Outro tributo sobre receita" },
];

const PAT_PIS = /\bPIS\b|\bPASEP\b/i;
const PAT_COFINS = /COFINS/i;
/* "SOBRE SERVIÇO" NÃO identifica o ISS. É a frase que os três tributos
   usam no plano de contas ("PIS SOBRE SERVIÇOS", "COFINS SOBRE
   SERVIÇOS", "(-)IMPOSTOS E CONTRIB. S/SERVIÇOS" — esta última é a
   própria conta-síntese). Com ela no padrão, a conta-síntese genérica
   virava ISS e o valor saía do confronto de PIS/COFINS sem que ninguém
   visse. O nome do tributo, ou nada. */
const PAT_ISS = /\bISS\b|\bISSQN\b/i;

/** Sugere o tributo de uma conta pelo nome. Devolve null quando não
 *  reconhece — e null vira "a confirmar" na tela, nunca "OUTRO". */
export function sugerirTributo(texto) {
  const t = String(texto || "");
  // COFINS antes de PIS: "PIS/COFINS" bate nos dois, e o rótulo mais
  // específico é o que interessa quando a conta junta os dois nomes.
  if (PAT_COFINS.test(t) && !PAT_PIS.test(t)) return "COFINS";
  if (PAT_PIS.test(t) && !PAT_COFINS.test(t)) return "PIS";
  if (PAT_ISS.test(t)) return "ISS";
  return null;
}

/** O De-Para dos tributos sobre a receita: uma linha por conta do grupo
 *  DED_IMPOSTOS, com o tributo sugerido, o escolhido e a origem. */
export function deParaTributos(dre, { mapaTributos = {}, nomes = {} } = {}) {
  const contas = dre?.bal?.DED_IMPOSTOS?.contas || [];
  return contas.map((c) => {
    const texto = `${nomes[c.conta] || ""} ${c.historico || ""}`;
    const sugerido = sugerirTributo(texto);
    const escolhido = mapaTributos[c.conta] || sugerido;
    return {
      conta: c.conta,
      descricao: nomes[c.conta] || (c.historico || "").trim().split(",")[0] || c.conta,
      valor: Math.abs(c.saldo),
      sugerido,
      tributo: escolhido || null,
      manual: !!mapaTributos[c.conta],
      origem: mapaTributos[c.conta] ? "manual" : sugerido ? "sugerido pelo nome" : "a confirmar",
    };
  }).sort((a, b) => b.valor - a.valor);
}

/** Quanto foi CONTABILIZADO de cada tributo, segundo o mapa. */
export function contabilizadoPorTributo(linhasTributo) {
  const t = { PIS: 0, COFINS: 0, ISS: 0, OUTRO: 0, indefinido: 0 };
  linhasTributo.forEach((l) => {
    if (l.tributo) t[l.tributo] += l.valor;
    else t.indefinido += l.valor;
  });
  return t;
}

/** A proporção da receita isenta por adesão ao PROUNI.
 *
 *  É o número que faz o recálculo bater ou não bater com o contabilizado,
 *  e o app NÃO tem como sabê-lo: a proporção oficial vem do termo de
 *  adesão e do número de bolsas, não da DRE. O que dá para fazer é
 *  estimá-la pela participação das bolsas na receita bruta, e dizer com
 *  todas as letras que é estimativa. */
export function proporcaoProuni(dre, params) {
  if (!params.prouni?.aderente) {
    return { proporcao: 0, estimada: false, base: 0, isenta: 0 };
  }
  const bruta = dre.receitaBruta || 0;
  const isenta = (dre.bal?.DED_PROUNI?.total || 0) + (dre.bal?.DED_BOLSAS?.total || 0);
  const proporcao = bruta > 0 ? Math.min(1, Math.max(0, isenta / bruta)) : 0;
  return { proporcao, estimada: true, base: bruta, isenta };
}

/** Apuração de PIS/COFINS confrontada com o contabilizado.
 *
 *  A base é a receita bruta menos as exclusões legais que a própria DRE
 *  já separa: devoluções e descontos incondicionais. Bolsas e PROUNI NÃO
 *  são exclusão de base — são o que define a proporção isenta, e tratá-las
 *  como exclusão reduziria a base duas vezes. */
export function apurarPisCofins({ dre, params, linhasTributo = [] }) {
  const p = comAliquotasDoRegime(params);
  const bruta = dre.receitaBruta || 0;
  const devolucoes = dre.bal?.DED_DEVOLUCOES?.total || 0;
  const descontos = dre.bal?.DED_DESCONTOS?.total || 0;
  const base = bruta - devolucoes - descontos;

  const prouni = proporcaoProuni(dre, p);
  const baseIsenta = base * prouni.proporcao;
  const baseTributavel = base - baseIsenta;

  const pisDevido = baseTributavel * p.aliquotas.pis;
  const cofinsDevido = baseTributavel * p.aliquotas.cofins;

  const contab = contabilizadoPorTributo(linhasTributo);
  const contabilizado = contab.PIS + contab.COFINS;
  const devido = pisDevido + cofinsDevido;

  return {
    memoria: [
      { rotulo: "Receita bruta de serviços", valor: bruta, origem: "DRE — Mensalidades + Taxas" },
      { rotulo: "( – ) Mensalidades devolvidas", valor: -devolucoes, origem: "DRE — grupo Devoluções" },
      { rotulo: "( – ) Descontos incondicionais", valor: -descontos, origem: "DRE — grupo Descontos" },
      { rotulo: "( = ) Base de cálculo", valor: base, subtotal: true },
      ...(prouni.proporcao > 0
        ? [{
            rotulo: `( – ) Parcela isenta por adesão ao PROUNI (${(prouni.proporcao * 100).toFixed(2).replace(".", ",")}%)`,
            valor: -baseIsenta,
            origem: "ESTIMADA pela participação das bolsas na receita bruta — confirmar com o termo de adesão",
            confirmar: true,
          }]
        : []),
      { rotulo: "( = ) Base tributável", valor: baseTributavel, subtotal: true },
      { rotulo: `PIS (${pct(p.aliquotas.pis)})`, valor: pisDevido },
      { rotulo: `COFINS (${pct(p.aliquotas.cofins)})`, valor: cofinsDevido },
      { rotulo: "( = ) Total devido no período", valor: devido, subtotal: true },
    ],
    base, baseIsenta, baseTributavel, prouni,
    pisDevido, cofinsDevido, devido,
    contabilizado,
    contabilizadoPis: contab.PIS,
    contabilizadoCofins: contab.COFINS,
    iss: contab.ISS,
    indefinido: contab.indefinido,
    divergencia: devido - contabilizado,
    // Com conta de tributo ainda sem classificar, o confronto não vale:
    // o valor indefinido pode ser PIS, COFINS ou ISS, e cada hipótese dá
    // uma divergência diferente. Melhor dizer que não dá do que dar um
    // número que parece resposta.
    confiavel: contab.indefinido < 0.005,
  };
}

const pct = (n) => `${(n * 100).toFixed(2).replace(".", ",")}%`;

/* ------------------------------------------------------------------ *
 * LALUR — Parte A
 * ------------------------------------------------------------------ */

/* As suspeitas clássicas, a partir dos grupos que a DRE já tem.
 *
 * Cada uma nasce "a confirmar" com o MOTIVO escrito, porque a
 * dedutibilidade depende de fatos que a DRE não carrega: se a provisão
 * foi revertida, se a perda foi definitiva, se a multa é de mora ou
 * punitiva. O app aponta onde olhar; quem assina decide. */
const SUSPEITAS = [
  {
    grupo: "PROVISOES_CONTINGENCIAS",
    tipo: "adicao",
    motivo: "Provisão para contingência é indedutível até a decisão final ou o pagamento (art. 13 da Lei 9.249/95). Confirmar quanto do saldo é provisão nova e quanto é reversão.",
  },
  {
    grupo: "PROVISOES_PCLD",
    tipo: "adicao",
    motivo: "A perda dedutível segue as regras do art. 9º da Lei 9.430/96 (prazo, valor e cobrança), que não coincidem com a PCLD societária. Confirmar a parcela dedutível.",
  },
  {
    grupo: "DEPRECIACAO",
    tipo: "confirmar",
    motivo: "Depreciação societária e fiscal podem divergir — inclusive a do CPC 06, que normalmente é adicionada. Confirmar contra o controle fiscal do imobilizado.",
  },
];

/** Ajustes sugeridos a partir da DRE, com origem e motivo.
 *
 *  `sugerido` significa "olhe aqui", não "adicione isto". Por isso todo
 *  ajuste sugerido nasce com `confirmar: true` e NÃO entra na soma até
 *  alguém aceitá-lo — somar por padrão produziria um lucro real que
 *  parece calculado e é um chute. */
export function sugerirAjustes(dre) {
  return SUSPEITAS
    .map((s) => {
      const valor = dre.bal?.[s.grupo]?.total || 0;
      if (Math.abs(valor) < 0.005) return null;
      return {
        id: `sug:${s.grupo}`,
        descricao: NOME_GRUPO[s.grupo] || s.grupo,
        grupo: s.grupo,
        tipo: s.tipo === "confirmar" ? "adicao" : s.tipo,
        valor: Math.abs(valor),
        motivo: s.motivo,
        origem: "sugerido",
        aceito: false,
      };
    })
    .filter(Boolean);
}

/** Junta os ajustes sugeridos com os que a pessoa cadastrou ou aceitou.
 *  O manual vence o sugerido de mesmo id — editar uma sugestão é
 *  transformá-la em decisão, não empilhar as duas. */
export function ajustesEfetivos(dre, ajustesManuais = []) {
  const porId = new Map(ajustesManuais.map((a) => [a.id, a]));
  const sugeridos = sugerirAjustes(dre).map((s) => porId.get(s.id) || s);
  const soltos = ajustesManuais.filter((a) => !a.id.startsWith("sug:"));
  return [...sugeridos, ...soltos];
}

/** LALUR Parte A: do lucro antes do IR ao IRPJ e à CSLL devidos, e o
 *  confronto com o que a DRE traz lançado.
 *
 *  Só o ajuste ACEITO entra na soma. O sugerido e não aceito aparece
 *  separado, contado como "pendente" — é a diferença entre "ainda não
 *  olhei" e "olhei e decidi que não se aplica", e ela precisa estar na
 *  tela antes de alguém assinar. */
export function apurarLalur({ dre, params, ajustes = [], prejuizo = {} }) {
  const p = comAliquotasDoRegime(params);
  const regime = regimeDe(p.regime);
  const lucroAntesIR = dre.antesIR || 0;

  const aceitos = ajustes.filter((a) => a.aceito);
  const pendentes = ajustes.filter((a) => !a.aceito);
  const adicoes = aceitos.filter((a) => a.tipo === "adicao").reduce((s, a) => s + a.valor, 0);
  const exclusoes = aceitos.filter((a) => a.tipo === "exclusao").reduce((s, a) => s + a.valor, 0);

  let base, memoria;

  if (!regime.lalur) {
    /* Lucro Presumido: não há LALUR. A base é presumida sobre a receita
       bruta, e o resultado contábil não entra na conta — mostrar a
       cascata de adições aqui sugeriria que ela importa. */
    const bruta = dre.receitaBruta || 0;
    base = bruta * p.aliquotas.presuncaoServicos;
    memoria = [
      { rotulo: "Receita bruta de serviços", valor: bruta, origem: "DRE — Mensalidades + Taxas" },
      { rotulo: `Presunção de serviços (${pct(p.aliquotas.presuncaoServicos)})`, valor: base, subtotal: true },
    ];
  } else {
    const lucroAjustado = lucroAntesIR + adicoes - exclusoes;
    /* Trava dos 30%: a compensação de prejuízo fiscal não pode reduzir o
       lucro real em mais de 30% (art. 42 da Lei 8.981/95). Sem lucro
       ajustado positivo não há o que compensar. */
    const tetoCompensacao = Math.max(0, lucroAjustado) * 0.30;
    const compensacao = Math.min(tetoCompensacao, Math.max(0, prejuizo.fiscal || 0));
    base = lucroAjustado - compensacao;
    memoria = [
      { rotulo: "Lucro antes do IRPJ e da CSLL", valor: lucroAntesIR, origem: "DRE — resultado antes do IR" },
      { rotulo: "( + ) Adições confirmadas", valor: adicoes, origem: `${aceitos.filter((a) => a.tipo === "adicao").length} ajuste(s)` },
      { rotulo: "( – ) Exclusões confirmadas", valor: -exclusoes, origem: `${aceitos.filter((a) => a.tipo === "exclusao").length} ajuste(s)` },
      { rotulo: "( = ) Lucro ajustado", valor: lucroAjustado, subtotal: true },
      {
        rotulo: "( – ) Compensação de prejuízo fiscal",
        valor: -compensacao,
        origem: `Limitada a 30% do lucro ajustado (${brlSeco(tetoCompensacao)}); saldo informado ${brlSeco(prejuizo.fiscal || 0)}`,
      },
      { rotulo: "( = ) Lucro real do período", valor: base, subtotal: true },
    ];
  }

  const lucroTributavel = Math.max(0, base);
  const limite = p.aliquotas.limiteAdicionalMensal * mesesDoPeriodo(p.periodicidade);
  const irpj = lucroTributavel * p.aliquotas.irpj;
  const adicional = Math.max(0, lucroTributavel - limite) * p.aliquotas.adicional;

  // A CSLL tem base própria no Presumido (presunção diferente) e a mesma
  // base ajustada no Real, menos a compensação de base negativa.
  let baseCSLL;
  if (!regime.lalur) {
    baseCSLL = (dre.receitaBruta || 0) * p.aliquotas.presuncaoCSLL;
  } else {
    const ajustada = lucroAntesIR + adicoes - exclusoes;
    const teto = Math.max(0, ajustada) * 0.30;
    baseCSLL = ajustada - Math.min(teto, Math.max(0, prejuizo.baseNegativa || 0));
  }
  const csll = Math.max(0, baseCSLL) * p.aliquotas.csll;

  const prouni = proporcaoProuni(dre, p);
  const bruto = irpj + adicional + csll;
  const isento = bruto * prouni.proporcao;
  const devido = bruto - isento;

  const contabilizado = Math.abs(dre.bal?.IRPJ_CSLL?.total || 0);

  return {
    regime,
    memoria,
    lucroAntesIR, adicoes, exclusoes, base, baseCSLL,
    irpj, adicional, csll, limite,
    bruto, isento, prouni, devido,
    contabilizado,
    divergencia: devido - contabilizado,
    ajustesAceitos: aceitos,
    ajustesPendentes: pendentes,
    // Ajuste sugerido e ainda não confirmado significa que a apuração
    // está incompleta por definição — e isso vale mais na tela do que o
    // número que ela mostraria.
    confiavel: pendentes.length === 0,
  };
}

/** Quantos meses o período de apuração cobre — é o que multiplica o
 *  limite de R$ 20.000 do adicional de IRPJ. */
export function mesesDoPeriodo(periodicidade) {
  if (periodicidade === "TRIMESTRAL") return 3;
  if (periodicidade === "ANUAL") return 12;
  return 1;
}

const brlSeco = (n) =>
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ *
 * O placar do bloco
 * ------------------------------------------------------------------ */

/** Um resumo para o selo do menu e para o Início: há divergência? há
 *  julgamento pendente? */
export function resumoFiscal(pisCofins, lalur) {
  const divergePis = pisCofins.confiavel && Math.abs(pisCofins.divergencia) >= 0.01;
  const divergeLalur = lalur.confiavel && Math.abs(lalur.divergencia) >= 0.01;
  const pendencias =
    (pisCofins.confiavel ? 0 : 1) + lalur.ajustesPendentes.length +
    (pisCofins.prouni.estimada ? 1 : 0);
  return {
    divergePis, divergeLalur,
    diverge: divergePis || divergeLalur,
    pendencias,
    // "Confere" só quando os dois lados conferem E não há julgamento
    // pendente. Um "confere" com metade das contas de tributo sem
    // classificar seria uma afirmação que o app não pode fazer.
    confere: !divergePis && !divergeLalur && pendencias === 0,
  };
}
