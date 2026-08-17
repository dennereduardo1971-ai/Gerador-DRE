/* Exportação do De-Para completo — os dois eixos numa planilha só.
 *
 * Difere do `baixarCSVDePara` de `exportacaoCPC51.js` de propósito:
 * aquele é o entregável da Fase 2 (conta → categoria do CPC 51, para a
 * auditoria); este é o arquivo de PARAMETRIZAÇÃO (conta → grupo da DRE
 * → categoria, com a origem de cada decisão), que é o que a TI carrega
 * no ERP na Fase 4. Mesma tabela de origem (`montarDePara`), dois
 * recortes com públicos diferentes.
 *
 * As duas saídas leem `montarDePara` — a mesma função que desenha a
 * tela. A regra do projeto vale igual aqui: a estrutura não se escreve
 * duas vezes.
 */

import { baixar, cabecalho, dec, neutralizarFormula } from "./exportacao.js";
import {
  aplicarZebra, definirLarguras, escreverCabecalhoTabela, escreverMeta,
  escreverTitulo, linhaEmBranco, baixarWorkbook, FORMATO_MOEDA,
} from "./excelEstilo.js";

const COLUNAS = [
  "Conta", "Descrição", "Grupo na DRE", "Origem do grupo",
  "Categoria CPC 51", "Origem da categoria", "Situação", "Saldo",
];

const nomeArquivo = (empresa, ext) =>
  `DePara_${(empresa || "empresa").replace(/\W+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;

/** A situação em uma palavra — a coluna que faz a planilha ser triável
 *  por "o que ainda falta" sem que ninguém precise cruzar duas colunas
 *  de origem na cabeça. */
export function situacaoDaLinha(l) {
  if (l.semGrupo) return "Fora da DRE";
  if (l.revisar) return "A revisar";
  if (l.grupoManual || l.categoriaManual) return "Decidida";
  return "Automática";
}

const linhaMatriz = (l) => [
  l.conta, l.descricao, l.grupoNome, l.origemGrupo,
  l.categoriaNome, l.origemCategoria, situacaoDaLinha(l), l.saldo,
];

/* NÚMERO GERADO POR NÓS NÃO PASSA PELO NEUTRALIZADOR DE FÓRMULA.
 *
 * `neutralizarFormula` prefixa com aspa simples tudo que começa com
 * `- = + @` — a defesa correta para TEXTO vindo do plano de contas e do
 * histórico do razão, que o app não controla. Mas `dec(-40000)` produz
 * "-40000.00", que também começa com `-`: aplicada ali, a defesa
 * transformava toda despesa numa célula de TEXTO, que o Excel não soma.
 * Num arquivo cujo destino é carga em ERP e conferência por totais, isso
 * é pior que inútil.
 *
 * A separação é segura porque a origem é diferente: o valor vem de
 * `dec()`, formatado aqui a partir de um número, e nunca de string
 * externa. Todo o resto da linha continua sendo neutralizado. */
const celulaTexto = (c) => `"${neutralizarFormula(c).replace(/"/g, '""')}"`;
const celulaNumero = (n) => `"${dec(n).replace(".", ",")}"`;

/** Uma linha de dados do CSV. Exportada para que o teste consiga provar
 *  as duas metades da regra acima numa asserção só. */
export function linhaCSV(l) {
  const m = linhaMatriz(l);
  return [...m.slice(0, -1).map(celulaTexto), celulaNumero(l.saldo)].join(";");
}

export function baixarCSVDeParaCompleto(linhas, ctx = {}) {
  const cab = [
    ...cabecalho({ ...ctx, titulo: "DE-PARA — PLANO DE CONTAS x DRE x CPC 51" }),
    COLUNAS,
  ].map((l) => l.map(celulaTexto).join(";"));

  baixar("﻿" + [...cab, ...linhas.map(linhaCSV)].join("\r\n"),
    nomeArquivo(ctx.empresa, "csv"), "text/csv;charset=utf-8");
}

/** O mesmo De-Para em Excel, com filtro automático ligado e uma aba de
 *  resumo por grupo. O filtro não é enfeite: é como se confere um
 *  mapeamento de 400 contas — filtra por grupo e lê as 14 linhas que
 *  caíram em Custos. Estilo em `excelEstilo.js`: mesmo cabeçalho de
 *  marca e rajado alternado das outras planilhas exportadas. */
export async function baixarExcelDePara(linhas, resumo, grupos, ctx = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gerador de DRE";
  wb.created = new Date();

  const ws = wb.addWorksheet("De-Para");
  definirLarguras(ws, [16, 48, 32, 15, 26, 18, 14, 16]);
  const cabTabela = escreverCabecalhoTabela(ws, COLUNAS);
  linhas.forEach((l) => {
    const row = ws.addRow(linhaMatriz(l));
    row.getCell(8).numFmt = FORMATO_MOEDA;
  });
  aplicarZebra(ws, cabTabela.number + 1, ws.rowCount, COLUNAS.length);
  ws.autoFilter = { from: { row: cabTabela.number, column: 1 }, to: { row: ws.rowCount, column: COLUNAS.length } };

  const wsRes = wb.addWorksheet("Resumo");
  definirLarguras(wsRes, [36, 12, 18, 12]);
  escreverTitulo(wsRes, "DE-PARA — RESUMO DA PARAMETRIZAÇÃO", 4);
  escreverMeta(wsRes, [ctx.empresa || "Empresa"]);
  linhaEmBranco(wsRes);
  [
    ["Contas de resultado", resumo.total],
    ["Com destino na DRE", resumo.comGrupo],
    ["Fora da DRE", resumo.semGrupo],
    ["Categoria ainda a revisar", resumo.aRevisar],
    ["Decisões manuais de grupo", resumo.manuaisGrupo],
    ["Decisões manuais de categoria", resumo.manuaisCategoria],
  ].forEach((l) => escreverMeta(wsRes, l));
  linhaEmBranco(wsRes);
  const cabGrupos = escreverCabecalhoTabela(wsRes, ["Grupo na DRE", "Contas", "Saldo", "A revisar"], { congelar: false });
  grupos.forEach((g) => {
    const row = wsRes.addRow([g.nome, g.n, g.total, g.aRevisar]);
    row.getCell(3).numFmt = FORMATO_MOEDA;
  });
  aplicarZebra(wsRes, cabGrupos.number + 1, wsRes.rowCount, 4);

  await baixarWorkbook(wb, nomeArquivo(ctx.empresa, "xlsx"));
}
