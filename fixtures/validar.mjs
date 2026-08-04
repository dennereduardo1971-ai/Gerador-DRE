// Validação ad-hoc: importa direto de src/lib (nenhum código duplicado) e
// confere a DRE calculada pelo app contra a DRE oficial real, mês a mês.
// Uso: node fixtures/validar.mjs
import fs from "node:fs";
import Papa from "papaparse";
import XLSX from "xlsx";
import { agregarPorConta, mapearColunas, parsearPlanoDeContas } from "../src/lib/parse.js";
import { sugerirClassificacao, montarDRE, GRUPOS } from "../src/lib/classify.js";

const DIR = new URL(".", import.meta.url).pathname;

// --- 1. Ler o razão (CSV) exatamente como o app leria -------------------
const csvTexto = fs.readFileSync(DIR + "Razão_excel.csv", "latin1");
const parsed = Papa.parse(csvTexto, { header: true, delimiter: ";", skipEmptyLines: true });
const linhas = parsed.data;
const campos = parsed.meta.fields;
const map = mapearColunas(campos);

// --- 2. Ler o plano de contas (Excel) exatamente como o app leria -------
const wbPlano = XLSX.readFile(DIR + "Plano_de_Contas1.xlsx");
const wsPlano = wbPlano.Sheets[wbPlano.SheetNames[0]];
const linhasPlano = XLSX.utils.sheet_to_json(wsPlano, { header: 1, defval: "" });
const nomes = parsearPlanoDeContas(linhasPlano);
console.log(`Plano de contas: ${Object.keys(nomes).length} contas nomeadas.`);

// --- 3. Ler a DRE oficial (Excel) para comparação ------------------------
const wbDre = XLSX.readFile(DIR + "DRE-BALANÇO_INTERMEDIÁRIOS_IESB_06_2026.xlsx");
const wsDre = wbDre.Sheets["DRE 2026"];
const linhasDre = XLSX.utils.sheet_to_json(wsDre, { header: 1, defval: null });
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
  const alvo = {};
  let deprec = 0, provisoes = 0;
  for (const row of linhasDre) {
    const rotulo = row[1] || row[0];
    if (!rotulo) continue;
    const val = row[col];
    if (ROTULO_GRUPO[rotulo] && val != null) alvo[ROTULO_GRUPO[rotulo]] = val;
    if ((rotulo === "Depreciação/Amortização" || rotulo === "Depreciação CPC 06") && val != null) deprec += val;
    if ((rotulo === "Provisões/Reversões Contingências" || rotulo === "Provisões/Reversões PCLD") && val != null) provisoes += val;
  }
  alvo.DEPRECIACAO = deprec;
  alvo.PROVISOES = provisoes;
  alvoPorMes[comp] = alvo;
}

// --- 4. Rodar o pipeline do app para cada mês e comparar -----------------
let tudoOk = true;
for (const comp of Object.keys(COL_MES)) {
  const { contas } = agregarPorConta(linhas, map, "todos", "todos", comp);
  const contasResultado = contas.filter((c) => "3456".includes(c.conta[0]));
  const sugestao = sugerirClassificacao(contasResultado, nomes);
  const grupoDe = (conta) => sugestao[conta] ?? "IGNORAR";
  const dre = montarDRE(contasResultado, grupoDe);

  console.log(`\n=== ${comp} ===`);
  const alvo = alvoPorMes[comp];
  for (const [grupoId, valorAlvo] of Object.entries(alvo)) {
    const g = GRUPOS.find((g) => g.id === grupoId);
    const meu = dre.bal[grupoId].total * (g.sinal || 1);
    const ok = Math.abs(meu - valorAlvo) < 0.5;
    if (!ok) tudoOk = false;
    console.log(
      `${grupoId.padEnd(18)} alvo=${valorAlvo.toFixed(2).padStart(15)}  meu=${meu.toFixed(2).padStart(15)}  ${ok ? "OK" : "❌ DIFERENTE"}`
    );
  }
}

console.log(tudoOk ? "\n✅ TUDO OK — bate com a DRE oficial em todos os meses testados." : "\n❌ HÁ DIFERENÇAS — ver acima.");
process.exit(tudoOk ? 0 : 1);
