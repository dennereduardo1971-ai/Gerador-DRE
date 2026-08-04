/* Leitura e normalização do razão contábil importado. */

export const brl = (n) =>
  (n < 0 ? "(" : "") +
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  (n < 0 ? ")" : "");

export const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "—");

/** Converte "1.234,56", "1234,56" ou "1234.56" para número. */
export function numeroBR(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/[R$\s]/g, "");
  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");
  if (temVirgula && temPonto) s = s.replace(/\./g, "").replace(",", ".");
  else if (temVirgula) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Decodifica tentando UTF-8 e caindo para Windows-1252 (padrão de exportação
 *  da maioria dos sistemas contábeis brasileiros). */
export async function lerTexto(file) {
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder("utf-8").decode(buf);
  if (txt.includes("\uFFFD")) txt = new TextDecoder("windows-1252").decode(buf);
  return txt;
}

/** Acha a coluna do CSV cujo nome bate com um dos termos, ignorando acentos
 *  e pontuação — primeiro por igualdade exata, depois por inclusão. */
export function acharColuna(cols, ...termos) {
  const norm = (s) =>
    String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  for (const t of termos) {
    const alvo = norm(t);
    const hit = cols.find((c) => norm(c) === alvo);
    if (hit) return hit;
  }
  for (const t of termos) {
    const alvo = norm(t);
    const hit = cols.find((c) => norm(c).includes(alvo));
    if (hit) return hit;
  }
  return "";
}

/** Descobre o mapeamento de colunas de um razão a partir do cabeçalho. */
export function mapearColunas(campos) {
  return {
    contaD: acharColuna(campos, "cta. debito", "conta debito", "debito"),
    contaC: acharColuna(campos, "cta. credito", "conta credito", "credito"),
    valorD: acharColuna(campos, "valor debito", "vlr debito", "debito"),
    valorC: acharColuna(campos, "valor credito", "vlr credito", "credito"),
    hist: acharColuna(campos, "historico", "descricao", "complemento"),
    data: acharColuna(campos, "dia/mes", "data", "mes"),
    ano: acharColuna(campos, "ano"),
    cc: acharColuna(campos, "c.custo debito", "centro de custo", "ccusto"),
  };
}

const MESES_ABREV = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** Extrai a competência (mês/ano) de uma linha, a partir da data e do ano.
 *  Aceita "DD/mmm" + ano separado (formato comum de razão brasileiro) ou uma
 *  data completa "DD/MM/AAAA". Retorna algo como "07/2026", ou "" se não der
 *  para reconhecer o formato — nesse caso a linha não entra na análise
 *  horizontal, mas continua valendo para os totais normais. */
export function competenciaDaLinha(dataStr, anoStr) {
  if (!dataStr) return "";
  const s = String(dataStr).trim().toLowerCase();
  const partes = s.split("/");
  if (partes.length >= 2) {
    const mesTxt = partes[1];
    const mesNum = MESES_ABREV[mesTxt.slice(0, 3)] || (/^\d{1,2}$/.test(mesTxt) ? mesTxt.padStart(2, "0") : null);
    if (mesNum) {
      const ano = partes[2] || anoStr;
      if (ano) return `${mesNum}/${String(ano).trim()}`;
    }
  }
  return "";
}

const NOME_MES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export function competenciaLegivel(comp) {
  const [mes, ano] = comp.split("/");
  return `${NOME_MES[Number(mes)] || mes}/${ano}`;
}

/** Agrega as linhas do razão por conta, respeitando filtros de mês e centro
 *  de custo. Mantém uma amostra ampla do histórico de cada conta (até 20 mil
 *  caracteres) para que a classificação por padrão de texto tenha material
 *  suficiente mesmo em contas com milhares de lançamentos. */
export function agregarPorConta(linhas, map, filtroMes, filtroCC) {
  const acc = {};
  let tDeb = 0, tCre = 0;
  const setMeses = new Set(), setCC = new Set();
  const LIMITE_HISTORICO = 20000;
  const porCompetencia = {}; // competencia -> { contas: { conta: {deb,cre} } }

  for (const l of linhas) {
    const mes = map.data ? String(l[map.data] ?? "").trim() : "";
    const cc = map.cc ? String(l[map.cc] ?? "").trim() : "";
    if (mes) setMeses.add(mes);
    if (cc) setCC.add(cc);
    if (filtroMes !== "todos" && mes !== filtroMes) continue;
    if (filtroCC !== "todos" && cc !== filtroCC) continue;

    const vd = numeroBR(l[map.valorD]);
    const vc = numeroBR(l[map.valorC]);
    tDeb += vd; tCre += vc;
    const cd = String(l[map.contaD] ?? "").trim();
    const cc2 = String(l[map.contaC] ?? "").trim();
    const h = map.hist ? String(l[map.hist] ?? "") : "";
    const comp = competenciaDaLinha(mes, map.ano ? l[map.ano] : "");

    if (cd && vd) {
      acc[cd] = acc[cd] || { conta: cd, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cd].deb += vd; acc[cd].n++;
      if (acc[cd].historico.length < LIMITE_HISTORICO) acc[cd].historico += " " + h;
      if (comp) {
        porCompetencia[comp] = porCompetencia[comp] || {};
        porCompetencia[comp][cd] = porCompetencia[comp][cd] || { deb: 0, cre: 0 };
        porCompetencia[comp][cd].deb += vd;
      }
    }
    if (cc2 && vc) {
      acc[cc2] = acc[cc2] || { conta: cc2, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cc2].cre += vc; acc[cc2].n++;
      if (acc[cc2].historico.length < LIMITE_HISTORICO) acc[cc2].historico += " " + h;
      if (comp) {
        porCompetencia[comp] = porCompetencia[comp] || {};
        porCompetencia[comp][cc2] = porCompetencia[comp][cc2] || { deb: 0, cre: 0 };
        porCompetencia[comp][cc2].cre += vc;
      }
    }
  }

  const contas = Object.values(acc).map((c) => ({ ...c, saldo: c.cre - c.deb }));
  contas.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  const competencias = Object.keys(porCompetencia).sort();
  const contasPorCompetencia = {};
  competencias.forEach((comp) => {
    contasPorCompetencia[comp] = Object.entries(porCompetencia[comp]).map(([conta, v]) => ({
      conta, deb: v.deb, cre: v.cre, saldo: v.cre - v.deb,
      historico: acc[conta] ? acc[conta].historico : "",
    }));
  });

  return {
    contas, tDeb, tCre, nLinhas: linhas.length,
    meses: [...setMeses], ccs: [...setCC].sort(),
    competencias, contasPorCompetencia,
  };
}

/** Importa um CSV de duas colunas (código;descrição) como plano de contas. */
export function parsearPlanoDeContas(dataRows) {
  const nomes = {};
  dataRows.forEach((l) => {
    if (!l || l.length < 2) return;
    const cod = String(l[0]).replace(/\D/g, "");
    const desc = String(l[1]).trim();
    if (cod && desc) nomes[cod] = desc;
  });
  return nomes;
}
