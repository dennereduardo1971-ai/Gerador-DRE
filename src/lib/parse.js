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
    cc: acharColuna(campos, "c.custo debito", "centro de custo", "ccusto"),
  };
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

    if (cd && vd) {
      acc[cd] = acc[cd] || { conta: cd, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cd].deb += vd; acc[cd].n++;
      if (acc[cd].historico.length < LIMITE_HISTORICO) acc[cd].historico += " " + h;
    }
    if (cc2 && vc) {
      acc[cc2] = acc[cc2] || { conta: cc2, deb: 0, cre: 0, n: 0, historico: "" };
      acc[cc2].cre += vc; acc[cc2].n++;
      if (acc[cc2].historico.length < LIMITE_HISTORICO) acc[cc2].historico += " " + h;
    }
  }

  const contas = Object.values(acc).map((c) => ({ ...c, saldo: c.cre - c.deb }));
  contas.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));

  return {
    contas, tDeb, tCre, nLinhas: linhas.length,
    meses: [...setMeses], ccs: [...setCC].sort(),
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
