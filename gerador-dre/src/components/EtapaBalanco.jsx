import { brl, competenciaLegivel } from "../lib/parse.js";

export function EtapaBalanco({ balanco, filtroCompetencia }) {
  if (!balanco.temDados) {
    return (
      <div className="empty">
        <b>Nenhuma conta de ativo ou passivo encontrada</b>
        Este razão só trouxe contas de resultado (grupos 3, 4, 5). Sem contas do grupo 1
        (ativo) ou 2 (passivo), não há Balanço para montar.
      </div>
    );
  }

  return (
    <>
      <div className="warn">
        {filtroCompetencia && filtroCompetencia !== "todas" ? (
          <>Isolado em <b>{competenciaLegivel(filtroCompetencia)}</b>. </>
        ) : null}
        Isto reflete a <b>movimentação das contas dentro deste arquivo</b>{filtroCompetencia && filtroCompetencia !== "todas" ? " (e do período filtrado)" : ""}, não necessariamente
        o saldo patrimonial acumulado da empresa. Se o razão não trouxer o saldo de abertura de
        cada conta — comum quando se importa só um mês —, os totais abaixo são a variação do
        período, não o saldo final real. Para um Balanço fiel, o arquivo precisa cobrir desde a
        abertura da conta ou incluir lançamentos de saldo inicial.
      </div>

      <div className="checks">
        <div className="check"><div className="k">Total do Ativo</div><div className="v">{brl(balanco.somaAtivo)}</div></div>
        <div className="check"><div className="k">Total do Passivo + PL</div><div className="v">{brl(balanco.somaPassivo)}</div></div>
        <div className="check" data-tone={Math.abs(balanco.diferenca) < 0.01 ? "ok" : "bad"}>
          <div className="k">Ativo − Passivo</div>
          <div className="v">{Math.abs(balanco.diferenca) < 0.01 ? "Fecha" : brl(balanco.diferenca)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Ativo (conta 1)</h2>
        <p className="hint">Saldo calculado como débito − crédito (natureza devedora).</p>
        <div className="scroll">
          <table>
            <thead><tr><th>Conta</th><th className="num">Débito</th><th className="num">Crédito</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {balanco.ativo.map((c) => (
                <tr key={c.conta}>
                  <td className="code">{c.conta}</td>
                  <td className="num">{brl(c.deb)}</td>
                  <td className="num">{brl(c.cre)}</td>
                  <td className={"num " + (c.saldoBalanco < 0 ? "neg" : "")}>{brl(c.saldoBalanco)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Passivo + Patrimônio Líquido (conta 2)</h2>
        <p className="hint">Saldo calculado como crédito − débito (natureza credora).</p>
        <div className="scroll">
          <table>
            <thead><tr><th>Conta</th><th className="num">Débito</th><th className="num">Crédito</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              {balanco.passivo.map((c) => (
                <tr key={c.conta}>
                  <td className="code">{c.conta}</td>
                  <td className="num">{brl(c.deb)}</td>
                  <td className="num">{brl(c.cre)}</td>
                  <td className={"num " + (c.saldoBalanco < 0 ? "neg" : "")}>{brl(c.saldoBalanco)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
