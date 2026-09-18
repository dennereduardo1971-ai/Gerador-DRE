import { describe, expect, it } from "vitest";
import { montarDRE } from "../classify.js";
import { montarLinhas } from "../linhasDRE.js";
import { montarLinhas51 } from "../linhasCPC51.js";
import { fazerCategoriaDe, montarDRE51 } from "../cpc51.js";
import { montarDePara } from "../depara.js";
import { matrizDRE } from "../exportacao.js";
import { lerPerfil, montarPerfil } from "../perfil.js";
import {
  CATALOGO_PADRAO, RESIDUAL, fazerModalidadeDe, modalidadeDoTexto, normalizarCatalogo,
  novoId, sugerirModalidades,
} from "../modalidade.js";
import {
  ROTULOS_VAZIOS, definirRotulo, limparRotulo, nomeDaConta, nomeDoGrupo,
  normalizarRotulos, quantosRotulos,
} from "../rotulos.js";

/* RENOMEAR É APARÊNCIA — é isso que estes testes travam.
 *
 * O apelido muda o que se lê na tela, no Excel e no CSV, e NÃO muda para
 * onde a conta vai nem quanto ela vale. O dia em que renomear uma conta
 * mover ela de grupo, quem renomeou por estética descobre no fechamento.
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

const CONTAS = [
  conta("3110101", 900000),
  conta("3110102", 540000),
  conta("3110107", 120000),
  conta("4120101", -180000),
];

const NOMES = {
  "3110101": "GRADUACAO PRESENCIAL",
  "3110102": "GRADUACAO EAD",
  "3110107": "ENSINO MEDIO/FUNDAMENTAL",
  "4120101": "ALUGUEL CAMPUS",
};

const grupoDe = (c) => (c.startsWith("31") ? "REC_MENSALIDADES" : "DESP_ADM");
const modalidadeDe = (catalogo = CATALOGO_PADRAO) =>
  fazerModalidadeDe({ sugestao: sugerirModalidades(CONTAS, NOMES, catalogo), catalogo });
const montar = (catalogo = CATALOGO_PADRAO) => montarDRE(CONTAS, grupoDe, modalidadeDe(catalogo));

/* ------------------------------------------------------------------ *
 * O registro de apelidos.
 * ------------------------------------------------------------------ */
describe("o apelido é texto limpo, e apagar devolve o original", () => {
  it("corta caractere de controle, espaço repetido e excesso de tamanho", () => {
    expect(limparRotulo("  Receita   de \n Mensalidades  ")).toBe("Receita de Mensalidades");
    expect(limparRotulo("a".repeat(200)).length).toBe(90);
    expect(limparRotulo(null)).toBe("");
  });

  it("apelido vazio REMOVE a entrada em vez de guardar string vazia", () => {
    const com = definirRotulo(ROTULOS_VAZIOS, "grupos", "REC_MENSALIDADES", "Mensalidades");
    expect(nomeDoGrupo("REC_MENSALIDADES", com)).toBe("Mensalidades");
    const sem = definirRotulo(com, "grupos", "REC_MENSALIDADES", "   ");
    expect("REC_MENSALIDADES" in sem.grupos).toBe(false);
    expect(nomeDoGrupo("REC_MENSALIDADES", sem)).toBe("Receita Bruta com Mensalidades");
  });

  it("eixo que não existe não cria eixo novo", () => {
    expect(definirRotulo(ROTULOS_VAZIOS, "inventado", "x", "y")).toEqual(ROTULOS_VAZIOS);
  });

  it("limpa o que veio de um arquivo editado à mão", () => {
    const sujo = { grupos: { CUSTOS: "  Custo  ", "": "sem chave", DESP_ADM: "   " }, lixo: 1 };
    const limpo = normalizarRotulos(sujo);
    expect(limpo.grupos).toEqual({ CUSTOS: "Custo" });
    expect(quantosRotulos(limpo)).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * O nome novo aparece em todo lugar que o antigo aparecia.
 * ------------------------------------------------------------------ */
describe("renomear um grupo vale na tela e no arquivo ao mesmo tempo", () => {
  const rotulos = definirRotulo(ROTULOS_VAZIOS, "grupos", "REC_MENSALIDADES", "Receita com Cursos");

  it("muda a linha da DRE, mantendo o sinal da cascata", () => {
    const linha = montarLinhas(montar(), rotulos).itens.find((i) => i.id === "REC_MENSALIDADES" && i.t === "l");
    expect(linha.lbl).toBe("( + ) Receita com Cursos");
  });

  it("muda a mesma linha na demonstração do CPC 51", () => {
    const dre51 = montarDRE51(CONTAS, grupoDe, fazerCategoriaDe({ grupoDe }), modalidadeDe());
    const linha = montarLinhas51(dre51, rotulos).itens.find((i) => i.id === "REC_MENSALIDADES");
    expect(linha.lbl).toBe("Receita com Cursos");
  });

  it("muda a coluna 'Grupo na DRE' do De-Para", () => {
    const linhas = montarDePara(CONTAS, { grupoDe, nomes: NOMES, rotulos });
    expect(linhas.find((l) => l.conta === "3110101").grupoNome).toBe("Receita com Cursos");
  });

  it("muda a matriz que vira Excel e CSV", () => {
    const rotulado = matrizDRE(montar(), rotulos).map((l) => l.lbl);
    expect(rotulado).toContain("( + ) Receita com Cursos");
    expect(matrizDRE(montar()).map((l) => l.lbl)).toContain("( + ) Receita Bruta com Mensalidades");
  });

  it("seção e subtotal também se renomeiam, cada um pela sua chave", () => {
    const r = definirRotulo(rotulos, "linhas", "FINAL_LIQUIDO", "Sobra do período");
    const itens = montarLinhas(montar(), r).itens;
    expect(itens.find((i) => i.t === "final").lbl).toBe("Sobra do período");
    expect(itens.find((i) => i.chave === "SEC_RECEITA_BRUTA").lbl).toBe("Receita Operacional Bruta");
  });
});

describe("renomear uma conta é aparência, nunca classificação", () => {
  const rotulos = definirRotulo(ROTULOS_VAZIOS, "contas", "3110102", "Graduação on-line");

  it("a tela e o arquivo passam a mostrar o apelido", () => {
    expect(nomeDaConta("3110102", NOMES, rotulos)).toBe("Graduação on-line");
    const linha = montarDePara(CONTAS, { grupoDe, nomes: NOMES, rotulos }).find((l) => l.conta === "3110102");
    expect(linha.descricao).toBe("Graduação on-line");
    expect(linha.descricaoOriginal).toBe("GRADUACAO EAD"); // o nome do plano continua à vista
  });

  it("a modalidade continua vindo do nome ORIGINAL do plano", () => {
    /* "Graduação on-line" não casa com termo nenhum do catálogo; se a
       sugestão lesse o apelido, esta conta cairia na faixa residual só
       por ter sido renomeada. */
    const sug = sugerirModalidades(CONTAS, NOMES, CATALOGO_PADRAO);
    expect(sug["3110102"]).toBe("EAD");
    const linha = montarDePara(CONTAS, {
      grupoDe, nomes: NOMES, rotulos, modalidadeDe: modalidadeDe(), sugestaoModalidade: sug,
    }).find((l) => l.conta === "3110102");
    expect(linha.modalidade).toBe("EAD");
  });

  it("nenhum valor se move por causa de um apelido", () => {
    const semApelido = montarLinhas(montar()).itens.map((i) => [i.chave, i.val]);
    const comApelido = montarLinhas(montar(), rotulos).itens.map((i) => [i.chave, i.val]);
    expect(comApelido).toEqual(semApelido);
  });
});

/* ------------------------------------------------------------------ *
 * O catálogo de modalidades.
 * ------------------------------------------------------------------ */
describe("o catálogo de modalidades é dado, não código", () => {
  it("de fábrica já separa presencial, EAD e médio/fundamental", () => {
    const dre = montar();
    const faixas = Object.fromEntries(dre.bal.REC_MENSALIDADES.faixas.map((f) => [f.id, f.total]));
    expect(faixas.PRESENCIAL).toBeCloseTo(900000, 2);
    expect(faixas.EAD).toBeCloseTo(540000, 2);
    expect(faixas.MEDIO_FUNDAMENTAL).toBeCloseTo(120000, 2);
  });

  it("modalidade nova com termo próprio reclassifica sem tocar em conta nenhuma", () => {
    const catalogo = [
      ...CATALOGO_PADRAO.slice(0, -1),
      { id: "TECNICO", nome: "Técnico", termos: ["campus"] },
      CATALOGO_PADRAO[CATALOGO_PADRAO.length - 1],
    ];
    expect(sugerirModalidades(CONTAS, NOMES, catalogo)["4120101"]).toBe("TECNICO");
  });

  it("remover a modalidade devolve as contas dela para a residual", () => {
    const semEad = CATALOGO_PADRAO.filter((m) => m.id !== "EAD");
    const de = fazerModalidadeDe({
      modalidadePorConta: { "3110102": "EAD" }, // decidida à mão antes de a faixa sumir
      sugestao: sugerirModalidades(CONTAS, NOMES, semEad),
      catalogo: semEad,
    });
    expect(de("3110102")).toBe(RESIDUAL);
  });

  it("renomear a modalidade NÃO muda o id — as contas decididas à mão continuam onde estavam", () => {
    const renomeado = CATALOGO_PADRAO.map((m) => (m.id === "EAD" ? { ...m, nome: "A distância" } : m));
    const de = fazerModalidadeDe({ modalidadePorConta: { "3110102": "EAD" }, catalogo: renomeado });
    expect(de("3110102")).toBe("EAD");
    const dre = montarDRE(CONTAS, grupoDe, de);
    expect(dre.bal.REC_MENSALIDADES.porModalidade.EAD.nome).toBe("A distância");
  });

  it("o termo casa por palavra inteira e sem depender de acento ou pontuação", () => {
    expect(modalidadeDoTexto("GRADUACAO SEMI-PRESENCIAL")).toBe("EAD");
    expect(modalidadeDoTexto("ENSINO MEDIO/FUNDAMENTAL")).toBe("MEDIO_FUNDAMENTAL");
    expect(modalidadeDoTexto("CURSOS A DISTÂNCIA")).toBe("EAD");
    expect(modalidadeDoTexto("MARKETING DIGITAL")).toBe(null);
  });

  it("entre dois termos que casam, vence o mais específico", () => {
    const catalogo = [
      { id: "GRAD", nome: "Graduação", termos: ["graduacao"] },
      { id: "POS", nome: "Pós", termos: ["pos graduacao"] },
      CATALOGO_PADRAO[CATALOGO_PADRAO.length - 1],
    ];
    expect(modalidadeDoTexto("POS GRADUACAO NOTURNA", catalogo)).toBe("POS");
  });

  it("id novo não colide com os que já existem", () => {
    expect(novoId("Técnico", CATALOGO_PADRAO)).toBe("TECNICO");
    expect(novoId("EAD", CATALOGO_PADRAO)).toBe("EAD_2");
  });

  it("catálogo vindo de arquivo sempre termina com a faixa residual", () => {
    const semResidual = normalizarCatalogo([{ id: "X", nome: "X", termos: [] }]);
    expect(semResidual[semResidual.length - 1].id).toBe(RESIDUAL);
    expect(normalizarCatalogo([]).length).toBe(CATALOGO_PADRAO.length);
    expect(normalizarCatalogo(null)[0].id).toBe("PRESENCIAL");
  });

  it("id repetido no arquivo não vira duas faixas", () => {
    const cat = normalizarCatalogo([
      { id: "EAD", nome: "EAD", termos: ["ead"] },
      { id: "EAD", nome: "EAD de novo", termos: [] },
    ]);
    expect(cat.filter((m) => m.id === "EAD")).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * O perfil leva os nomes junto — é o que faz o trabalho não se perder.
 * ------------------------------------------------------------------ */
describe("nomes e catálogo viajam no perfil", () => {
  const rotulos = definirRotulo(
    definirRotulo(ROTULOS_VAZIOS, "contas", "3110102", "Graduação EAD"),
    "grupos", "REC_MENSALIDADES", "Receita com Cursos"
  );
  const catalogo = [
    { id: "PRESENCIAL", nome: "Presencial", termos: ["presencial"] },
    { id: "TECNICO", nome: "Técnico", termos: ["tecnico"] },
    { id: RESIDUAL, nome: "Rateio institucional", termos: [], residual: true },
  ];

  const ida = montarPerfil({
    nome: "Exemplo", classif: {}, rotulos, catalogoModalidades: catalogo,
    modalidades: { "3110101": "TECNICO", "9999999": "SUMIU" },
  });

  it("salva apelidos, catálogo e a modalidade manual válida nele", () => {
    expect(ida.versao).toBe(6);
    expect(ida.rotulos.grupos.REC_MENSALIDADES).toBe("Receita com Cursos");
    expect(ida.catalogoModalidades.map((m) => m.id)).toEqual(["PRESENCIAL", "TECNICO", RESIDUAL]);
    // modalidade que não existe no catálogo do próprio perfil não entra
    expect(ida.modalidades).toEqual({ "3110101": "TECNICO" });
  });

  it("não leva valor nenhum", () => {
    expect(JSON.stringify(ida)).not.toMatch(/saldo|900000|R\$/);
  });

  it("volta inteiro na leitura", () => {
    const { ok, perfil } = lerPerfil(JSON.stringify(ida));
    expect(ok).toBe(true);
    expect(perfil.rotulos.contas["3110102"]).toBe("Graduação EAD");
    expect(perfil.catalogoModalidades.find((m) => m.residual).nome).toBe("Rateio institucional");
    expect(perfil.quantosRotulos).toBe(2);
  });

  it("perfil antigo (sem catálogo) continua sendo lido, caindo no padrão", () => {
    const antigo = { formato: "gerador-dre/perfil", versao: 4, nome: "Velho", contas: {}, modalidades: { "3110101": "PRESENCIAL" } };
    const { ok, perfil } = lerPerfil(JSON.stringify(antigo));
    expect(ok).toBe(true);
    expect(perfil.modalidades).toEqual({ "3110101": "PRESENCIAL" });
    expect(perfil.catalogoModalidades.map((m) => m.id)).toEqual(CATALOGO_PADRAO.map((m) => m.id));
    expect(perfil.rotulos).toEqual(ROTULOS_VAZIOS);
  });
});

/* ------------------------------------------------------------------ *
 * DIGITAR NÃO PODE BRIGAR COM QUEM DIGITA.
 *
 * Defeito encontrado em 18/09/2026, na primeira vez que alguém escreveu
 * um nome em vez de colar: a limpeza rodava a cada tecla e APARAVA o fim
 * do texto, então o espaço entre duas palavras nunca chegava a aparecer
 * — nome de mais de uma palavra era impossível de escrever. O mesmo com
 * a vírgula que separa os termos de uma modalidade.
 * ------------------------------------------------------------------ */
describe("o campo de nome aceita o que se está digitando", () => {
  it("o espaço do fim sobrevive à tecla — senão a segunda palavra nunca começa", () => {
    const r = definirRotulo(ROTULOS_VAZIOS, "grupos", "REC_MENSALIDADES", "Receita ");
    expect(r.grupos.REC_MENSALIDADES).toBe("Receita ");
    // digitando a palavra seguinte
    const r2 = definirRotulo(r, "grupos", "REC_MENSALIDADES", "Receita de Cursos");
    expect(r2.grupos.REC_MENSALIDADES).toBe("Receita de Cursos");
  });

  it("mas o texto que vai para o arquivo sai aparado", () => {
    const r = definirRotulo(ROTULOS_VAZIOS, "grupos", "REC_MENSALIDADES", "Receita ");
    expect(normalizarRotulos(r).grupos.REC_MENSALIDADES).toBe("Receita");
    expect(limparRotulo("Receita  de \t Cursos ")).toBe("Receita de Cursos");
  });

  it("campo em branco continua removendo o apelido", () => {
    const r = definirRotulo(ROTULOS_VAZIOS, "grupos", "REC_MENSALIDADES", "Receita");
    expect(definirRotulo(r, "grupos", "REC_MENSALIDADES", "   ").grupos).toEqual({});
  });

  it("caractere de controle nunca entra — ele rompe a linha do CSV", () => {
    const r = definirRotulo(ROTULOS_VAZIOS, "grupos", "CUSTOS", "Custo\ndos serviços");
    expect(r.grupos.CUSTOS).not.toMatch(/\n/);
  });

  it("a vírgula recém-teclada sobrevive, e o termo vazio não classifica nada", () => {
    // é o que o hook guarda enquanto se escreve o segundo termo
    const emEdicao = [{ id: "EAD", nome: "EAD", termos: "ead,".split(",") }];
    expect(emEdicao[0].termos.join(",")).toBe("ead,");
    expect(normalizarCatalogo(emEdicao)[0].termos).toEqual(["ead"]);
    expect(modalidadeDoTexto("GRADUACAO EAD", emEdicao)).toBe("EAD");
    expect(modalidadeDoTexto("ALUGUEIS", emEdicao)).toBe(null);
  });

  it("nome de modalidade em branco vira o id na leitura, não na tecla", () => {
    expect(normalizarCatalogo([{ id: "EAD", nome: "", termos: [] }])[0].nome).toBe("EAD");
  });
});

/* ------------------------------------------------------------------ *
 * O alcance e a faixa padrão viajam no perfil (versão 6).
 * ------------------------------------------------------------------ */
describe("alcance e faixa padrão no perfil", () => {
  it("vão e voltam inteiros", () => {
    const ida = montarPerfil({
      nome: "IESB", classif: {},
      alcanceModalidade: ["3", "5"], faixaPadraoModalidade: "PRESENCIAL",
    });
    expect(ida.alcanceModalidade).toEqual(["3", "5"]);
    const { ok, perfil } = lerPerfil(JSON.stringify(ida));
    expect(ok).toBe(true);
    expect(perfil.alcanceModalidade).toEqual(["3", "5"]);
    expect(perfil.faixaPadraoModalidade).toBe("PRESENCIAL");
  });

  it("faixa padrão que não existe no catálogo do perfil não passa", () => {
    const ida = montarPerfil({ nome: "X", classif: {}, faixaPadraoModalidade: "FANTASMA" });
    expect(ida.faixaPadraoModalidade).toBe("PRESENCIAL");
  });

  it("perfil sem os dois campos cai no padrão de hoje, não no de ontem", () => {
    const v5 = { formato: "gerador-dre/perfil", versao: 5, nome: "Velho", contas: {} };
    const { perfil } = lerPerfil(JSON.stringify(v5));
    expect(perfil.alcanceModalidade).toEqual(["3"]);
    expect(perfil.faixaPadraoModalidade).toBe("PRESENCIAL");
  });
});
