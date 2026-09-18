import { describe, expect, it } from "vitest";
import { montarDRE } from "../classify.js";
import { montarLinhas } from "../linhasDRE.js";
import { fazerCategoriaDe, montarDRE51 } from "../cpc51.js";
import { montarLinhas51 } from "../linhasCPC51.js";
import { montarDePara, resumoDePara } from "../depara.js";
import { conciliar, deParaCPC51, POLITICA_PADRAO } from "../cpc51.js";
import { montarWorkbookCPC51 } from "../exportacaoCPC51.js";
import {
  fazerModalidadeDe, faixasDoGrupo, modalidadePorNome, origemModalidade,
  rotuloPorConta, sugerirModalidades,
} from "../modalidade.js";

/* O TERCEIRO EIXO — Presencial / EAD / Comum.
 *
 * O que estes testes travam é uma frase só: DIVIDIR NÃO MUDA NÚMERO
 * NENHUM. A quebra por modalidade é leitura; se algum subtotal, seção ou
 * o lucro líquido se mover por causa dela, a demonstração deixou de ser
 * a que foi validada centavo a centavo contra a DRE oficial.
 *
 * Valores fictícios, como em todo teste deste projeto. */

const conta = (codigo, saldo, extra = {}) => ({
  conta: codigo,
  saldo,
  historico: "",
  deb: saldo < 0 ? -saldo : 0,
  cre: saldo > 0 ? saldo : 0,
  n: 1,
  ...extra,
});

/* Um balancete sintético com as três situações que existem de verdade:
   receita segregada nas duas modalidades, custo idem, e despesa
   administrativa que nasce da instituição inteira. */
const CONTAS = [
  conta("3110101", 100000), // mensalidade presencial
  conta("3110102", 60000), // mensalidade EAD
  conta("3110103", 4000), // mensalidade sem modalidade declarada
  conta("4110101", -40000), // custo docente presencial
  conta("4110102", -15000), // custo docente EAD
  conta("4120101", -9000), // aluguel — da instituição inteira
  conta("4120102", -2000), // marketing digital — NÃO é EAD
];

const NOMES = {
  "3": "RECEITAS LIQUIDAS",
  "31101": "MENSALIDADES",
  "3110101": "GRADUACAO PRESENCIAL",
  "3110102": "GRADUACAO EAD",
  "3110103": "OUTROS CURSOS",
  "41101": "CUSTO TOTAL - DOCENTES",
  "4110101": "DOCENTES GRADUACAO PRESENCIAL",
  "4110102": "DOCENTES GRADUACAO EAD",
  "4120101": "ALUGUEIS E CONDOMINIOS",
  "4120102": "MARKETING DIGITAL",
};

const grupoDe = (c) =>
  c.startsWith("31101") ? "REC_MENSALIDADES" : c.startsWith("41101") ? "CUSTOS" : "DESP_ADM";

const modalidadeDe = fazerModalidadeDe({ sugestao: sugerirModalidades(CONTAS, NOMES) });
const dreCom = () => montarDRE(CONTAS, grupoDe, modalidadeDe);
const dreSem = () => montarDRE(CONTAS, grupoDe);

/* ------------------------------------------------------------------ *
 * Ler a modalidade do plano de contas.
 * ------------------------------------------------------------------ */
describe("a modalidade sai do nome da conta e dos ancestrais", () => {
  it("lê o nome da própria conta", () => {
    expect(modalidadePorNome("3110101", NOMES)).toBe("PRESENCIAL");
    expect(modalidadePorNome("3110102", NOMES)).toBe("EAD");
  });

  it("herda da conta-síntese quando a folha não diz nada", () => {
    const nomes = { "31105": "POS-GRADUACAO EAD", "3110501": "TURMA 2026" };
    expect(modalidadePorNome("3110501", nomes)).toBe("EAD");
  });

  it("a conta mais próxima vence a mais distante", () => {
    /* A exceção que o plano quis declarar: uma folha presencial dentro de
       uma síntese EAD. Concatenar os textos, como faz o classificador de
       GRUPO, faria EAD ganhar sempre. */
    const nomes = { "31105": "POS-GRADUACAO EAD", "3110501": "TURMA PRESENCIAL" };
    expect(modalidadePorNome("3110501", nomes)).toBe("PRESENCIAL");
  });

  it("semipresencial é EAD, não presencial", () => {
    expect(modalidadePorNome("x", { x: "GRADUACAO SEMIPRESENCIAL" })).toBe("EAD");
    expect(modalidadePorNome("y", { y: "GRADUACAO SEMI-PRESENCIAL" })).toBe("EAD");
  });

  it("'a distância' também é EAD", () => {
    expect(modalidadePorNome("x", { x: "ENSINO A DISTANCIA" })).toBe("EAD");
    expect(modalidadePorNome("y", { y: "CURSOS A DISTÂNCIA" })).toBe("EAD");
  });

  it("não inventa modalidade onde o nome não declara nenhuma", () => {
    /* O padrão é estreito de propósito: "digital" e "online" aparecem em
       despesa administrativa da instituição inteira, e um EAD inflado por
       marketing é erro difícil de perceber na tela. */
    expect(modalidadePorNome("4120102", NOMES)).toBe(null);
    expect(modalidadePorNome("x", { x: "COMPRAS ONLINE" })).toBe(null);
    expect(modalidadePorNome("x", { x: "ALUGUEIS E CONDOMINIOS" })).toBe(null);
  });

  it("conta sem modalidade fica FORA do mapa de sugestão", () => {
    const sug = sugerirModalidades(CONTAS, NOMES);
    expect(sug["3110101"]).toBe("PRESENCIAL");
    expect(sug["3110102"]).toBe("EAD");
    expect("4120101" in sug).toBe(false); // ausência, não "COMUM"
  });
});

/* ------------------------------------------------------------------ *
 * Manual > nome do plano > comum.
 * ------------------------------------------------------------------ */
describe("a decisão manual vence o nome do plano", () => {
  const sugestao = { "3110101": "PRESENCIAL" };

  it("manual sobrepõe a sugestão", () => {
    const de = fazerModalidadeDe({ modalidadePorConta: { "3110101": "EAD" }, sugestao });
    expect(de("3110101")).toBe("EAD");
    expect(origemModalidade("3110101", { modalidadePorConta: { "3110101": "EAD" }, sugestao })).toBe("manual");
  });

  it("sem manual e sem sugestão, a conta é COMUM", () => {
    const de = fazerModalidadeDe({ sugestao });
    expect(de("9999")).toBe("COMUM");
    expect(origemModalidade("9999", { sugestao })).toBe("sem modalidade");
  });

  it("modalidade inválida é ignorada em vez de virar linha nova", () => {
    const de = fazerModalidadeDe({ modalidadePorConta: { "3110101": "HIBRIDO" }, sugestao });
    expect(de("3110101")).toBe("PRESENCIAL");
  });
});

/* ------------------------------------------------------------------ *
 * O invariante central: dividir não muda número nenhum.
 * ------------------------------------------------------------------ */
describe("as faixas somam exatamente a linha que abriram", () => {
  it("cada grupo dividido fecha com o próprio total", () => {
    const dre = dreCom();
    Object.values(dre.bal).forEach((g) => {
      const soma = g.faixas.reduce((s, f) => s + f.total, 0);
      if (g.faixas.length) expect(soma).toBeCloseTo(g.total, 2);
    });
  });

  it("a soma líquida também vale dentro da faixa (reversão reduz a despesa)", () => {
    /* O mesmo cuidado de `montarDRE`: um grupo pode misturar provisão
       nova e reversão. Somar magnitude dentro da faixa reproduziria, um
       nível abaixo, o erro que o total do grupo já evita. */
    const contas = [
      conta("6110101", -5000, { historico: "" }), // provisão nova, presencial
      conta("6110102", 2000), // reversão, presencial
    ];
    const nomes = { "6110101": "PROV. CONTINGENCIAS PRESENCIAL", "6110102": "(-) REV. PROV. PRESENCIAL" };
    const dre = montarDRE(
      contas,
      () => "PROVISOES_CONTINGENCIAS",
      fazerModalidadeDe({ sugestao: sugerirModalidades(contas, nomes) })
    );
    const g = dre.bal.PROVISOES_CONTINGENCIAS;
    expect(g.porModalidade.PRESENCIAL.total).toBeCloseTo(3000, 2); // 5000 − 2000, não 7000
    expect(g.porModalidade.PRESENCIAL.total).toBeCloseTo(g.total, 2);
  });

  it("o lucro líquido e os subtotais não se movem com a divisão ligada", () => {
    const com = dreCom();
    const sem = dreSem();
    ["receitaBruta", "deducoes", "receitaLiq", "resultadoOperBruto", "despOper",
      "resultadoOper", "antesIR", "liquido"].forEach((chave) => {
      expect(com[chave]).toBeCloseTo(sem[chave], 2);
    });
  });

  it("as linhas da demonstração continuam com o mesmo valor", () => {
    const comLinhas = montarLinhas(dreCom()).itens.filter((i) => i.t !== "mod");
    const semLinhas = montarLinhas(dreSem()).itens;
    expect(comLinhas.map((i) => [i.lbl, i.val])).toEqual(semLinhas.map((i) => [i.lbl, i.val]));
  });

  it("o total do título de seção soma todas as linhas, não só a primeira", () => {
    /* A regressão que a faixa quase causou: `totalizarSecoes` parava na
       primeira linha que não fosse `l`, e a primeira faixa cortava a
       seção ao meio sem nenhum sinal na tela. */
    const secao = montarLinhas(dreCom()).itens.find((i) => i.lbl === "Receita Operacional Bruta");
    expect(secao.val).toBeCloseTo(164000, 2); // as três mensalidades + taxas (zero)
  });

  it("a faixa não entra na cascata", () => {
    const itens = montarLinhas(dreCom()).itens;
    itens.filter((i) => i.t === "mod").forEach((f) => {
      expect(f.inicio).toBeUndefined();
      expect(f.fim).toBeUndefined();
    });
  });
});

/* ------------------------------------------------------------------ *
 * Quando a linha se divide — e quando não.
 * ------------------------------------------------------------------ */
describe("só se divide o grupo que tem modalidade", () => {
  it("grupo inteiramente comum continua uma linha só", () => {
    const dre = dreCom();
    expect(dre.bal.DESP_ADM.dividido).toBe(false);
    expect(dre.bal.DESP_ADM.faixas).toEqual([]);
  });

  it("grupo misto abre as três faixas, com a comum por último", () => {
    const dre = dreCom();
    expect(dre.bal.REC_MENSALIDADES.faixas.map((f) => f.id)).toEqual(["PRESENCIAL", "EAD", "COMUM"]);
  });

  it("grupo sem conta comum abre só as duas modalidades", () => {
    const dre = dreCom();
    expect(dre.bal.CUSTOS.faixas.map((f) => f.id)).toEqual(["PRESENCIAL", "EAD"]);
  });

  it("sem modalidade nenhuma, nada se divide", () => {
    const dre = dreSem();
    Object.values(dre.bal).forEach((g) => expect(g.dividido).toBe(false));
    expect(montarLinhas(dre).itens.some((i) => i.t === "mod")).toBe(false);
  });

  it("faixasDoGrupo não inventa divisão a partir de blocos vazios", () => {
    expect(faixasDoGrupo(null)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * A chave da linha — o que a comparativa casa entre colunas.
 * ------------------------------------------------------------------ */
describe("cada linha tem chave própria", () => {
  it("nenhuma chave se repete na demonstração", () => {
    const chaves = montarLinhas(dreCom()).itens.filter((i) => i.chave).map((i) => i.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("o rótulo, sozinho, NÃO serviria de chave", () => {
    /* É esta repetição que quebraria a comparativa se ela casasse por
       rótulo: "Presencial" aparece embaixo de cada tópico dividido. */
    const rotulos = montarLinhas(dreCom()).itens.filter((i) => i.t === "mod").map((i) => i.lbl);
    expect(rotulos.filter((r) => r === "Presencial").length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ *
 * O mesmo eixo na demonstração do CPC 51.
 * ------------------------------------------------------------------ */
describe("o CPC 51 lê a mesma modalidade", () => {
  const categoriaDe = fazerCategoriaDe({ grupoDe });
  const dre51 = () => montarDRE51(CONTAS, grupoDe, categoriaDe, modalidadeDe);

  it("as faixas somam o grupo dentro da categoria", () => {
    Object.values(dre51().cat).forEach((c) =>
      c.grupos.forEach((g) => {
        if (g.faixas.length) {
          expect(g.faixas.reduce((s, f) => s + f.total, 0)).toBeCloseTo(g.total, 2);
        }
      })
    );
  });

  it("o lucro líquido continua idêntico ao da estrutura atual", () => {
    expect(dre51().liquido).toBeCloseTo(dreCom().liquido, 2);
  });

  it("a faixa não recebe código de linha — ela não é linha da demonstração", () => {
    montarLinhas51(dre51()).itens.filter((i) => i.t === "mod").forEach((f) => {
      expect(f.cod).toBeUndefined();
      expect(f.chave).toMatch(/\|/);
    });
  });

  it("a mesma conta tem a mesma modalidade nas duas demonstrações", () => {
    const naAtual = rotuloPorConta(dreCom().bal.REC_MENSALIDADES.porModalidade);
    const bloco = dre51().cat.OPERACIONAL.grupos.find((g) => g.id === "REC_MENSALIDADES");
    expect(rotuloPorConta(bloco.porModalidade)).toEqual(naAtual);
  });
});

/* ------------------------------------------------------------------ *
 * De-Para: o eixo aparece conta a conta, com a origem.
 * ------------------------------------------------------------------ */
describe("o De-Para mostra a modalidade e de onde ela veio", () => {
  const sugestaoModalidade = sugerirModalidades(CONTAS, NOMES);
  /* A tela compõe os dois na mesma ordem do app (manual > plano): o
     De-Para RECEBE a função pronta, não monta uma segunda resolução por
     conta própria — senão corrigir uma conta aqui valeria numa tela e
     não na outra. */
  const modalidadePorConta = { "3110103": "EAD" };
  const linhas = montarDePara(CONTAS, {
    grupoDe, nomes: NOMES,
    modalidadeDe: fazerModalidadeDe({ modalidadePorConta, sugestao: sugestaoModalidade }),
    modalidadePorConta,
    sugestaoModalidade,
  });
  const por = Object.fromEntries(linhas.map((l) => [l.conta, l]));

  it("registra a origem de cada decisão", () => {
    expect(por["3110101"].modalidade).toBe("PRESENCIAL");
    expect(por["3110101"].origemModalidade).toBe("nome no plano");
    expect(por["4120101"].modalidade).toBe("COMUM");
    expect(por["4120101"].origemModalidade).toBe("sem modalidade");
  });

  it("a faixa residual NÃO conta como pendência de parametrização", () => {
    /* Despesa da instituição inteira é comum de verdade: marcá-la como
       trabalho a fazer encheria o placar de tarefa que não existe. */
    expect(por["4120101"].pendente).toBe(false);
    expect(resumoDePara(linhas).semModalidade).toBe(2);
  });

  it("o placar conta por faixa, sem nome de modalidade cravado", () => {
    const r = resumoDePara(linhas);
    expect(r.porModalidade.PRESENCIAL).toBe(2);
    expect(r.porModalidade.EAD).toBe(3); // as duas do plano + a corrigida à mão
    expect(r.segregadas).toBe(5);
    expect(r.manuaisModalidade).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * O Excel detalhado — abrir a faixa tem que mostrar as contas DELA.
 * ------------------------------------------------------------------ */
describe("no Excel do CPC 51, a faixa abre nas contas da própria modalidade", () => {
  const categoriaDe = fazerCategoriaDe({ grupoDe });

  const abrirAba = async () => {
    const dre = dreCom();
    const dre51 = montarDRE51(CONTAS, grupoDe, categoriaDe, modalidadeDe);
    const wb = await montarWorkbookCPC51({
      dre, dre51,
      conciliacao: conciliar(dre, dre51, CONTAS, grupoDe, categoriaDe),
      dePara: deParaCPC51(CONTAS, { grupoDe, categoriaPorConta: {}, politica: POLITICA_PADRAO, nomes: NOMES }),
      medidas: [], politica: POLITICA_PADRAO, empresa: "Exemplo",
      periodo: "junho de 2026", nomes: NOMES,
    });
    const ws = wb.getWorksheet("DR_CPC_51_Detalhada");

    /* Reconstrói a árvore como o Excel a desenha: cada linha de nível 0
       é um tópico ou uma faixa, e as de nível 1 penduradas embaixo são
       as contas que o `+` dela abre. */
    const blocos = [];
    ws.eachRow((row) => {
      const nivel = row.outlineLevel || 0;
      if (nivel === 1) {
        if (blocos.length) blocos[blocos.length - 1].contas.push(String(row.getCell(2).value));
        return;
      }
      blocos.push({ rotulo: String(row.getCell(3).value), valor: row.getCell(4).value, contas: [] });
    });
    return blocos;
  };

  it("dentro de Presencial não aparece conta de EAD — o defeito de 18/09/2026", async () => {
    /* O total da faixa sempre esteve certo; era a lista aberta pelo `+`
       que trazia o grupo inteiro, porque a faixa carrega o id do GRUPO.
       Quem confere somando a coluna via a composição estourar o total. */
    const blocos = await abrirAba();
    const presencial = blocos.find((b) => b.rotulo === "Presencial" && b.contas.length);
    expect(presencial.contas).toEqual(["3110101"]);

    const ead = blocos.find((b) => b.rotulo === "EAD" && b.contas.length);
    expect(ead.contas).toEqual(["3110102"]);
    expect(ead.contas).not.toContain("3110101");

    // e a conta sem modalidade declarada cai na faixa residual, sozinha
    const comum = blocos.find((b) => b.rotulo === "Comum / não segregado" && b.contas.length);
    expect(comum.contas).toEqual(["3110103"]);
  });

  it("as contas abertas somam exatamente o valor da faixa", async () => {
    const blocos = await abrirAba();
    const saldos = Object.fromEntries(CONTAS.map((c) => [c.conta, c.saldo]));
    blocos.filter((b) => b.contas.length).forEach((b) => {
      const soma = b.contas.reduce((s, conta) => s + (saldos[conta] ?? 0), 0);
      expect(soma).toBeCloseTo(b.valor, 2);
    });
  });

  it("o tópico dividido não repete as contas que as faixas já listaram", async () => {
    const blocos = await abrirAba();
    const topico = blocos.find((b) => b.rotulo === "Receita Bruta com Mensalidades");
    expect(topico.contas).toEqual([]);
  });

  it("tópico sem divisão continua abrindo nas contas dele", async () => {
    const blocos = await abrirAba();
    const adm = blocos.find((b) => b.rotulo === "Despesas Administrativas");
    expect(adm.contas.sort()).toEqual(["4120101", "4120102"]);
  });
});
