// Validação ad-hoc: importa direto de src/lib (nenhum código duplicado) e
// confere a DRE calculada pelo app contra a DRE oficial real, mês a mês.
// Uso: node fixtures/validar.mjs
//
// A FONTE MUDOU. Até 24/08/2026 este script lia o razão contábil em CSV e
// somava lançamento a lançamento com `agregarPorConta`. O razão saiu do
// app, e agora ele lê os BALANCETES — os mesmos arquivos que o usuário
// carrega na tela, pelo mesmo caminho de código.
//
// Nenhum nome de arquivo é cravado aqui de propósito: o script varre
// fixtures/, tenta ler cada planilha como balancete e descobre o período
// de cada uma pela aba de parâmetros, exatamente como o app faz. Assim,
// acrescentar o balancete de julho é copiar o arquivo para a pasta.
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { parsearBalancete, contasDeMovimento, periodoDoBalancete, detectarColunas } from "../src/lib/balancete.js";
import { sugerirClassificacao, montarDRE, GRUPOS } from "../src/lib/classify.js";

const DIR = new URL(".", import.meta.url).pathname;
const EXTENSOES = [".xlsx", ".xls", ".xlsm", ".xlsb", ".ods"];

/** Todas as abas de uma planilha, como arrays de arrays — o mesmo formato
 *  que `importarAbasSimples` entrega ao app. */
function abasDe(arquivo) {
  const wb = XLSX.readFile(arquivo);
  return wb.SheetNames.map((nome) => ({
    nome,
    linhas: XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: "" }),
  }));
}

/** "30/06/2026" → "06/2026". */
const competenciaDe = (data) => {
  const m = String(data ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}/${m[3]}` : null;
};

// --- 1. Achar e ler os balancetes -----------------------------------------
const candidatos = fs.readdirSync(DIR)
  .filter((f) => EXTENSOES.includes(path.extname(f).toLowerCase()))
  .map((f) => path.join(DIR, f));

if (!candidatos.length) {
  console.error(
    "Nenhuma planilha em fixtures/. Este script precisa dos arquivos REAIS, que estão\n" +
    "no .gitignore e não vêm no clone. Copie para fixtures/:\n" +
    "  - um balancete de verificação por mês (contas 1 a 7, sem filtrar por conta)\n" +
    "  - a DRE oficial (DRE-BALANÇO_INTERMEDIÁRIOS...xlsx, com a aba 'DRE 2026')\n" +
    "Sem eles, NÃO diga que validou."
  );
  process.exit(2);
}

const balancetes = [];
let arquivoDre = null;
const nomes = {};

for (const arquivo of candidatos) {
  let abas;
  try { abas = abasDe(arquivo); } catch { continue; }
  const daAba = abas.find((a) => detectarColunas(a.linhas));
  if (!daAba) {
    // Não é balancete: pode ser a DRE oficial, que é o outro lado da
    // comparação. Reconhecida pela aba, não pelo nome do arquivo.
    if (abas.some((a) => /^DRE/i.test(a.nome))) arquivoDre = { arquivo, abas };
    continue;
  }
  const bal = parsearBalancete(daAba.linhas);
  if (!bal) continue;
  const periodo = periodoDoBalancete(abas);
  const comp = competenciaDe(periodo?.fim);
  // O plano de contas sai do próprio balancete — a união de todos dá o
  // plano mais completo, que é o que o app também faz.
  bal.contas.forEach((c) => { nomes[c.codigo] = c.descricao; });
  balancetes.push({ arquivo: path.basename(arquivo), bal, periodo, comp });
}

if (!balancetes.length) {
  console.error("Achei planilhas em fixtures/, mas nenhuma com cara de balancete de verificação.");
  process.exit(2);
}
if (!arquivoDre) {
  console.error("Não achei a DRE oficial em fixtures/ (planilha com uma aba começando em 'DRE').");
  process.exit(2);
}

balancetes.sort((a, b) => String(a.comp).localeCompare(String(b.comp)));
console.log(`Balancetes lidos: ${balancetes.length} (${balancetes.map((b) => b.comp || "sem período").join(", ")}).`);
console.log(`Plano de contas vindo dos próprios balancetes: ${Object.keys(nomes).length} contas nomeadas.`);

// --- 2. Ler a DRE oficial para comparação ---------------------------------
const abaDre = arquivoDre.abas.find((a) => /^DRE/i.test(a.nome));
const linhasDre = abaDre.linhas;
const COL_MES = { "01/2026": 2, "02/2026": 3, "03/2026": 4, "04/2026": 6, "05/2026": 7, "06/2026": 8 };
const ROTULO_GRUPO = {
  "( + ) Receita Bruta com Mensalidades": "REC_MENSALIDADES",
  "( + ) Receita com Taxas": "REC_TAXAS",
  "( - ) Bolsas/Resoluções": "DED_BOLSAS",
  "( - ) Prouni": "DED_PROUNI",
  "( - ) Mensalidades Devolvidas": "DED_DEVOLUCOES",
  "( - ) Mensalidades Desc./Canceladas": "DED_DESCONTOS",
  "( - ) Pis/Cofins/Iss": "DED_IMPOSTOS",
  "CUSTOS DOS SERVIÇOS VENDIDOS": "CUSTOS",
  "Despesas com Fopag": "DESP_FOPAG",
  "Despesas Administrativas": "DESP_ADM",
  "Despesas Financeiras": "DESP_FIN",
  "Receitas Financeiras": "REC_FIN",
};
const alvoPorMes = {};
for (const [comp, col] of Object.entries(COL_MES)) {
  const alvo = { DEPRECIACAO: 0, PROVISOES_CONTINGENCIAS: 0, PROVISOES_PCLD: 0 };
  for (const row of linhasDre) {
    const rotulo = row[1] || row[0];
    if (!rotulo) continue;
    const val = typeof row[col] === "number" ? row[col] : null;
    if (ROTULO_GRUPO[rotulo] && val != null) alvo[ROTULO_GRUPO[rotulo]] = val;
    if (rotulo === "Depreciação/Amortização" && val != null) alvo.DEPRECIACAO = (alvo.DEPRECIACAO || 0) + val;
    if (rotulo === "Depreciação CPC 06" && val != null) alvo.DEPRECIACAO = (alvo.DEPRECIACAO || 0) + val;
    if (rotulo === "Provisões/Reversões Contingências" && val != null) alvo.PROVISOES_CONTINGENCIAS = val;
    if (rotulo === "Provisões/Reversões PCLD" && val != null) alvo.PROVISOES_PCLD = val;
  }
  alvoPorMes[comp] = alvo;
}

// --- 3. Rodar o pipeline do app para cada balancete e comparar ------------
let tudoOk = true;
let comparados = 0;

for (const { arquivo, bal, comp, periodo } of balancetes) {
  console.log(`\n=== ${comp || "período não declarado"} — ${arquivo} ===`);

  // Conferência que o próprio arquivo permite, antes de qualquer
  // comparação com a DRE oficial: se ele não fecha consigo mesmo, o que
  // vier depois não significa nada.
  const r = bal.resumo;
  if (!r.integro) {
    tudoOk = false;
    console.log(`  ⚠ o arquivo não fecha internamente: ${r.inconsistentes} linha(s), ${r.sinteticasErradas} sintética(s).`);
  }
  if (r.resultadoConfere === false) {
    tudoOk = false;
    console.log("  ⚠ patrimonial e resultado apuram números diferentes para o período.");
  }

  const alvo = alvoPorMes[comp];
  if (!alvo) {
    console.log(`  (sem coluna correspondente na DRE oficial — período do arquivo: ${periodo?.legivel || "?"})`);
    continue;
  }

  const contas = contasDeMovimento(bal);
  const contasResultado = contas.filter((c) => "3456".includes(c.conta[0]));
  const sugestao = sugerirClassificacao(contasResultado, nomes);
  const grupoDe = (conta) => sugestao[conta] ?? "IGNORAR";
  const dre = montarDRE(contasResultado, grupoDe);
  comparados++;

  for (const [grupoId, valorAlvo] of Object.entries(alvo)) {
    const g = GRUPOS.find((g) => g.id === grupoId);
    const meu = dre.bal[grupoId].total * (g.sinal || 1);
    const ok = Math.abs(meu - valorAlvo) < 0.5;
    if (!ok) tudoOk = false;
    console.log(
      `${grupoId.padEnd(24)} alvo=${valorAlvo.toFixed(2).padStart(15)}  meu=${meu.toFixed(2).padStart(15)}  ${ok ? "OK" : "❌ DIFERENTE"}`
    );
  }
}

if (!comparados) {
  console.error("\nNenhum balancete casou com uma coluna da DRE oficial — nada foi validado.");
  process.exit(2);
}

console.log(
  tudoOk
    ? `\n✅ TUDO OK — ${comparados} mês(es) batem com a DRE oficial.`
    : "\n❌ HÁ DIFERENÇAS — ver acima."
);
process.exit(tudoOk ? 0 : 1);
