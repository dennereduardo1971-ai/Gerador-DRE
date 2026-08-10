/* Exportação da implementação do CPC 51.
 *
 * Um arquivo só, cinco abas, porque são cinco entregáveis diferentes do
 * cronograma que sempre andam juntos na mesma reunião:
 *
 *   DRE CPC 51    → Fase 5, "DRE piloto no novo formato"
 *   DFs paralelas → Fase 6, "DFs paralelas do 1º semestre (atual x CPC 51)"
 *   Conciliação   → Fase 5 passo 22 e Fase 6 passo 29 (o lucro não mudou)
 *   De-Para       → Fase 2, "Planilha De-Para do plano de contas por empresa"
 *   MPDA          → Fase 5, "Minuta de nota explicativa de MPDA"
 *   Política      → Fase 1, "Documento de política contábil de classificação"
 *
 * Tudo sai de `montarLinhas51`, `conciliar` e `deParaCPC51` — as mesmas
 * funções que desenham a tela. A regra do projeto vale igual aqui: a
 * estrutura da demonstração não se escreve duas vezes.
 */

import { montarLinhas51 } from "./linhasCPC51.js";
import { CATEGORIAS, NOME_CATEGORIA, gruposParaRevisar } from "./cpc51.js";
import { calcularMPDA, notaMPDA } from "./mpda.js";
import { matrizDRE, matrizLinhas, cabecalho, baixar, dec, neutralizarFormula, periodoLegivel } from "./exportacao.js";

const nomeArquivo = (empresa, sufixo, ext) =>
  `${sufixo}_${(empresa || "empresa").replace(/\W+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${ext}`;

const FORMATO_VALOR = '#,##0.00;[Red](#,##0.00)';

/** A minuta da nota de MPDA como arquivo de texto.
 *
 *  Texto puro de propósito: a nota vai ser colada dentro do documento das
 *  demonstrações, no editor do escritório. Um .docx aqui obrigaria a
 *  carregar uma biblioteca inteira para produzir algo que o contador
 *  formata do jeito dele de qualquer forma. */
export function baixarNotaMPDA(medidas, dre51, ctx = {}) {
  const texto = notaMPDA(medidas, dre51, {
    empresa: ctx.empresa,
    periodo: periodoLegivel(ctx),
  });
  baixar("﻿" + texto, nomeArquivo(ctx.empresa, "Nota_MPDA", "txt"), "text/plain;charset=utf-8");
}

/** O De-Para sozinho, em CSV — é o formato que TI costuma pedir para
 *  carregar no ERP na Fase 4, e ninguém quer abrir um Excel de seis abas
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

function formatarValores(XLSX, ws, linhas, primeiraLinha, colValor) {
  linhas.forEach((l, i) => {
    const r = primeiraLinha + i;
    const cv = XLSX.utils.encode_cell({ r, c: colValor });
    if (ws[cv]) ws[cv].z = FORMATO_VALOR;
    if (l.t === "secao" || l.t === "sub" || l.t === "final") {
      for (let c = 0; c <= colValor; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      }
    }
  });
}

export async function baixarExcelCPC51(ctx) {
  const XLSX = await import("xlsx");
  const { dre, dre51, conciliacao, dePara, medidas = [], politica, empresa, nomes = {} } = ctx;
  const wb = XLSX.utils.book_new();
  const base = dre?.receitaLiq || 1;

  // --- Aba 1: a demonstração na estrutura do CPC 51 ---
  const linhas51 = matrizLinhas(montarLinhas51(dre51).itens, base);
  const cab = cabecalho({ ...ctx, titulo: "DEMONSTRAÇÃO DO RESULTADO — CPC 51" });
  const aoa = [...cab, ["Linha", "Valor", "AV %"], ...linhas51.map((l) => [l.lbl, l.val ?? null, l.av ?? null])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 62 }, { wch: 18 }, { wch: 9 }];
  formatarValores(XLSX, ws, linhas51, cab.length + 1, 1);
  linhas51.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: cab.length + 1 + i, c: 2 });
    if (ws[ref]) ws[ref].z = "0.0%";
  });
  XLSX.utils.book_append_sheet(wb, ws, "DRE CPC 51");

  // --- Aba 2: as duas estruturas lado a lado ---
  /* Não é uma tabela de-para linha a linha, e não deveria ser: as duas
     estruturas têm linhas diferentes de propósito. O que se compara é o
     conjunto, e o que precisa bater é o último número de cada coluna. */
  const linhasAtual = matrizDRE(dre);
  const altura = Math.max(linhasAtual.length, linhas51.length);
  const par = [
    ["DEMONSTRAÇÕES PARALELAS — ESTRUTURA ATUAL x CPC 51"],
    [empresa || "Empresa", "", "", periodoLegivel(ctx)],
    [],
    ["Estrutura atual", "Valor", "", "Estrutura CPC 51", "Valor"],
  ];
  for (let i = 0; i < altura; i++) {
    const a = linhasAtual[i];
    const b = linhas51[i];
    par.push([a?.lbl ?? "", a?.val ?? null, "", b?.lbl ?? "", b?.val ?? null]);
  }
  par.push([]);
  par.push([
    "Lucro líquido (estrutura atual)", dre.liquido, "",
    "Resultado líquido (CPC 51)", dre51.liquido,
  ]);
  par.push([
    conciliacao.fecha
      ? "As duas estruturas fecham no mesmo resultado — o CPC 51 reclassifica, não altera o lucro."
      : "ATENÇÃO: as duas estruturas NÃO fecham no mesmo resultado. Revise o mapeamento antes de apresentar.",
    conciliacao.diferenca,
  ]);
  const wsPar = XLSX.utils.aoa_to_sheet(par);
  wsPar["!cols"] = [{ wch: 52 }, { wch: 18 }, { wch: 3 }, { wch: 62 }, { wch: 18 }];
  for (let i = 0; i < altura; i++) {
    [1, 4].forEach((c) => {
      const ref = XLSX.utils.encode_cell({ r: 4 + i, c });
      if (wsPar[ref]) wsPar[ref].z = FORMATO_VALOR;
    });
  }
  XLSX.utils.book_append_sheet(wb, wsPar, "DFs paralelas");

  // --- Aba 3: a ponte entre um operacional e outro ---
  const pontes = conciliacao.pontes;
  const conc = [
    ["CONCILIAÇÃO ENTRE AS DUAS ESTRUTURAS"],
    [empresa || "Empresa", periodoLegivel(ctx)],
    [],
    ["Do Resultado Operacional atual ao Resultado Operacional do CPC 51", "Valor"],
    ...pontes.map((p) => [p.lbl, p.val]),
    [],
    ["Prova do resultado", "Valor"],
    ["Lucro líquido — estrutura atual", dre.liquido],
    ["Resultado líquido — CPC 51", dre51.liquido],
    ["Diferença", conciliacao.diferenca],
  ];
  const wsConc = XLSX.utils.aoa_to_sheet(conc);
  wsConc["!cols"] = [{ wch: 66 }, { wch: 18 }];
  conc.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: i, c: 1 });
    if (wsConc[ref] && typeof wsConc[ref].v === "number") wsConc[ref].z = FORMATO_VALOR;
  });
  XLSX.utils.book_append_sheet(wb, wsConc, "Conciliação");

  // --- Aba 4: o De-Para conta a conta ---
  const dp = [["Conta", "Descrição", "Grupo na DRE", "Categoria CPC 51", "Origem da decisão", "Saldo"]];
  dePara.forEach((l) =>
    dp.push([l.conta, l.descricao || nomes[l.conta] || "", l.grupoNome, l.categoriaNome, l.origem, l.saldo])
  );
  const wsDp = XLSX.utils.aoa_to_sheet(dp);
  wsDp["!cols"] = [{ wch: 16 }, { wch: 46 }, { wch: 32 }, { wch: 26 }, { wch: 18 }, { wch: 16 }];
  wsDp["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: dp.length - 1, c: 5 } }) };
  XLSX.utils.book_append_sheet(wb, wsDp, "De-Para");

  // --- Aba 5: MPDA com a conciliação de cada medida ---
  const mp = [["MEDIDAS DE DESEMPENHO DEFINIDAS PELA ADMINISTRAÇÃO (MPDA)"], []];
  if (!medidas.length) {
    mp.push(["Nenhuma medida cadastrada."]);
    mp.push([
      "Se a empresa divulga EBITDA, EBITDA ajustado ou resultado recorrente, o CPC 51 exige " +
      "nota explicativa com conciliação — cadastre a medida na aba CPC 51.",
    ]);
  }
  medidas.forEach((m) => {
    const c = calcularMPDA(m, dre51);
    mp.push([m.nome, "Valor", "Efeito de tributos", "Efeito de não controladores"]);
    c.linhas.forEach((l) => mp.push([l.lbl, l.val, l.t === "l" ? "[preencher]" : "", l.t === "l" ? "[preencher]" : ""]));
    if (m.porQueUtil) mp.push(["Por que a administração usa esta medida:", m.porQueUtil]);
    mp.push([]);
  });
  const wsMp = XLSX.utils.aoa_to_sheet(mp);
  wsMp["!cols"] = [{ wch: 58 }, { wch: 18 }, { wch: 20 }, { wch: 26 }];
  mp.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: i, c: 1 });
    if (wsMp[ref] && typeof wsMp[ref].v === "number") wsMp[ref].z = FORMATO_VALOR;
  });
  XLSX.utils.book_append_sheet(wb, wsMp, "MPDA");

  // --- Aba 6: a política contábil que gerou tudo acima ---
  const pol = [
    ["POLÍTICA CONTÁBIL DE CLASSIFICAÇÃO — CPC 51"],
    [empresa || "Empresa", periodoLegivel(ctx)],
    [],
    ["Julgamento", "Definição adotada"],
    [
      "Investir em ativos é atividade de negócio principal?",
      politica?.investirEhAtividadePrincipal ? "Sim — o resultado de investimento é apresentado em operacional" : "Não",
    ],
    [
      "Conceder financiamento a clientes é atividade de negócio principal?",
      politica?.financiarClientesEhAtividadePrincipal ? "Sim — o resultado de financiamento é apresentado em operacional" : "Não",
    ],
    [],
    ["Categoria", "Definição"],
    ...CATEGORIAS.map((c) => [c.nome, c.descricao]),
    [],
    ["Grupo que exige julgamento", "Categoria adotada", "Motivo"],
    ...gruposParaRevisar(politica).map((g) => [g.nome, NOME_CATEGORIA[g.categoria] || "", g.motivo]),
  ];
  const wsPol = XLSX.utils.aoa_to_sheet(pol);
  wsPol["!cols"] = [{ wch: 52 }, { wch: 34 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsPol, "Política");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  baixar(buf, nomeArquivo(empresa, "CPC51", "xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
