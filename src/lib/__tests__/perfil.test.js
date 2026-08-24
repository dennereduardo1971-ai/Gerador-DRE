import { describe, expect, it } from "vitest";
import { cobertura, lerPerfil, montarPerfil } from "../perfil.js";

describe("montarPerfil", () => {
  it("guarda só decisões e nomes, nunca valores", () => {
    const p = montarPerfil({
      nome: "IESB",
      classif: { "3110101": "REC_MENSALIDADES", "4120101": "DESP_ADM" },
      nomes: { "3110101": "RECEITAS PROPRIAS" },
    });
    expect(p.contas).toEqual({ "3110101": "REC_MENSALIDADES", "4120101": "DESP_ADM" });
    expect(JSON.stringify(p)).not.toMatch(/saldo|valor|deb|cre/i);
  });

  it("descarta grupo que não existe na DRE", () => {
    const p = montarPerfil({ classif: { "111": "GRUPO_INVENTADO", "222": "CUSTOS" } });
    expect(p.contas).toEqual({ "222": "CUSTOS" });
  });
});

describe("lerPerfil", () => {
  const valido = JSON.stringify(montarPerfil({
    nome: "IESB", classif: { "3110101": "REC_MENSALIDADES" }, nomes: { "3110101": "RECEITAS PROPRIAS" },
  }));

  it("lê um perfil válido", () => {
    const r = lerPerfil(valido);
    expect(r.ok).toBe(true);
    expect(r.perfil.contas["3110101"]).toBe("REC_MENSALIDADES");
    expect(r.perfil.nomes["3110101"]).toBe("RECEITAS PROPRIAS");
  });

  it("recusa arquivo que não é JSON", () => {
    expect(lerPerfil("isso não é json").ok).toBe(false);
  });

  it("recusa JSON que não é perfil deste app", () => {
    const r = lerPerfil(JSON.stringify({ qualquer: "coisa" }));
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/perfil/i);
  });

  it("recusa perfil de versão futura em vez de adivinhar", () => {
    const r = lerPerfil(JSON.stringify({ formato: "gerador-dre/perfil", versao: 99, contas: {} }));
    expect(r.ok).toBe(false);
  });

  it("ignora grupo desconhecido e conta quantos foram", () => {
    const r = lerPerfil(JSON.stringify({
      formato: "gerador-dre/perfil", versao: 1,
      contas: { "1": "CUSTOS", "2": "NAO_EXISTE" },
    }));
    expect(r.ok).toBe(true);
    expect(r.ignoradas).toBe(1);
    expect(r.perfil.contas).toEqual({ "1": "CUSTOS" });
  });
});

describe("cobertura", () => {
  it("diz quantas contas do razão aberto o perfil cobre", () => {
    const perfil = { contas: { a: "CUSTOS", b: "DESP_ADM", c: "REC_FIN" } };
    const c = cobertura(perfil, [{ conta: "a" }, { conta: "b" }, { conta: "z" }]);
    expect(c).toEqual({ presentes: 2, total: 3, noPerfil: 3 });
  });
});

describe("perfil — as decisões do CPC 51 viajam junto", () => {
  const perfil = montarPerfil({
    nome: "Cliente X",
    classif: { "4210201": "REC_FIN" },
    categorias: { "4210201": "OPERACIONAL", "9999": "INVENTADA" },
    politica: { investirEhAtividadePrincipal: true },
    medidas: [{ id: "EBITDA", nome: "EBITDA", base: "OPERACIONAL", ajustes: [{ tipo: "grupo", id: "DEPRECIACAO", modo: "excluir" }] }],
  });

  it("guarda categoria por conta, política e medidas — e nenhum valor", () => {
    expect(perfil.versao).toBe(3);
    expect(perfil.categorias).toEqual({ "4210201": "OPERACIONAL" }); // categoria inválida fora
    expect(perfil.politica.investirEhAtividadePrincipal).toBe(true);
    expect(perfil.politica.financiarClientesEhAtividadePrincipal).toBe(false);
    expect(JSON.stringify(perfil)).not.toMatch(/saldo|valor|R\$/);
  });

  it("volta inteiro na releitura", () => {
    const r = lerPerfil(JSON.stringify(perfil));
    expect(r.ok).toBe(true);
    expect(r.perfil.categorias).toEqual({ "4210201": "OPERACIONAL" });
    expect(r.perfil.politica.investirEhAtividadePrincipal).toBe(true);
    expect(r.perfil.medidas).toHaveLength(1);
  });

  it("continua lendo perfil versão 1, sem os campos novos", () => {
    const r = lerPerfil(JSON.stringify({
      formato: "gerador-dre/perfil", versao: 1, contas: { "1": "CUSTOS" },
    }));
    expect(r.ok).toBe(true);
    expect(r.perfil.categorias).toEqual({});
    expect(r.perfil.politica).toBe(null);
    expect(r.perfil.medidas).toEqual([]);
  });

  it("descarta medida sem ajuste: sem ajuste ela é o próprio subtotal da norma", () => {
    const r = lerPerfil(JSON.stringify({
      formato: "gerador-dre/perfil", versao: 2, contas: {},
      medidas: [{ nome: "Vazia", base: "OPERACIONAL", ajustes: [] }],
    }));
    expect(r.perfil.medidas).toEqual([]);
  });
});

describe("perfil versão 3 — os parâmetros fiscais viajam, os valores não", () => {
  const fiscal = {
    params: {
      regime: "REAL_NAO_CUMULATIVO",
      periodicidade: "TRIMESTRAL",
      aliquotas: { pis: 0.0165, cofins: 0.076, irpj: 0.15, adicional: 0.10, csll: 0.09 },
      prouni: { aderente: true },
    },
    mapaTributos: { "3210501": "PIS", "3210502": "COFINS" },
  };

  it("guarda regime, alíquotas e o mapa de tributos", () => {
    const p = montarPerfil({ nome: "IESB", classif: {}, fiscal });
    expect(p.versao).toBe(3);
    expect(p.fiscal.params.regime).toBe("REAL_NAO_CUMULATIVO");
    expect(p.fiscal.params.prouni.aderente).toBe(true);
    expect(p.fiscal.mapaTributos["3210502"]).toBe("COFINS");
  });

  it("NÃO guarda prejuízo fiscal nem base negativa — são valores de cliente", () => {
    /* O perfil existe para poder ser versionado no Git e mandado por
       e-mail. Saldo de prejuízo fiscal de uma instituição identificada
       num repositório público é exatamente o que este projeto tenta
       evitar. Eles vivem só na sessão, em IndexedDB. */
    const p = montarPerfil({
      nome: "IESB", classif: {},
      fiscal: { ...fiscal, prejuizo: { fiscal: 500000, baseNegativa: 300000 } },
    });
    const texto = JSON.stringify(p);
    expect(texto).not.toContain("500000");
    expect(texto).not.toContain("prejuizo");
    expect(texto).not.toContain("baseNegativa");
  });

  it("perfil sem bloco fiscal continua válido — versões 1 e 2 são lidas", () => {
    const p = montarPerfil({ nome: "Antigo", classif: { "3110101": "REC_MENSALIDADES" } });
    expect(p.fiscal).toBe(null);
    const r = lerPerfil(JSON.stringify({ ...p, versao: 1 }));
    expect(r.ok).toBe(true);
    expect(r.perfil.contas["3110101"]).toBe("REC_MENSALIDADES");
  });
});
