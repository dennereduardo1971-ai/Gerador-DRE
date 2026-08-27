/* Exportação da implementação do CPC 51.
 *
 * Um arquivo só, sete abas, porque são sete entregáveis diferentes do
 * cronograma que sempre andam juntos na mesma reunião:
 *
 *   DRE CPC 51            → Fase 5, "DRE piloto no novo formato"
 *   DR_CPC_51_Detalhada   → o drill-down: as mesmas linhas, com as contas
 *                           de cada tópico penduradas embaixo, recolhidas
 *   DFs paralelas         → Fase 6, "DFs paralelas do 1º semestre (atual x CPC 51)"
 *   Conciliação           → Fase 5 passo 22 e Fase 6 passo 29 (o lucro não mudou)
 *   De-Para               → Fase 2, "Planilha De-Para do plano de contas por empresa"
 *   MPDA                  → Fase 5, "Minuta de nota explicativa de MPDA"
 *   Política              → Fase 1, "Documento de política contábil de classificação"
 *
 * Tudo sai de `montarLinhas51`, `conciliar` e `deParaCPC51` — as mesmas
 * funções que desenham a tela. A regra do projeto vale igual aqui: a
 * estrutura da demonstração não se escreve duas vezes.
 */

import { montarLinhas51 } from "./linhasCPC51.js";
import { CATEGORIAS, NOME_CATEGORIA, gruposParaRevisar } from "./cpc51.js";
import { descricaoDaConta } from "./depara.js";
import { calcularMPDA, notaMPDA } from "./mpda.js";
import { matrizDRE, matrizLinhas, cabecalho, baixar, dec, neutralizarFormula } from "./exportacao.js";
import {
  aplicarZebra, definirLarguras, escreverCabecalhoTabela, escreverMeta,
  escreverTitulo, linhaEmBranco, marcarSubtotal, baixarWorkbook,
  FORMATO_MOEDA, FORMATO_PCT,
} from "./excelEstilo.js";

const nomeArquivo = (empresa, sufixo, ext) =>
  `${sufixo}_${(empresa || "empresa").replace(/\W+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;

const FORMATO_VALOR = FORMATO_MOEDA;

/** A primeira coluna da demonstração do CPC 51, no formato do modelo
 *  usado como base: a linha e o subtotal que fecham um bloco levam o
 *  nome da categoria; os subtotais que atravessam categorias (resultado
 *  antes do financiamento, antes dos tributos, das operações
 *  continuadas) são "Subtotal", e o resultado do período é "Final". */
function rotuloCategoria(l) {
  if (l.cat) return NOME_CATEGORIA[l.cat] || l.cat;
  return l.t === "final" ? "Final" : "Subtotal";
}

/** A minuta da nota de MPDA como arquivo de texto.
 *
 *  Texto puro de propósito: a nota vai ser colada dentro do documento das
 *  demonstrações, no editor do escritório. Um .docx aqui obrigaria a
 *  carregar uma biblioteca inteira para produzir algo que o contador
 *  formata do jeito dele de qualquer forma. */
export function baixarNotaMPDA(medidas, dre51, ctx = {}) {
  const texto = notaMPDA(medidas, dre51, {
    empresa: ctx.empresa,
    periodo: ctx.periodo || "",
  });
  baixar("﻿" + texto, nomeArquivo(ctx.empresa, "Nota_MPDA", "txt"), "text/plain;charset=utf-8");
}

/** O De-Para sozinho, em CSV — é o formato que TI costuma pedir para
 *  carregar no ERP na Fase 4, e ninguém quer abrir um Excel de sete abas
 *  para extrair uma. */
export function baixarCSVDePara(dePara, ctx = {}) {
  const linhas = [
    ...cabecalho({ ...ctx, titulo: "DE-PARA — PLANO DE CONTAS x CATEGORIAS DO CPC 51" }),
    ["Conta", "Descrição", "Grupo na DRE", "Categoria CPC 51", "Origem da decisão", "Saldo"],
    ...dePara.map((l) => [l.conta, l.descricao, l.grupoNome, l.categoriaNome, l.origem, dec(l.saldo)]),
  ];
  const csv = linhas
    .map((l) => l.map((c) => `"${neutralizarFormula(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n")
    .replace(/(\d)\.(\d\d)"/g, '$1,$2"');
  baixar("﻿" + csv, nomeArquivo(ctx.empresa, "DePara_CPC51", "csv"), "text/csv;charset=utf-8");
}

/** O Excel de sete abas como workbook — separado do download pelo mesmo
 *  motivo que em `exportacaoDePara.js`: assim o teste afirma sobre o
 *  arquivo em si (colunas, código de linha, coluna comparativa) sem
 *  precisar de DOM. */
export async function montarWorkbookCPC51(ctx) {
  const ExcelJS = (await import("exceljs")).default;
  const { dre, dre51, conciliacao, dePara, medidas = [], politica, empresa, nomes = {}, comparativo = null } = ctx;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gerador de DRE";
  wb.created = new Date();
  const base = dre?.receitaLiq || 1;

  // --- Aba 1: a demonstração na estrutura do CPC 51 ---
  /* O LAYOUT DESTA ABA SEGUE O MODELO DE DRE DO CPC 51 QUE O CLIENTE USA
     COMO BASE: categoria, código da linha, descrição, o período, o
     comparativo e uma coluna de notas.

     O que foi adotado dele é o LAYOUT — as colunas e a ordem em que se
     lê a demonstração. As LINHAS continuam sendo as da DRE deste app,
     que saem dos grupos validados centavo a centavo contra a
     demonstração oficial. Trocar as linhas pelas do modelo seria
     remapear conta a conta e perder essa validação; trocar as colunas
     não muda número nenhum.

     A coluna de notas sai VAZIA de propósito: a referência da nota
     explicativa é decisão de quem redige as demonstrações, e preencher
     por conta própria seria inventar uma referência que não existe. */
  const itens51 = montarLinhas51(dre51).itens;
  const linhas51 = matrizLinhas(itens51, base);
  const rotuloPeriodo = ctx.periodo || "Período";
  const COLS_DRE51 = [
    "Categoria CPC 51", "Código", "Descrição", rotuloPeriodo,
    comparativo ? comparativo.rotulo : "Comparativo", "AV %", "Notas",
  ];
  const ws = wb.addWorksheet("DRE CPC 51");
  definirLarguras(ws, [24, 10, 58, 18, 18, 9, 24]);
  escreverTitulo(ws, "DEMONSTRAÇÃO DO RESULTADO — CPC 51", COLS_DRE51.length);
  cabecalho(ctx).slice(1).forEach((l) => { if (l.length) escreverMeta(ws, l); else linhaEmBranco(ws); });
  if (!comparativo) {
    escreverMeta(ws, [
      "Coluna comparativa em branco: o arquivo importado não traz o período anterior. " +
      "O CPC 51 exige 2027 com 2026 reapresentado — preencha ao consolidar os dois exercícios.",
    ]);
    linhaEmBranco(ws);
  }
  const cab1 = escreverCabecalhoTabela(ws, COLS_DRE51);
  linhas51.forEach((l) => {
    const row = ws.addRow([
      rotuloCategoria(l), l.cod ?? null, l.lbl, l.val ?? null,
      comparativo ? comparativo.valores[l.lbl] ?? null : null, l.av ?? null, null,
    ]);
    row.getCell(4).numFmt = FORMATO_VALOR;
    row.getCell(5).numFmt = FORMATO_VALOR;
    row.getCell(6).numFmt = FORMATO_PCT;
    if (l.t === "secao" || l.t === "sub" || l.t === "final") marcarSubtotal(ws, row.number, COLS_DRE51.length);
  });
  aplicarZebra(ws, cab1.number + 1, ws.rowCount, COLS_DRE51.length);

  // --- Aba 2: a mesma demonstração, com as contas de cada tópico abertas ---
  /* O QUE O CLIENTE PEDIU: clicar num tópico da DRE e ver as contas que
     formam aquele saldo, dentro do próprio Excel. O Excel não tem clique
     de app — o equivalente nativo é o agrupamento de linhas (o `+` da
     margem esquerda), o mesmo recurso que já abre a aba "Resumo" do
     De-Para (`exportacaoDePara.js`).

     As linhas são as MESMAS de `montarLinhas51` — nenhuma estrutura nova,
     só a árvore de contas que `montarDRE51` já monta dentro de cada grupo
     (`dre51.cat[categoria].grupos[i].contas`) pendurada embaixo da linha
     do tópico. Abrir o grupo nunca pode mostrar composição diferente da
     que somou o valor de cima, porque é a mesma lista. */
  const COLS_DET = [
    "Categoria CPC 51", "Código", "Descrição", rotuloPeriodo, "AV %",
    "Conta", "Descrição da conta", "Saldo da conta",
  ];
  const wsDet = wb.addWorksheet("DR_CPC_51_Detalhada");
  wsDet.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
  wsDet.properties.outlineLevelRow = 1;
  definirLarguras(wsDet, [22, 9, 46, 16, 8, 14, 40, 16]);
  escreverTitulo(wsDet, "DEMONSTRAÇÃO DO RESULTADO — CPC 51 (DETALHADA POR CONTA)", COLS_DET.length);
  cabecalho(ctx).slice(1).forEach((l) => { if (l.length) escreverMeta(wsDet, l); else linhaEmBranco(wsDet); });
  escreverMeta(wsDet, ["Clique no + à esquerda de cada tópico para abrir as contas que formam o saldo."]);
  linhaEmBranco(wsDet);
  escreverCabecalhoTabela(wsDet, COLS_DET);
  itens51.forEach((l) => {
    const av = l.val == null ? null : l.val / base;
    const row = wsDet.addRow([rotuloCategoria(l), l.cod ?? null, l.lbl, l.val ?? null, av, null, null, null]);
    row.getCell(4).numFmt = FORMATO_VALOR;
    row.getCell(5).numFmt = FORMATO_PCT;
    row.getCell(8).numFmt = FORMATO_VALOR;
    if (l.t === "secao" || l.t === "sub" || l.t === "final") {
      marcarSubtotal(wsDet, row.number, COLS_DET.length);
      return;
    }
    const contas = dre51.cat[l.cat]?.grupos.find((g) => g.id === l.id)?.contas || [];
    if (!contas.length) return;
    marcarSubtotal(wsDet, row.number, COLS_DET.length); // o tópico é o "cabeçalho" das contas abaixo
    const primeira = wsDet.rowCount + 1;
    contas.forEach((c) => {
      const rowC = wsDet.addRow([null, null, null, null, null, c.conta, descricaoDaConta(c, nomes), c.saldo]);
      rowC.getCell(8).numFmt = FORMATO_VALOR;
      rowC.outlineLevel = 1;
      rowC.hidden = true;
    });
    aplicarZebra(wsDet, primeira, wsDet.rowCount, COLS_DET.length);
  });

  // --- Aba 3: as duas estruturas lado a lado ---
  /* Não é uma tabela de-para linha a linha, e não deveria ser: as duas
     estruturas têm linhas diferentes de propósito. O que se compara é o
     conjunto, e o que precisa bater é o último número de cada coluna. */
  const linhasAtual = matrizDRE(dre);
  const altura = Math.max(linhasAtual.length, linhas51.length);
  const wsPar = wb.addWorksheet("DFs paralelas");
  definirLarguras(wsPar, [52, 18, 3, 62, 18]);
  escreverTitulo(wsPar, "DEMONSTRAÇÕES PARALELAS — ESTRUTURA ATUAL x CPC 51", 5);
  escreverMeta(wsPar, [empresa || "Empresa", "", "", ctx.periodo || ""]);
  linhaEmBranco(wsPar);
  const cab2 = escreverCabecalhoTabela(wsPar, ["Estrutura atual", "Valor", "", "Estrutura CPC 51", "Valor"]);
  for (let i = 0; i < altura; i++) {
    const a = linhasAtual[i];
    const b = linhas51[i];
    const row = wsPar.addRow([a?.lbl ?? "", a?.val ?? null, "", b?.lbl ?? "", b?.val ?? null]);
    row.getCell(2).numFmt = FORMATO_VALOR;
    row.getCell(5).numFmt = FORMATO_VALOR;
  }
  aplicarZebra(wsPar, cab2.number + 1, wsPar.rowCount, 5);
  linhaEmBranco(wsPar);
  const rowLL = wsPar.addRow([
    "Lucro líquido (estrutura atual)", dre.liquido, "",
    "Resultado líquido (CPC 51)", dre51.liquido,
  ]);
  rowLL.getCell(2).numFmt = FORMATO_VALOR;
  rowLL.getCell(5).numFmt = FORMATO_VALOR;
  marcarSubtotal(wsPar, rowLL.number, 5);
  const rowProva = wsPar.addRow([
    conciliacao.fecha
      ? "As duas estruturas fecham no mesmo resultado — o CPC 51 reclassifica, não altera o lucro."
      : "ATENÇÃO: as duas estruturas NÃO fecham no mesmo resultado. Revise o mapeamento antes de apresentar.",
    conciliacao.diferenca,
  ]);
  rowProva.getCell(2).numFmt = FORMATO_VALOR;
  if (!conciliacao.fecha) rowProva.getCell(1).font = { color: { argb: "FFB0302F" }, bold: true };

  // --- Aba 4: a ponte entre um operacional e outro ---
  const wsConc = wb.addWorksheet("Conciliação");
  definirLarguras(wsConc, [66, 18]);
  escreverTitulo(wsConc, "CONCILIAÇÃO ENTRE AS DUAS ESTRUTURAS", 2);
  escreverMeta(wsConc, [empresa || "Empresa", ctx.periodo || ""]);
  linhaEmBranco(wsConc);
  const cab3 = escreverCabecalhoTabela(wsConc, ["Do Resultado Operacional atual ao Resultado Operacional do CPC 51", "Valor"]);
  conciliacao.pontes.forEach((p) => { wsConc.addRow([p.lbl, p.val]).getCell(2).numFmt = FORMATO_VALOR; });
  aplicarZebra(wsConc, cab3.number + 1, wsConc.rowCount, 2);
  linhaEmBranco(wsConc);
  escreverCabecalhoTabela(wsConc, ["Prova do resultado", "Valor"], { congelar: false });
  [
    ["Lucro líquido — estrutura atual", dre.liquido],
    ["Resultado líquido — CPC 51", dre51.liquido],
    ["Diferença", conciliacao.diferenca],
  ].forEach((l, i) => {
    const row = wsConc.addRow(l);
    row.getCell(2).numFmt = FORMATO_VALOR;
    if (i === 2) marcarSubtotal(wsConc, row.number, 2);
  });

  // --- Aba 5: o De-Para conta a conta ---
  const wsDp = wb.addWorksheet("De-Para");
  definirLarguras(wsDp, [16, 46, 32, 26, 18, 16]);
  const cab4 = escreverCabecalhoTabela(wsDp, ["Conta", "Descrição", "Grupo na DRE", "Categoria CPC 51", "Origem da decisão", "Saldo"]);
  dePara.forEach((l) => {
    const row = wsDp.addRow([l.conta, l.descricao || nomes[l.conta] || "", l.grupoNome, l.categoriaNome, l.origem, l.saldo]);
    row.getCell(6).numFmt = FORMATO_VALOR;
  });
  aplicarZebra(wsDp, cab4.number + 1, wsDp.rowCount, 6);
  wsDp.autoFilter = { from: { row: cab4.number, column: 1 }, to: { row: wsDp.rowCount, column: 6 } };

  // --- Aba 6: MPDA com a conciliação de cada medida ---
  const wsMp = wb.addWorksheet("MPDA");
  definirLarguras(wsMp, [58, 18, 20, 26]);
  escreverTitulo(wsMp, "MEDIDAS DE DESEMPENHO DEFINIDAS PELA ADMINISTRAÇÃO (MPDA)", 4);
  linhaEmBranco(wsMp);
  if (!medidas.length) {
    escreverMeta(wsMp, ["Nenhuma medida cadastrada."]);
    escreverMeta(wsMp, [
      "Se a empresa divulga EBITDA, EBITDA ajustado ou resultado recorrente, o CPC 51 exige " +
      "nota explicativa com conciliação — cadastre a medida na aba CPC 51.",
    ]);
  }
  medidas.forEach((m) => {
    const c = calcularMPDA(m, dre51);
    escreverCabecalhoTabela(wsMp, [m.nome, "Valor", "Efeito de tributos", "Efeito de não controladores"], { congelar: false });
    const primeira = wsMp.rowCount + 1;
    c.linhas.forEach((l) => {
      const row = wsMp.addRow([l.lbl, l.val, l.t === "l" ? "[preencher]" : "", l.t === "l" ? "[preencher]" : ""]);
      row.getCell(2).numFmt = FORMATO_VALOR;
      if (l.t === "sub" || l.t === "final") marcarSubtotal(wsMp, row.number, 4);
    });
    aplicarZebra(wsMp, primeira, wsMp.rowCount, 4);
    if (m.porQueUtil) escreverMeta(wsMp, ["Por que a administração usa esta medida:", m.porQueUtil]);
    linhaEmBranco(wsMp);
  });

  // --- Aba 7: a política contábil que gerou tudo acima ---
  const wsPol = wb.addWorksheet("Política");
  definirLarguras(wsPol, [52, 34, 90]);
  escreverTitulo(wsPol, "POLÍTICA CONTÁBIL DE CLASSIFICAÇÃO — CPC 51", 3);
  escreverMeta(wsPol, [empresa || "Empresa", ctx.periodo || ""]);
  linhaEmBranco(wsPol);
  const cabJ = escreverCabecalhoTabela(wsPol, ["Julgamento", "Definição adotada"], { congelar: false });
  [
    [
      "Investir em ativos é atividade de negócio principal?",
      politica?.investirEhAtividadePrincipal ? "Sim — o resultado de investimento é apresentado em operacional" : "Não",
    ],
    [
      "Conceder financiamento a clientes é atividade de negócio principal?",
      politica?.financiarClientesEhAtividadePrincipal ? "Sim — o resultado de financiamento é apresentado em operacional" : "Não",
    ],
  ].forEach((l) => wsPol.addRow(l));
  aplicarZebra(wsPol, cabJ.number + 1, wsPol.rowCount, 2);
  linhaEmBranco(wsPol);
  const cabCat = escreverCabecalhoTabela(wsPol, ["Categoria", "Definição"], { congelar: false });
  CATEGORIAS.forEach((c) => wsPol.addRow([c.nome, c.descricao]));
  aplicarZebra(wsPol, cabCat.number + 1, wsPol.rowCount, 2);
  linhaEmBranco(wsPol);
  const cabRev = escreverCabecalhoTabela(wsPol, ["Grupo que exige julgamento", "Categoria adotada", "Motivo"], { congelar: false });
  gruposParaRevisar(politica).forEach((g) => wsPol.addRow([g.nome, NOME_CATEGORIA[g.categoria] || "", g.motivo]));
  aplicarZebra(wsPol, cabRev.number + 1, wsPol.rowCount, 3);

  return wb;
}

export async function baixarExcelCPC51(ctx) {
  const wb = await montarWorkbookCPC51(ctx);
  await baixarWorkbook(wb, nomeArquivo(ctx.empresa, "CPC51", "xlsx"));
}
