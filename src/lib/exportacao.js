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
import {
  aplicarZebra, definirLarguras, escreverCabecalhoTabela, escreverMeta,
  escreverTitulo, linhaEmBranco, marcarSubtotal, baixarWorkbook,
  FORMATO_MOEDA, FORMATO_PCT,
} from "./excelEstilo.js";

/** Neutraliza injeção de fórmula em CSV.
 *
 *  Excel e LibreOffice avaliam como FÓRMULA qualquer célula que comece
 *  com `=`, `+`, `-`, `@`, tab ou retorno de carro. Uma descrição de
 *  conta como `=HYPERLINK("http://...&"&A1)` vira link clicável que
 *  vaza dados da planilha ao ser aberto; `=cmd|...` chega a executar
 *  comando no Windows com uma confirmação.
 *
 *  Isso importa aqui porque o texto vem do plano de contas e do
 *  descrição do balancete — dados que o app não controla e que passam por
 *  vários sistemas antes de chegar. E o destino do CSV é justamente ser
 *  aberto no Excel por um contador, que é quem menos espera isso.
 *
 *  A defesa padrão é prefixar com aspa simples, que o Excel consome ao
 *  exibir: o texto aparece igual, mas não é avaliado. */
export const PERIGO_FORMULA = /^[=+\-@\t\r]/;
export function neutralizarFormula(v) {
  const s = String(v ?? "");
  return PERIGO_FORMULA.test(s) ? `'${s}` : s;
}

export const dec = (n) => (n == null ? "" : n.toFixed(2));

/* O período do arquivo exportado é o do BALANCETE, que o declara sozinho
   na aba de parâmetros ("Data Inicial"/"Data Final") — ver
   `periodoDoBalancete` e `periodoLegivel` em balancete.js. Antes vinha
   das competências do razão, e por muito tempo veio de `meses`, que
   apesar do nome era a lista de DIAS do arquivo: um Set sem ordem
   cronológica, que produzia "01/jan a 29/mar" para um arquivo de janeiro
   a junho. Com o balancete não há o que deduzir — o arquivo diz. */
export function cabecalho({ empresa, cnpj, periodo, titulo }) {
  return [
    [titulo || "DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO"],
    [empresa || "Empresa"],
    [cnpj ? `CNPJ ${cnpj}` : ""],
    ["Período", periodo || ""],
    [],
  ];
}

/** Uma demonstração já montada em linhas vira matriz: rótulo, valor,
 *  análise vertical, tipo. O tipo viaja junto para o Excel poder formatar
 *  seção/subtotal/final sem ter de adivinhar pelo texto do rótulo.
 *
 *  Separado de `matrizDRE` porque a demonstração do CPC 51 é outra
 *  estrutura de linhas com a mesma forma — e as duas exportações têm que
 *  formatar igual, hoje e depois de qualquer mudança. */
export function matrizLinhas(itens, base) {
  const b = base || 1;
  return itens.map((it) => ({
    lbl: it.lbl,
    val: it.val,
    av: it.val == null ? null : it.val / b,
    t: it.t,
    /* `cat` e `cod` só existem na demonstração do CPC 51 (a estrutura
       atual não tem categoria nem código de linha). Viajam aqui em vez
       de a exportação ir buscá-los por fora: a matriz é o que o Excel
       escreve, e o que ela não carrega o Excel não tem de onde tirar. */
    cat: it.cat ?? null,
    cod: it.cod ?? null,
  }));
}

export function matrizDRE(dre) {
  return matrizLinhas(montarLinhas(dre).itens, dre.receitaLiq || 1);
}

export function baixar(conteudo, nome, tipo) {
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
    .map((l) => l.map((c) => `"${neutralizarFormula(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n")
    .replace(/(\d)\.(\d\d)"/g, '$1,$2"'); // decimal com vírgula
  baixar("\uFEFF" + csv, nomeArquivo(empresa, "csv"), "text/csv;charset=utf-8");
}

/** Excel estilizado: DRE, contas por grupo e, quando há mais
 *  de um mês, a comparativa — cada uma em sua aba, com números como
 *  NÚMERO (não texto), para o contador poder somar e filtrar em cima, e
 *  com o mesmo visual "Razão" da tela: cabeçalho de marca, rajado
 *  alternado, subtotal em negrito. Ver `excelEstilo.js` para o porquê de
 *  `exceljs` em vez de `xlsx` aqui. */
export async function baixarExcel(ctx) {
  const ExcelJS = (await import("exceljs")).default;
  const { dre, empresa, nomes, dresPorCompetencia = [] } = ctx;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gerador de DRE";
  wb.created = new Date();

  // --- Aba DRE ---
  const ws = wb.addWorksheet("DRE");
  definirLarguras(ws, [48, 16, 9]);
  escreverTitulo(ws, cabecalho(ctx)[0]?.[0] || "DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO", 3);
  cabecalho(ctx).slice(1).forEach((l) => { if (l.length) escreverMeta(ws, l); else linhaEmBranco(ws); });
  const cabTabela = escreverCabecalhoTabela(ws, ["Linha", "Valor", "AV %"]);

  const linhas = matrizDRE(dre);
  linhas.forEach((l) => {
    const row = ws.addRow([l.lbl, l.val ?? null, l.av ?? null]);
    row.getCell(2).numFmt = FORMATO_MOEDA;
    row.getCell(3).numFmt = FORMATO_PCT;
    if (l.t === "secao" || l.t === "sub" || l.t === "final") marcarSubtotal(ws, row.number, 3);
  });
  aplicarZebra(ws, cabTabela.number + 1, ws.rowCount, 3);

  // --- Aba de contas por grupo ---
  const wsDet = wb.addWorksheet("Contas por grupo");
  definirLarguras(wsDet, [32, 14, 42, 16]);
  const cabDet = escreverCabecalhoTabela(wsDet, ["Grupo", "Conta", "Descrição", "Valor"]);
  GRUPOS.forEach((g) => {
    if (g.id === "IGNORAR") return;
    const sinal = SINAL_GRUPO[g.id] ?? 1;
    dre.bal[g.id].contas.forEach((c) => {
      const row = wsDet.addRow([g.nome, c.conta, nomes[c.conta] || "", c.saldo * sinal]);
      row.getCell(4).numFmt = FORMATO_MOEDA;
    });
  });
  aplicarZebra(wsDet, cabDet.number + 1, wsDet.rowCount, 4);
  wsDet.autoFilter = { from: { row: cabDet.number, column: 1 }, to: { row: wsDet.rowCount, column: 4 } };

  // --- Aba comparativa (só se houver mais de uma competência) ---
  if (dresPorCompetencia.length > 1) {
    const colunas = dresPorCompetencia.map((d) => ({
      titulo: d.rotulo,
      valores: new Map(matrizDRE(d.dre).map((l) => [l.lbl, l.val])),
    }));
    // Esqueleto da última competência: seções condicionais aparecem
    // conforme o mês tiver movimento, e o mês mais recente representa
    // melhor a estrutura corrente.
    const esqueleto = matrizDRE(dresPorCompetencia[dresPorCompetencia.length - 1].dre);
    const wsComp = wb.addWorksheet("Comparativa");
    definirLarguras(wsComp, [48, ...colunas.map(() => 16)]);
    const cabComp = escreverCabecalhoTabela(wsComp, ["Linha", ...colunas.map((c) => c.titulo)]);
    esqueleto.forEach((l) => {
      const row = wsComp.addRow([l.lbl, ...colunas.map((c) => c.valores.get(l.lbl) ?? null)]);
      for (let c = 2; c <= colunas.length + 1; c++) row.getCell(c).numFmt = FORMATO_MOEDA;
      if (l.t === "secao" || l.t === "sub" || l.t === "final") marcarSubtotal(wsComp, row.number, colunas.length + 1);
    });
    aplicarZebra(wsComp, cabComp.number + 1, wsComp.rowCount, colunas.length + 1);
  }

  await baixarWorkbook(wb, nomeArquivo(empresa, "xlsx"));
}
