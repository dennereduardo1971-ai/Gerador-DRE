import { describe, expect, it } from "vitest";
import { estruturaPatrimonial, indicesPatrimoniais, margens, ranquearDespesas, serieMensal } from "../indicadores.js";
import { GRUPOS } from "../grupos.js";

/* Balancete mínimo no formato que `parsearBalancete` devolve. */
const bal = (grupos) => {
  const porCodigo = new Map();
  let ativo = 0, passivo = 0;
  for (const [codigo, descricao, atual] of grupos) {
    porCodigo.set(codigo, { codigo, descricao, atual, filhos: [] });
    if (codigo[0] === "1") ativo += atual; else passivo += atual;
  }
  porCodigo.set("1", { codigo: "1", descricao: "ATIVO", atual: ativo, filhos: grupos.filter((g) => g[0][0] === "1").map((g) => g[0]) });
  porCodigo.set("2", { codigo: "2", descricao: "PASSIVO", atual: passivo, filhos: grupos.filter((g) => g[0][0] === "2").map((g) => g[0]) });
  return {
    porCodigo,
    resumo: { totalAtivo: ativo, totalPassivo: Math.abs(passivo), resultadoExercicio: ativo + passivo },
  };
};

const BALANCETE = bal([
  ["11", "CIRCULANTE", 400],
  ["12", "ATIVO NAO CIRCULANTE", 300],
  ["13", "ATIVO NAO CIRCULANTE", 300],
  ["21", "PASSIVO CIRCULANTE", -200],
  ["22", "PASSIVO NAO CIRCULANTE", -300],
  ["24", "PATRIMONIO LIQUIDO", -400],
]);

describe("estruturaPatrimonial", () => {
  const e = estruturaPatrimonial(BALANCETE);

  it("classifica pelo NOME do grupo, não pelo código", () => {
    // 1.2 e 1.3 são ambos "Ativo Não Circulante" no plano do IESB, e
    // outro plano usaria outra numeração. O nome é o que a contabilidade
    // padroniza.
    expect(e.ativoCirculante).toBeCloseTo(400, 2);
    expect(e.ativoNaoCirculante).toBeCloseTo(600, 2);
  });

  it("não confunde 'não circulante' com 'circulante'", () => {
    expect(e.passivoCirculante).toBeCloseTo(200, 2);
    expect(e.passivoNaoCirculante).toBeCloseTo(300, 2);
  });

  it("separa o patrimônio líquido do capital de terceiros", () => {
    expect(e.patrimonioLiquido).toBeCloseTo(400, 2);
  });

  it("os grupos somam exatamente o total de cada lado", () => {
    expect(e.ativoCirculante + e.ativoNaoCirculante).toBeCloseTo(e.totalAtivo, 2);
    expect(e.passivoCirculante + e.passivoNaoCirculante + e.patrimonioLiquido).toBeCloseTo(e.totalPassivo, 2);
  });
});

describe("indicesPatrimoniais", () => {
  const ip = indicesPatrimoniais(BALANCETE);

  it("calcula liquidez, endividamento e imobilização", () => {
    expect(ip.liquidezCorrente).toBeCloseTo(2, 2); // 400 / 200
    expect(ip.liquidezGeral).toBeCloseTo(2, 2); // 1000 / 500
    expect(ip.endividamento).toBeCloseTo(0.5, 4); // 500 / 1000
    expect(ip.imobilizacaoPL).toBeCloseTo(1.5, 4); // 600 / 400
    expect(ip.capitalCirculanteLiquido).toBeCloseTo(200, 2);
  });

  it("distingue índice indefinido de índice que vale zero", () => {
    // Sem passivo circulante, a liquidez corrente é INDEFINIDA — mostrar
    // 0,00 pareceria diagnóstico ("não cobre o curto prazo") quando é o
    // oposto. Já o endividamento de quem não deve nada é 0% de verdade:
    // é resposta, não ausência de dado.
    const semPassivo = indicesPatrimoniais(bal([["11", "CIRCULANTE", 100]]));
    expect(semPassivo.liquidezCorrente).toBe(null);
    expect(semPassivo.endividamento).toBe(0);
  });

  it("não existe sem balancete", () => {
    expect(indicesPatrimoniais(null)).toBe(null);
  });
});

describe("margens", () => {
  const dre = {
    receitaBruta: 1000, deducoes: 200, receitaLiq: 800,
    resultadoOperBruto: 500, despOper: 300, resultadoFin: -50,
    resultadoOper: 150, antesIR: 150, liquido: 100,
    bal: { DEPRECIACAO: { total: -40 } },
  };
  const m = margens(dre);

  it("calcula as margens sobre a receita líquida", () => {
    expect(m.margemBruta).toBeCloseTo(0.625, 4);
    expect(m.margemOperacional).toBeCloseTo(0.1875, 4);
    expect(m.margemLiquida).toBeCloseTo(0.125, 4);
  });

  it("mede o peso das deduções sobre a receita BRUTA", () => {
    // Sobre a líquida seria circular: a dedução é o que forma a líquida.
    expect(m.pesoDeducoes).toBeCloseTo(0.2, 4);
  });

  it("devolve o EBITDA sem o financeiro e com a depreciação de volta", () => {
    expect(m.ebitda).toBeCloseTo(240, 2); // 150 − (−50) + 40
  });

  it("devolve null para margem sobre receita zero", () => {
    const zerada = margens({ ...dre, receitaLiq: 0 });
    expect(zerada.margemLiquida).toBe(null);
  });
});

describe("serieMensal", () => {
  it("preserva a ordem cronológica que já vem de dresPorCompetencia", () => {
    const s = serieMensal([
      { competencia: "12/2025", dre: { receitaLiq: 100, despOper: -60, custos: -10, liquido: 30 } },
      { competencia: "01/2026", dre: { receitaLiq: 200, despOper: -80, custos: -20, liquido: 100 } },
    ]);
    expect(s.map((p) => p.competencia)).toEqual(["12/2025", "01/2026"]);
    expect(s[0].despesas).toBeCloseTo(70, 2);
    expect(s[1].margem).toBeCloseTo(0.5, 4);
  });
});

describe("ranquearDespesas", () => {
  it("ordena da maior para a menor, em valores positivos", () => {
    const dre = { bal: { DESP_ADM: { total: -300 }, CUSTOS: { total: -900 }, DESP_FIN: { total: -50 } } };
    const r = ranquearDespesas(dre, GRUPOS);
    expect(r.map((x) => x.id)).toEqual(["CUSTOS", "DESP_ADM", "DESP_FIN"]);
    expect(r.every((x) => x.valor > 0)).toBe(true);
  });

  it("não inclui linhas de receita no ranking de despesas", () => {
    const dre = { bal: { REC_MENSALIDADES: { total: 5000 }, DESP_ADM: { total: -300 } } };
    expect(ranquearDespesas(dre, GRUPOS).map((x) => x.id)).toEqual(["DESP_ADM"]);
  });

  it("omite grupos zerados em vez de listar barras vazias", () => {
    const dre = { bal: { DESP_ADM: { total: -300 }, CUSTOS: { total: 0 } } };
    expect(ranquearDespesas(dre, GRUPOS)).toHaveLength(1);
  });
});
