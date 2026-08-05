import { useRef, useState } from "react";
import { brl } from "../lib/parse.js";
import { GRUPOS } from "../lib/classify.js";

export function EtapaClassificar({
  grupos1, digitosResultado, resultadoManual, onResultadoManual,
  contasResultado, grupoDe, tocadas, nomes, busca, onBusca,
  onClassificar, onImportarPlano, onGerarDRE, onLimparManuais,
}) {
  const [buscaLocal, setBuscaLocal] = useState(busca);
  const planoRef = useRef(null);

  return (
    <>
      <div className="card">
        <h2>Grupos do plano de contas</h2>
        <p className="hint">
          Marque quais grupos são contas de resultado. Só eles entram na DRE — o resto é
          patrimonial. O padrão assume 1 e 2 como ativo e passivo.
        </p>
        <div className="scroll" style={{ maxHeight: "none" }}>
        <table>
          <thead>
            <tr>
              <th>Grupo</th><th className="num">Contas</th><th className="num">Débito</th>
              <th className="num">Crédito</th><th className="num">Saldo</th><th>Entra na DRE</th>
            </tr>
          </thead>
          <tbody>
            {grupos1.map((g) => (
              <tr key={g.digito}>
                <td className="code" data-rotulo="Grupo">{g.digito}</td>
                <td className="num" data-rotulo="Contas">{g.n}</td>
                <td className="num" data-rotulo="Débito">{brl(g.deb)}</td>
                <td className="num" data-rotulo="Crédito">{brl(g.cre)}</td>
                <td className={"num " + (g.cre - g.deb < 0 ? "neg" : "")} data-rotulo="Saldo">{brl(g.cre - g.deb)}</td>
                <td data-rotulo="Entra na DRE">
                  <input
                    type="checkbox"
                    aria-label={`Grupo ${g.digito} entra na DRE`}
                    checked={digitosResultado.includes(g.digito)}
                    onChange={(e) => onResultadoManual({ ...resultadoManual, [g.digito]: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h2>Contas de resultado</h2>
        <p className="hint">
          {contasResultado.length} contas identificadas como resultado. A sugestão vem da
          natureza do saldo e do código — confira e ajuste o que estiver fora do lugar. Tudo o
          que ficar em "Não entra na DRE" é ignorado no cálculo.
        </p>
        <div className="filters">
          <div>
            <label>Buscar conta</label>
            <input type="text" value={buscaLocal} placeholder="Código ou histórico"
              onChange={(e) => { setBuscaLocal(e.target.value); onBusca(e.target.value); }} />
          </div>
          <div>
            <label>Nomes das contas</label>
            <button className="btn ghost" style={{ width: "100%" }} onClick={() => planoRef.current?.click()}>
              Importar plano de contas
            </button>
            <input ref={planoRef} type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods" style={{ display: "none" }}
              onChange={(e) => onImportarPlano(e.target.files[0])} />
          </div>
        </div>
        <p className="hint" style={{ marginTop: -6 }}>
          O plano de contas é um arquivo (CSV ou Excel) de duas colunas: código e descrição.
          Importar o plano de contas pode <b>mudar a sugestão de grupo</b> aqui embaixo — a
          descrição oficial da conta costuma ser um sinal mais limpo que o histórico dos
          lançamentos. Contas que você já reclassificou manualmente não são alteradas. (A coluna
          "Descrição" desta tabela continua mostrando o histórico; o nome do plano de contas
          aparece nas etapas Conferir e DRE.)
        </p>
        <div className="scroll">
          <table className="tabela-cartao">
            <thead>
              <tr>
                <th>Conta</th><th>Descrição</th><th className="num">Saldo</th>
                <th style={{ minWidth: 210 }}>Grupo na DRE</th><th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {contasResultado
                .filter((c) => !busca || (c.conta + " " + c.historico + " " + (nomes[c.conta] || "")).toLowerCase().includes(busca.toLowerCase()))
                .map((c) => (
                  <tr key={c.conta}>
                    <td className="code" data-rotulo="Conta">{c.conta}</td>
                    <td className="desc" data-rotulo="Descrição">
                      {(c.historico.trim().split(",")[0] || "").slice(0, 38)}
                    </td>
                    <td className={"num destaque " + (c.saldo < 0 ? "neg" : "")} data-rotulo="Saldo">{brl(c.saldo)}</td>
                    <td data-rotulo="">
                      <select value={grupoDe(c.conta)} aria-label={`Grupo da conta ${c.conta} na DRE`}
                        onChange={(e) => onClassificar(c.conta, e.target.value)}>
                        {GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                      </select>
                    </td>
                    <td data-rotulo="Origem">
                      <span className="tag" data-s={tocadas[c.conta] ? "edit" : "auto"}>
                        {tocadas[c.conta] ? "manual" : "sugerido"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={onGerarDRE}>Gerar DRE</button>
          <button className="btn ghost" onClick={onLimparManuais}>Voltar às sugestões</button>
        </div>
      </div>
    </>
  );
}
