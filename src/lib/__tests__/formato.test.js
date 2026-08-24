import { describe, expect, it } from "vitest";
import { brl, numeroBR, parsearPlanoDeContas, pct } from "../formato.js";

/* O que sobrou quando o razão contábil saiu do app (24/08/2026).
 *
 * Este arquivo era `parse.test.js` e cobria também o mapeamento de
 * colunas do razão, a competência por lançamento e `agregarPorConta` —
 * tudo isso deixou de existir junto com a leitura do razão. O que fica é
 * o que não depende de fonte nenhuma: formatação, número em pt-BR e a
 * leitura de um plano de contas de duas colunas.
 */

describe("brl e pct", () => {
  it("formata em pt-BR, com despesa entre parênteses", () => {
    expect(brl(1234.5)).toBe("1.234,50");
    expect(brl(-1234.5)).toBe("(1.234,50)");
    expect(brl(0)).toBe("0,00");
  });

  it("usa vírgula decimal no percentual, como o resto do app", () => {
    expect(pct(0.3263)).toBe("32,6%");
    expect(pct(-0.5)).toBe("-50,0%");
    // Sem denominador não há percentual — e "0,0%" ali pareceria
    // diagnóstico em vez de ausência de base.
    expect(pct(Infinity)).toBe("—");
    expect(pct(NaN)).toBe("—");
  });
});

describe("numeroBR", () => {
  it("lê os formatos que aparecem num razão brasileiro", () => {
    expect(numeroBR("1.234,56")).toBe(1234.56);
    expect(numeroBR("1234,56")).toBe(1234.56);
    expect(numeroBR("1234.56")).toBe(1234.56);
    expect(numeroBR("R$ 1.234,56")).toBe(1234.56);
    expect(numeroBR(1234.56)).toBe(1234.56);
  });

  it("devolve 0 para vazio e lixo, nunca NaN", () => {
    expect(numeroBR("")).toBe(0);
    expect(numeroBR(null)).toBe(0);
    expect(numeroBR(undefined)).toBe(0);
    expect(numeroBR("abc")).toBe(0);
  });
});

describe("parsearPlanoDeContas", () => {
  it("monta código → descrição a partir de duas colunas", () => {
    const nomes = parsearPlanoDeContas([
      ["3", "RECEITAS LIQUIDAS"],
      ["31101", "RECEITAS PROPRIAS"],
      ["", "linha sem código"],
    ]);
    expect(nomes["31101"]).toBe("RECEITAS PROPRIAS");
    expect(Object.keys(nomes)).toHaveLength(2);
  });
});
