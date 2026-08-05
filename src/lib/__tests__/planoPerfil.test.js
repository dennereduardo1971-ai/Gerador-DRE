import { describe, expect, it } from "vitest";
import { PLANO_IESB } from "../planos/iesb.js";
import { escolherPlano, grupoPorPlano, lerPlano, planoCombina } from "../planoPerfil.js";
import { montarLinhas } from "../linhasDRE.js";
import { matrizDRE } from "../exportacao.js";
import { montarDRE, sugerirClassificacao } from "../classify.js";

const NOMES_IESB = {
  "3": "RECEITAS LIQUIDAS",
  "4": "DESPESAS ADMINISTRATIVAS",
  "5": "OUTRAS RECEITAS",
  "6": "PROVISOES",
  "32100003": "(-)PROUNI",
};

describe("planoCombina", () => {
  it("reconhece o plano do IESB pela assinatura", () => {
    expect(planoCombina(PLANO_IESB, NOMES_IESB)).toBe(true);
  });

  it("não se aplica a outro plano de contas", () => {
    // Um perfil aplicado ao plano errado distribuiria valores
    // silenciosamente errados — recusar é o comportamento seguro.
    expect(planoCombina(PLANO_IESB, { "3": "RECEITA BRUTA", "4": "CUSTOS" })).toBe(false);
  });

  it("não se aplica sem plano de contas importado", () => {
    expect(planoCombina(PLANO_IESB, {})).toBe(false);
    expect(escolherPlano([PLANO_IESB], {})).toBe(null);
  });
});

describe("grupoPorPlano", () => {
  const g = (conta, saldo = -1, nomes = NOMES_IESB) => grupoPorPlano(PLANO_IESB, conta, nomes, saldo);

  it("resolve do código mais específico para o mais genérico", () => {
    expect(g("4120101")).toBe("DESP_ADM"); // via 41201
    expect(g("6110107")).toBe("IRPJ_CSLL"); // código exato vence 61101
    expect(g("6110150")).toBe("PROVISOES_PCLD"); // conta nova cai no 61101
  });

  it("aplica a exceção da conta-folha contra o grupo-pai", () => {
    expect(g("3210208")).toBe("DED_DEVOLUCOES"); // dentro de 32102 (Descontos)
    expect(g("6110113")).toBe("OUTRAS_DESP"); // IPTU dentro de Provisões
  });

  it("regra por nome roda antes do mapa: Prouni sai de Bolsas", () => {
    expect(g("32100003")).toBe("DED_PROUNI");
    expect(g("32100001")).toBe("DED_BOLSAS"); // sem PROUNI no nome, fica em Bolsas
  });

  it("regra por sinal decide a seção que mistura receita e despesa", () => {
    expect(grupoPorPlano(PLANO_IESB, "5110101", NOMES_IESB, 500)).toBe("OUTRAS_REC");
    expect(grupoPorPlano(PLANO_IESB, "5110101", NOMES_IESB, -500)).toBe("OUTRAS_DESP");
  });

  it("devolve null para código que não reconhece", () => {
    expect(g("99999")).toBe(null);
  });
});

describe("lerPlano", () => {
  it("lê um perfil válido", () => {
    const r = lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1, nome: "Comércio",
      assinatura: { "3": "RECEITA" }, codigos: { "31": "REC_MENSALIDADES" },
    }));
    expect(r.ok).toBe(true);
    expect(r.plano.codigos["31"]).toBe("REC_MENSALIDADES");
  });

  it("recusa perfil sem assinatura", () => {
    const r = lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1, codigos: { "31": "REC_TAXAS" },
    }));
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/assinatura/i);
  });

  it("descarta código com grupo inexistente e conta quantos", () => {
    const r = lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1,
      assinatura: { "3": "RECEITA" }, codigos: { "31": "CUSTOS", "32": "INVENTADO" },
    }));
    expect(r.ignorados).toBe(1);
    expect(r.plano.codigos).toEqual({ "31": "CUSTOS" });
  });

  it("recusa arquivo que não é perfil de plano", () => {
    expect(lerPlano(JSON.stringify({ formato: "outra/coisa" })).ok).toBe(false);
    expect(lerPlano("nada disso").ok).toBe(false);
  });
});

describe("sugerirClassificacao com perfil customizado", () => {
  it("aceita um plano de contas que não é o do IESB, sem tocar no código", () => {
    // É este o ponto do item: atender outro cliente vira um arquivo,
    // não um commit em classify.js.
    const planoLoja = {
      nome: "Comércio",
      assinatura: { "3": "RECEITA DE VENDAS" },
      codigos: { "31": "REC_MENSALIDADES", "41": "CUSTOS", "42": "DESP_ADM" },
      regras: [],
    };
    const nomes = { "3": "RECEITA DE VENDAS", "31": "VENDAS DE MERCADORIAS" };
    const contas = [
      { conta: "3101", saldo: 10000, historico: "" },
      { conta: "4101", saldo: -6000, historico: "" },
      { conta: "4201", saldo: -1000, historico: "" },
    ];
    const mapa = sugerirClassificacao(contas, nomes, [planoLoja]);
    expect(mapa["3101"]).toBe("REC_MENSALIDADES");
    expect(mapa["4101"]).toBe("CUSTOS");
    expect(mapa["4201"]).toBe("DESP_ADM");
  });
});

describe("montarLinhas — soma por seção", () => {
  const contas = [
    { conta: "3110101", saldo: 10000, historico: "" },
    { conta: "3110201", saldo: 2000, historico: "" },
    { conta: "3210001", saldo: -1000, historico: "" },
    { conta: "3210501", saldo: -500, historico: "" },
    { conta: "4111101", saldo: -2000, historico: "" },
    { conta: "4120101", saldo: -1000, historico: "" },
    { conta: "4210101", saldo: -100, historico: "" },
    { conta: "4210201", saldo: 300, historico: "" },
    { conta: "5110101", saldo: 250, historico: "" },
  ];
  const mapa = sugerirClassificacao(contas, NOMES_IESB);
  const { itens } = montarLinhas(montarDRE(contas, (c) => mapa[c]));
  const secao = (lbl) => itens.find((i) => i.t === "secao" && i.lbl === lbl);

  it("cada título de seção traz a soma das linhas embaixo dele", () => {
    expect(secao("Receita Operacional Bruta").val).toBeCloseTo(12000, 2);
    expect(secao("Deduções à Receita Operacional").val).toBeCloseTo(-1500, 2);
    expect(secao("Despesas Operacionais").val).toBeCloseTo(-3000, 2);
    expect(secao("Receita / Despesas Financeiras").val).toBeCloseTo(200, 2);
    expect(secao("Receitas / Despesas Não Operacionais").val).toBeCloseTo(250, 2);
  });

  it("a soma da seção para no próximo subtotal, sem invadir a seção seguinte", () => {
    const dedu = secao("Deduções à Receita Operacional");
    const i = itens.indexOf(dedu);
    const linhas = [];
    for (let j = i + 1; itens[j] && itens[j].t === "l"; j++) linhas.push(itens[j].val);
    expect(linhas.reduce((a, b) => a + b, 0)).toBeCloseTo(dedu.val, 2);
  });

  it("toda seção tem valor — nenhuma fica com o título sem número", () => {
    itens.filter((i) => i.t === "secao").forEach((s) => {
      expect(typeof s.val).toBe("number");
      expect(Number.isNaN(s.val)).toBe(false);
    });
  });
});

describe("matrizDRE — o que sai no CSV e no Excel", () => {
  const contas = [
    { conta: "3110101", saldo: 10000, historico: "" },
    { conta: "3210001", saldo: -1000, historico: "" },
    { conta: "4120101", saldo: -1500, historico: "" },
  ];
  const mapa = sugerirClassificacao(contas, NOMES_IESB);
  const linhas = matrizDRE(montarDRE(contas, (c) => mapa[c]));
  const acha = (lbl) => linhas.find((l) => l.lbl === lbl);

  it("exporta exatamente a mesma estrutura que a tela desenha", () => {
    // O CSV reconstruía a DRE à mão, com os rótulos digitados de novo:
    // uma mudança de estrutura exigia lembrar de dois lugares. Agora as
    // duas saídas leem montarLinhas, então não há como divergir.
    const { itens } = montarLinhas(montarDRE(contas, (c) => mapa[c]));
    expect(linhas.map((l) => l.lbl)).toEqual(itens.map((i) => i.lbl));
  });

  it("leva os totais de seção para o arquivo exportado", () => {
    expect(acha("Receita Operacional Bruta").val).toBeCloseTo(10000, 2);
    expect(acha("Deduções à Receita Operacional").val).toBeCloseTo(-1000, 2);
  });

  it("calcula a análise vertical sobre a receita líquida", () => {
    expect(acha("Receita Operacional Líquida").av).toBeCloseTo(1, 4);
  });

  it("marca o tipo da linha, para o Excel formatar sem adivinhar pelo texto", () => {
    expect(acha("Lucro Líquido do Exercício").t).toBe("final");
    expect(acha("Receita Operacional Bruta").t).toBe("secao");
  });
});
