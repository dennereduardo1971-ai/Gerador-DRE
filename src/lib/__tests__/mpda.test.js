import { describe, expect, it } from "vitest";
import { GRUPOS } from "../grupos.js";
import { fazerCategoriaDe, montarDRE51 } from "../cpc51.js";
import { BASES, MODELOS, calcularMPDA, notaMPDA, validarMedida, valorDoGrupo } from "../mpda.js";

const conta = (codigo, saldo) => ({ conta: codigo, saldo, historico: "", deb: 0, cre: 0, n: 1 });

const GRUPO = {
  "31": "REC_MENSALIDADES",
  "41": "CUSTOS",
  "42": "DEPRECIACAO",
  "43": "PROVISOES_CONTINGENCIAS",
  "44": "PROVISOES_PCLD",
  "45": "OUTRAS_REC",
  "46": "DESP_FIN",
  "47": "IRPJ_CSLL",
};
const grupoDe = (c) => GRUPO[c] || "IGNORAR";
const CONTAS = [
  conta("31", 100000),
  conta("41", -50000),
  conta("42", -8000), // depreciação
  conta("43", -3000), // provisões contingências
  conta("44", -1000), // provisões PCLD
  conta("45", 2000), // outras receitas, agora operacionais
  conta("46", -5000), // despesas financeiras → financiamento
  conta("47", -7000), // IRPJ/CSLL → tributos
];

const dre51 = montarDRE51(CONTAS, grupoDe, fazerCategoriaDe({ grupoDe }));

describe("EBITDA no CPC 51", () => {
  const ebitda = calcularMPDA(MODELOS[0], dre51);

  it("parte do resultado operacional, que já exclui juros e tributos", () => {
    expect(ebitda.base.id).toBe("OPERACIONAL");
    expect(ebitda.valorBase).toBeCloseTo(dre51.operacional, 2);
  });

  it("devolve a depreciação ao resultado, somando", () => {
    expect(ebitda.valor).toBeCloseTo(dre51.operacional + 8000, 2);
  });

  it("a conciliação começa no subtotal da norma e termina na medida", () => {
    expect(ebitda.linhas[0].t).toBe("sub");
    expect(ebitda.linhas.at(-1)).toMatchObject({ t: "final", lbl: "EBITDA" });
    const soma = ebitda.linhas.filter((l) => l.t === "l").reduce((s, l) => s + l.val, ebitda.valorBase);
    expect(soma).toBeCloseTo(ebitda.valor, 2);
  });
});

describe("as outras medidas prontas", () => {
  it("EBITDA ajustado também exclui provisões", () => {
    const c = calcularMPDA(MODELOS[1], dre51);
    expect(c.valor).toBeCloseTo(dre51.operacional + 8000 + 3000 + 1000, 2);
  });

  it("resultado recorrente tira do operacional o que antes era não operacional", () => {
    const c = calcularMPDA(MODELOS[2], dre51);
    expect(c.valor).toBeCloseTo(dre51.operacional - 2000, 2);
  });

  it("toda medida pronta explica por que a administração a usa", () => {
    MODELOS.forEach((m) => expect(String(m.porQueUtil).length).toBeGreaterThan(40));
  });
});

describe("grupo partido entre categorias", () => {
  it("soma o grupo inteiro, não só a primeira categoria em que ele aparece", () => {
    const contas = [...CONTAS, conta("42b", -2000)];
    const g = (c) => (c === "42b" ? "DEPRECIACAO" : grupoDe(c));
    const categoriaDe = fazerCategoriaDe({ grupoDe: g, categoriaPorConta: { "42b": "INVESTIMENTO" } });
    const partido = montarDRE51(contas, g, categoriaDe);
    expect(valorDoGrupo(partido, "DEPRECIACAO")).toBeCloseTo(-10000, 2);
  });
});

describe("validação de medida criada pelo usuário", () => {
  const ids = GRUPOS.map((g) => g.id);

  it("exige nome, base válida e pelo menos um ajuste", () => {
    expect(validarMedida({ nome: "", base: "OPERACIONAL", ajustes: [] }, ids).ok).toBe(false);
    expect(validarMedida({ nome: "X", base: "INVENTADA", ajustes: [] }, ids).ok).toBe(false);
    expect(validarMedida({ nome: "X", base: "OPERACIONAL", ajustes: [] }, ids).ok).toBe(false);
  });

  it("recusa ajuste em grupo que não existe", () => {
    const r = validarMedida(
      { nome: "X", base: "OPERACIONAL", ajustes: [{ tipo: "grupo", id: "NAO_EXISTE", modo: "excluir" }] },
      ids
    );
    expect(r.ok).toBe(false);
  });

  it("aceita uma medida bem formada", () => {
    const r = validarMedida(
      { nome: "EBITDA", base: "OPERACIONAL", ajustes: [{ tipo: "grupo", id: "DEPRECIACAO", modo: "excluir" }] },
      ids
    );
    expect(r.ok).toBe(true);
  });

  it("toda base declarada existe na demonstração do CPC 51", () => {
    BASES.forEach((b) => expect(dre51[b.campo]).toBeTypeOf("number"));
  });
});

describe("minuta da nota explicativa", () => {
  const texto = notaMPDA([MODELOS[0]], dre51, { empresa: "Faculdade Exemplo", periodo: "jan/2027" });

  it("nomeia a medida, o subtotal comparável e o período", () => {
    expect(texto).toContain("EBITDA");
    expect(texto).toContain("Resultado Operacional");
    expect(texto).toContain("jan/2027");
  });

  it("deixa o efeito tributário como lacuna, nunca como zero", () => {
    expect(texto).toContain("efeito de tributos sobre o lucro [__________]");
    expect(texto).toContain("não controladores");
  });

  it("avisa que a medida não substitui os subtotais da norma", () => {
    expect(texto).toContain("não substituem os subtotais exigidos pela norma");
  });
});
