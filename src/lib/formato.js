/* Formatação e normalização — as peças que toda tela e todo exportador
 * usam, sem depender de fonte de dados nenhuma.
 *
 * Era `parse.js`, e carregava junto a leitura do razão contábil
 * (mapeamento de colunas, `agregarPorConta`, competência por lançamento).
 * O razão saiu do app em 24/08/2026: o balancete de verificação é a única
 * fonte, e ele já traz o movimento somado e fechado pela contabilidade.
 * O que sobrou aqui não sabe de onde o número veio — e é isso que faz
 * este módulo ser importado por praticamente toda a interface. */

export const brl = (n) =>
  (n < 0 ? "(" : "") +
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  (n < 0 ? ")" : "");

/* Vírgula decimal, como todo o resto do app: "326,3%", não "326.3%".
   Seguro trocar porque `pct` só alimenta tela e o PNG do painel — os
   exportadores (CSV/Excel) formatam número por conta própria, e um
   percentual com ponto no meio de uma planilha em pt-BR viraria texto. */
export const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1).replace(".", ",") + "%" : "—");

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
