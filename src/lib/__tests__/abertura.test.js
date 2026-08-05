import { describe, expect, it } from "vitest";
import { aplicarAbertura, parsearAbertura } from "../abertura.js";
import { montarBalanco } from "../balanco.js";

describe("parsearAbertura", () => {
  it("lê o formato código;saldo", () => {
    const r = parsearAbertura([
      ["11101001", "10.000,00"],
      ["21101001", "-4.000,00"],
    ]);
    expect(r.saldos["11101001"]).toBeCloseTo(10000, 2);
    expect(r.saldos["21101001"]).toBeCloseTo(-4000, 2);
    expect(r.lidas).toBe(2);
  });

  it("lê o formato código;débito;crédito como devedor − credor", () => {
    const r = parsearAbertura([["11101001", "10.000,00", "2.500,00"]]);
    expect(r.saldos["11101001"]).toBeCloseTo(7500, 2);
  });

  it("ignora cabeçalho e linhas de título sem código numérico", () => {
    const r = parsearAbertura([
      ["Conta", "Saldo"],
      ["ATIVO CIRCULANTE", ""],
      ["11101001", "500,00"],
    ]);
    expect(Object.keys(r.saldos)).toEqual(["11101001"]);
    expect(r.ignoradas).toBe(2);
  });

  it("soma código repetido em vez de deixar a última linha vencer", () => {
    // Alguns sistemas quebram a mesma conta por centro de custo.
    // Sobrescrever perderia dinheiro silenciosamente.
    const r = parsearAbertura([["11101001", "300,00"], ["11101001", "200,00"]]);
    expect(r.saldos["11101001"]).toBeCloseTo(500, 2);
  });
});

describe("aplicarAbertura", () => {
  it("soma abertura e movimento do período", () => {
    const r = aplicarAbertura([{ conta: "11101001", deb: 300, cre: 100 }], { "11101001": 1000 });
    expect(r[0].abertura).toBeCloseTo(1000, 2);
    expect(r[0].movimento).toBeCloseTo(200, 2);
    expect(r[0].saldoFinal).toBeCloseTo(1200, 2);
  });

  it("mantém conta que só existe no balancete, sem movimento no período", () => {
    // Se ela sumisse, o Balanço continuaria errado — que é justamente o
    // problema que o balancete veio corrigir.
    const r = aplicarAbertura([{ conta: "11101001", deb: 0, cre: 0 }], { "13101001": 5000 });
    const parada = r.find((c) => c.conta === "13101001");
    expect(parada.saldoFinal).toBeCloseTo(5000, 2);
    expect(parada.movimento).toBe(0);
  });
});

describe("montarBalanco", () => {
  const contas = [
    { conta: "11101001", deb: 5000, cre: 1000 },
    { conta: "21101001", deb: 500, cre: 4500 },
  ];

  it("sem balancete, mostra a movimentação do período e sinaliza isso", () => {
    const b = montarBalanco(contas);
    expect(b.comAbertura).toBe(false);
    expect(b.somaAtivo).toBeCloseTo(4000, 2);
    expect(b.somaPassivo).toBeCloseTo(4000, 2);
  });

  it("com balancete, mostra o saldo final de verdade", () => {
    const b = montarBalanco(contas, { "11101001": 20000, "21101001": -20000 });
    expect(b.comAbertura).toBe(true);
    expect(b.somaAtivo).toBeCloseTo(24000, 2); // 20.000 + 4.000
    expect(b.somaPassivo).toBeCloseTo(24000, 2); // 20.000 + 4.000 (credor)
    expect(Math.abs(b.diferenca)).toBeLessThan(0.01);
  });

  it("um balancete vazio não conta como balancete", () => {
    expect(montarBalanco(contas, {}).comAbertura).toBe(false);
  });
});
