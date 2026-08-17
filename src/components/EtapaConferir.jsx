import { brl, competenciaLegivel } from "../lib/parse.js";
import { Balanca } from "./Eixo.jsx";

export function EtapaConferir({
  arquivo, nLinhas, contas, dif, tDeb, tCre, meses, ccs, filtroMes, filtroCC, semRazao = false,
  competenciasDisponiveis, filtroCompetencia, onFiltroCompetencia,
  empresa, cnpj, map, cols, nomes, avisosMap = [], debSemConta = 0, creSemConta = 0,
  onFiltroMes, onFiltroCC,
  onEmpresa, onCnpj, onMap, onIrClassificar,
}) {
  return (
    <>
      {avisosMap.map((aviso, i) => (
        <div className="warn" key={i}>{aviso}</div>
      ))}

      <div className="checks">
        {!semRazao && (
          <div className="check"><div className="k">Arquivo</div><div className="v" style={{ fontSize: 13 }}>{arquivo}</div></div>
        )}
        {/* O balancete já vem somado: não há lançamento para contar, nem
            teste de partidas dobradas a fazer — a contabilidade já fechou
            isso antes de emitir o relatório. Mostrar "0 lançamentos" e
            "débito x crédito: confere" seria informação falsa. */}
        {!semRazao && (
          <div className="check"><div className="k">Lançamentos</div><div className="v">{nLinhas.toLocaleString("pt-BR")}</div></div>
        )}
        <div className="check"><div className="k">Contas movimentadas</div><div className="v">{contas.length}</div></div>
        {filtroCompetencia !== "todas" && (
          <div className="check" data-tone="ok"><div className="k">Competência isolada</div><div className="v">{competenciaLegivel(filtroCompetencia)}</div></div>
        )}
        {!semRazao && (
          <div className="check" data-tone={Math.abs(dif) < 0.01 ? "ok" : "bad"}>
            <div className="k">Débito x crédito</div>
            <div className="v">{Math.abs(dif) < 0.01 ? "Confere" : brl(dif)}</div>
          </div>
        )}
      </div>

      {!semRazao && <div className="card">
        <h2>Partidas dobradas</h2>
        <p className="hint">Fechou quando os dois braços têm o mesmo comprimento.</p>
        <Balanca
          esquerda={tDeb} direita={tCre}
          rotuloEsq={`Débito ${brl(tDeb)}`} rotuloDir={`Crédito ${brl(tCre)}`}
        />
      </div>}

      {Math.abs(dif) >= 0.01 && (
        <div className="warn">
          Diferença de <b>{brl(Math.abs(dif))}</b> entre débitos e créditos.
          <details className="explica">
            <summary>De onde costuma vir</summary>
            <p>
              Arredondamento ou lançamento cortado na exportação. Vale conferir antes de
              assinar a DRE.
            </p>
          </details>
        </div>
      )}

      {(debSemConta > 0.005 || creSemConta > 0.005) && (
        <div className="warn">
          Há valor lançado <b>sem conta preenchida</b> do lado correspondente:{" "}
          {debSemConta > 0.005 && <>débito de <b>{brl(debSemConta)}</b></>}
          {debSemConta > 0.005 && creSemConta > 0.005 && " e "}
          {creSemConta > 0.005 && <>crédito de <b>{brl(creSemConta)}</b></>}.
          Esse valor entra no total acima, mas não aparece em nenhuma conta da tabela — é uma
          das origens típicas de diferença que "some" quando se soma conta por conta.
        </div>
      )}

      {/* Os filtros são do razão e já se escondem sozinhos quando as
          listas estão vazias — mas Empresa e CNPJ vivem neste card e são
          necessários em qualquer fonte, porque saem no cabeçalho da DRE.
          Por isso o card fica; só o texto muda. */}
      <div className="card">
        <h2>{semRazao ? "Identificação" : "Filtros"}</h2>
        <p className="hint">
          {semRazao
            ? "Sai no cabeçalho da demonstração e dos arquivos exportados."
            : <>Recortam o razão antes de somar. A <b>competência</b> isola um mês inteiro.</>}
        </p>
        <div className="filters">
          {competenciasDisponiveis.length > 0 && (
            <div>
              <label>Competência (mês/ano)</label>
              <select value={filtroCompetencia} onChange={(e) => onFiltroCompetencia(e.target.value)}>
                <option value="todas">Todas ({competenciasDisponiveis.length})</option>
                {competenciasDisponiveis.map((c) => (
                  <option key={c} value={c}>{competenciaLegivel(c)}</option>
                ))}
              </select>
            </div>
          )}
          {meses.length > 1 && (
            <div>
              <label>Dia específico (opcional)</label>
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

      {!semRazao && <div className="card">
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
      </div>}

      <div className="card">
        <h2>Saldo por conta</h2>
        <p className="hint">
          Todas as contas movimentadas no período. Saldo credor positivo, devedor negativo.
        </p>
        <div className="scroll">
          <table className="tabela-cartao">
            <thead>
              <tr>
                <th>Conta</th><th>Descrição</th><th className="num">Débito</th>
                <th className="num">Crédito</th><th className="num">Saldo</th><th className="num">Lanç.</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.conta}>
                  <td className="code" data-rotulo="Conta">{c.conta}</td>
                  <td className="desc" data-rotulo="Descrição">
                    {nomes[c.conta] || (c.historico.trim().split(",")[0] || "").slice(0, 40)}
                  </td>
                  <td className="num" data-rotulo="Débito">{brl(c.deb)}</td>
                  <td className="num" data-rotulo="Crédito">{brl(c.cre)}</td>
                  <td className={"num destaque " + (c.saldo < 0 ? "neg" : "")} data-rotulo="Saldo">{brl(c.saldo)}</td>
                  <td className="num" data-rotulo="Lanç.">{c.n}</td>
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
