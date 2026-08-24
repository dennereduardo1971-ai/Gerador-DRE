import { describe, expect, it } from "vitest";
import {
  PARAMS_FISCAIS_PADRAO, apurarLalur, apurarPisCofins, ajustesEfetivos,
  deParaTributos, mesesDoPeriodo, proporcaoProuni, resumoFiscal,
  sugerirAjustes, sugerirTributo,
} from "../fiscal.js";
import { montarDRE } from "../classify.js";

/* Uma DRE sintética, com números redondos escolhidos para a conta fechar
 * de cabeça. Nenhum valor real de cliente entra em teste — regra do
 * projeto, e a mais fácil de violar por descuido. */
const conta = (codigo, saldo, historico = "") => ({ conta: codigo, saldo, historico, deb: 0, cre: 0, n: 1 });

const CONTAS = [
  conta("3110101", 1000000, "MENSALIDADE"),         // receita bruta
  conta("3110201", 200000, "TAXA"),                 // receita bruta
  conta("3210401", -50000, "DEVOLUCAO"),            // dedução
  conta("3210601", -30000, "DESCONTO"),             // dedução
  conta("3210001", -120000, "BOLSA"),               // dedução (base do PROUNI)
  conta("3210003", -80000, "PROUNI"),               // dedução (base do PROUNI)
  conta("3210501", -39000, "PIS SOBRE SERVICOS"),   // imposto lançado
  conta("3210502", -180000, "COFINS SOBRE SERVICOS"),
  conta("3210503", -20000, "ISS SOBRE SERVICOS"),
  conta("4111101", -300000, "FOPAG"),
  conta("4120101", -100000, "ALUGUEL"),
  conta("6110100", -40000, "PROVISAO CONTINGENCIA TRABALHISTA"),
  conta("6110103", -25000, "PROVISAO PCLD"),
  conta("6210101", -60000, "IRPJ E CSLL"),
];

const GRUPO = {
  "3110101": "REC_MENSALIDADES", "3110201": "REC_TAXAS",
  "3210401": "DED_DEVOLUCOES", "3210601": "DED_DESCONTOS",
  "3210001": "DED_BOLSAS", "3210003": "DED_PROUNI",
  "3210501": "DED_IMPOSTOS", "3210502": "DED_IMPOSTOS", "3210503": "DED_IMPOSTOS",
  "4111101": "DESP_FOPAG", "4120101": "DESP_ADM",
  "6110100": "PROVISOES_CONTINGENCIAS", "6110103": "PROVISOES_PCLD",
  "6210101": "IRPJ_CSLL",
};

const DRE = montarDRE(CONTAS, (c) => GRUPO[c] || "IGNORAR");
const params = (extra = {}) => ({ ...PARAMS_FISCAIS_PADRAO, ...extra });

describe("a DRE sintética é o que os testes acham que é", () => {
  it("receita bruta e base de PIS/COFINS", () => {
    expect(DRE.receitaBruta).toBeCloseTo(1200000, 2);
    // base = bruta − devoluções − descontos = 1.200.000 − 50.000 − 30.000
    expect(DRE.bal.DED_DEVOLUCOES.total).toBeCloseTo(50000, 2);
    expect(DRE.bal.DED_DESCONTOS.total).toBeCloseTo(30000, 2);
  });
});

describe("De-Para dos tributos sobre a receita", () => {
  it("sugere PIS, COFINS e ISS pelo nome da conta", () => {
    expect(sugerirTributo("(-)PIS SOBRE SERVICOS")).toBe("PIS");
    expect(sugerirTributo("(-)COFINS SOBRE SERVICOS")).toBe("COFINS");
    expect(sugerirTributo("(-)ISS SOBRE SERVICOS")).toBe("ISS");
  });

  it("não chuta quando o nome não diz — devolve null, não OUTRO", () => {
    // "a confirmar" é informação; "OUTRO" seria uma afirmação falsa.
    expect(sugerirTributo("(-)IMPOSTOS SOBRE SERVICOS")).toBe(null);
    expect(sugerirTributo("")).toBe(null);
  });

  it("uma conta que junta os dois nomes não vira nem um nem outro", () => {
    expect(sugerirTributo("(-)PIS/COFINS S/ FATURAMENTO")).toBe(null);
  });

  it("monta uma linha por conta do grupo, com origem da decisão", () => {
    const linhas = deParaTributos(DRE, { nomes: {} });
    expect(linhas).toHaveLength(3);
    expect(linhas[0].valor).toBeCloseTo(180000, 2); // ordenado por valor
    expect(linhas.map((l) => l.tributo).sort()).toEqual(["COFINS", "ISS", "PIS"]);
    expect(linhas.every((l) => l.origem === "sugerido pelo nome")).toBe(true);
  });

  it("a escolha manual vence a sugestão e muda a origem", () => {
    const linhas = deParaTributos(DRE, { mapaTributos: { "3210503": "OUTRO" } });
    const iss = linhas.find((l) => l.conta === "3210503");
    expect(iss.tributo).toBe("OUTRO");
    expect(iss.sugerido).toBe("ISS");
    expect(iss.origem).toBe("manual");
  });
});

describe("apuração de PIS/COFINS", () => {
  const linhas = deParaTributos(DRE, {});

  it("a base exclui devoluções e descontos, mas NÃO as bolsas", () => {
    // Bolsas e PROUNI definem a proporção isenta; tratá-las como exclusão
    // de base reduziria a base duas vezes.
    const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    expect(a.base).toBeCloseTo(1120000, 2);
  });

  it("cumulativo: 0,65% e 3% sobre a base", () => {
    const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    expect(a.pisDevido).toBeCloseTo(1120000 * 0.0065, 2);
    expect(a.cofinsDevido).toBeCloseTo(1120000 * 0.03, 2);
    expect(a.devido).toBeCloseTo(a.pisDevido + a.cofinsDevido, 2);
  });

  it("não cumulativo: 1,65% e 7,6%, sem tocar no resto", () => {
    const a = apurarPisCofins({
      dre: DRE, params: params({ regime: "REAL_NAO_CUMULATIVO" }), linhasTributo: linhas,
    });
    expect(a.pisDevido).toBeCloseTo(1120000 * 0.0165, 2);
    expect(a.cofinsDevido).toBeCloseTo(1120000 * 0.076, 2);
    expect(a.base).toBeCloseTo(1120000, 2);
  });

  it("o confronto é só com PIS e COFINS — o ISS fica fora", () => {
    // Confrontar o grupo DED_IMPOSTOS inteiro daria divergência sempre,
    // porque o ISS estaria dentro dele sem ninguém ver.
    const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    expect(a.contabilizado).toBeCloseTo(39000 + 180000, 2);
    expect(a.iss).toBeCloseTo(20000, 2);
    expect(a.divergencia).toBeCloseTo(a.devido - 219000, 2);
  });

  it("sem base informada, o app calcula mas NÃO afirma divergência", () => {
    // A estimativa da DRE não é a base da apuração: ela não conhece
    // regime de caixa nem isenção de receita. Nos balancetes reais a
    // diferença chegou a três vezes, e variou mês a mês — o que exclui
    // até a hipótese de um percentual fixo de isenção.
    const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    expect(a.informada).toBe(false);
    expect(a.baseInformada).toBe(null);
    expect(a.baseEstimada).toBeCloseTo(1120000, 2);
    expect(a.base).toBeCloseTo(1120000, 2);
    // Calcula tudo — só não se declara confiável.
    expect(a.devido).toBeGreaterThan(0);
    expect(a.confiavel).toBe(false);
  });

  it("a base informada substitui a estimativa e libera o confronto", () => {
    const a = apurarPisCofins({
      dre: DRE, params: params(), linhasTributo: linhas, baseInformada: 400000,
    });
    expect(a.informada).toBe(true);
    expect(a.base).toBeCloseTo(400000, 2);
    expect(a.baseEstimada).toBeCloseTo(1120000, 2);
    expect(a.pisDevido).toBeCloseTo(400000 * 0.0065, 2);
    expect(a.confiavel).toBe(true);
    // A memória guarda as duas, para quem confere ver de onde veio a conta.
    const rotulos = a.memoria.map((l) => l.rotulo);
    expect(rotulos.some((r) => /Base estimada pela DRE/.test(r))).toBe(true);
    expect(rotulos.some((r) => /Base informada/.test(r))).toBe(true);
  });

  it("base zero ou negativa não conta como informada", () => {
    for (const v of [0, -1, null, undefined, NaN]) {
      const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas, baseInformada: v });
      expect(a.informada).toBe(false);
      expect(a.base).toBeCloseTo(1120000, 2);
    }
  });

  it("base informada não salva o confronto se houver tributo sem classificar", () => {
    const semNome = deParaTributos(
      montarDRE([conta("3210599", -10000, "IMPOSTOS DIVERSOS")], () => "DED_IMPOSTOS"), {}
    );
    const a = apurarPisCofins({
      dre: DRE, params: params(), linhasTributo: semNome, baseInformada: 400000,
    });
    expect(a.confiavel).toBe(false);
  });

  it("com conta de tributo sem classificar, o confronto não é confiável", () => {
    const semNome = deParaTributos(
      montarDRE([conta("3210599", -10000, "IMPOSTOS DIVERSOS")], () => "DED_IMPOSTOS"), {}
    );
    const a = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: semNome });
    expect(a.indefinido).toBeCloseTo(10000, 2);
    expect(a.confiavel).toBe(false);
  });
});

describe("PROUNI — proporção isenta", () => {
  it("sem adesão, não há isenção nenhuma", () => {
    const p = proporcaoProuni(DRE, params());
    expect(p.proporcao).toBe(0);
    expect(p.estimada).toBe(false);
  });

  it("com adesão, a proporção sai das bolsas sobre a receita bruta — e é ESTIMADA", () => {
    // 120.000 + 80.000 = 200.000 sobre 1.200.000
    const p = proporcaoProuni(DRE, params({ prouni: { aderente: true } }));
    expect(p.proporcao).toBeCloseTo(200000 / 1200000, 6);
    // O app não tem a proporção oficial: ela vem do termo de adesão.
    // Marcar como estimada é o que impede o número de passar por fato.
    expect(p.estimada).toBe(true);
  });

  it("a isenção reduz a base tributável de PIS/COFINS na mesma proporção", () => {
    const a = apurarPisCofins({
      dre: DRE, params: params({ prouni: { aderente: true } }), linhasTributo: deParaTributos(DRE, {}),
    });
    expect(a.baseTributavel).toBeCloseTo(1120000 * (1 - 200000 / 1200000), 2);
  });

  it("proporção 100% zera o devido; 0% deixa igual ao sem adesão", () => {
    const tudoBolsa = montarDRE(
      [conta("3110101", 100000, "MENSALIDADE"), conta("3210001", -100000, "BOLSA")],
      (c) => (c === "3110101" ? "REC_MENSALIDADES" : "DED_BOLSAS")
    );
    const p = proporcaoProuni(tudoBolsa, params({ prouni: { aderente: true } }));
    expect(p.proporcao).toBeCloseTo(1, 6);
    const a = apurarPisCofins({ dre: tudoBolsa, params: params({ prouni: { aderente: true } }) });
    expect(a.devido).toBeCloseTo(0, 2);
  });
});

describe("LALUR Parte A", () => {
  it("sem ajuste aceito, o lucro real é o lucro antes do IR", () => {
    const l = apurarLalur({ dre: DRE, params: params(), ajustes: [] });
    expect(l.base).toBeCloseTo(DRE.antesIR, 2);
  });

  it("sugestão NÃO entra na soma até ser aceita", () => {
    // Somar por padrão produziria um lucro real que parece calculado e é
    // um chute sobre a dedutibilidade de cada provisão.
    const ajustes = ajustesEfetivos(DRE, []);
    expect(ajustes.length).toBeGreaterThan(0);
    expect(ajustes.every((a) => !a.aceito)).toBe(true);
    const l = apurarLalur({ dre: DRE, params: params(), ajustes });
    expect(l.base).toBeCloseTo(DRE.antesIR, 2);
    expect(l.confiavel).toBe(false); // há julgamento pendente
  });

  it("cada sugestão carrega o motivo, não só o valor", () => {
    const s = sugerirAjustes(DRE);
    expect(s.find((a) => a.grupo === "PROVISOES_CONTINGENCIAS").motivo).toMatch(/indedut/i);
    expect(s.every((a) => a.origem === "sugerido")).toBe(true);
  });

  it("ajuste aceito entra: adição soma, exclusão subtrai", () => {
    const l = apurarLalur({
      dre: DRE, params: params(),
      ajustes: [
        { id: "a", tipo: "adicao", valor: 40000, aceito: true, descricao: "Provisão" },
        { id: "b", tipo: "exclusao", valor: 10000, aceito: true, descricao: "Reversão" },
      ],
    });
    expect(l.adicoes).toBeCloseTo(40000, 2);
    expect(l.exclusoes).toBeCloseTo(10000, 2);
    expect(l.base).toBeCloseTo(DRE.antesIR + 40000 - 10000, 2);
    expect(l.confiavel).toBe(true);
  });

  it("o adicional de 10% só incide acima do limite do período", () => {
    const abaixo = montarDRE([conta("3110101", 15000, "MENSALIDADE")], () => "REC_MENSALIDADES");
    const a = apurarLalur({ dre: abaixo, params: params(), ajustes: [] });
    expect(a.base).toBeCloseTo(15000, 2);
    expect(a.adicional).toBeCloseTo(0, 2); // 15.000 < 20.000

    const acima = montarDRE([conta("3110101", 120000, "MENSALIDADE")], () => "REC_MENSALIDADES");
    const b = apurarLalur({ dre: acima, params: params(), ajustes: [] });
    expect(b.irpj).toBeCloseTo(120000 * 0.15, 2);
    expect(b.adicional).toBeCloseTo((120000 - 20000) * 0.10, 2);
  });

  it("o limite do adicional acompanha a periodicidade", () => {
    expect(mesesDoPeriodo("MENSAL")).toBe(1);
    expect(mesesDoPeriodo("TRIMESTRAL")).toBe(3);
    expect(mesesDoPeriodo("ANUAL")).toBe(12);
    const tri = apurarLalur({ dre: DRE, params: params({ periodicidade: "TRIMESTRAL" }), ajustes: [] });
    expect(tri.limite).toBeCloseTo(60000, 2);
  });

  it("a compensação de prejuízo trava em 30% do lucro ajustado", () => {
    const lucro = montarDRE([conta("3110101", 100000, "MENSALIDADE")], () => "REC_MENSALIDADES");
    // Saldo de prejuízo muito maior que o teto: compensa só 30.000.
    const l = apurarLalur({ dre: lucro, params: params(), ajustes: [], prejuizo: { fiscal: 500000 } });
    expect(l.base).toBeCloseTo(70000, 2);
  });

  it("prejuízo menor que o teto é compensado por inteiro", () => {
    const lucro = montarDRE([conta("3110101", 100000, "MENSALIDADE")], () => "REC_MENSALIDADES");
    const l = apurarLalur({ dre: lucro, params: params(), ajustes: [], prejuizo: { fiscal: 12000 } });
    expect(l.base).toBeCloseTo(88000, 2);
  });

  it("com prejuízo no período não há o que compensar nem imposto a pagar", () => {
    const perda = montarDRE([conta("4120101", -50000, "ALUGUEL")], () => "DESP_ADM");
    const l = apurarLalur({ dre: perda, params: params(), ajustes: [], prejuizo: { fiscal: 100000 } });
    expect(l.base).toBeCloseTo(-50000, 2);
    expect(l.irpj).toBeCloseTo(0, 2);
    expect(l.adicional).toBeCloseTo(0, 2);
    expect(l.csll).toBeCloseTo(0, 2);
  });

  it("IRPJ + adicional + CSLL fecham com o total devido", () => {
    const l = apurarLalur({ dre: DRE, params: params(), ajustes: [] });
    expect(l.bruto).toBeCloseTo(l.irpj + l.adicional + l.csll, 2);
    expect(l.devido).toBeCloseTo(l.bruto - l.isento, 2);
  });

  it("a isenção do PROUNI reduz o devido, não a base", () => {
    const semProuni = apurarLalur({ dre: DRE, params: params(), ajustes: [] });
    const comProuni = apurarLalur({
      dre: DRE, params: params({ prouni: { aderente: true } }), ajustes: [],
    });
    expect(comProuni.base).toBeCloseTo(semProuni.base, 2);
    expect(comProuni.bruto).toBeCloseTo(semProuni.bruto, 2);
    expect(comProuni.devido).toBeLessThan(semProuni.devido);
    expect(comProuni.devido).toBeCloseTo(semProuni.bruto * (1 - 200000 / 1200000), 2);
  });

  it("no Lucro Presumido não há LALUR: a base é presumida sobre a receita", () => {
    const l = apurarLalur({
      dre: DRE, params: params({ regime: "PRESUMIDO" }),
      ajustes: [{ id: "a", tipo: "adicao", valor: 999999, aceito: true, descricao: "irrelevante" }],
    });
    expect(l.regime.lalur).toBe(false);
    expect(l.base).toBeCloseTo(1200000 * 0.32, 2);
    // A adição aceita não pode contaminar uma base que não depende dela.
    expect(l.base).not.toBeCloseTo(DRE.antesIR + 999999, 2);
  });

  it("confronta com o IRPJ/CSLL que a DRE traz lançado", () => {
    const l = apurarLalur({ dre: DRE, params: params(), ajustes: [] });
    expect(l.contabilizado).toBeCloseTo(60000, 2);
    expect(l.divergencia).toBeCloseTo(l.devido - 60000, 2);
  });
});

describe("o placar não diz 'confere' quando ainda há julgamento pendente", () => {
  it("com sugestão não confirmada, o placar acusa pendência", () => {
    const linhas = deParaTributos(DRE, {});
    const pc = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    const l = apurarLalur({ dre: DRE, params: params(), ajustes: ajustesEfetivos(DRE, []) });
    const r = resumoFiscal(pc, l);
    expect(r.pendencias).toBeGreaterThan(0);
    expect(r.confere).toBe(false);
  });

  it("mas 'confere' continua alcançável: base informada, sem pendência e sem diferença", () => {
    // Sem este teste, apertar a régua da confiabilidade poderia deixar o
    // placar preso em "Incompleto" para sempre, e ninguém veria.
    const linhas = deParaTributos(DRE, {});
    const pc = apurarPisCofins({ dre: DRE, params: params(), linhasTributo: linhas });
    // A base que faz o recalculado bater exatamente com o contabilizado.
    const exata = pc.contabilizado / (0.0065 + 0.03);
    const pcOk = apurarPisCofins({
      dre: DRE, params: params(), linhasTributo: linhas, baseInformada: exata,
    });
    const lOk = apurarLalur({
      dre: DRE, params: params(), ajustes: [],
      prejuizo: { fiscal: 0, baseNegativa: 0 },
    });
    const r = resumoFiscal(pcOk, { ...lOk, divergencia: 0 });
    expect(pcOk.confiavel).toBe(true);
    expect(Math.abs(pcOk.divergencia)).toBeLessThan(0.01);
    expect(r.divergePis).toBe(false);
    expect(r.pendencias).toBe(0);
    expect(r.confere).toBe(true);
  });

  it("a proporção estimada do PROUNI conta como pendência", () => {
    const p = params({ prouni: { aderente: true } });
    const pc = apurarPisCofins({ dre: DRE, params: p, linhasTributo: deParaTributos(DRE, {}) });
    const l = apurarLalur({ dre: DRE, params: p, ajustes: [] });
    expect(resumoFiscal(pc, l).pendencias).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * O Excel entregue.
 *
 * A planilha circula SOZINHA, sem a tela junto — então tudo que a tela
 * diz sobre o limite do bloco e sobre o que ainda é julgamento precisa
 * estar escrito nela também. Um número sem essa marca passa por apurado.
 * ------------------------------------------------------------------ */
describe("o Excel da apuração", () => {
  const montar = async (extra = {}) => {
    const { montarWorkbookFiscal } = await import("../exportacaoFiscal.js");
    const p = { ...PARAMS_FISCAIS_PADRAO, ...extra.params };
    const linhasTributo = deParaTributos(DRE, {});
    return montarWorkbookFiscal({
      params: p,
      pisCofins: apurarPisCofins({ dre: DRE, params: p, linhasTributo }),
      lalur: apurarLalur({ dre: DRE, params: p, ajustes: extra.ajustes || [] }),
      ajustes: extra.ajustes || [],
      linhasTributo,
      empresa: "Exemplo", periodo: "junho de 2026",
    });
  };

  const textoDe = (ws) => {
    const linhas = [];
    ws.eachRow((row) => row.eachCell((c) => { if (typeof c.value === "string") linhas.push(c.value); }));
    return linhas.join(" | ");
  };

  it("tem as cinco abas, na ordem em que se lê", async () => {
    const wb = await montar();
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Resumo", "PIS e COFINS", "LALUR Parte A", "Ajustes", "De-Para tributos",
    ]);
  });

  it("diz NO ARQUIVO que confere e não apura para recolhimento", async () => {
    const wb = await montar();
    expect(textoDe(wb.getWorksheet("Resumo"))).toMatch(/não é apuração para recolhimento/i);
  });

  it("marca 'A CONFIRMAR' na linha do PROUNI, que é estimada", async () => {
    const wb = await montar({ params: { prouni: { aderente: true } } });
    expect(textoDe(wb.getWorksheet("PIS e COFINS"))).toContain("A CONFIRMAR");
  });

  it("acusa no Resumo quando há ajuste do LALUR pendente", async () => {
    const wb = await montar({ ajustes: ajustesEfetivos(DRE, []) });
    expect(textoDe(wb.getWorksheet("Resumo"))).toMatch(/ainda não confirmados/i);
  });

  it("avisa, na planilha, que a base de PIS/COFINS não foi informada", async () => {
    // A planilha circula sozinha. Sem esta linha, a diferença ali dentro
    // passa por divergência apurada quando é só a estimativa da DRE.
    const wb = await montar();
    const t = textoDe(wb.getWorksheet("Resumo"));
    expect(t).toMatch(/base de PIS\/COFINS não foi informada/i);
    expect(t).toMatch(/NÃO é uma divergência apurada/i);
  });

  it("o ajuste não confirmado sai marcado, não escondido", async () => {
    const wb = await montar({ ajustes: ajustesEfetivos(DRE, []) });
    expect(textoDe(wb.getWorksheet("Ajustes"))).toContain("NÃO — pendente");
  });

  it("valor é NÚMERO com formato de moeda, nunca texto", async () => {
    // O destino do arquivo é conferência por totais dentro do Excel.
    const ws = (await montar()).getWorksheet("Resumo");
    let achou = false;
    ws.eachRow((row) => {
      if (row.getCell(1).value === "PIS + COFINS") {
        expect(typeof row.getCell(2).value).toBe("number");
        expect(row.getCell(2).numFmt).toBeTruthy();
        achou = true;
      }
    });
    expect(achou).toBe(true);
  });

  it("no Lucro Presumido a aba do LALUR muda de nome, porque não há LALUR", async () => {
    const wb = await montar({ params: { regime: "PRESUMIDO" } });
    expect(wb.worksheets.map((w) => w.name)).toContain("Base presumida");
    expect(wb.worksheets.map((w) => w.name)).not.toContain("LALUR Parte A");
  });
});
