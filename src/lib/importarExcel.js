/* A lib xlsx (SheetJS) só é carregada quando alguém de fato importa um
 * Excel — import() dinâmico em vez de import no topo do arquivo, para não
 * engordar o bundle inicial (que a maioria das importações, em CSV, nunca
 * usa).
 *
 * Este módulo lê a planilha como ARRAYS DE ARRAYS, sem cabeçalho: é o
 * formato que o balancete precisa, porque quem interpreta as colunas é
 * `detectarColunas` (balancete.js), que acha a linha de cabeçalho no meio
 * do relatório. Existia aqui um `importarExcel` que lia por nome de
 * coluna — era do razão contábil, e saiu com ele em 24/08/2026. */

/** Uma aba conta como "com dados" se tiver mais de uma linha (a primeira
 *  linha é o cabeçalho). Abas vazias ou só com título são ignoradas na
 *  escolha automática. */
function temDados(XLSX, ws) {
  if (!ws || !ws["!ref"]) return false;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  return range.e.r > range.s.r;
}

/** Quantas linhas desta aba têm cara de conta contábil na primeira coluna
 *  — código numérico, pontuado ou não ("1", "4.1.10.10", "1111001").
 *
 *  É a pergunta que separa a aba que interessa do resto da pasta de
 *  trabalho. O balancete que o sistema contábil emite de verdade
 *  (ctbr041) vem com DUAS abas: "Parametros", com as perguntas do
 *  relatório ("Pergunta 01 : Data Inicial ?"), e só a segunda com o
 *  balancete. Pegar a primeira aba com dados pegava a de parâmetros — e
 *  aí nem o balancete hierárquico nem o formato simples reconheciam nada:
 *  o arquivo inteiro morria em "não achei nenhuma conta nesse arquivo". */
export function pontuarAbaDeContas(linhas) {
  let n = 0;
  for (const l of linhas) {
    if (!Array.isArray(l) || l.length < 2) continue;
    const c = String(l[0] ?? "").trim();
    if (c && /^[\d.]+$/.test(c) && /\d/.test(c)) n++;
  }
  return n;
}

/** Lê um arquivo Excel como array de arrays (sem assumir cabeçalho) — usado
 *  pelo plano de contas, que é só duas colunas (código, descrição), e pelo
 *  balancete, que acha a própria linha de cabeçalho no meio do
 *  relatório.
 *
 *  Entre várias abas vence a que tem MAIS linhas com código de conta na
 *  primeira coluna, não a primeira que tiver qualquer dado. Sem nenhum
 *  código em aba nenhuma, cai na primeira com dados — o comportamento
 *  antigo, que continua certo para uma pasta de trabalho de uma aba só. */
export async function importarExcelComoLinhas(file) {
  const [XLSX, buf] = await Promise.all([import("xlsx"), file.arrayBuffer()]);
  const wb = XLSX.read(buf, { type: "array" });
  const abasComDados = wb.SheetNames.filter((nome) => temDados(XLSX, wb.Sheets[nome]));
  const candidatas = abasComDados.length ? abasComDados : wb.SheetNames;

  let melhor = null, melhorPonto = 0;
  for (const nome of candidatas) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: "" });
    const ponto = pontuarAbaDeContas(linhas);
    if (ponto > melhorPonto) { melhor = linhas; melhorPonto = ponto; }
  }
  if (melhor) return melhor;

  return XLSX.utils.sheet_to_json(wb.Sheets[candidatas[0]], { header: 1, defval: "" });
}

/** Todas as abas do arquivo, cada uma como array de arrays.
 *
 *  Existe porque um relatório contábil não guarda tudo o que interessa na
 *  mesma aba: o balancete traz os dados numa aba e os PARÂMETROS da
 *  extração — inclusive o período que ele cobre — em outra. Quem só quer
 *  os dados usa `importarExcelComoLinhas`, que já escolhe a aba certa por
 *  conteúdo; quem precisa cruzar as abas (achar o período na aba de
 *  parâmetros, por exemplo) usa esta. */
export async function importarExcelAbas(file) {
  const [XLSX, buf] = await Promise.all([import("xlsx"), file.arrayBuffer()]);
  const wb = XLSX.read(buf, { type: "array" });
  const abasComDados = wb.SheetNames.filter((nome) => temDados(XLSX, wb.Sheets[nome]));
  return (abasComDados.length ? abasComDados : wb.SheetNames).map((nome) => ({
    nome,
    linhas: XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: "" }),
  }));
}

const EXTENSOES_EXCEL = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods"];

export function ehArquivoExcel(nome) {
  const n = nome.toLowerCase();
  return EXTENSOES_EXCEL.some((ext) => n.endsWith(ext));
}
