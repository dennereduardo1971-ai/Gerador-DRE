import { useState } from "react";
import { brl, pct } from "../lib/parse.js";
import { SincronizacaoGitHub } from "./SincronizacaoGitHub.jsx";

const LINHAS = [
  ["receitaBruta", "Receita Bruta de Serviços"],
  ["deducoes", "Deduções à Receita"],
  ["receitaLiq", "Receita Operacional Líquida"],
  ["despOper", "Despesas Operacionais"],
  ["resultadoOper", "Resultado Operacional"],
  ["liquido", "Lucro Líquido do Exercício"],
];

function formatarData(ts) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EtapaHistorico({ historico, onRemover, onSincronizado }) {
  const [selecionados, setSelecionados] = useState([]);

  function alternar(id) {
    setSelecionados((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  }

  const comparar = selecionados.length === 2
    ? [historico.find((h) => h.id === selecionados[0]), historico.find((h) => h.id === selecionados[1])]
    : null;

  return (
    <>
      <SincronizacaoGitHub onSincronizado={onSincronizado} />

      {!historico.length ? (
        <div className="empty">
          <b>Nenhuma DRE salva ainda</b>
          Na aba 4 · DRE, use "Salvar no histórico" depois de gerar uma demonstração. Fica salvo
          neste navegador — e, se você configurar a sincronização acima, também no GitHub.
        </div>
      ) : (
        <div className="card">
          <h2>DREs salvas</h2>
          <p className="hint">Marque duas para comparar lado a lado. Fica salvo neste navegador e, se configurado, também no GitHub.</p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th></th><th>Empresa</th><th>Período</th><th>Salvo em</th>
                  <th className="num">Receita Líquida</th><th className="num">Lucro Líquido</th><th></th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td><input type="checkbox" checked={selecionados.includes(h.id)} onChange={() => alternar(h.id)} /></td>
                    <td>{h.empresa || "—"}</td>
                    <td>{h.periodo || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--soft)" }}>{formatarData(h.criadoEm)}</td>
                    <td className="num">{brl(h.totais.receitaLiq)}</td>
                    <td className={"num " + (h.totais.liquido < 0 ? "neg" : "")}>{brl(h.totais.liquido)}</td>
                    <td><button className="btn ghost" onClick={() => onRemover(h.id)}>Remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {comparar && (
        <div className="card">
          <h2>Comparação</h2>
          <p className="hint">
            {comparar[0].periodo || "—"} ({formatarData(comparar[0].criadoEm)}) vs{" "}
            {comparar[1].periodo || "—"} ({formatarData(comparar[1].criadoEm)})
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Linha</th><th className="num">{comparar[0].periodo || "A"}</th><th className="num">{comparar[1].periodo || "B"}</th><th className="num">Variação</th></tr>
              </thead>
              <tbody>
                {LINHAS.map(([chave, nome]) => {
                  const a = comparar[0].totais[chave];
                  const b = comparar[1].totais[chave];
                  const variacao = a ? (b - a) / Math.abs(a) : null;
                  return (
                    <tr key={chave}>
                      <td>{nome}</td>
                      <td className="num">{brl(a)}</td>
                      <td className="num">{brl(b)}</td>
                      <td className={"num " + (variacao < 0 ? "neg" : "")}>
                        {variacao == null ? "—" : (variacao >= 0 ? "+" : "") + pct(variacao)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
