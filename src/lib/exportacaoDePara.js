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
  escreverTitulo, linhaEmBranco, marcarSubtotal, baixarWorkbook, FORMATO_MOEDA,
} from "./excelEstilo.js";

/* "Movimento no período" é coluna de PRIMEIRA classe, não detalhe.
   O arquivo vira parametrização de ERP, e a conta a cadastrar que ainda
   não teve saldo é exatamente o que ele precisa levar — mas quem confere
   o mês fechado precisa poder separar as duas de relance, sem cruzar com
   a coluna de saldo. */
const COLUNAS = [
  "Conta", "Descrição", "Grupo na DRE", "Origem do grupo",
  "Categoria CPC 51", "Origem da categoria", "Situação", "Movimento no período", "Saldo",
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
  l.categoriaNome, l.origemCategoria, situacaoDaLinha(l),
  l.semMovimento ? "sem movimento" : "com movimento", l.saldo,
];

/* NÚMERO GERADO POR NÓS NÃO PASSA PELO NEUTRALIZADOR DE FÓRMULA.
 *
 * `neutralizarFormula` prefixa com aspa simples tudo que começa com
 * `- = + @` — a defesa correta para TEXTO vindo do plano de contas e do
 * descrição do balancete, que o app não controla. Mas `dec(-40000)` produz
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

/* AS COLUNAS DA ABA "RESUMO" SÃO UMA SÓ TABELA EM DOIS NÍVEIS.
 *
 * A linha do grupo ocupa a primeira coluna e as duas últimas (quantas
 * contas, quantas a revisar); a linha de conta ocupa as do meio. As duas
 * compartilham de propósito a coluna Saldo: o total do grupo fica na
 * MESMA coluna das parcelas recolhidas debaixo dele, então abrir o grupo
 * e conferir se a composição fecha é olhar uma coluna só, sem cruzar
 * tabela nenhuma — que é para isso que a expansão existe. */
const COLUNAS_RESUMO = [
  "Grupo na DRE", "Conta", "Descrição", "Categoria CPC 51",
  "Situação", "Saldo", "Contas", "A revisar",
];

const linhaGrupo = (g) => [g.nome, null, null, null, null, g.total, g.n, g.aRevisar];
const linhaConta = (l) => [
  null, l.conta, l.descricao, l.categoriaNome, situacaoDaLinha(l), l.saldo,
];

/** A tabela por destino com as contas de cada grupo penduradas embaixo,
 *  recolhidas — o mesmo "clique no grupo para ver as contas" que a tela
 *  De-Para já faz, agora dentro do arquivo entregue.
 *
 *  Três detalhes que fazem isto funcionar no Excel de verdade:
 *
 *  - `summaryBelow: false` põe o botão de expandir na linha do GRUPO, e
 *    não na linha seguinte ao bloco. Sem isso o Excel desenha o `+` uma
 *    linha depois das contas e ninguém entende o que ele abre.
 *  - as contas nascem `hidden`, senão a planilha abriria com as
 *    centenas de linhas já esparramadas e a leitura por destino, que é
 *    um resumo, deixaria de ser resumo.
 *  - o rajado alternado corre DENTRO de cada grupo, não pelo bloco
 *    inteiro: com os grupos recolhidos, uma zebra contínua sairia
 *    quebrada quando um grupo fosse aberto. */
function escreverResumoPorGrupo(ws, grupos) {
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
  ws.properties.outlineLevelRow = 1;

  escreverCabecalhoTabela(ws, COLUNAS_RESUMO, { congelar: false });
  grupos.forEach((g) => {
    const rowGrupo = ws.addRow(linhaGrupo(g));
    rowGrupo.getCell(6).numFmt = FORMATO_MOEDA;
    marcarSubtotal(ws, rowGrupo.number, COLUNAS_RESUMO.length);

    const primeira = ws.rowCount + 1;
    g.contas.forEach((l) => {
      const row = ws.addRow(linhaConta(l));
      row.getCell(6).numFmt = FORMATO_MOEDA;
      row.outlineLevel = 1;
      row.hidden = true;
    });
    aplicarZebra(ws, primeira, ws.rowCount, COLUNAS_RESUMO.length);
  });
}

/** O De-Para inteiro como workbook — separado do download para poder ser
 *  conferido em teste sem DOM nenhum. `baixarExcelDePara` é só ele mais
 *  o clique. */
export async function montarWorkbookDePara(linhas, resumo, grupos, ctx = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gerador de DRE";
  wb.created = new Date();

  const ws = wb.addWorksheet("De-Para");
  definirLarguras(ws, [16, 48, 32, 15, 26, 18, 14, 20, 16]);
  const cabTabela = escreverCabecalhoTabela(ws, COLUNAS);
  /* O Saldo é a ÚLTIMA coluna, e o formato de moeda se ancora nisso em
     vez de num índice cravado. Uma coluna nova no meio já empurrou o
     índice fixo uma vez: o formato caía sobre a célula de texto ao lado
     e o saldo saía sem moeda, sem quebrar nada visivelmente. */
  const COL_SALDO = COLUNAS.length;
  linhas.forEach((l) => {
    const row = ws.addRow(linhaMatriz(l));
    row.getCell(COL_SALDO).numFmt = FORMATO_MOEDA;
  });
  aplicarZebra(ws, cabTabela.number + 1, ws.rowCount, COLUNAS.length);
  ws.autoFilter = { from: { row: cabTabela.number, column: 1 }, to: { row: ws.rowCount, column: COLUNAS.length } };

  const wsRes = wb.addWorksheet("Resumo");
  definirLarguras(wsRes, [34, 14, 46, 20, 14, 18, 10, 10]);
  escreverTitulo(wsRes, "DE-PARA — RESUMO DA PARAMETRIZAÇÃO", COLUNAS_RESUMO.length);
  escreverMeta(wsRes, [ctx.empresa || "Empresa"]);
  linhaEmBranco(wsRes);
  [
    ["Contas de resultado", resumo.total],
    ["Com destino na DRE", resumo.comGrupo],
    ["Fora da DRE", resumo.semGrupo],
    ["Categoria ainda a revisar", resumo.aRevisar],
    ["Decisões manuais de grupo", resumo.manuaisGrupo],
    ["Decisões manuais de categoria", resumo.manuaisCategoria],
    ["Contas sem movimento no período", resumo.semMovimento || 0],
  ].forEach((l) => escreverMeta(wsRes, l));
  linhaEmBranco(wsRes);
  escreverMeta(wsRes, ["Clique no + à esquerda de cada grupo para abrir as contas que formam o saldo."]);
  escreverResumoPorGrupo(wsRes, grupos);

  return wb;
}

/** O mesmo De-Para em Excel, com filtro automático ligado e uma aba de
 *  resumo por grupo. O filtro não é enfeite: é como se confere um
 *  mapeamento de 400 contas — filtra por grupo e lê as 14 linhas que
 *  caíram em Custos. Estilo em `excelEstilo.js`: mesmo cabeçalho de
 *  marca e rajado alternado das outras planilhas exportadas. */
export async function baixarExcelDePara(linhas, resumo, grupos, ctx = {}) {
  const wb = await montarWorkbookDePara(linhas, resumo, grupos, ctx);
  await baixarWorkbook(wb, nomeArquivo(ctx.empresa, "xlsx"));
}
