import Papa from "papaparse";
import { lerTexto } from "./parse.js";
import { importarCSV } from "./importarCSV.js";
import { importarExcel, importarExcelComoLinhas, ehArquivoExcel } from "./importarExcel.js";

/** Importa o razão contábil, em CSV ou em Excel (.xlsx, .xls, .xlsm,
 *  .xlsb, .ods) — decide qual caminho usar pela extensão do arquivo e
 *  devolve sempre o mesmo formato ({ campos, linhas, ... }), para o resto
 *  do app não precisar saber a diferença. */
export function importarArquivo(file, onProgress) {
  if (ehArquivoExcel(file.name)) return importarExcel(file, onProgress);
  return importarCSV(file, onProgress);
}

/** Importa um arquivo de duas colunas (código, descrição) — o plano de
 *  contas — em CSV ou Excel, devolvendo sempre um array de arrays (sem
 *  assumir cabeçalho), pronto para parsearPlanoDeContas (em parse.js). */
export async function importarLinhasSimples(file) {
  if (ehArquivoExcel(file.name)) return importarExcelComoLinhas(file);
  const txt = await lerTexto(file);
  return Papa.parse(txt, { header: false, skipEmptyLines: true }).data;
}
