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

/** Importa um arquivo tabular sem cabeçalho previsível — o plano de
 *  contas ou o balancete — em CSV ou Excel, devolvendo sempre um array de
 *  arrays, pronto para parsearPlanoDeContas ou parsearBalancete.
 *
 *  `preferir` é repassado ao leitor de Excel para escolher a aba pelo
 *  CONTEÚDO. Sem isso, um arquivo com aba de parâmetros na frente da aba
 *  de dados era lido pela aba errada. Em CSV não há aba nenhuma, então o
 *  parâmetro simplesmente não se aplica. */
export async function importarLinhasSimples(file, preferir) {
  if (ehArquivoExcel(file.name)) return importarExcelComoLinhas(file, preferir);
  const txt = await lerTexto(file);
  return Papa.parse(txt, { header: false, skipEmptyLines: true }).data;
}

/** Todas as abas de um arquivo, como arrays de arrays. Em CSV existe uma
 *  aba só — o próprio arquivo —, então o formato de retorno é o mesmo e
 *  quem chama não precisa saber a diferença. */
export async function importarAbasSimples(file) {
  if (ehArquivoExcel(file.name)) return importarExcelAbas(file);
  const txt = await lerTexto(file);
  const linhas = Papa.parse(txt, { header: false, skipEmptyLines: true }).data;
  return [{ nome: file.name, linhas }];
}
