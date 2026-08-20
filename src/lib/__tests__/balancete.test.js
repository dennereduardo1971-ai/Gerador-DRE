import { describe, expect, it } from "vitest";
import { achatar, coberturaBalancete, contasAcumuladas, contasDeMovimento, gruposDe, nomesDoBalancete, parsearBalancete, periodoDoBalancete, periodoLegivel, valorDC } from "../balancete.js";

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
    expect(r.raizesErradas).toBe(0);
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

/* ------------------------------------------------------------------ *
 * As duas leituras do MESMO arquivo: mês e acumulado.
 *
 * Um balancete mensal traz o movimento do período (resultado do mês) e o
 * saldo atual (resultado acumulado do exercício). O app já lia o
 * primeiro; ignorar o segundo fazia a tela acusar divergência contra o
 * Balanço todo mês, porque comparava o acumulado do Balanço com a DRE do
 * mês. Estes testes congelam a distinção.
 * ------------------------------------------------------------------ */
describe("mês × acumulado", () => {
  /* Conta de resultado com histórico: já vinham R$ 900 acumulados de
     meses anteriores (saldo anterior) e o mês corrente somou R$ 100. */
  const COM_RESULTADO = [
    CABECALHO,
    ["1", "ATIVO", "      1.000,00 D", 100, 0, "        100,00 D", "      1.100,00 D"],
    ["1.1.11.00.1", "CAIXA", "      1.000,00 D", 100, 0, "        100,00 D", "      1.100,00 D"],
    ["2", "PASSIVO", "        100,00 C", 0, 0, "          0,00", "        100,00 C"],
    ["2.1.10.00.1", "FORNECEDOR A", "        100,00 C", 0, 0, "          0,00", "        100,00 C"],
    ["3", "RECEITAS", "        900,00 C", 0, 100, "        100,00 C", "      1.000,00 C"],
    ["3.1.10.00.1", "MENSALIDADES", "        900,00 C", 0, 100, "        100,00 C", "      1.000,00 C"],
  ];
  const bal = parsearBalancete(COM_RESULTADO);

  it("contasDeMovimento devolve o resultado só do MÊS", () => {
    const rec = contasDeMovimento(bal).find((c) => c.conta === "3110001");
    expect(rec.saldo).toBeCloseTo(100, 2); // crédito − débito do período
  });

  it("contasAcumuladas devolve o resultado do EXERCÍCIO até a data", () => {
    const rec = contasAcumuladas(bal).find((c) => c.conta === "3110001");
    expect(rec.saldo).toBeCloseTo(1000, 2); // 900 anteriores + 100 do mês
  });

  it("as duas mantêm a convenção de sinal: receita credora é positiva", () => {
    const mov = contasDeMovimento(bal).find((c) => c.conta === "3110001");
    const acu = contasAcumuladas(bal).find((c) => c.conta === "3110001");
    expect(mov.saldo).toBeGreaterThan(0);
    expect(acu.saldo).toBeGreaterThan(0);
  });

  it("o acumulado é o que reproduz o desequilíbrio do Balanço", () => {
    /* Ativo − (Passivo + PL) tem que dar o resultado ACUMULADO, não o do
       mês. É essa igualdade que a tela confere — e era ela que dava
       alarme falso quando comparada contra a DRE mensal. */
    const acumulado = contasAcumuladas(bal)
      .filter((c) => c.conta[0] >= "3")
      .reduce((s, c) => s + c.saldo, 0);
    expect(bal.resumo.resultadoExercicio).toBeCloseTo(acumulado, 2);
    // e o do mês, neste arquivo, é outro número — de propósito
    const doMes = contasDeMovimento(bal)
      .filter((c) => c.conta[0] >= "3")
      .reduce((s, c) => s + c.saldo, 0);
    expect(doMes).not.toBeCloseTo(acumulado, 2);
  });
});

describe("integridade não depende da árvore", () => {
  /* A hierarquia é reconstruída pelo prefixo mais longo existente, e num
     plano de contas real isso erra o galho de algumas folhas: 4110110
     pertence à sintética 411010, que NÃO é prefixo dela. Nenhum total
     muda por causa disso — o conjunto de folhas é o mesmo. Por isso a
     conferência é por raiz, e não sintética a sintética. */
  const ARVORE_AMBIGUA = [
    CABECALHO,
    ["4", "DESPESAS", "          0,00", 300, 0, "        300,00 D", "        300,00 D"],
    ["4.1.10.1", "CUSTO TOTAL", "          0,00", 300, 0, "        300,00 D", "        300,00 D"],
    ["4.1.10.10", "CUSTO COM PESSOAL", "          0,00", 300, 0, "        300,00 D", "        300,00 D"],
    ["4.1.10.10.1", "SALARIOS", "          0,00", 200, 0, "        200,00 D", "        200,00 D"],
    ["4.1.10.11.0", "EXAMES PERIODICOS", "          0,00", 100, 0, "        100,00 D", "        100,00 D"],
  ];
  const bal = parsearBalancete(ARVORE_AMBIGUA);

  it("a folha de prefixo diferente cai em outro galho", () => {
    // 4110110 não tem 411010 como prefixo, então pendura em 41101.
    expect(bal.porCodigo.get("4110110").pai).toBe("41101");
    expect(bal.porCodigo.get("4110101").pai).toBe("411010");
  });

  it("mesmo assim a raiz fecha, e o arquivo é dado como íntegro", () => {
    expect(bal.resumo.raizesErradas).toBe(0);
    expect(bal.resumo.integro).toBe(true);
  });

  it("o desencontro da árvore é reportado à parte, sem virar erro", () => {
    expect(bal.resumo.sinteticasAproximadas).toBeGreaterThan(0);
  });

  it("nenhuma folha se perde: elas somam o total da raiz", () => {
    const soma = bal.folhas.reduce((s, c) => s + c.atual, 0);
    expect(soma).toBeCloseTo(bal.porCodigo.get("4").atual, 2);
  });
});

/* ------------------------------------------------------------------ *
 * O período vem do próprio arquivo.
 *
 * O relatório grava as respostas da extração numa aba à parte. Ler dali
 * evita pedir ao usuário um período que o arquivo já declara — e é o que
 * deixa o histórico se rotular sozinho.
 * ------------------------------------------------------------------ */
describe("periodoDoBalancete", () => {
  const PARAMETROS = {
    nome: "Parametros",
    linhas: [
      ["Pergunta 01 : Data Inicial ?", "01/06/2026"],
      ["Pergunta 02 : Data Final ?", "30/06/2026"],
      ["Pergunta 03 : Conta Inicial ?", "1"],
    ],
  };

  it("lê data inicial e final da aba de parâmetros", () => {
    const p = periodoDoBalancete([PARAMETROS, { nome: "Dados", linhas: BALANCETE }]);
    expect(p.inicio).toBe("01/06/2026");
    expect(p.fim).toBe("30/06/2026");
  });

  it("escreve o mês por extenso quando o período é o mês inteiro", () => {
    expect(periodoLegivel("01/06/2026", "30/06/2026")).toBe("junho de 2026");
    expect(periodoLegivel("01/02/2026", "28/02/2026")).toBe("fevereiro de 2026");
  });

  it("não força nome de mês quando o recorte não é um mês fechado", () => {
    // Um acumulado de seis meses não é "junho": dizer que é mentiria
    // sobre o que o arquivo cobre.
    expect(periodoLegivel("01/01/2026", "30/06/2026")).toBe("01/01/2026 a 30/06/2026");
    expect(periodoLegivel("05/06/2026", "20/06/2026")).toBe("05/06/2026 a 20/06/2026");
  });

  it("devolve null quando não há período declarado, em vez de inventar", () => {
    expect(periodoDoBalancete([{ nome: "Dados", linhas: BALANCETE }])).toBe(null);
    expect(periodoDoBalancete(null)).toBe(null);
    expect(periodoDoBalancete([])).toBe(null);
  });
});

/* A aba certa é a que TEM cabeçalho de balancete. O relatório real vem
 * com uma aba de parâmetros ANTES da aba de dados, e "a primeira aba com
 * dados" escolhia a errada — o app lia os parâmetros, não achava conta
 * nenhuma e dizia ao usuário que o arquivo não servia. */
describe("escolha da aba pelo conteúdo", () => {
  const PARAMETROS = [
    ["Pergunta 01 : Data Inicial ?", "01/06/2026"],
    ["Pergunta 02 : Data Final ?", "30/06/2026"],
  ];

  it("a aba de parâmetros não passa por balancete", () => {
    expect(parsearBalancete(PARAMETROS)).toBe(null);
  });

  it("a aba de dados passa, e é ela que o predicado encontra", () => {
    const abas = [{ linhas: PARAMETROS }, { linhas: BALANCETE }];
    const escolhida = abas.find((a) => parsearBalancete(a.linhas));
    expect(escolhida.linhas).toBe(BALANCETE);
  });
});
