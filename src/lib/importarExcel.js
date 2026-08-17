/* A lib xlsx (SheetJS) só é carregada quando alguém de fato importa um
 * Excel — import() dinâmico em vez de import no topo do arquivo, para não
 * engordar o bundle inicial (que a maioria das importações, em CSV, nunca
 * usa). */

/** Formata uma data para "DD/MM/AAAA" — o mesmo formato que
 *  competenciaDaLinha (em parse.js) já sabe interpretar via seu fallback
 *  numérico de mês, então não precisa de nenhum código novo lá. */
function formatarData(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Converte células de data (que o SheetJS entrega como objeto Date) para
 *  texto "DD/MM/AAAA" — o resto do app trabalha com texto/número, igual a
 *  um CSV, nunca com objetos Date. Todo o resto passa direto: números
 *  ficam como número nativo do JavaScript (sem risco de confundir "," com
 *  separador de milhar — essa ambiguidade só existe em texto formatado). */
function normalizarLinha(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v instanceof Date ? formatarData(v) : v;
  }
  return out;
}

/** Uma aba conta como "com dados" se tiver mais de uma linha (a primeira
 *  linha é o cabeçalho). Abas vazias ou só com título são ignoradas na
 *  escolha automática. */
function temDados(XLSX, ws) {
  if (!ws || !ws["!ref"]) return false;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  return range.e.r > range.s.r;
}

/** Importa uma planilha Excel (.xlsx, .xls, .xlsm, .xlsb, .ods) e devolve
 *  no mesmo formato que a importação de CSV — um array de campos
 *  (cabeçalho) e um array de linhas (objetos) — para reaproveitar toda a
 *  lógica de mapeamento de colunas e agregação já existente.
 *
 *  Se o arquivo tiver mais de uma aba, usa a primeira que tiver dados; as
 *  demais ficam disponíveis em `abas` caso o app queira oferecer escolha
 *  no futuro. */
export async function importarExcel(file, onProgress) {
  onProgress?.({ linhas: 0, pct: 5 });
  const [XLSX, buf] = await Promise.all([import("xlsx"), file.arrayBuffer()]);
  onProgress?.({ linhas: 0, pct: 45 });

  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const abasComDados = wb.SheetNames.filter((nome) => temDados(XLSX, wb.Sheets[nome]));
  const aba = abasComDados[0] || wb.SheetNames[0];
  const ws = wb.Sheets[aba];
  onProgress?.({ linhas: 0, pct: 75 });

  const brutas = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const linhas = brutas.map(normalizarLinha);
  const campos = brutas.length
    ? Object.keys(brutas[0])
    : (XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || []).map(String);

  onProgress?.({ linhas: linhas.length, pct: 100 });
  return { campos, linhas, aba, abas: wb.SheetNames };
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
 *  balancete, ao contrário do razão principal que precisa dos nomes das
 *  colunas.
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

const EXTENSOES_EXCEL = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods"];

export function ehArquivoExcel(nome) {
  const n = nome.toLowerCase();
  return EXTENSOES_EXCEL.some((ext) => n.endsWith(ext));
}
