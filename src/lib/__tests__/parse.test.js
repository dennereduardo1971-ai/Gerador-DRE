import { describe, expect, it } from "vitest";
import {
  acharColuna,
  agregarPorConta,
  compararCompetencia,
  competenciaDaLinha,
  competenciaLegivel,
  avisosDoMapeamento,
  listarCompetencias,
  mapearColunas,
  numeroBR,
  parsearPlanoDeContas,
} from "../parse.js";

/* O cabeçalho real do razão do IESB — o formato contra o qual todo o app
 * foi calibrado. Se algum ajuste em acharColuna/mapearColunas mudar
 * QUALQUER coluna daqui, é regressão, não melhoria. */
const CABECALHO_IESB = [
  "Dia/Mes", "Cta. Debito", "Cta. Credito", "Valor Debito", "Valor Credito",
  "Historico", "Ano", "C.Custo Debito",
];

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

describe("mapearColunas", () => {
  it("mapeia o cabeçalho real do IESB exatamente como sempre mapeou", () => {
    expect(mapearColunas(CABECALHO_IESB)).toEqual({
      contaD: "Cta. Debito",
      contaC: "Cta. Credito",
      valorD: "Valor Debito",
      valorC: "Valor Credito",
      hist: "Historico",
      data: "Dia/Mes",
      ano: "Ano",
      cc: "C.Custo Debito",
    });
  });

  it("nunca usa a mesma coluna para conta e para valor", () => {
    // Cabeçalho curto: 'Debito' é a única coluna que casa com os dois
    // termos. Antes, contaD e valorD apontavam para ela — e o app somava
    // o CÓDIGO da conta como se fosse dinheiro, sem avisar nada.
    const map = mapearColunas(["Data", "Debito", "Credito", "Valor", "Historico"]);
    expect(map.contaD).not.toBe(map.valorD);
    expect(map.contaC).not.toBe(map.valorC);
  });

  it("reconhece nomes de coluna abreviados", () => {
    const map = mapearColunas(["Data", "Conta Debito", "Conta Credito", "Vlr Debito", "Vlr Credito", "Hist"]);
    expect(map.hist).toBe("Hist");
  });

  it("não casa colunas de nome curto demais por acidente", () => {
    // 'D' não pode virar a coluna de data só porque 'd' cabe em 'dia/mes'.
    const map = mapearColunas(["D", "X", "Cta. Debito", "Cta. Credito", "Valor Debito", "Valor Credito"]);
    expect(map.data).toBe("");
  });
});

describe("avisosDoMapeamento", () => {
  it("não reclama do cabeçalho correto", () => {
    const map = mapearColunas(CABECALHO_IESB);
    const linhas = [{ "Valor Debito": "1.000,00", "Valor Credito": "1.000,00" }];
    expect(avisosDoMapeamento(map, linhas)).toEqual([]);
  });

  it("avisa quando não achou coluna de valor", () => {
    const avisos = avisosDoMapeamento({ contaD: "A", contaC: "B", valorD: "", valorC: "" }, []);
    expect(avisos.join(" ")).toMatch(/valor/i);
  });

  it("avisa quando a coluna de valor não tem número", () => {
    const map = { contaD: "Cta", contaC: "Cta2", valorD: "Valor", valorC: "" };
    const linhas = Array.from({ length: 20 }, () => ({ Valor: "3110101" }));
    // 3110101 é código de conta, não valor — mas numeroBR aceita e soma.
    expect(avisosDoMapeamento(map, linhas).join(" ")).toMatch(/parece/i);
  });
});

describe("competenciaDaLinha", () => {
  it("lê 'DD/mmm' com o ano numa coluna separada", () => {
    expect(competenciaDaLinha("05/jan", "2026")).toBe("01/2026");
    expect(competenciaDaLinha("31/dez", "2025")).toBe("12/2025");
  });

  it("lê data completa DD/MM/AAAA", () => {
    expect(competenciaDaLinha("05/01/2026", "")).toBe("01/2026");
  });

  it("normaliza ano de 2 dígitos", () => {
    // Antes gerava '01/26', que convivia com '01/2026' como se fossem
    // meses diferentes — a mesma competência aparecia duas vezes.
    expect(competenciaDaLinha("05/jan", "26")).toBe("01/2026");
  });

  it("devolve vazio quando não reconhece o formato", () => {
    expect(competenciaDaLinha("", "2026")).toBe("");
    expect(competenciaDaLinha("qualquer coisa", "2026")).toBe("");
  });
});

describe("compararCompetencia", () => {
  it("ordena por ano e depois por mês, não alfabeticamente", () => {
    const comps = ["12/2025", "01/2026", "02/2026", "11/2025"];
    expect([...comps].sort(compararCompetencia)).toEqual([
      "11/2025", "12/2025", "01/2026", "02/2026",
    ]);
  });
});

describe("competenciaLegivel", () => {
  it("mostra mês por extenso", () => {
    expect(competenciaLegivel("01/2026")).toBe("Jan/2026");
    expect(competenciaLegivel("12/2025")).toBe("Dez/2025");
  });
});

/* Um razão mínimo, em partidas dobradas, cobrindo duas competências que
 * cruzam a virada do ano — exatamente o caso em que a ordenação
 * alfabética quebrava. */
const RAZAO = [
  { "Dia/Mes": "10/dez", Ano: "2025", "Cta. Debito": "41201001", "Cta. Credito": "11101001",
    "Valor Debito": "1.000,00", "Valor Credito": "1.000,00", Historico: "ALUGUEL", "C.Custo Debito": "ADM" },
  { "Dia/Mes": "15/jan", Ano: "2026", "Cta. Debito": "11101001", "Cta. Credito": "31101001",
    "Valor Debito": "5.000,00", "Valor Credito": "5.000,00", Historico: "MENSALIDADE", "C.Custo Debito": "ACAD" },
  { "Dia/Mes": "20/jan", Ano: "2026", "Cta. Debito": "41201001", "Cta. Credito": "11101001",
    "Valor Debito": "300,00", "Valor Credito": "300,00", Historico: "ENERGIA", "C.Custo Debito": "ADM" },
];
const MAP = mapearColunas(CABECALHO_IESB);

describe("agregarPorConta", () => {
  it("soma débito e crédito por conta e fecha em partidas dobradas", () => {
    const r = agregarPorConta(RAZAO, MAP, "todos", "todos", "todas");
    expect(r.tDeb).toBeCloseTo(6300, 2);
    expect(r.tCre).toBeCloseTo(6300, 2);
    expect(r.nLinhas).toBe(3);

    const caixa = r.contas.find((c) => c.conta === "11101001");
    expect(caixa.deb).toBeCloseTo(5000, 2);
    expect(caixa.cre).toBeCloseTo(1300, 2);
    expect(caixa.saldo).toBeCloseTo(-3700, 2); // cre − deb
  });

  it("lista competências em ordem cronológica mesmo cruzando o ano", () => {
    const r = agregarPorConta(RAZAO, MAP, "todos", "todos", "todas");
    expect(r.competencias).toEqual(["12/2025", "01/2026"]);
    expect(listarCompetencias(RAZAO, MAP)).toEqual(["12/2025", "01/2026"]);
  });

  it("isola uma competência sem contaminar as outras", () => {
    const r = agregarPorConta(RAZAO, MAP, "todos", "todos", "01/2026");
    expect(r.tDeb).toBeCloseTo(5300, 2);
    expect(r.contas.find((c) => c.conta === "31101001").cre).toBeCloseTo(5000, 2);
  });

  it("filtra por centro de custo", () => {
    const r = agregarPorConta(RAZAO, MAP, "todos", "ACAD", "todas");
    expect(r.tDeb).toBeCloseTo(5000, 2);
  });

  it("reporta valor lançado sem conta em vez de escondê-lo", () => {
    const comOrfao = [...RAZAO, {
      "Dia/Mes": "22/jan", Ano: "2026", "Cta. Debito": "", "Cta. Credito": "",
      "Valor Debito": "99,00", "Valor Credito": "99,00", Historico: "SEM CONTA",
    }];
    const r = agregarPorConta(comOrfao, MAP, "todos", "todos", "todas");
    expect(r.debSemConta).toBeCloseTo(99, 2);
    expect(r.creSemConta).toBeCloseTo(99, 2);
  });

  it("guarda o histórico dos lançamentos para a classificação por texto", () => {
    const r = agregarPorConta(RAZAO, MAP, "todos", "todos", "todas");
    expect(r.contas.find((c) => c.conta === "31101001").historico).toMatch(/MENSALIDADE/);
  });
});

describe("acharColuna", () => {
  it("prefere igualdade exata antes de inclusão", () => {
    expect(acharColuna(["Valor Debito", "Debito"], "debito")).toBe("Debito");
  });

  it("ignora acento e pontuação", () => {
    expect(acharColuna(["Histórico"], "historico")).toBe("Histórico");
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
