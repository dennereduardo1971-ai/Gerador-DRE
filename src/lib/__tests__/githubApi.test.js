import { afterEach, describe, expect, it, vi } from "vitest";
import { gravarArquivo } from "../githubApi.js";

/* O histórico leva totais reais da DRE: em repositório público ele é
   vazamento de dado de cliente (aconteceu em ago/2026). */
const cfg = { owner: "eu", repo: "dados", token: "t", caminho: "data/historico.json" };
const resposta = (corpo, ok = true, status = 200) => ({ ok, status, json: async () => corpo });

afterEach(() => vi.unstubAllGlobals());

describe("a sincronização só grava em repositório privado", () => {
  it("recusa repositório público e não chega a gravar", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(resposta({ private: false }));
    vi.stubGlobal("fetch", fetch);
    await expect(gravarArquivo(cfg, { historico: [] })).rejects.toThrow(/PÚBLICO/);
    expect(fetch).toHaveBeenCalledTimes(1); // só a consulta; nenhum PUT
  });

  it("recusa quando não consegue confirmar que é privado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(resposta({ message: "x" }, false, 404)));
    await expect(gravarArquivo(cfg, { historico: [] })).rejects.toThrow();
  });

  it("grava em repositório privado", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(resposta({ private: true }))
      .mockResolvedValueOnce(resposta({ content: { sha: "abc" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(gravarArquivo(cfg, { historico: [] })).resolves.toEqual({ sha: "abc" });
    expect(fetch.mock.calls[1][1].method).toBe("PUT");
  });
});
