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

/* ------------------------------------------------------------------ *
 * CONTAS SEM MOVIMENTO NO PERÍODO.
 *
 * O balancete pode (e deve) ser emitido com as contas zeradas: é assim
 * que uma conta fica parametrizada ANTES do primeiro mês em que ela tem
 * saldo. Isso abriu dois defeitos que estes testes travam.
 * ------------------------------------------------------------------ */

/** Conta sem movimento no período: débito e crédito zerados. `natureza`
 *  é o que o balancete sabe pelo SALDO (credora +1, devedora −1, 0 quando
 *  nem saldo há) — ver `naturezaDaConta` em balancete.js. */
const zerada = (codigo, natureza = 0, historico = "") => ({
  conta: codigo, saldo: 0, historico, deb: 0, cre: 0, n: 0,
  semMovimento: true, natureza,
});

describe("contas sem movimento não são classificadas como despesa por omissão", () => {
  it("conta de receita zerada, com saldo credor, vai para receita", () => {
    // O defeito era `saldo > 0 ? receita : despesa`: zero caía no `else`.
    const contas = [zerada("3110102", 1), conta("3110101", 5000)];
    const mapa = sugerirClassificacao(contas, PLANO_IESB);
    expect(mapa["3110102"]).toBe("REC_MENSALIDADES");
  });

  it("conta de despesa zerada, com saldo devedor, continua em despesa", () => {
    const contas = [zerada("4111102", -1), conta("4111101", -1200)];
    const mapa = sugerirClassificacao(contas, PLANO_IESB);
    expect(mapa["4111102"]).toBe("DESP_FOPAG");
  });

  it("sem plano de contas, a natureza do saldo ainda decide o lado", () => {
    const contas = [
      zerada("9110001", 1, "MENSALIDADE GRADUACAO"),
      zerada("9110002", -1, "ALUGUEL"),
    ];
    const mapa = sugerirClassificacao(contas, {}, []);
    expect(mapa["9110001"]).toBe("REC_MENSALIDADES");
    expect(mapa["9110002"]).not.toBe("REC_MENSALIDADES");
  });

  it("conta nova, sem movimento E sem saldo, cai em IGNORAR — nunca em DESP_ADM", () => {
    // Não há o que deduzir: afirmar um grupo aqui é inventar. A tela
    // marca "a revisar"; a doutrina é a mesma do [______] da nota de MPDA.
    const mapa = sugerirClassificacao([zerada("9990001", 0, "CONTA NOVA")], {}, []);
    expect(mapa["9990001"]).toBe("IGNORAR");
  });

  it("mas o CÓDIGO do plano decide mesmo sem natureza nenhuma", () => {
    // O plano é fato, não dedução a partir de saldo: uma conta nova sob
    // uma síntese conhecida já nasce no grupo certo.
    const mapa = sugerirClassificacao([zerada("3110109", 0)], PLANO_IESB);
    expect(mapa["3110109"]).toBe("REC_MENSALIDADES");
  });
});

describe("contas zeradas não mudam a classificação das contas com movimento", () => {
  /* O fallback por maioria decide por `contagem[prefixo] / n >= 0.5`.
     Contas sem movimento aumentam `n` sem aumentar `contagem`, então
     emitir o balancete com as zeradas afrouxaria a maioria e mudaria a
     classificação de contas que TÊM movimento — sem sinal nenhum na tela. */
  const comMovimento = [
    conta("9110001", -1000, "FOPAG SALARIOS"),
    conta("9110002", -900, "FOLHA DE PAGAMENTO"),
    conta("9110003", -800, "ALGUMA OUTRA COISA"),
  ];
  const vinteZeradas = Array.from({ length: 20 }, (_, i) =>
    zerada(`911001${i}`, -1, "CONTA SEM MOVIMENTO"));

  it("a mesma decisão sai com e sem as zeradas na lista", () => {
    const so = sugerirClassificacao(comMovimento, {}, []);
    const com = sugerirClassificacao([...comMovimento, ...vinteZeradas], {}, []);
    for (const c of comMovimento) {
      expect(com[c.conta], `conta ${c.conta}`).toBe(so[c.conta]);
    }
  });

  it("e as zeradas continuam sendo classificadas, não descartadas", () => {
    const com = sugerirClassificacao([...comMovimento, ...vinteZeradas], {}, []);
    expect(Object.keys(com)).toHaveLength(comMovimento.length + vinteZeradas.length);
  });
});

describe("conta zerada não move nenhum número da DRE", () => {
  it("o lucro líquido é o mesmo com e sem as contas sem movimento", () => {
    const base = [
      conta("3110101", 10000), conta("3210001", -1000),
      conta("4111101", -3000), conta("4120101", -2500),
    ];
    const zeradas = [zerada("3110109", 1), zerada("4111109", -1), zerada("4120109", -1)];
    const mapaA = sugerirClassificacao(base, PLANO_IESB);
    const mapaB = sugerirClassificacao([...base, ...zeradas], PLANO_IESB);
    const a = montarDRE(base, (c) => mapaA[c] ?? "IGNORAR");
    const b = montarDRE([...base, ...zeradas], (c) => mapaB[c] ?? "IGNORAR");
    for (const linha of ["receitaBruta", "deducoes", "receitaLiq", "despOper", "liquido"]) {
      expect(b[linha], `linha ${linha}`).toBeCloseTo(a[linha], 2);
    }
  });
});
