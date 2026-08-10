import { describe, expect, it } from "vitest";
import {
  FASES,
  chaveEntregavel,
  chavePasso,
  diasPara,
  faseAtual,
  progressoFase,
  progressoGeral,
} from "../cronograma51.js";

/* O cronograma é transcrição de um documento externo. Estes testes não
 * julgam o plano — eles garantem que a transcrição não se degrade com o
 * tempo: numeração dos passos, prazos e a existência de entregável em
 * toda fase. Um passo perdido numa refatoração é um passo que ninguém
 * executa. */
describe("fidelidade ao documento do cronograma", () => {
  it("tem as dez fases, de 0 a 9", () => {
    expect(FASES).toHaveLength(10);
    expect(FASES.map((f) => f.id)).toEqual(["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9"]);
  });

  it("numera os passos de 1 a 44 sem buraco nem repetição", () => {
    const numerados = FASES.flatMap((f) => f.passos.map((p) => p.n)).filter((n) => n != null);
    expect(numerados).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
  });

  it("a Fase 0 tem os cinco passos sem numeração do documento", () => {
    expect(FASES[0].passos).toHaveLength(5);
    expect(FASES[0].passos.every((p) => p.n == null)).toBe(true);
  });

  it("toda fase tem prazo, data-limite, responsável, objetivo e entregáveis", () => {
    FASES.forEach((f) => {
      expect(f.prazo).toBeTruthy();
      expect(f.limite).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.responsavel).toBeTruthy();
      expect(f.objetivo.length).toBeGreaterThan(40);
      expect(f.entregaveis.length).toBeGreaterThan(0);
    });
  });

  it("as datas-limite andam para a frente, fase a fase", () => {
    const limites = FASES.map((f) => f.limite);
    expect([...limites].sort()).toEqual(limites);
  });

  it("o go-live acontece no exercício de 2027", () => {
    expect(FASES[8].limite.startsWith("2027")).toBe(true);
  });

  it("os passos apoiados pelo app dizem o que o app faz", () => {
    const comApoio = FASES.flatMap((f) => f.passos).filter((p) => p.apoio);
    expect(comApoio.length).toBeGreaterThanOrEqual(12);
    comApoio.forEach((p) => expect(p.apoio.length).toBeGreaterThan(30));
  });
});

describe("progresso", () => {
  it("conta passos e entregáveis com o mesmo peso", () => {
    const f = FASES[0];
    const p = progressoFase(f, {});
    expect(p.total).toBe(f.passos.length + f.entregaveis.length);
    expect(p.pct).toBe(0);
  });

  it("chega a 100% só quando os entregáveis também estão feitos", () => {
    const f = FASES[7];
    const soPassos = {};
    f.passos.forEach((_, i) => (soPassos[chavePasso(f.id, i)] = "feito"));
    expect(progressoFase(f, soPassos).pct).toBeLessThan(1);

    const tudo = { ...soPassos };
    f.entregaveis.forEach((_, i) => (tudo[chaveEntregavel(f.id, i)] = "feito"));
    expect(progressoFase(f, tudo).pct).toBe(1);
  });

  it("passo e entregável de mesmo índice não compartilham chave", () => {
    expect(chavePasso("f1", 0)).not.toBe(chaveEntregavel("f1", 0));
  });

  it("o progresso geral soma todas as fases", () => {
    const g = progressoGeral({});
    const total = FASES.reduce((s, f) => s + f.passos.length + f.entregaveis.length, 0);
    expect(g.total).toBe(total);
    expect(g.feitos).toBe(0);
  });

  it("a fase atual é a primeira ainda não concluída", () => {
    expect(faseAtual({}).id).toBe("f0");
    const f0 = {};
    FASES[0].passos.forEach((_, i) => (f0[chavePasso("f0", i)] = "feito"));
    FASES[0].entregaveis.forEach((_, i) => (f0[chaveEntregavel("f0", i)] = "feito"));
    expect(faseAtual(f0).id).toBe("f1");
  });

  it("sem nenhuma fase pendente, não aponta fase nenhuma", () => {
    const tudo = {};
    FASES.forEach((f) => {
      f.passos.forEach((_, i) => (tudo[chavePasso(f.id, i)] = "feito"));
      f.entregaveis.forEach((_, i) => (tudo[chaveEntregavel(f.id, i)] = "feito"));
    });
    expect(faseAtual(tudo)).toBe(null);
  });
});

describe("contagem de prazo", () => {
  it("é zero no dia do vencimento, qualquer que seja a hora", () => {
    expect(diasPara("2026-08-10", new Date("2026-08-10T00:30:00"))).toBe(0);
    expect(diasPara("2026-08-10", new Date("2026-08-10T23:30:00"))).toBe(0);
  });

  it("é negativo depois de vencer e positivo antes", () => {
    expect(diasPara("2026-08-10", new Date("2026-08-15T10:00:00"))).toBe(-5);
    expect(diasPara("2026-08-31", new Date("2026-08-10T10:00:00"))).toBe(21);
  });
});
