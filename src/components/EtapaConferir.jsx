import { brl } from "../lib/formato.js";
import { Balanca } from "./Eixo.jsx";

/* Conferir o balancete antes de classificar.
 *
 * Esta tela já teve duas metades: uma para o razão (partidas dobradas,
 * mapeamento de colunas, filtros de dia e centro de custo) e uma para o
 * balancete. O razão saiu do app em 24/08/2026 e a metade dele foi junto
 * — inclusive o teste de débito × crédito, que sobre um balancete não
 * significa nada: o relatório sai da contabilidade já fechado, e num
 * balancete completo os dois lados se anulam por partida dobrada.
 *
 * O que este arquivo confere agora é o que o ARQUIVO permite conferir:
 * quanto ele traz, se a hierarquia fecha, qual período cobre, e se o
 * resultado apurado pelas contas patrimoniais bate com o apurado pelas
 * contas de resultado — dois caminhos independentes para o mesmo número.
 * Essa é a validação mais forte que existe aqui. */
export function EtapaConferir({
  contas, resumo, cobertura, periodo, balancetes = [], ativo, onAtivo,
  empresa, cnpj, nomes, onEmpresa, onCnpj, onIrClassificar,
}) {
  const confere = resumo?.resultadoConfere;

  return (
    <>
      <div className="checks">
        <div className="check"><div className="k">Contas no arquivo</div><div className="v">{resumo?.nContas ?? 0}</div></div>
        <div className="check"><div className="k">Analíticas</div><div className="v">{resumo?.nFolhas ?? 0}</div></div>
        {periodo && (
          <div className="check" data-tone="ok"><div className="k">Período</div><div className="v" style={{ fontSize: 13 }}>{periodo}</div></div>
        )}
        <div className="check" data-tone={resumo?.integro ? "ok" : "bad"}>
          <div className="k">Conferência interna</div>
          <div className="v">{resumo?.integro ? "Fecha" : "Não fecha"}</div>
        </div>
        {confere != null && (
          <div className="check" data-tone={confere ? "ok" : "bad"}>
            <div className="k">Patrimonial x resultado</div>
            <div className="v">{confere ? "Confere" : "Diverge"}</div>
          </div>
        )}
      </div>

      {resumo && !resumo.integro && (
        <div className="warn">
          {resumo.inconsistentes} linha(s) não fecham <b>saldo anterior + movimento = saldo atual</b>{" "}
          e {resumo.sinteticasErradas} sintética(s) não batem com a soma das próprias filhas.
          <details className="explica">
            <summary>Por que isso importa antes de classificar</summary>
            <p>
              A DRE é montada a partir das contas analíticas deste arquivo. Se a hierarquia não
              fecha dentro dele, a demonstração pode sair certa em algumas linhas e errada em
              outras, sem nenhum sinal na tela. Vale reexportar o relatório antes de seguir.
            </p>
          </details>
        </div>
      )}

      {confere === false && (
        <div className="warn">
          O resultado do período apurado pelas contas <b>1 e 2</b> não bate com o apurado pelas
          contas <b>3 a 7</b>. São dois caminhos independentes para o mesmo número — quando eles
          divergem, o arquivo tem problema antes de qualquer classificação.
        </div>
      )}

      {/* A prova cruzada, desenhada: os dois braços são o mesmo resultado
          apurado por caminhos independentes, e o único trecho vermelho é
          o quanto um excede o outro — literalmente o que não fecha. */}
      {confere != null && resumo && (
        <div className="card">
          <h2>Resultado do período, por dois caminhos</h2>
          <p className="hint">
            Δ(Ativo + Passivo) do período tem que ser igual ao resultado apurado pelas contas
            de resultado. Fechou quando os dois braços têm o mesmo comprimento.
          </p>
          <Balanca
            esquerda={Math.abs(resumo.periodoPelaPatrimonial)}
            direita={Math.abs(resumo.periodoPelaResultado)}
            rotuloEsq={`Contas 1 e 2 · ${brl(resumo.periodoPelaPatrimonial)}`}
            rotuloDir={`Contas 3 a 7 · ${brl(resumo.periodoPelaResultado)}`}
          />
        </div>
      )}

      <div className="card">
        <h2>Identificação</h2>
        <p className="hint">Sai no cabeçalho da demonstração e dos arquivos exportados.</p>
        <div className="filters">
          {balancetes.length > 1 && (
            <div>
              <label>Balancete em foco</label>
              <select value={ativo || ""} aria-label="Qual balancete monta a demonstração"
                onChange={(e) => onAtivo(e.target.value)}>
                {balancetes.map((b) => (
                  <option key={b.chave} value={b.chave}>{b.rotulo}</option>
                ))}
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
        {balancetes.length > 1 && (
          <p className="hint" style={{ marginTop: 10 }}>
            {balancetes.length} balancetes carregados. A DRE, o De-Para e o CPC 51 mostram o que
            está em foco; a <b>Comparativa</b> põe todos lado a lado.
          </p>
        )}
      </div>

      {cobertura && !cobertura.resultado && (
        <div className="warn">
          Este balancete traz só as contas <b>{cobertura.digitos.join(" e ")}</b> — sem as contas
          de resultado (3 a 7) não há DRE a montar.
          <details className="explica">
            <summary>Como resolver</summary>
            <p>
              Exporte o <b>mesmo relatório sem filtrar por conta</b>. O relatório típico de
              fechamento patrimonial sai filtrado em 1 e 2; sem filtro, ele monta a demonstração
              inteira e ainda traz o plano de contas junto.
            </p>
          </details>
        </div>
      )}

      <div className="card">
        <h2>Saldo por conta</h2>
        <p className="hint">
          As contas analíticas do balancete em foco. Saldo credor positivo, devedor negativo.
        </p>
        <div className="scroll">
          <table className="tabela-cartao">
            <thead>
              <tr>
                <th>Conta</th><th>Descrição</th><th className="num">Débito</th>
                <th className="num">Crédito</th><th className="num">Saldo</th>
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
