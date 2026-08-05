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
