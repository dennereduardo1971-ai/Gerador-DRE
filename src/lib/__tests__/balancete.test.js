import { describe, expect, it } from "vitest";
import { achatar, coberturaBalancete, contasDeMovimento, gruposDe, nomesDoBalancete, parsearBalancete, valorDC } from "../balancete.js";

/* Recorte fiel do balancete real (ctbr041.xlsx): mesma estrutura de
 * cabeçalho, mesma pontuação de código, mesma mistura de colunas
 * formatadas em pt-BR com colunas numéricas cruas, e o mesmo pulo de
 * nível (1.3.40.0 pendura direto em 1.3, porque não existe 1.3.4). */
const CABECALHO = ["Conta", "Descricao", "Saldo anterior", "Debito", "Credito", "Mov  periodo", "Saldo atual"];
const BALANCETE = [
  [null, null, null, null, null, null, null],
  CABECALHO,
  ["1", "ATIVO", "      1.000,00 D", 5000, 4400, "        600,00 D", "      1.600,00 D"],
  ["1.1", "CIRCULANTE", "        700,00 D", 5000, 4200, "        800,00 D", "      1.500,00 D"],
  ["1.1.1", "DISPONIBILIDADE IMEDIATA", "        700,00 D", 5000, 4200, "        800,00 D", "      1.500,00 D"],
  ["1.1.11.0", "CAIXA", "        700,00 D", 5000, 4200, "        800,00 D", "      1.500,00 D"],
  ["1.1.11.00.1", "FUNDO FIXO", "        700,00 D", 5000, 4200, "        800,00 D", "      1.500,00 D"],
  ["1.3", "ATIVO NAO CIRCULANTE", "        300,00 D", 0, 200, "        200,00 C", "        100,00 D"],
  ["1.3.1", "INVESTIMENTOS", "        300,00 D", 0, 0, "          0,00", "        300,00 D"],
  ["1.3.10.0", "TERRENOS", "        300,00 D", 0, 0, "          0,00", "        300,00 D"],
  ["1.3.10.00.1", "TERRENO SEDE", "        300,00 D", 0, 0, "          0,00", "        300,00 D"],
  ["1.3.40.0", "(-)DEPRECIACAO SOCIETARIA", "          0,00", 0, 200, "        200,00 C", "        200,00 C"],
  ["1.3.40.00.0", "(-)MOVEIS E UTENSILIOS", "          0,00", 0, 200, "        200,00 C", "        200,00 C"],
  ["2", "PASSIVO", "      1.000,00 C", 100, 600, "        500,00 C", "      1.500,00 C"],
  ["2.1", "PASSIVO CIRCULANTE", "      1.000,00 C", 100, 600, "        500,00 C", "      1.500,00 C"],
  ["2.1.1", "FORNECEDORES", "      1.000,00 C", 100, 600, "        500,00 C", "      1.500,00 C"],
  ["2.1.10.0", "FORNECEDORES NACIONAIS", "      1.000,00 C", 100, 600, "        500,00 C", "      1.500,00 C"],
  ["2.1.10.00.1", "FORNECEDOR A", "      1.000,00 C", 100, 600, "        500,00 C", "      1.500,00 C"],
  ["T O T A I S  D O  P E R I O D O: ", null, null, null, null, null, null],
];


describe("valorDC", () => {
  it("lê a natureza pelo sufixo D/C, não pelo sinal", () => {
    expect(valorDC("1.234,56 D")).toBeCloseTo(1234.56, 2);
    expect(valorDC("1.234,56 C")).toBeCloseTo(-1234.56, 2);
    expect(valorDC("      255.099.955,67 D")).toBeCloseTo(255099955.67, 2);
  });

  it("desempata o ponto pela vírgula, como numeroBR", () => {
    // As duas formas convivem no mesmo arquivo: colunas formatadas em
    // pt-BR e colunas numéricas cruas. Tratar o ponto como milhar nos
    // dois casos multiplicava o movimento do período por cem.
    expect(valorDC("393.899.653,88")).toBeCloseTo(393899653.88, 2);
    expect(valorDC("393899653.88")).toBeCloseTo(393899653.88, 2);
    expect(valorDC(393899653.88)).toBeCloseTo(393899653.88, 2);
  });

  it("devolve 0 para vazio e lixo, nunca NaN", () => {
    ["", null, undefined, "abc", "-"].forEach((v) => expect(valorDC(v)).toBe(0));
  });
});

describe("parsearBalancete", () => {
  const bal = parsearBalancete(BALANCETE);

  it("acha o cabeçalho mesmo com linhas vazias antes", () => {
    expect(bal).not.toBe(null);
    expect(bal.lidas).toBe(16);
  });

  it("descarta o rodapé de totais sem contá-lo como conta", () => {
    expect(bal.porCodigo.has("TOTAIS")).toBe(false);
    expect(bal.contas.every((c) => /^\d+$/.test(c.codigo))).toBe(true);
  });

  it("monta a hierarquia pelo prefixo mais longo que existe", () => {
    // O nível pode ser pulado: 1.3.40.0 pendura em 1.3, não em 1.3.4,
    // que não existe. Fatiar por número de pontos monta a árvore errada.
    expect(bal.porCodigo.get("13400").pai).toBe("13");
    expect(bal.porCodigo.get("1111001").pai).toBe("11110");
    expect(bal.porCodigo.get("11").pai).toBe("1");
    expect(bal.porCodigo.get("1").pai).toBe(null);
  });

  it("distingue analítica de sintética pela presença de filhas", () => {
    expect(bal.folhas.map((c) => c.codigo).sort()).toEqual(
      ["1111001", "1310001", "1340000", "2110001"].sort()
    );
  });

  it("guarda os cinco valores de cada linha", () => {
    const c = bal.porCodigo.get("1111001");
    expect(c.anterior).toBeCloseTo(700, 2);
    expect(c.debito).toBeCloseTo(5000, 2);
    expect(c.credito).toBeCloseTo(4200, 2);
    expect(c.movimento).toBeCloseTo(800, 2);
    expect(c.atual).toBeCloseTo(1500, 2);
  });

  it("expõe o saldo anterior das analíticas como saldo de abertura", () => {
    // É o que liga este formato ao caminho que o Balanço já tinha.
    expect(bal.saldosAbertura["1111001"]).toBeCloseTo(700, 2);
    expect(bal.saldosAbertura["11110"]).toBeUndefined(); // sintética não entra
  });

  it("não soma as sintéticas junto das folhas", () => {
    // O arquivo já traz as sintéticas somadas; totalizar tudo dá o dobro.
    const r = bal.resumo;
    expect(r.debitoPeriodo).toBeCloseTo(5100, 2); // 5000 + 0 + 0 + 100
    expect(r.creditoPeriodo).toBeCloseTo(5000, 2); // 4200 + 0 + 200 + 600
  });

  it("recusa arquivo que não é balancete", () => {
    expect(parsearBalancete([["qualquer", "coisa"], ["1", "2"]])).toBe(null);
    expect(parsearBalancete([])).toBe(null);
  });
});

describe("resumo — o desequilíbrio é o resultado do exercício", () => {
  const r = parsearBalancete(BALANCETE).resumo;

  it("mede Ativo, Passivo + PL e a diferença entre eles", () => {
    expect(r.totalAtivo).toBeCloseTo(1600, 2);
    expect(r.totalPassivo).toBeCloseTo(1500, 2);
    expect(r.resultadoExercicio).toBeCloseTo(100, 2);
  });

  it("a diferença é igual a débitos menos créditos do período", () => {
    // Não é coincidência: é a identidade que prova que o balancete das
    // contas 1 e 2 só não fecha pelo resultado que está nas contas 3 a 7.
    // Vale quando o saldo ANTERIOR já estava equilibrado, isto é, quando
    // o exercício anterior foi encerrado — que é o caso normal e o do
    // arquivo real (débitos 478.342.682,57 − créditos 477.412.123,48 =
    // 930.559,09 = Ativo − Passivo).
    expect(r.debitoPeriodo - r.creditoPeriodo).toBeCloseTo(r.resultadoExercicio, 2);
  });

  it("confere a integridade interna do arquivo", () => {
    expect(r.inconsistentes).toBe(0);
    expect(r.sinteticasErradas).toBe(0);
    expect(r.integro).toBe(true);
  });

  it("aponta a linha em que anterior + movimento não dá o atual", () => {
    const quebrado = BALANCETE.map((l) =>
      l[0] === "1.1.11.00.1" ? [...l.slice(0, 6), "      9.999,00 D"] : l
    );
    expect(parsearBalancete(quebrado).resumo.inconsistentes).toBeGreaterThan(0);
  });
});

describe("achatar e gruposDe", () => {
  const bal = parsearBalancete(BALANCETE);

  it("um nó fechado esconde toda a subárvore", () => {
    const soRaizes = achatar(bal, new Set());
    expect(soRaizes.map((c) => c.codigo)).toEqual(["1", "2"]);
  });

  it("abrir um nó revela só o nível seguinte", () => {
    const codigos = achatar(bal, new Set(["1"])).map((c) => c.codigo);
    expect(codigos).toEqual(["1", "11", "13", "2"]);
  });

  it("gruposDe entrega o segundo nível com suas filhas, para o Balanço", () => {
    const ativo = gruposDe(bal, "1");
    expect(ativo.map((g) => g.descricao)).toEqual(["CIRCULANTE", "ATIVO NAO CIRCULANTE"]);
    expect(ativo[1].itens.map((i) => i.descricao)).toEqual([
      "INVESTIMENTOS", "(-)DEPRECIACAO SOCIETARIA",
    ]);
  });
});

describe("balancete como fonte da DRE", () => {
  const bal = parsearBalancete(BALANCETE);

  it("informa que este arquivo só cobre o patrimonial", () => {
    const c = coberturaBalancete(bal);
    expect(c.patrimonial).toBe(true);
    expect(c.resultado).toBe(false);
    expect(c.digitos).toEqual(["1", "2"]);
  });

  it("reconhece contas de resultado quando o balancete não vem filtrado", () => {
    const comResultado = parsearBalancete([
      ...BALANCETE.slice(0, -1),
      ["3", "RECEITAS", "0,00", 0, 5000, "5.000,00 C", "5.000,00 C"],
      ["3.1", "MENSALIDADES", "0,00", 0, 5000, "5.000,00 C", "5.000,00 C"],
      ["3.1.10.0", "GRADUACAO", "0,00", 0, 5000, "5.000,00 C", "5.000,00 C"],
      ["3.1.10.00.1", "GRADUACAO PRESENCIAL", "0,00", 0, 5000, "5.000,00 C", "5.000,00 C"],
    ]);
    const c = coberturaBalancete(comResultado);
    expect(c.resultado).toBe(true);
    expect(c.digitos).toContain("3");
  });

  it("converte as folhas para o formato de agregarPorConta, invertendo o sinal", () => {
    // agregarPorConta usa saldo = crédito − débito (natureza credora
    // positiva, que é o que montarDRE espera para receitas); o balancete
    // usa movimento = débito − crédito. Trocar isso inverteria a DRE.
    const contas = contasDeMovimento(bal);
    const fundoFixo = contas.find((c) => c.conta === "1111001");
    expect(fundoFixo.deb).toBeCloseTo(5000, 2);
    expect(fundoFixo.cre).toBeCloseTo(4200, 2);
    expect(fundoFixo.saldo).toBeCloseTo(-800, 2);
    expect(fundoFixo.saldo).toBeCloseTo(-bal.porCodigo.get("1111001").movimento, 2);
  });

  it("converte só as analíticas — as sintéticas já vêm somadas", () => {
    expect(contasDeMovimento(bal)).toHaveLength(bal.folhas.length);
  });

  it("entrega o plano de contas de graça, sintéticas inclusive", () => {
    // É o que permite a classificação por código funcionar sem o arquivo
    // separado de plano de contas: a assinatura do perfil olha o nome das
    // contas-síntese de topo.
    const nomes = nomesDoBalancete(bal);
    expect(nomes["1"]).toBe("ATIVO");
    expect(nomes["11110"]).toBe("CAIXA");
    expect(nomes["1111001"]).toBe("FUNDO FIXO");
  });
});
