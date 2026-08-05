import { describe, expect, it } from "vitest";
import { GRUPOS, agruparPorDigito, montarDRE, provaIntegridade, sugerirClassificacao } from "../classify.js";

/* Plano de contas reduzido com a assinatura do IESB — o suficiente para
 * ligar a camada de classificação por código exato. Se a assinatura
 * deixar de ser reconhecida, os testes abaixo caem para o classificador
 * por texto e o grupo muda: é justamente isso que queremos detectar. */
const PLANO_IESB = {
  "3": "RECEITAS LIQUIDAS",
  "4": "DESPESAS ADMINISTRATIVAS",
  "5": "OUTRAS RECEITAS",
  "6": "PROVISOES",
  "31101": "RECEITAS PROPRIAS",
  "31102": "OUTRAS/RECEITAS ACESSORIAS TAXAS",
  "32100": "(-)BOLSAS ESTUDANTIS",
  "32100003": "(-)PROUNI",
  "32104": "(-)DEVOLUCOES MENSALIDADES/TAXAS",
  "32105": "(-)IMPOSTOS E CONTRIB. S/SERVICOS",
  "41101": "CUSTO TOTAL - DOCENTES",
  "41111": "FOPAG ADMINISTRATIVO",
  "41201": "DESPESAS GERAIS",
  "41210": "DEPRECIACAO SOCIETARIA",
  "42101": "DESPESAS FINANCEIRAS",
  "42102": "(-)RECEITAS FINANCEIRAS",
};

const conta = (codigo, saldo, historico = "") => ({ conta: codigo, saldo, historico, deb: 0, cre: 0, n: 1 });

describe("sugerirClassificacao — camada de código exato (IESB)", () => {
  const contas = [
    conta("3110101", 5000),
    conta("3110201", 800),
    conta("3210001", -400),
    conta("32100003", -900),
    conta("3210401", -150),
    conta("3210501", -600),
    conta("4110101", -2000),
    conta("4111101", -1200),
    conta("4120101", -700),
    conta("4121001", -300),
    conta("4210101", -80),
    conta("4210201", 120),
    conta("6110100", -500),
    conta("6110103", -250),
    conta("6110107", -400),
    conta("6110113", -90),
    conta("7110101", -10),
  ];
  const mapa = sugerirClassificacao(contas, PLANO_IESB);

  it("liga cada conta-síntese ao grupo certo da DRE", () => {
    expect(mapa["3110101"]).toBe("REC_MENSALIDADES");
    expect(mapa["3110201"]).toBe("REC_TAXAS");
    expect(mapa["3210001"]).toBe("DED_BOLSAS");
    expect(mapa["3210401"]).toBe("DED_DEVOLUCOES");
    expect(mapa["3210501"]).toBe("DED_IMPOSTOS");
    expect(mapa["4120101"]).toBe("DESP_ADM");
    expect(mapa["4210101"]).toBe("DESP_FIN");
  });

  it("separa custo dos serviços (docentes) de fopag (administrativo)", () => {
    // Distinção por desenho contábil, não coincidência: quem entrega o
    // serviço-fim é custo; o administrativo é despesa operacional.
    expect(mapa["4110101"]).toBe("CUSTOS");
    expect(mapa["4111101"]).toBe("DESP_FOPAG");
  });

  it("tira depreciação de dentro das despesas administrativas", () => {
    expect(mapa["4121001"]).toBe("DEPRECIACAO");
  });

  it("entende que '(-)RECEITAS FINANCEIRAS' é receita, apesar do nome", () => {
    expect(mapa["4210201"]).toBe("REC_FIN");
  });

  it("separa Prouni de Bolsas mesmo morando dentro de 32100", () => {
    expect(mapa["32100003"]).toBe("DED_PROUNI");
  });

  it("mantém Provisões em duas linhas: contingências e PCLD", () => {
    expect(mapa["6110100"]).toBe("PROVISOES_CONTINGENCIAS");
    expect(mapa["6110103"]).toBe("PROVISOES_PCLD");
  });

  it("tira IRPJ/CSLL de dentro do grupo de provisões", () => {
    expect(mapa["6110107"]).toBe("IRPJ_CSLL");
  });

  it("respeita as exceções pontuais do plano", () => {
    expect(mapa["6110113"]).toBe("OUTRAS_DESP"); // IPTU imóvel de investimento
  });

  it("ignora conta de fechamento do exercício", () => {
    expect(mapa["7110101"]).toBe("IGNORAR");
  });
});

describe("sugerirClassificacao — fallback por texto, sem plano de contas", () => {
  it("classifica pela natureza do saldo e pelo histórico", () => {
    const contas = [
      conta("311", 9000, "MENSALIDADE GRADUACAO"),
      conta("411", -3000, "SALARIO FOPAG"),
      conta("421", -200, "JUROS EMPRESTIMO"),
    ];
    const mapa = sugerirClassificacao(contas, {});
    expect(mapa["311"]).toBe("REC_MENSALIDADES");
    expect(mapa["411"]).toBe("DESP_FOPAG");
    expect(mapa["421"]).toBe("DESP_FIN");
  });

  it("checa fopag antes de impostos: PIS s/ folha é encargo, não dedução", () => {
    const mapa = sugerirClassificacao([conta("411", -500, "PIS S/FOLHA PAGAMENTO")], {});
    expect(mapa["411"]).toBe("DESP_FOPAG");
  });

  it("checa IRPJ/CSLL antes de provisões", () => {
    const mapa = sugerirClassificacao([conta("611", -700, "PROVISAO DE IRPJ")], {});
    expect(mapa["611"]).toBe("IRPJ_CSLL");
  });
});

describe("montarDRE", () => {
  const contas = [
    conta("3110101", 10000), conta("3110201", 2000),
    conta("3210001", -1000), conta("3210501", -500),
    conta("4110101", -3000),
    conta("4111101", -2000), conta("4120101", -1000),
    conta("4210101", -100), conta("4210201", 300),
    conta("6110107", -400),
  ];
  const mapa = sugerirClassificacao(contas, PLANO_IESB);
  const dre = montarDRE(contas, (c) => mapa[c]);

  it("segue a hierarquia de subtotais da DRE oficial", () => {
    expect(dre.receitaBruta).toBeCloseTo(12000, 2);
    expect(dre.deducoes).toBeCloseTo(1500, 2);
    expect(dre.receitaLiq).toBeCloseTo(10500, 2);
    expect(dre.resultadoOperBruto).toBeCloseTo(7500, 2);
    expect(dre.despOper).toBeCloseTo(3000, 2);
    expect(dre.resultadoFin).toBeCloseTo(200, 2);
    expect(dre.resultadoOper).toBeCloseTo(4700, 2);
    expect(dre.antesIR).toBeCloseTo(4700, 2);
    expect(dre.liquido).toBeCloseTo(4300, 2);
  });

  it("não perde nem duplica valor: a soma dos grupos bate com as contas", () => {
    const somaGrupos = GRUPOS.reduce((s, g) => s + Math.abs(dre.bal[g.id].total), 0);
    const somaContas = contas.reduce((s, c) => s + Math.abs(c.saldo), 0);
    expect(somaGrupos).toBeCloseTo(somaContas, 2);
  });

  it("soma o líquido do grupo, não a magnitude: reversão reduz a despesa", () => {
    // Provisões misturam despesa (provisão nova) e receita (reversão) na
    // MESMA linha da DRE oficial. Num mês de reversão forte a linha vira
    // positiva de verdade — somar Math.abs() inflaria o grupo.
    const comReversao = [conta("6110100", -300), conta("6110101", 800)];
    const m = sugerirClassificacao(comReversao, PLANO_IESB);
    const d = montarDRE(comReversao, (c) => m[c]);
    expect(d.bal.PROVISOES_CONTINGENCIAS.total).toBeCloseTo(-500, 2);
  });
});

describe("agruparPorDigito", () => {
  it("agrupa pelo primeiro dígito do plano de contas", () => {
    const g = agruparPorDigito([
      { conta: "1101", deb: 100, cre: 0 },
      { conta: "3101", deb: 0, cre: 500 },
      { conta: "3102", deb: 0, cre: 200 },
    ]);
    expect(g.map((x) => x.digito)).toEqual(["1", "3"]);
    expect(g[1].cre).toBeCloseTo(700, 2);
    expect(g[1].n).toBe(2);
  });
});

describe("provaIntegridade", () => {
  it("soma classificado + ignorado e confirma que fecha com o razão", () => {
    const contas = [conta("3110101", 1000), conta("4120101", -400), conta("9999", -50)];
    const p = provaIntegridade(contas, (c) => (c === "9999" ? "IGNORAR" : "DESP_ADM"));
    expect(p.total).toBeCloseTo(1450, 2);
    expect(p.classificado).toBeCloseTo(1400, 2);
    expect(p.ignorado).toBeCloseTo(50, 2);
    expect(p.nIgnoradas).toBe(1);
    expect(p.fecha).toBe(true);
  });

  it("informa o VALOR do que ficou de fora, não só a contagem", () => {
    const p = provaIntegridade([conta("9999", -3_000_000)], () => "IGNORAR");
    expect(p.ignorado).toBeCloseTo(3_000_000, 2);
  });
});
