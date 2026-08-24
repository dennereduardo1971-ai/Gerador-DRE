import { describe, expect, it } from "vitest";
import { contasDeMovimento, parsearBalancete } from "../balancete.js";
import { montarDRE, sugerirClassificacao } from "../classify.js";

/* O BALANCETE MONTA A DRE SOZINHO.
 *
 * Este arquivo provava outra coisa até 24/08/2026: que a DRE saía
 * idêntica pelo razão e pelo balancete. O razão saiu do app — e o que a
 * afirmação tinha de mais valioso continua aqui, porque não dependia
 * dele: o balancete guarda movimento = débito − crédito e o app usa
 * saldo = crédito − débito. Um é o negativo do outro, e "simplificar"
 * isso inverte a demonstração inteira sem quebrar mais nada
 * visivelmente. Daí o último teste deste arquivo.
 *
 * O balancete abaixo descreve um mês inteiro: mensalidade recebida,
 * bolsa concedida, aluguel e folha do administrativo pagos.
 */

const BALANCETE = [
  ["Conta", "Descricao", "Saldo anterior", "Debito", "Credito", "Mov  periodo", "Saldo atual"],
  // patrimonial
  ["1", "ATIVO", "0,00", 10000, 6500, "3.500,00 D", "3.500,00 D"],
  ["1.1", "CIRCULANTE", "0,00", 10000, 6500, "3.500,00 D", "3.500,00 D"],
  ["1.1.11.0", "CAIXA", "0,00", 10000, 6500, "3.500,00 D", "3.500,00 D"],
  ["1.1.11.00.1", "FUNDO FIXO", "0,00", 10000, 6500, "3.500,00 D", "3.500,00 D"],
  // resultado — o que faz o balancete montar a DRE sozinho
  ["3", "RECEITAS LIQUIDAS", "0,00", 1000, 10000, "9.000,00 C", "9.000,00 C"],
  ["3.1", "RECEITA BRUTA", "0,00", 0, 10000, "10.000,00 C", "10.000,00 C"],
  ["3.1.10.1", "RECEITAS PROPRIAS", "0,00", 0, 10000, "10.000,00 C", "10.000,00 C"],
  ["3.1.10.10.1", "GRADUACAO", "0,00", 0, 10000, "10.000,00 C", "10.000,00 C"],
  ["3.2", "DEDUCOES", "0,00", 1000, 0, "1.000,00 D", "1.000,00 D"],
  ["3.2.10.0", "(-)BOLSAS ESTUDANTIS", "0,00", 1000, 0, "1.000,00 D", "1.000,00 D"],
  ["3.2.10.00.1", "(-)BOLSA INSTITUCIONAL", "0,00", 1000, 0, "1.000,00 D", "1.000,00 D"],
  ["4", "DESPESAS ADMINISTRATIVAS", "0,00", 5500, 0, "5.500,00 D", "5.500,00 D"],
  ["4.1", "OPERACIONAIS", "0,00", 5500, 0, "5.500,00 D", "5.500,00 D"],
  ["4.1.11.1", "FOPAG ADMINISTRATIVO", "0,00", 3000, 0, "3.000,00 D", "3.000,00 D"],
  ["4.1.11.10.1", "SALARIOS", "0,00", 3000, 0, "3.000,00 D", "3.000,00 D"],
  ["4.1.20.1", "DESPESAS GERAIS", "0,00", 2500, 0, "2.500,00 D", "2.500,00 D"],
  ["4.1.20.10.1", "ALUGUEL", "0,00", 2500, 0, "2.500,00 D", "2.500,00 D"],
];

const NOMES = {
  "3": "RECEITAS LIQUIDAS", "4": "DESPESAS ADMINISTRATIVAS",
  "5": "OUTRAS RECEITAS", "6": "PROVISOES",
  "31101": "RECEITAS PROPRIAS", "32100": "(-)BOLSAS ESTUDANTIS",
  "41111": "FOPAG ADMINISTRATIVO", "41201": "DESPESAS GERAIS",
};

const dreDe = (contas) => {
  const resultado = contas.filter((c) => c.conta[0] >= "3" && c.conta[0] <= "7");
  const mapa = sugerirClassificacao(resultado, NOMES);
  return montarDRE(resultado, (c) => mapa[c]);
};

describe("a DRE montada a partir do balancete", () => {
  const bal = parsearBalancete(BALANCETE);
  const doBalancete = contasDeMovimento(bal);

  it("traz uma conta por folha do balancete, com débito e crédito do período", () => {
    for (const [codigo, deb, cre] of [
      ["3110101", 0, 10000], ["3210001", 1000, 0],
      ["4120101", 2500, 0], ["4111101", 3000, 0],
    ]) {
      const b = doBalancete.find((c) => c.conta === codigo);
      expect(b, `conta ${codigo} ausente no balancete`).toBeTruthy();
      expect(b.deb, `débito de ${codigo}`).toBeCloseTo(deb, 2);
      expect(b.cre, `crédito de ${codigo}`).toBeCloseTo(cre, 2);
      expect(b.saldo, `saldo de ${codigo}`).toBeCloseTo(cre - deb, 2);
    }
  });

  it("cada linha da demonstração fecha com o esperado", () => {
    const d = dreDe(doBalancete);
    expect(d.receitaBruta).toBeCloseTo(10000, 2);
    expect(d.deducoes).toBeCloseTo(1000, 2);
    expect(d.receitaLiq).toBeCloseTo(9000, 2);
    expect(d.despOper).toBeCloseTo(5500, 2);
    expect(d.resultadoOper).toBeCloseTo(3500, 2);
    expect(d.antesIR).toBeCloseTo(3500, 2);
  });

  it("o lucro líquido bate com o saldo do caixa", () => {
    // 10.000 de receita − 1.000 de bolsa − 2.500 de aluguel − 3.000 de
    // folha = 3.500, que é também o saldo do caixa no balancete.
    expect(dreDe(doBalancete).liquido).toBeCloseTo(3500, 2);
    expect(bal.porCodigo.get("1111001").atual).toBeCloseTo(3500, 2);
  });

  it("um erro de sinal na conversão quebraria este teste", () => {
    // Guarda explícita: o balancete usa movimento = débito − crédito, e o
    // app usa saldo = crédito − débito. Se alguém "simplificar" isso, a
    // receita vira despesa e a DRE inverte sem quebrar mais nada.
    const receita = doBalancete.find((c) => c.conta === "3110101");
    expect(receita.saldo).toBeGreaterThan(0); // receita é credora
    const despesa = doBalancete.find((c) => c.conta === "4120101");
    expect(despesa.saldo).toBeLessThan(0); // despesa é devedora
  });
});
