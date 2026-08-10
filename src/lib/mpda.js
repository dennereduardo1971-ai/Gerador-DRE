/* MPDA — Medidas de Desempenho Definidas pela Administração (CPC 51).
 *
 * É a novidade do CPC 51 que mais pega empresa de surpresa: EBITDA,
 * "EBITDA ajustado", "resultado recorrente" e afins deixam de ser número
 * solto no release de resultados e passam a ser DIVULGAÇÃO CONTÁBIL. Uma
 * vez usada publicamente para comunicar a visão da administração sobre o
 * desempenho, a medida precisa ir para nota explicativa única, com:
 *
 *   - conciliação com o subtotal do CPC 51 mais diretamente comparável;
 *   - para CADA item de conciliação, o efeito tributário e o efeito sobre
 *     participação de não controladores;
 *   - explicação de por que a medida é útil e como é calculada;
 *   - explicação de qualquer mudança de cálculo entre períodos.
 *
 * Este módulo cobre o que o app pode calcular sozinho (o valor e a
 * conciliação, a partir das mesmas contas da DRE) e deixa EXPLÍCITO o que
 * depende de informação que ele não tem — o efeito tributário item a item
 * entra na minuta como lacuna a preencher, não como zero. Zero seria uma
 * afirmação; lacuna é a verdade.
 *
 * Uma consequência boa do CPC 51 que vale registrar: como o resultado
 * operacional da norma já exclui juros e tributos sobre o lucro, o EBITDA
 * passa a ser "resultado operacional sem depreciação e amortização" — uma
 * conta de duas linhas, conciliável, em vez de um número construído fora
 * da contabilidade.
 */

import { NOME_GRUPO } from "./grupos.js";

/** Os subtotais do CPC 51 que podem servir de âncora da conciliação. A
 *  norma manda usar o MAIS DIRETAMENTE COMPARÁVEL — por isso cada base
 *  guarda o campo correspondente em `montarDRE51`, sem tradução no meio
 *  do caminho. */
export const BASES = [
  { id: "OPERACIONAL", nome: "Resultado Operacional", campo: "operacional" },
  { id: "ANTES_FIN_TRIB", nome: "Resultado antes do financiamento e dos tributos sobre o lucro", campo: "antesFinTributos" },
  { id: "ANTES_TRIB", nome: "Resultado antes dos tributos sobre o lucro", campo: "antesTributos" },
  { id: "CONTINUADAS", nome: "Resultado das operações continuadas", campo: "continuadas" },
  { id: "LIQUIDO", nome: "Resultado líquido do período", campo: "liquido" },
];
const BASE_POR_ID = Object.fromEntries(BASES.map((b) => [b.id, b]));

/** Medidas que praticamente toda empresa brasileira já divulga. Vêm
 *  prontas porque a Fase 5 (passo 24) pede a minuta da nota de MPDA com
 *  "os indicadores gerenciais já utilizados pela empresa" — e começar de
 *  uma folha em branco é o que faz esse passo atrasar. */
export const MODELOS = [
  {
    id: "EBITDA",
    nome: "EBITDA",
    base: "OPERACIONAL",
    ajustes: [{ tipo: "grupo", id: "DEPRECIACAO", modo: "excluir" }],
    porQueUtil:
      "A administração acompanha o EBITDA por aproximar a geração de caixa da " +
      "operação, isolando o efeito de decisões de investimento passadas " +
      "(depreciação e amortização) sobre o resultado do período.",
  },
  {
    id: "EBITDA_AJUSTADO",
    nome: "EBITDA ajustado",
    base: "OPERACIONAL",
    ajustes: [
      { tipo: "grupo", id: "DEPRECIACAO", modo: "excluir" },
      { tipo: "grupo", id: "PROVISOES_CONTINGENCIAS", modo: "excluir" },
      { tipo: "grupo", id: "PROVISOES_PCLD", modo: "excluir" },
    ],
    porQueUtil:
      "Além da depreciação e amortização, a administração exclui constituições e " +
      "reversões de provisões, que oscilam por reestimativa e não por desempenho " +
      "da operação no período.",
  },
  {
    id: "OPER_RECORRENTE",
    nome: "Resultado operacional recorrente",
    base: "OPERACIONAL",
    ajustes: [
      { tipo: "grupo", id: "OUTRAS_REC", modo: "excluir" },
      { tipo: "grupo", id: "OUTRAS_DESP", modo: "excluir" },
    ],
    porQueUtil:
      "Como o CPC 51 traz para dentro do operacional itens antes apresentados como " +
      "não operacionais (venda de imobilizado, por exemplo), a administração " +
      "acompanha o operacional sem esses itens para comparar períodos.",
  },
];

/** Soma de um grupo da DRE dentro da demonstração do CPC 51, somando
 *  todas as categorias em que ele aparece.
 *
 *  Ele PODE aparecer em mais de uma: com decisões manuais por conta, um
 *  grupo como "Receitas Financeiras" fica parte em investimento, parte em
 *  operacional. Somar só a primeira ocorrência produziria uma conciliação
 *  que não fecha — silenciosamente. */
export function valorDoGrupo(dre51, grupoId) {
  let total = 0;
  Object.values(dre51.cat).forEach((c) =>
    c.grupos.forEach((g) => { if (g.id === grupoId) total += g.total; })
  );
  return total;
}

function valorDoAjuste(dre51, ajuste) {
  if (ajuste.tipo === "categoria") return dre51.cat[ajuste.id]?.total ?? 0;
  return valorDoGrupo(dre51, ajuste.id);
}

function nomeDoAjuste(ajuste) {
  if (ajuste.tipo === "categoria") return ajuste.id;
  return NOME_GRUPO[ajuste.id] || ajuste.id;
}

/** Calcula a medida e devolve a conciliação já na ordem exigida pela
 *  norma: do subtotal do CPC 51 PARA a medida, e não o contrário. É essa
 *  direção que permite ao leitor da nota partir do número auditado e
 *  chegar ao número do release. */
export function calcularMPDA(medida, dre51) {
  const base = BASE_POR_ID[medida.base] || BASE_POR_ID.OPERACIONAL;
  const valorBase = dre51[base.campo] ?? 0;

  const linhas = [{ t: "sub", lbl: base.nome, val: valorBase }];
  let valor = valorBase;
  (medida.ajustes || []).forEach((a) => {
    const contribuicao = valorDoAjuste(dre51, a);
    // "Excluir" significa remover do subtotal o efeito daquele item — o
    // sinal do lançamento é que decide se isso soma ou subtrai. Uma
    // despesa de depreciação (negativa) excluída SOMA ao resultado.
    const val = a.modo === "excluir" ? -contribuicao : contribuicao;
    valor += val;
    linhas.push({
      t: "l",
      lbl: `${a.modo === "excluir" ? "Exclui" : "Inclui"} ${nomeDoAjuste(a)}`,
      val,
      ajuste: a,
    });
  });
  linhas.push({ t: "final", lbl: medida.nome, val: valor });

  return { medida, base, valorBase, valor, linhas };
}

const IDS_BASE = new Set(BASES.map((b) => b.id));

/** Valida uma medida criada pelo usuário. Devolve `{ ok, erro }` em vez
 *  de lançar, porque isto responde a um formulário. */
export function validarMedida(medida, gruposValidos) {
  if (!medida || !String(medida.nome || "").trim()) return { ok: false, erro: "A medida precisa de um nome." };
  if (!IDS_BASE.has(medida.base)) return { ok: false, erro: "Escolha um subtotal do CPC 51 como base da conciliação." };
  const ajustes = medida.ajustes || [];
  if (!ajustes.length) {
    return {
      ok: false,
      erro:
        "Uma medida sem nenhum ajuste é igual ao próprio subtotal do CPC 51 — " +
        "nesse caso ela não é uma MPDA, é o subtotal.",
    };
  }
  const invalido = ajustes.find((a) => a.tipo === "grupo" && !gruposValidos.includes(a.id));
  if (invalido) return { ok: false, erro: `O grupo "${invalido.id}" não existe na DRE.` };
  return { ok: true };
}

const brl = (n) =>
  (n < 0 ? "(" : "") +
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  (n < 0 ? ")" : "");

/** Minuta da nota explicativa — entregável da Fase 5 ("Minuta de nota
 *  explicativa de MPDA") e obrigação da Fase 8 (passo 38).
 *
 *  É minuta, não nota pronta, e o texto diz isso: os efeitos tributário e
 *  de não controladores por item de conciliação são exigidos pela norma e
 *  o app não tem como calculá-los — ele não conhece a alíquota efetiva
 *  aplicável a cada ajuste nem a participação de não controladores. Sai
 *  como lacuna marcada, para o contador preencher e ninguém publicar um
 *  zero que não foi apurado. */
export function notaMPDA(medidas, dre51, { empresa = "", periodo = "" } = {}) {
  const calculos = medidas.map((m) => calcularMPDA(m, dre51));
  const linhas = [];

  linhas.push("NOTA EXPLICATIVA — MEDIDAS DE DESEMPENHO DEFINIDAS PELA ADMINISTRAÇÃO (MPDA)");
  linhas.push(`${empresa || "Empresa"}${periodo ? ` — ${periodo}` : ""}`);
  linhas.push("");
  linhas.push(
    "Esta nota apresenta, em local único, as medidas de desempenho definidas pela " +
    "administração utilizadas para comunicar publicamente sua visão sobre o desempenho " +
    "da entidade, conforme o CPC 51. Essas medidas não são definidas pelas normas " +
    "contábeis, podem não ser comparáveis com medidas de mesmo nome divulgadas por " +
    "outras entidades e não substituem os subtotais exigidos pela norma."
  );
  linhas.push("");

  calculos.forEach((c, i) => {
    linhas.push(`${i + 1}. ${c.medida.nome}`);
    linhas.push("");
    if (c.medida.porQueUtil) {
      linhas.push(c.medida.porQueUtil);
      linhas.push("");
    }
    linhas.push(
      `Conciliação com o subtotal mais diretamente comparável (${c.base.nome}), em R$:`
    );
    c.linhas.forEach((l) => linhas.push(`   ${l.lbl} .................... ${brl(l.val)}`));
    linhas.push("");
    linhas.push("   Efeito por item de conciliação (a preencher):");
    c.linhas
      .filter((l) => l.t === "l")
      .forEach((l) =>
        linhas.push(
          `   - ${l.lbl}: efeito de tributos sobre o lucro [__________]; ` +
          `efeito sobre participação de não controladores [__________].`
        )
      );
    linhas.push("");
    linhas.push(
      "   A administração não alterou a forma de cálculo desta medida em relação ao " +
      "período anterior. [Confirmar; havendo mudança, descrever a alteração, o motivo " +
      "e reapresentar o período comparativo.]"
    );
    linhas.push("");
  });

  linhas.push(
    "Os valores acima foram extraídos das mesmas contas que compõem a demonstração do " +
    "resultado do período."
  );
  return linhas.join("\n");
}
