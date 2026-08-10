import { describe, expect, it } from "vitest";
import { montarDRE } from "../classify.js";
import {
  CATEGORIAS,
  POLITICA_PADRAO,
  categoriaDoGrupo,
  coberturaCPC51,
  conciliar,
  contasMistas,
  deParaCPC51,
  fazerCategoriaDe,
  gruposParaRevisar,
  montarDRE51,
} from "../cpc51.js";
import { montarLinhas51 } from "../linhasCPC51.js";

/* Razão sintético com uma conta em cada grupo que importa para o CPC 51,
 * incluindo os três casos difíceis: financeiro (que se parte entre
 * investimento e financiamento), não operacional (que deixa de existir) e
 * tributo sobre o lucro (que ganha categoria própria). */
const conta = (codigo, saldo, extra = {}) => ({
  conta: codigo,
  saldo,
  historico: "",
  deb: saldo < 0 ? -saldo : 0,
  cre: saldo > 0 ? saldo : 0,
  n: 1,
  ...extra,
});

const CONTAS = [
  conta("3110101", 100000), // mensalidades
  conta("3110201", 5000), // taxas
  conta("3210001", -8000), // bolsas
  conta("3210501", -6000), // impostos sobre receita
  conta("4110101", -40000), // custos
  conta("4111101", -20000), // fopag
  conta("4120101", -9000), // administrativas
  conta("4121001", -3000), // depreciação
  conta("6110100", -2000), // provisões contingências
  conta("6110103", -1000), // provisões PCLD
  conta("4210201", 1500), // receitas financeiras
  conta("4210101", -2500), // despesas financeiras
  conta("5110101", 900), // outras receitas (não operacional)
  conta("5210101", -400), // outras despesas (não operacional)
  conta("6110107", -4000), // IRPJ/CSLL
];

const GRUPO = {
  "3110101": "REC_MENSALIDADES",
  "3110201": "REC_TAXAS",
  "3210001": "DED_BOLSAS",
  "3210501": "DED_IMPOSTOS",
  "4110101": "CUSTOS",
  "4111101": "DESP_FOPAG",
  "4120101": "DESP_ADM",
  "4121001": "DEPRECIACAO",
  "6110100": "PROVISOES_CONTINGENCIAS",
  "6110103": "PROVISOES_PCLD",
  "4210201": "REC_FIN",
  "4210101": "DESP_FIN",
  "5110101": "OUTRAS_REC",
  "5210101": "OUTRAS_DESP",
  "6110107": "IRPJ_CSLL",
};
const grupoDe = (c) => GRUPO[c] || "IGNORAR";

function montar({ categoriaPorConta = {}, politica = POLITICA_PADRAO, contas = CONTAS } = {}) {
  const categoriaDe = fazerCategoriaDe({ grupoDe, categoriaPorConta, politica });
  const dre = montarDRE(contas, grupoDe);
  const dre51 = montarDRE51(contas, grupoDe, categoriaDe);
  return { dre, dre51, categoriaDe, contas };
}

describe("o CPC 51 reclassifica, não recalcula", () => {
  it("chega ao mesmo lucro líquido da estrutura atual", () => {
    const { dre, dre51 } = montar();
    expect(dre51.liquido).toBeCloseTo(dre.liquido, 2);
  });

  it("continua fechando depois de mover contas de categoria à mão", () => {
    const { dre, dre51 } = montar({
      categoriaPorConta: {
        "4210201": "OPERACIONAL", // juros de mora de aluno: operacional
        "5110101": "INVESTIMENTO", // ganho na venda de participação
        "5210101": "DESCONTINUADAS",
      },
    });
    expect(dre51.liquido).toBeCloseTo(dre.liquido, 2);
  });

  it("o lucro líquido é a soma dos saldos de todas as contas classificadas", () => {
    const { dre51 } = montar();
    const soma = CONTAS.filter((c) => grupoDe(c.conta) !== "IGNORAR").reduce((s, c) => s + c.saldo, 0);
    expect(dre51.liquido).toBeCloseTo(soma, 2);
  });

  it("conta ignorada não entra em categoria nenhuma", () => {
    const contas = [...CONTAS, conta("9999999", 12345)];
    const { dre, dre51 } = montar({ contas });
    expect(dre51.foraDaDemonstracao).toBeCloseTo(12345, 2);
    expect(dre51.liquido).toBeCloseTo(dre.liquido, 2);
  });
});

describe("as cinco categorias e os subtotais obrigatórios", () => {
  const { dre51 } = montar();

  it("separa financeiro entre investimento e financiamento", () => {
    expect(dre51.investimento).toBeCloseTo(1500, 2); // receitas financeiras
    expect(dre51.financiamento).toBeCloseTo(-2500, 2); // despesas financeiras
  });

  it("traz o antigo não operacional para dentro do operacional", () => {
    const gruposOper = dre51.cat.OPERACIONAL.grupos.map((g) => g.id);
    expect(gruposOper).toContain("OUTRAS_REC");
    expect(gruposOper).toContain("OUTRAS_DESP");
  });

  it("isola os tributos sobre o lucro", () => {
    expect(dre51.tributos).toBeCloseTo(-4000, 2);
    expect(dre51.continuadas).toBeCloseTo(dre51.antesTributos - 4000, 2);
  });

  it("encadeia os subtotais na ordem da norma", () => {
    expect(dre51.antesFinTributos).toBeCloseTo(dre51.operacional + dre51.investimento, 2);
    expect(dre51.antesTributos).toBeCloseTo(dre51.antesFinTributos + dre51.financiamento, 2);
    expect(dre51.continuadas).toBeCloseTo(dre51.antesTributos + dre51.tributos, 2);
    expect(dre51.liquido).toBeCloseTo(dre51.continuadas + dre51.descontinuadas, 2);
  });

  it("imprime os dois subtotais obrigatórios mesmo sem movimento na categoria", () => {
    const semFinanceiro = CONTAS.filter((c) => !["4210101", "4210201"].includes(c.conta));
    const { itens } = montarLinhas51(montar({ contas: semFinanceiro }).dre51);
    const rotulos = itens.map((i) => i.lbl);
    expect(rotulos).toContain("( = ) Resultado Operacional");
    expect(rotulos).toContain("( = ) Resultado antes do financiamento e dos tributos sobre o lucro");
  });

  it("só mostra operações descontinuadas quando existem", () => {
    const semDesc = montarLinhas51(montar().dre51).itens.map((i) => i.lbl);
    expect(semDesc).not.toContain("Operações descontinuadas");

    const comDesc = montarLinhas51(
      montar({ categoriaPorConta: { "5210101": "DESCONTINUADAS" } }).dre51
    ).itens.map((i) => i.lbl);
    expect(comDesc).toContain("Operações descontinuadas");
  });
});

describe("política contábil de atividade principal", () => {
  it("empresa comum mantém investimento e financiamento fora do operacional", () => {
    expect(categoriaDoGrupo("REC_FIN")).toBe("INVESTIMENTO");
    expect(categoriaDoGrupo("DESP_FIN")).toBe("FINANCIAMENTO");
  });

  it("quem investe como atividade principal traz o investimento para o operacional", () => {
    const politica = { ...POLITICA_PADRAO, investirEhAtividadePrincipal: true };
    expect(categoriaDoGrupo("REC_FIN", politica)).toBe("OPERACIONAL");
    const { dre, dre51 } = montar({ politica });
    expect(dre51.investimento).toBe(0);
    expect(dre51.liquido).toBeCloseTo(dre.liquido, 2);
  });

  it("quem financia clientes como atividade principal traz o financiamento para o operacional", () => {
    const politica = { ...POLITICA_PADRAO, financiarClientesEhAtividadePrincipal: true };
    const { dre51 } = montar({ politica });
    expect(dre51.financiamento).toBe(0);
    expect(dre51.operacional).toBeCloseTo(montar().dre51.operacional - 2500, 2);
  });

  it("lista os grupos que dependem de julgamento com o motivo", () => {
    const revisar = gruposParaRevisar().map((g) => g.id);
    expect(revisar).toEqual(["REC_FIN", "DESP_FIN", "OUTRAS_REC", "OUTRAS_DESP"]);
    gruposParaRevisar().forEach((g) => expect(g.motivo.length).toBeGreaterThan(20));
  });

  it("a política encerra a dúvida que ela mesma resolve", () => {
    // Num banco, juros de empréstimo e tarifa bancária vão ambos para
    // operacional: não sobra o que separar em Despesas Financeiras.
    const politica = { ...POLITICA_PADRAO, financiarClientesEhAtividadePrincipal: true };
    expect(gruposParaRevisar(politica).map((g) => g.id)).not.toContain("DESP_FIN");
    expect(gruposParaRevisar(politica).map((g) => g.id)).toContain("OUTRAS_REC");
    const cob = coberturaCPC51(CONTAS, { grupoDe, politica });
    expect(cob.aRevisar).toBe(3); // rec_fin + as duas não operacionais
  });
});

describe("decisão manual por conta", () => {
  it("vence o padrão do grupo", () => {
    const { categoriaDe } = montar({ categoriaPorConta: { "4210201": "OPERACIONAL" } });
    expect(categoriaDe("4210201")).toBe("OPERACIONAL");
    expect(categoriaDe("4210101")).toBe("FINANCIAMENTO");
  });

  it("categoria inválida é ignorada em vez de derrubar a demonstração", () => {
    const { categoriaDe } = montar({ categoriaPorConta: { "4210201": "INVENTADA" } });
    expect(categoriaDe("4210201")).toBe("INVESTIMENTO");
  });

  it("um grupo partido entre duas categorias soma certo nos dois lados", () => {
    const contas = [...CONTAS, conta("4210202", 700)];
    const grupoComExtra = (c) => (c === "4210202" ? "REC_FIN" : grupoDe(c));
    const categoriaDe = fazerCategoriaDe({
      grupoDe: grupoComExtra,
      categoriaPorConta: { "4210202": "OPERACIONAL" },
    });
    const dre51 = montarDRE51(contas, grupoComExtra, categoriaDe);
    expect(dre51.investimento).toBeCloseTo(1500, 2);
    const recFinOper = dre51.cat.OPERACIONAL.grupos.find((g) => g.id === "REC_FIN");
    expect(recFinOper.total).toBeCloseTo(700, 2);
  });
});

describe("conciliação entre as duas estruturas", () => {
  it("prova que o lucro líquido não mudou", () => {
    const { dre, dre51, categoriaDe } = montar();
    const c = conciliar(dre, dre51, CONTAS, grupoDe, categoriaDe);
    expect(c.fecha).toBe(true);
    expect(c.diferenca).toBeCloseTo(0, 2);
  });

  it("a ponte do operacional fecha sozinha, com e sem decisões manuais", () => {
    [{}, { "4210201": "OPERACIONAL", "5110101": "INVESTIMENTO" }].forEach((categoriaPorConta) => {
      const { dre, dre51, categoriaDe } = montar({ categoriaPorConta });
      const c = conciliar(dre, dre51, CONTAS, grupoDe, categoriaDe);
      expect(c.ponteFecha).toBe(true);
      expect(c.residuoPonte).toBeCloseTo(0, 2);
    });
  });

  it("explica cada movimento pelo motivo, não por uma diferença global", () => {
    const { dre, dre51, categoriaDe } = montar();
    const { pontes } = conciliar(dre, dre51, CONTAS, grupoDe, categoriaDe);
    const rotulos = pontes.map((p) => p.lbl);
    expect(rotulos[0]).toContain("estrutura atual");
    expect(rotulos.at(-1)).toContain("CPC 51");
    expect(rotulos.some((r) => r.includes("Investimento"))).toBe(true);
    expect(rotulos.some((r) => r.includes("Financiamento"))).toBe(true);
    expect(rotulos.some((r) => r.includes("agora dentro do operacional"))).toBe(true);
  });
});

describe("diagnóstico de contas mistas (Fase 2, passo 8)", () => {
  const categoriaDe = fazerCategoriaDe({ grupoDe });

  it("aponta conta que movimenta os dois sentidos de forma relevante", () => {
    const contas = [conta("4210201", 1000, { deb: 400, cre: 1400 })];
    const achados = contasMistas(contas, { grupoDe, categoriaDe });
    expect(achados).toHaveLength(1);
    expect(achados[0].motivos[0].tipo).toBe("duplo-sentido");
  });

  it("não aponta estorno pontual", () => {
    const contas = [conta("4210201", 1000, { deb: 20, cre: 1020 })];
    expect(contasMistas(contas, { grupoDe, categoriaDe })).toHaveLength(0);
  });

  it("aponta divergência entre o histórico e a categoria da conta", () => {
    const contas = [conta("4120101", -5000, { deb: 5000, cre: 0 })];
    const achados = contasMistas(contas, {
      grupoDe,
      categoriaDe,
      sugestaoTexto: { "4120101": "DESP_FIN" }, // texto diz financiamento, conta está em operacional
    });
    expect(achados[0].motivos.some((m) => m.tipo === "divergencia")).toBe(true);
  });

  it("ordena por valor: desmembrar a conta grande vale mais", () => {
    const contas = [
      conta("4210201", 100, { deb: 50, cre: 150 }),
      conta("4210101", -90000, { deb: 95000, cre: 5000 }),
    ];
    const achados = contasMistas(contas, { grupoDe, categoriaDe });
    expect(achados[0].conta).toBe("4210101");
  });
});

describe("De-Para e cobertura", () => {
  it("registra a origem de cada decisão", () => {
    const dePara = deParaCPC51(CONTAS, {
      grupoDe,
      categoriaPorConta: { "4210201": "OPERACIONAL" },
      nomes: { "4210201": "JUROS DE MORA" },
    });
    const linha = dePara.find((l) => l.conta === "4210201");
    expect(linha.origem).toBe("decisão manual");
    expect(linha.categoriaNome).toBe("Operacional");
    expect(linha.descricao).toBe("JUROS DE MORA");
    expect(dePara.find((l) => l.conta === "4210101").origem).toBe("padrão do grupo");
  });

  it("conta o que ainda depende de revisão, em contas e em reais", () => {
    const cob = coberturaCPC51(CONTAS, { grupoDe, categoriaPorConta: { "4210201": "OPERACIONAL" } });
    expect(cob.categorizadas).toBe(CONTAS.length);
    expect(cob.manuais).toBe(1);
    // Sobram despesas financeiras e as duas não operacionais.
    expect(cob.aRevisar).toBe(3);
    expect(cob.valorARevisar).toBeCloseTo(2500 + 900 + 400, 2);
  });

  it("toda categoria tem definição escrita — é o texto da política contábil", () => {
    CATEGORIAS.forEach((c) => expect(c.descricao.length).toBeGreaterThan(40));
  });
});
