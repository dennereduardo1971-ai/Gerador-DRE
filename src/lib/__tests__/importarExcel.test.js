import { describe, expect, it } from "vitest";
import { pontuarAbaDeContas } from "../importarExcel.js";

/* O balancete que o sistema contábil emite (ctbr041) vem com DUAS abas:
 * "Parametros", com as perguntas do relatório, e só a segunda com o
 * balancete. Escolher a primeira aba com dados pegava a de parâmetros — e
 * aí nem parsearBalancete nem parsearAbertura achavam conta nenhuma: o
 * arquivo inteiro morria em "não achei nenhuma conta nesse arquivo". */

const PARAMETROS = [
  ["Pergunta 01 : Data Inicial ?", "01/06/2026"],
  ["Pergunta 02 : Data Final ?", "30/06/2026"],
  ["Pergunta 03 : Conta Inicial ?", "1"],
  ["Pergunta 26 : Grupos Receitas/Despesas ?", "3;4;5;6;7"],
];

const BALANCETE = [
  ["Conta", "Descricao", "Saldo anterior", "Debito", "Credito", "Mov  periodo", "Saldo atual"],
  ["1", "ATIVO", "1.000,00 D", 5000, 4400, "600,00 D", "1.600,00 D"],
  ["1.1", "CIRCULANTE", "700,00 D", 5000, 4200, "800,00 D", "1.500,00 D"],
  ["1.1.11.00.1", "FUNDO FIXO", "700,00 D", 5000, 4200, "800,00 D", "1.500,00 D"],
];

describe("escolha da aba pela cara de tabela de contas", () => {
  it("a aba de parâmetros não tem código de conta nenhum", () => {
    expect(pontuarAbaDeContas(PARAMETROS)).toBe(0);
  });

  it("a aba do balancete pontua pelas linhas com código", () => {
    // Só as três contas; o cabeçalho não conta.
    expect(pontuarAbaDeContas(BALANCETE)).toBe(3);
  });

  it("o balancete vence a aba de parâmetros, esteja ela onde estiver", () => {
    expect(pontuarAbaDeContas(BALANCETE)).toBeGreaterThan(pontuarAbaDeContas(PARAMETROS));
  });

  it("conta código pontuado e não pontuado", () => {
    expect(pontuarAbaDeContas([["4.1.10.10", "x"], ["1111001", "y"]])).toBe(2);
  });

  it("não confunde texto, data nem linha de uma coluna só", () => {
    expect(pontuarAbaDeContas([["T O T A I S", "x"], ["01/06/2026", "y"], ["..."], ["1"]])).toBe(0);
  });
});
