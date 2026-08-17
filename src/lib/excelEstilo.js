/* O visual dos Excel exportados — definido uma vez, para as três
 * planilhas (DRE, De-Para, CPC 51) saírem com a MESMA cara em vez de
 * cada exportador inventar a própria paleta.
 *
 * POR QUE `exceljs` E NÃO `xlsx` AQUI: a biblioteca `xlsx` (SheetJS
 * Community, a mesma usada para LER arquivo importado) aceita `cell.s`
 * no objeto, mas ignora esse campo ao gravar — só o formato numérico
 * (`cell.z`) chega no arquivo de verdade. Cor de fundo, fonte e negrito
 * são recursos pagos (SheetJS Pro) nessa biblioteca. Testado: um
 * cabeçalho com `s: { font: { bold: true } }` abre no Excel sem nenhum
 * estilo. `exceljs` escreve estilo de verdade e é gratuito — o preço é
 * bundle maior (~270 kB gzip contra ~140 kB do `xlsx`), pago só por quem
 * clica em "Baixar Excel" (`import()` dinâmico, como o `xlsx` já é).
 *
 * A LEITURA de arquivo importado continua em `xlsx`/SheetJS
 * (`importarExcel.js`) — é a única das duas que lê `.xls` legado,
 * `.xlsb` e `.ods`. As duas bibliotecas convivem porque fazem metades
 * diferentes do trabalho: uma lê o que o cliente manda, a outra escreve
 * o que o app entrega.
 *
 * A paleta reaproveita a identidade "Razão" da tela (ver App.css): índigo
 * de marca, nunca verde nem vermelho — que aqui, como lá, pertencem só
 * ao dado. O rajado alternado ecoa o papel de razão contábil que dá nome
 * ao projeto.
 */

export const COR = {
  marca: "FF2B3A8C",
  marcaTinta: "FFFFFFFF",
  papel: "FFE8EDE8",
  superficie2: "FFEDF2EC",
  regua: "FFCDD7CE",
  tinta: "FF121A16",
  tinta2: "FF5C6B62",
  positivo: "FF0B6B41",
  negativo: "FFB0302F",
  atencaoFraca: "FFF5EEE0",
  atencao: "FF8A5A12",
};

export const FORMATO_MOEDA = '#,##0.00;[Red](#,##0.00)';
export const FORMATO_PCT = "0.0%";

const fonteBase = { name: "Calibri", size: 11, color: { argb: COR.tinta } };

/** Linha de título: mescla a largura da tabela, fundo de marca, texto
 *  branco — a mesma função que abre toda aba, do jeito que o cabeçalho
 *  em `cabecalho()` (exportacao.js) já descreve o arquivo em texto. */
export function escreverTitulo(ws, texto, nCols) {
  ws.mergeCells(ws.rowCount + 1, 1, ws.rowCount + 1, Math.max(nCols, 1));
  const row = ws.getRow(ws.rowCount);
  row.getCell(1).value = texto;
  row.getCell(1).font = { ...fonteBase, bold: true, size: 13, color: { argb: COR.marcaTinta } };
  row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.marca } };
  row.getCell(1).alignment = { vertical: "middle" };
  row.height = 22;
  for (let c = 2; c <= Math.max(nCols, 1); c++) {
    row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.marca } };
  }
  return row;
}

/** Uma linha simples de metadado (empresa, período) — texto neutro sem
 *  fundo, mais leve que o título. */
export function escreverMeta(ws, valores) {
  const row = ws.addRow(valores);
  row.font = { ...fonteBase, color: { argb: COR.tinta2 } };
  return row;
}

export function linhaEmBranco(ws) { ws.addRow([]); }

/** Cabeçalho de tabela: fundo `superficie-2`, negrito, borda inferior de
 *  marca — a mesma linguagem do `<thead>` das tabelas da tela (fundo
 *  sutil, sem depender de cor para carregar significado). Congela a
 *  linha logo abaixo, para rolar o corpo sem perder a coluna. */
export function escreverCabecalhoTabela(ws, colunas, { congelar = true } = {}) {
  const row = ws.addRow(colunas);
  row.eachCell((cell) => {
    cell.font = { ...fonteBase, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.superficie2 } };
    cell.border = { bottom: { style: "medium", color: { argb: COR.marca } } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 18;
  if (congelar) ws.views = [{ state: "frozen", ySplit: row.number }];
  return row;
}

/** Aplica o rajado alternado (zebra) num intervalo de linhas de dados —
 *  o mesmo recurso que a tela usa nas tabelas para guiar o olho na linha
 *  certa numa planilha de muitas contas. */
export function aplicarZebra(ws, primeiraLinha, ultimaLinha, nCols) {
  for (let r = primeiraLinha; r <= ultimaLinha; r++) {
    if ((r - primeiraLinha) % 2 === 1) {
      const row = ws.getRow(r);
      for (let c = 1; c <= nCols; c++) {
        const cell = row.getCell(c);
        if (!cell.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.papel } };
      }
    }
  }
}

/** Negrito + fundo sutil + borda superior de marca — o equivalente em
 *  planilha da linha de subtotal/final da tela (`.line[data-k="sub"]`,
 *  `[data-k="final"]`): pesa mais que o resto sem precisar de cor nova.
 *  Define o fundo ANTES do rajado alternado rodar (`aplicarZebra` só
 *  pinta célula sem fundo já definido), para o subtotal não sair ora
 *  clara ora rajada dependendo de calhar numa linha par ou ímpar. */
export function marcarSubtotal(ws, linha, nCols) {
  const row = ws.getRow(linha);
  for (let c = 1; c <= nCols; c++) {
    const cell = row.getCell(c);
    cell.font = { ...fonteBase, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR.superficie2 } };
    cell.border = { ...cell.border, top: { style: "thin", color: { argb: COR.marca } } };
  }
}

/** Número com a cor semântica do dado — positivo/negativo — só onde a
 *  planilha PRECISA da cor porque o formato `[Red](...)` do Excel não
 *  cobre (ex.: percentuais, ou quando o negativo já é o normal do
 *  contexto). Uso pontual: a regra geral é o formato numérico cuidar
 *  disso sozinho. */
export function corPorSinal(cell, valor) {
  if (typeof valor !== "number") return;
  cell.font = { ...fonteBase, color: { argb: valor < 0 ? COR.negativo : COR.positivo } };
}

/** Larguras de coluna, no mesmo formato enxuto que os `!cols` do `xlsx`
 *  ({wch}) — só que em caracteres direto, sem o array de objetos. */
export function definirLarguras(ws, larguras) {
  larguras.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

export function baixarWorkbook(wb, nome) {
  return wb.xlsx.writeBuffer().then((buf) => {
    const url = URL.createObjectURL(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  });
}

