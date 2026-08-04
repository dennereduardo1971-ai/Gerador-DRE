import { GRUPOS } from "./classify.js";

/** Gera e dispara o download do CSV da DRE, no mesmo layout visto na tela. */
export function baixarCSV({ dre, empresa, cnpj, filtroMes, meses, nomes }) {
  const L = [];
  const add = (a, b) => L.push([a, b == null ? "" : String(b).replace(".", ",")]);

  add("DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO", "");
  add(empresa || "Empresa", "");
  add(cnpj ? `CNPJ ${cnpj}` : "", "");
  add("Período", filtroMes === "todos" ? meses.join(" a ") : filtroMes);
  add("", "");
  add("RECEITA OPERACIONAL BRUTA", "");
  add("( + ) Receita Bruta com Mensalidades", dre.bal.REC_MENSALIDADES.total.toFixed(2));
  add("( + ) Receita com Taxas", dre.bal.REC_TAXAS.total.toFixed(2));
  add("( = ) Receita Bruta de Serviços", dre.receitaBruta.toFixed(2));
  add("", "");
  add("DEDUÇÕES À RECEITA OPERACIONAL", "");
  add("( - ) Bolsas / Resoluções", (-dre.bal.DED_BOLSAS.total).toFixed(2));
  add("( - ) Prouni", (-dre.bal.DED_PROUNI.total).toFixed(2));
  add("( - ) Mensalidades Devolvidas", (-dre.bal.DED_DEVOLUCOES.total).toFixed(2));
  add("( - ) Descontos / Cancelamentos", (-dre.bal.DED_DESCONTOS.total).toFixed(2));
  add("( - ) PIS / COFINS / ISS", (-dre.bal.DED_IMPOSTOS.total).toFixed(2));
  add("RECEITA OPERACIONAL LÍQUIDA", dre.receitaLiq.toFixed(2));
  add("( - ) Custos dos Serviços", (-dre.bal.CUSTOS.total).toFixed(2));
  add("( = ) RESULTADO OPERACIONAL BRUTO", dre.resultadoOperBruto.toFixed(2));
  add("", "");
  add("DESPESAS OPERACIONAIS", (-dre.despOper).toFixed(2));
  add("Despesas com Pessoal (Fopag)", (-dre.bal.DESP_FOPAG.total).toFixed(2));
  add("Despesas Administrativas", (-dre.bal.DESP_ADM.total).toFixed(2));
  add("Depreciação / Amortização", (-dre.bal.DEPRECIACAO.total).toFixed(2));
  add("Provisões / Reversões", (-dre.bal.PROVISOES.total).toFixed(2));
  add("", "");
  add("RECEITA / DESPESAS FINANCEIRAS", dre.resultadoFin.toFixed(2));
  add("Receitas Financeiras", dre.bal.REC_FIN.total.toFixed(2));
  add("Despesas Financeiras", (-dre.bal.DESP_FIN.total).toFixed(2));
  add("RESULTADO OPERACIONAL", dre.resultadoOper.toFixed(2));
  add("", "");
  add("RECEITAS / DESPESAS NÃO OPERACIONAIS", dre.naoOper.toFixed(2));
  add("Receitas Não Operacionais", dre.bal.OUTRAS_REC.total.toFixed(2));
  add("Despesas Não Operacionais", (-dre.bal.OUTRAS_DESP.total).toFixed(2));
  add("LUCRO ANTES DO IMPOSTO DE RENDA E CONT. SOCIAL", dre.antesIR.toFixed(2));
  add("( - ) IRPJ e CSLL", (-dre.bal.IRPJ_CSLL.total).toFixed(2));
  add("LUCRO LÍQUIDO DO EXERCÍCIO", dre.liquido.toFixed(2));
  add("", "");
  add("DETALHAMENTO POR CONTA", "");
  L.push(["Grupo", "Conta", "Descrição", "Valor"]);
  GRUPOS.forEach((g) => {
    if (g.id === "IGNORAR") return;
    dre.bal[g.id].contas.forEach((c) =>
      L.push([g.nome, c.conta, nomes[c.conta] || "", c.val.toFixed(2).replace(".", ",")])
    );
  });

  const csv = L.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `DRE_${(empresa || "empresa").replace(/\W+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
