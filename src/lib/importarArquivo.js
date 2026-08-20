import Papa from "papaparse";
import { lerTexto } from "./parse.js";
import { importarCSV } from "./importarCSV.js";
import { importarExcel, importarExcelAbas, importarExcelComoLinhas, ehArquivoExcel } from "./importarExcel.js";

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
 *  assumir cabeçalho), pronto para parsearPlanoDeContas (em parse.js).
 *  Também serve ao balancete: em Excel, a aba certa já é escolhida por
 *  conteúdo (ver `pontuarAbaDeContas`), então quem chama não precisa
 *  saber qual aba tem o quê. */
export async function importarLinhasSimples(file) {
  if (ehArquivoExcel(file.name)) return importarExcelComoLinhas(file);
  const txt = await lerTexto(file);
  return Papa.parse(txt, { header: false, skipEmptyLines: true }).data;
}

/** Todas as abas de um arquivo, como arrays de arrays. Em CSV existe uma
 *  aba só — o próprio arquivo —, então o formato de retorno é o mesmo e
 *  quem chama não precisa saber a diferença.
 *
 *  Usado quando uma aba sozinha não basta — o balancete precisa cruzar a
 *  aba de dados com a aba de parâmetros para achar o período coberto. */
export async function importarAbasSimples(file) {
  if (ehArquivoExcel(file.name)) return importarExcelAbas(file);
  const txt = await lerTexto(file);
  const linhas = Papa.parse(txt, { header: false, skipEmptyLines: true }).data;
  return [{ nome: file.name, linhas }];
}
