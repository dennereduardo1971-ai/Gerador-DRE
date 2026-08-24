/* A apuração fiscal como planilha: LALUR Parte A, memória de PIS/COFINS,
 * os ajustes e o De-Para dos tributos.
 *
 * Três decisões herdadas do resto das exportações deste projeto:
 *
 * 1. `exceljs` entra por `import()` DINÂMICO, no clique. Ele pesa ~271 kB
 *    gzip — quase o dobro do `xlsx` — e ninguém que só quer ver a tela
 *    deve pagar por isso. (`xlsx` também não serviria: ele ignora
 *    `cell.s` ao gravar, então não escreve estilo nenhum.)
 *
 * 2. VALOR É NÚMERO, nunca texto. O destino do arquivo é conferência por
 *    totais dentro do Excel; uma célula de texto que parece número é pior
 *    que inútil ali.
 *
 * 3. A COLUNA DE ORIGEM DA DECISÃO SAI EM TODA TABELA. Sem ela, o que o
 *    app sugeriu e o que uma pessoa conferiu parecem a mesma coisa — e é
 *    justamente essa diferença que a auditoria pergunta.
 *
 * `montarWorkbookFiscal` é separada de `baixarExcelFiscal` de propósito,
 * para o teste afirmar sobre o arquivo em si sem precisar de DOM.
 */

import {
  FORMATO_MOEDA, aplicarZebra, baixarWorkbook, definirLarguras,
  escreverCabecalhoTabela, escreverMeta, escreverTitulo, linhaEmBranco, marcarSubtotal,
} from "./excelEstilo.js";
import { regimeDe } from "./fiscal.js";

const nomeArquivo = (empresa) =>
  `Apuracao_${(empresa || "empresa").replace(/\W+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;

/** Escreve uma memória de cálculo (rótulo, valor, de onde veio) numa aba. */
function escreverMemoria(ws, titulo, memoria) {
  definirLarguras(ws, [58, 18, 62]);
  escreverTitulo(ws, titulo, 3);
  const cab = escreverCabecalhoTabela(ws, ["Linha", "Valor", "De onde veio"]);
  memoria.forEach((l) => {
    const row = ws.addRow([
      l.rotulo,
      l.valor,
      // "a confirmar" precisa aparecer NA PLANILHA, não só na tela: é o
      // arquivo que chega na auditoria, e um número sem essa marca passa
      // por apurado.
      [l.confirmar ? "A CONFIRMAR" : "", l.origem || ""].filter(Boolean).join(" — "),
    ]);
    row.getCell(2).numFmt = FORMATO_MOEDA;
    if (l.subtotal) marcarSubtotal(ws, row.number, 3);
  });
  aplicarZebra(ws, cab.number + 1, ws.rowCount, 3);
  return cab;
}

export async function montarWorkbookFiscal({
  params, pisCofins, lalur, ajustes = [], linhasTributo = [], empresa, cnpj, periodo,
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gerador de DRE";
  wb.created = new Date();

  const regime = regimeDe(params.regime);

  // --- Resumo -------------------------------------------------------
  const wsRes = wb.addWorksheet("Resumo");
  definirLarguras(wsRes, [46, 22, 22, 22]);
  escreverTitulo(wsRes, "APURAÇÃO FISCAL — CONFERÊNCIA", 4);
  escreverMeta(wsRes, [empresa || "Empresa"]);
  if (cnpj) escreverMeta(wsRes, [`CNPJ ${cnpj}`]);
  escreverMeta(wsRes, ["Período", periodo || ""]);
  escreverMeta(wsRes, ["Regime", regime.nome]);
  escreverMeta(wsRes, ["Período de apuração", params.periodicidade]);
  escreverMeta(wsRes, ["Adesão ao PROUNI", params.prouni?.aderente ? "sim" : "não"]);
  linhaEmBranco(wsRes);

  /* O limite do documento, escrito NELE. A planilha circula sozinha, sem
     a tela junto — e sem esta linha ela pode ser lida como apuração
     oficial, que não é. */
  escreverMeta(wsRes, [
    "Este arquivo CONFERE o imposto lançado; não é apuração para recolhimento.",
  ]);
  linhaEmBranco(wsRes);

  /* O confronto é por par recalculado x contabilizado, e só onde a DRE
     dá o contabilizado separado. A isenção do PROUNI incide sobre o
     total de IRPJ + CSLL, e não há como reparti-la entre os dois sem
     inventar um critério — por isso IRPJ e CSLL aparecem BRUTOS, como
     memória, e o confronto é feito no total, que é o que a DRE tem
     numa linha só (grupo IRPJ e CSLL). */
  const cabRes = escreverCabecalhoTabela(wsRes, ["Tributo", "Recalculado", "Contabilizado", "Divergência"]);
  [
    ["PIS", pisCofins.pisDevido, pisCofins.contabilizadoPis],
    ["COFINS", pisCofins.cofinsDevido, pisCofins.contabilizadoCofins],
    ["PIS + COFINS", pisCofins.devido, pisCofins.contabilizado],
    ["IRPJ (bruto, antes da isenção)", lalur.irpj + lalur.adicional, null],
    ["CSLL (bruta, antes da isenção)", lalur.csll, null],
    ["IRPJ + CSLL devidos", lalur.devido, lalur.contabilizado],
  ].forEach(([nome, devido, contab]) => {
    const row = wsRes.addRow([nome, devido, contab, contab == null ? null : devido - contab]);
    [2, 3, 4].forEach((c) => { row.getCell(c).numFmt = FORMATO_MOEDA; });
  });
  aplicarZebra(wsRes, cabRes.number + 1, wsRes.rowCount, 4);

  linhaEmBranco(wsRes);
  escreverMeta(wsRes, ["O ISS lançado fica fora do confronto de PIS/COFINS.", pisCofins.iss]);

  linhaEmBranco(wsRes);
  if (!pisCofins.confiavel) {
    escreverMeta(wsRes, ["ATENÇÃO: há conta de tributo sem classificar — o confronto de PIS/COFINS não vale."]);
  }
  if (!lalur.confiavel) {
    escreverMeta(wsRes, [`ATENÇÃO: ${lalur.ajustesPendentes.length} ajuste(s) do LALUR ainda não confirmados.`]);
  }
  if (pisCofins.prouni.estimada) {
    escreverMeta(wsRes, ["A proporção isenta do PROUNI é ESTIMADA pelas bolsas sobre a receita bruta — confirmar com o termo de adesão."]);
  }

  // --- PIS/COFINS ---------------------------------------------------
  escreverMemoria(wb.addWorksheet("PIS e COFINS"), "MEMÓRIA DE CÁLCULO — PIS E COFINS", pisCofins.memoria);

  // --- LALUR --------------------------------------------------------
  const wsL = wb.addWorksheet(regime.lalur ? "LALUR Parte A" : "Base presumida");
  escreverMemoria(wsL, regime.lalur ? "LALUR — PARTE A" : "BASE PRESUMIDA", [
    ...lalur.memoria,
    { rotulo: "IRPJ", valor: lalur.irpj },
    { rotulo: `Adicional de IRPJ (acima de ${lalur.limite.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`, valor: lalur.adicional },
    { rotulo: "CSLL", valor: lalur.csll },
    { rotulo: "( = ) Total bruto", valor: lalur.bruto, subtotal: true },
    ...(lalur.prouni.proporcao > 0
      ? [{
          rotulo: "( – ) Isenção proporcional PROUNI",
          valor: -lalur.isento,
          origem: "Proporção estimada pelas bolsas sobre a receita bruta",
          confirmar: true,
        }]
      : []),
    { rotulo: "( = ) Devido no período", valor: lalur.devido, subtotal: true },
    { rotulo: "Contabilizado na DRE (grupo IRPJ e CSLL)", valor: lalur.contabilizado, origem: "DRE" },
    { rotulo: "( = ) Divergência", valor: lalur.devido - lalur.contabilizado, subtotal: true },
  ]);

  // --- Ajustes ------------------------------------------------------
  const wsA = wb.addWorksheet("Ajustes");
  definirLarguras(wsA, [44, 14, 18, 14, 16, 62]);
  escreverTitulo(wsA, "ADIÇÕES E EXCLUSÕES", 6);
  const cabA = escreverCabecalhoTabela(wsA, [
    "Descrição", "Tipo", "Valor", "Confirmado", "Origem da decisão", "Motivo",
  ]);
  ajustes.forEach((a) => {
    const row = wsA.addRow([
      a.descricao || "(sem descrição)",
      a.tipo === "exclusao" ? "Exclusão" : "Adição",
      a.valor,
      a.aceito ? "sim" : "NÃO — pendente",
      a.origem,
      a.motivo || "",
    ]);
    row.getCell(3).numFmt = FORMATO_MOEDA;
  });
  if (!ajustes.length) wsA.addRow(["Nenhum ajuste — o lucro real é o lucro contábil."]);
  aplicarZebra(wsA, cabA.number + 1, wsA.rowCount, 6);
  wsA.autoFilter = { from: { row: cabA.number, column: 1 }, to: { row: wsA.rowCount, column: 6 } };

  // --- De-Para dos tributos -----------------------------------------
  const wsT = wb.addWorksheet("De-Para tributos");
  definirLarguras(wsT, [16, 48, 18, 16, 16, 26]);
  escreverTitulo(wsT, "CONTAS DE TRIBUTO SOBRE A RECEITA", 6);
  escreverMeta(wsT, ["A DRE traz uma linha só (PIS / COFINS / ISS); esta aba é quem separa."]);
  linhaEmBranco(wsT);
  const cabT = escreverCabecalhoTabela(wsT, [
    "Conta", "Descrição", "Lançado", "Sugerido", "Tributo", "Origem da decisão",
  ]);
  linhasTributo.forEach((l) => {
    const row = wsT.addRow([
      l.conta, l.descricao, l.valor, l.sugerido || "—", l.tributo || "A CONFIRMAR", l.origem,
    ]);
    row.getCell(3).numFmt = FORMATO_MOEDA;
  });
  if (!linhasTributo.length) wsT.addRow(["Nenhuma conta no grupo PIS / COFINS / ISS."]);
  aplicarZebra(wsT, cabT.number + 1, wsT.rowCount, 6);
  wsT.autoFilter = { from: { row: cabT.number, column: 1 }, to: { row: wsT.rowCount, column: 6 } };

  return wb;
}

export async function baixarExcelFiscal(ctx) {
  const wb = await montarWorkbookFiscal(ctx);
  await baixarWorkbook(wb, nomeArquivo(ctx.empresa));
}
