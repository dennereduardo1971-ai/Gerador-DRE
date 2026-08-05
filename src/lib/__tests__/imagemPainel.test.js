import { describe, expect, it } from "vitest";
import { montarLayoutPainel } from "../imagemPainel.js";

describe("montarLayoutPainel", () => {
  it("distribui os indicadores em 3 colunas", () => {
    const ind = Array.from({ length: 7 }, (_, i) => ({ k: `Ind ${i}`, texto: "R$ 1,00" }));
    const l = montarLayoutPainel({ indicadores: ind });
    expect(l.porLinha).toBe(3);
    expect(l.linhas).toBe(3); // 7 itens em 3 colunas -> 3 linhas
    expect(l.celulas[0]).toMatchObject({ col: 0, linha: 0 });
    expect(l.celulas[3]).toMatchObject({ col: 0, linha: 1 });
    expect(l.celulas[6]).toMatchObject({ col: 0, linha: 2 });
  });

  it("a altura é proporcional ao número de linhas", () => {
    const seis = montarLayoutPainel({ indicadores: Array(6).fill({ k: "x", texto: "y" }) });
    const tres = montarLayoutPainel({ indicadores: Array(3).fill({ k: "x", texto: "y" }) });
    expect(seis.altura).toBe(tres.altura * 2);
  });

  it("lida com lista vazia sem gerar linha nenhuma", () => {
    const l = montarLayoutPainel({ indicadores: [] });
    expect(l.linhas).toBe(0);
    expect(l.celulas).toEqual([]);
  });
});
