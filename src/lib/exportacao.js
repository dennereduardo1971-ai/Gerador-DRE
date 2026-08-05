/* Exportação da DRE em CSV e em Excel.
 *
 * As duas saídas leem a demonstração de `montarLinhas` — a mesma função
 * que desenha a tela. Antes o CSV reconstruía a DRE à mão, linha por
 * linha, com os rótulos digitados de novo: qualquer mudança na estrutura
 * exigia lembrar de alterar dois lugares, e o dia em que alguém
 * esquecesse, o arquivo entregue ao cliente divergiria silenciosamente
 * da tela conferida. Agora não há como divergir.
 */

import { GRUPOS, SINAL_GRUPO } from "./classify.js";
import { montarLinhas } from "./linhasDRE.js";
import { competenciaLegivel } from "./parse.js";

const dec = (n) => (n == null ? "" : n.toFixed(2));

function cabecalho({ empresa, cnpj, filtroMes, meses, filtroCompetencia }) {
  const periodo =
    filtroCompetencia && filtroCompetencia !== "todas"
      ? competenciaLegivel(filtroCompetencia)
      : filtroMes === "todos"
        ? (meses || []).join(" a ")
        : filtroMes;
  return [
    ["DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO"],
    [empresa || "Empresa"],
    [cnpj ? `CNPJ ${cnpj}` : ""],
    ["Período", periodo],
    [],
  ];
}

/** A demonstração como matriz: rótulo, valor, análise vertical, tipo.
 *  O tipo viaja junto para o Excel poder formatar seção/subtotal/final
 *  sem ter de adivinhar pelo texto do rótulo. */
export function matrizDRE(dre) {
  const { itens } = montarLinhas(dre);
  const base = dre.receitaLiq || 1;
  return itens.map((it) => ({
    lbl: it.lbl,
    val: it.val,
    av: it.val == null ? null : it.val / base,
    t: it.t,
  }));
}

function baixar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

const nomeArquivo = (empresa, ext) =>
  `DRE_${(empresa || "empresa").replace(/\W+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;

/** CSV com ponto e vírgula e vírgula decimal — o que o Excel em português
 *  abre sem pedir nada ao usuário. BOM no início para o acento não sair
 *  quebrado. */
export function baixarCSV(ctx) {
  const { dre, empresa, nomes } = ctx;
  const linhas = [
    ...cabecalho(ctx),
    ["Linha", "Valor", "AV %"],
    ...matrizDRE(dre).map((l) => [l.lbl, dec(l.val), l.av == null ? "" : (l.av * 100).toFixed(1)]),
    [],
    ["CONTAS POR GRUPO"],
    ["Grupo", "Conta", "Descrição", "Valor"],
  ];

  // Valor com sinal, na mesma orientação do total do grupo — igual à tela.
  GRUPOS.forEach((g) => {
    if (g.id === "IGNORAR") return;
    const sinal = SINAL_GRUPO[g.id] ?? 1;
    dre.bal[g.id].contas.forEach((c) =>
      linhas.push([g.nome, c.conta, nomes[c.conta] || "", dec(c.saldo * sinal)])
    );
  });

  const csv = linhas
    .map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\r\n")
    .replace(/(\d)\.(\d\d)"/g, '$1,$2"'); // decimal com vírgula
  baixar("\uFEFF" + csv, nomeArquivo(empresa, "csv"), "text/csv;charset=utf-8");
}

/** Excel formatado: DRE, contas por grupo e, quando o razão cobre mais de
 *  um mês, a comparativa — cada uma em sua aba, com números como NÚMERO
 *  (não texto), para o contador poder somar e filtrar em cima. */
export async function baixarExcel(ctx) {
  const XLSX = await import("xlsx");
  const { dre, empresa, nomes, dresPorCompetencia = [] } = ctx;
  const wb = XLSX.utils.book_new();

  // --- Aba DRE ---
  const linhas = matrizDRE(dre);
  const aoa = [
    ...cabecalho(ctx),
    ["Linha", "Valor", "AV %"],
    ...linhas.map((l) => [l.lbl, l.val ?? null, l.av ?? null]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 48 }, { wch: 16 }, { wch: 9 }];

  const primeiraLinha = cabecalho(ctx).length + 1; // 0-based: linha do "Linha|Valor|AV %"
  linhas.forEach((l, i) => {
    const r = primeiraLinha + 1 + i;
    const cv = XLSX.utils.encode_cell({ r, c: 1 });
    const ca = XLSX.utils.encode_cell({ r, c: 2 });
    // Negativo entre parênteses e em vermelho, como manda a convenção
    // contábil — e como a tela já mostra.
    if (ws[cv]) ws[cv].z = '#,##0.00;[Red](#,##0.00)';
    if (ws[ca]) ws[ca].z = "0.0%";
    if (l.t === "secao" || l.t === "sub" || l.t === "final") {
      [XLSX.utils.encode_cell({ r, c: 0 }), cv, ca].forEach((ref) => {
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      });
    }
  });
  XLSX.utils.book_append_sheet(wb, ws, "DRE");

  // --- Aba de contas por grupo ---
  const det = [["Grupo", "Conta", "Descrição", "Valor"]];
  GRUPOS.forEach((g) => {
    if (g.id === "IGNORAR") return;
    const sinal = SINAL_GRUPO[g.id] ?? 1;
    dre.bal[g.id].contas.forEach((c) =>
      det.push([g.nome, c.conta, nomes[c.conta] || "", c.saldo * sinal])
    );
  });
  const wsDet = XLSX.utils.aoa_to_sheet(det);
  wsDet["!cols"] = [{ wch: 32 }, { wch: 14 }, { wch: 42 }, { wch: 16 }];
  wsDet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: det.length - 1, c: 3 } }) };
  XLSX.utils.book_append_sheet(wb, wsDet, "Contas por grupo");

  // --- Aba comparativa (só se houver mais de uma competência) ---
  if (dresPorCompetencia.length > 1) {
    const colunas = dresPorCompetencia.map((d) => ({
      titulo: competenciaLegivel(d.competencia),
      valores: new Map(matrizDRE(d.dre).map((l) => [l.lbl, l.val])),
    }));
    // Esqueleto da última competência: seções condicionais aparecem
    // conforme o mês tiver movimento, e o mês mais recente representa
    // melhor a estrutura corrente.
    const esqueleto = matrizDRE(dresPorCompetencia[dresPorCompetencia.length - 1].dre);
    const comp = [["Linha", ...colunas.map((c) => c.titulo)]];
    esqueleto.forEach((l) => {
      comp.push([l.lbl, ...colunas.map((c) => c.valores.get(l.lbl) ?? null)]);
    });
    const wsComp = XLSX.utils.aoa_to_sheet(comp);
    wsComp["!cols"] = [{ wch: 48 }, ...colunas.map(() => ({ wch: 16 }))];
    XLSX.utils.book_append_sheet(wb, wsComp, "Comparativa");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  baixar(buf, nomeArquivo(empresa, "xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
