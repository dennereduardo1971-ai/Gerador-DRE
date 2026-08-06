import { describe, expect, it } from "vitest";
import { agregarPorConta, mapearColunas } from "../parse.js";
import { contasDeMovimento, parsearBalancete } from "../balancete.js";
import { montarDRE, sugerirClassificacao } from "../classify.js";

/* AS DUAS FONTES DESCREVEM O MESMO FATO.
 *
 * O razão soma lançamento a lançamento até chegar no movimento de cada
 * conta; o balancete já traz esse movimento somado pela contabilidade.
 * A afirmação central desta funcionalidade é que a DRE sai idêntica pelos
 * dois caminhos — e ela precisa estar travada por teste, porque um erro
 * de sinal na conversão inverteria a demonstração inteira sem quebrar
 * nada visivelmente.
 *
 * Os dois blocos abaixo descrevem o MESMO mês: quatro lançamentos no
 * razão, e o balancete correspondente com o movimento já somado.
 */

const CABECALHO = ["Dia/Mes", "Cta. Debito", "Cta. Credito", "Valor Debito", "Valor Credito", "Historico", "Ano"];
const MAP = mapearColunas(CABECALHO);

const RAZAO = [
  // Mensalidade recebida: caixa (débito) contra receita (crédito)
  { "Dia/Mes": "05/jan", Ano: "2026", "Cta. Debito": "1111001", "Cta. Credito": "3110101",
    "Valor Debito": "10.000,00", "Valor Credito": "10.000,00", Historico: "MENSALIDADE" },
  // Bolsa concedida: dedução (débito) contra caixa (crédito)
  { "Dia/Mes": "10/jan", Ano: "2026", "Cta. Debito": "3210001", "Cta. Credito": "1111001",
    "Valor Debito": "1.000,00", "Valor Credito": "1.000,00", Historico: "BOLSA" },
  // Despesa administrativa paga
  { "Dia/Mes": "15/jan", Ano: "2026", "Cta. Debito": "4120101", "Cta. Credito": "1111001",
    "Valor Debito": "2.500,00", "Valor Credito": "2.500,00", Historico: "ALUGUEL" },
  // Folha do administrativo
  { "Dia/Mes": "20/jan", Ano: "2026", "Cta. Debito": "4111101", "Cta. Credito": "1111001",
    "Valor Debito": "3.000,00", "Valor Credito": "3.000,00", Historico: "FOPAG" },
];

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

describe("razão e balancete produzem a mesma DRE", () => {
  const doRazao = agregarPorConta(RAZAO, MAP, "todos", "todos", "todas").contas;
  const bal = parsearBalancete(BALANCETE);
  const doBalancete = contasDeMovimento(bal);

  it("o movimento por conta bate entre as duas fontes", () => {
    for (const codigo of ["3110101", "3210001", "4120101", "4111101"]) {
      const r = doRazao.find((c) => c.conta === codigo);
      const b = doBalancete.find((c) => c.conta === codigo);
      expect(b, `conta ${codigo} ausente no balancete`).toBeTruthy();
      expect(b.deb, `débito de ${codigo}`).toBeCloseTo(r.deb, 2);
      expect(b.cre, `crédito de ${codigo}`).toBeCloseTo(r.cre, 2);
      expect(b.saldo, `saldo de ${codigo}`).toBeCloseTo(r.saldo, 2);
    }
  });

  it("a DRE sai idêntica pelos dois caminhos, linha por linha", () => {
    const a = dreDe(doRazao);
    const b = dreDe(doBalancete);
    for (const linha of [
      "receitaBruta", "deducoes", "receitaLiq", "resultadoOperBruto",
      "despOper", "resultadoFin", "resultadoOper", "antesIR", "liquido",
    ]) {
      expect(b[linha], `linha ${linha}`).toBeCloseTo(a[linha], 2);
    }
  });

  it("o lucro líquido é o esperado por conta própria", () => {
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
