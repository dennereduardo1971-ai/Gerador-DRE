import { importarCSV } from "./importarCSV.js";
import { importarExcel, ehArquivoExcel } from "./importarExcel.js";

/** Importa o razão contábil, em CSV ou em Excel (.xlsx, .xls, .xlsm,
 *  .xlsb, .ods) — decide qual caminho usar pela extensão do arquivo e
 *  devolve sempre o mesmo formato ({ campos, linhas, ... }), para o resto
 *  do app não precisar saber a diferença. */
export function importarArquivo(file, onProgress) {
  if (ehArquivoExcel(file.name)) return importarExcel(file, onProgress);
  return importarCSV(file, onProgress);
}
