import { brl } from "../lib/parse.js";

export function EtapaConferir({
  arquivo, nLinhas, contas, dif, meses, ccs, filtroMes, filtroCC,
  empresa, cnpj, map, cols, nomes, onFiltroMes, onFiltroCC,
  onEmpresa, onCnpj, onMap, onIrClassificar,
}) {
  return (
    <>
      <div className="checks">
        <div className="check"><div className="k">Arquivo</div><div className="v" style={{ fontSize: 13 }}>{arquivo}</div></div>
        <div className="check"><div className="k">Lançamentos</div><div className="v">{nLinhas.toLocaleString("pt-BR")}</div></div>
        <div className="check"><div className="k">Contas movimentadas</div><div className="v">{contas.length}</div></div>
        <div className="check" data-tone={Math.abs(dif) < 0.01 ? "ok" : "bad"}>
          <div className="k">Débito x crédito</div>
          <div className="v">{Math.abs(dif) < 0.01 ? "Confere" : brl(dif)}</div>
        </div>
      </div>

      {Math.abs(dif) >= 0.01 && (
        <div className="warn">
          O razão fecha com diferença de <b>{brl(Math.abs(dif))}</b> entre débitos e créditos.
          Costuma ser arredondamento ou lançamento cortado na exportação — vale conferir antes
          de assinar a DRE.
        </div>
      )}

      <div className="card">
        <h2>Filtros</h2>
        <p className="hint">Recortam o razão antes de somar os saldos.</p>
        <div className="filters">
          {meses.length > 1 && (
            <div>
              <label>Período</label>
              <select value={filtroMes} onChange={(e) => onFiltroMes(e.target.value)}>
                <option value="todos">Todos ({meses.length})</option>
                {meses.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {ccs.length > 0 && (
            <div>
              <label>Centro de custo</label>
              <select value={filtroCC} onChange={(e) => onFiltroCC(e.target.value)}>
                <option value="todos">Todos ({ccs.length})</option>
                {ccs.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>Empresa (sai no cabeçalho)</label>
            <input type="text" value={empresa} placeholder="Razão social"
              onChange={(e) => onEmpresa(e.target.value)} />
          </div>
          <div>
            <label>CNPJ (opcional)</label>
            <input type="text" value={cnpj} placeholder="00.000.000/0001-00"
              onChange={(e) => onCnpj(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Mapeamento das colunas</h2>
        <p className="hint">Reconhecidas automaticamente. Corrija se alguma ficou no lugar errado.</p>
        <div className="filters">
          {[
            ["contaD", "Conta débito"], ["contaC", "Conta crédito"],
            ["valorD", "Valor débito"], ["valorC", "Valor crédito"],
            ["hist", "Histórico"], ["data", "Data / mês"], ["ano", "Ano"], ["cc", "Centro de custo"],
          ].map(([k, lbl]) => (
            <div key={k}>
              <label>{lbl}</label>
              <select value={map[k] || ""} onChange={(e) => onMap({ ...map, [k]: e.target.value })}>
                <option value="">— nenhuma —</option>
                {cols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Saldo por conta</h2>
        <p className="hint">
          Todas as contas movimentadas no período. Saldo credor positivo, devedor negativo.
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Conta</th><th>Descrição</th><th className="num">Débito</th>
                <th className="num">Crédito</th><th className="num">Saldo</th><th className="num">Lanç.</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.conta}>
                  <td className="code">{c.conta}</td>
                  <td style={{ fontSize: 12.5, color: "var(--soft)" }}>
                    {nomes[c.conta] || (c.historico.trim().split(",")[0] || "").slice(0, 40)}
                  </td>
                  <td className="num">{brl(c.deb)}</td>
                  <td className="num">{brl(c.cre)}</td>
                  <td className={"num " + (c.saldo < 0 ? "neg" : "")}>{brl(c.saldo)}</td>
                  <td className="num">{c.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={onIrClassificar}>Classificar contas</button>
        </div>
      </div>
    </>
  );
}
